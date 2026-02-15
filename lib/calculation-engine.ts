/**
 * AUTO APPROACH CALCULATION ENGINE - BULLETPROOF VERSION
 * 
 * This engine implements the complete Auto Approach Formula with:
 * - Comprehensive error handling
 * - Edge case protection
 * - Detailed logging
 * - Graceful degradation
 */

import { UserProfile, HouseholdTypeEnum, determineHouseholdType, getAdjustedCOLKey, getRentType } from './onboarding/types';
import { getLocationData, getSalary, LocationData } from './data-extraction';

// ===== CONSTANTS =====
const SAVINGS_GROWTH_RATE = 0.03; // 3% annual growth on savings
const LOAN_DEBT_GROWTH_TOLERANCE = 5; // Allow loan debt to grow for max 5 consecutive years
const NEGATIVE_DI_TOLERANCE = 5; // Allow negative DI for max 5 years before declaring unviable
const MIN_VIABLE_DI = -5000; // Minimum DI before structural failure (very negative)
const MIN_SAVINGS = 0; // Savings cannot go negative

// ===== TYPES =====

export interface YearSnapshot {
  year: number;
  age: number;
  householdType: HouseholdTypeEnum;
  numKids: number;
  
  // Income
  totalIncome: number;
  userIncome: number;
  partnerIncome: number;
  
  // Cost of Living
  adjustedCOL: number;
  housingCost: number;
  totalCOL: number;
  
  // Disposable Income
  disposableIncome: number;
  effectiveDisposableIncome: number;
  
  // Debts
  loanDebtStart: number;
  loanDebtEnd: number;
  loanDebtInterest: number;
  ccDebtPaid: number;
  
  // Payments
  ccDebtPayment: number;
  loanDebtPayment: number;
  savingsContribution: number;
  
  // Accumulation
  savingsStart: number;
  savingsEnd: number;
  savingsGrowth: number;
  
  // Mortgage
  hasMortgage: boolean;
  mortgageAcquiredThisYear: boolean;
  
  // Life Events
  kidBornThisYear: number;
  relationshipStartedThisYear: boolean;
  
  // Debug info
  debugNotes: string[];
}

export interface CalculationResult {
  location: string;
  locationData: LocationData;
  
  // Success flag
  calculationSuccessful: boolean;
  errorMessage?: string;
  
  // Timeline
  yearsToDebtFree: number;
  yearsToMortgage: number;
  ageDebtFree: number;
  ageMortgageAcquired: number;
  
  // Viability
  viabilityClassification: ViabilityClass;
  isViable: boolean;
  minimumAllocationRequired: number;
  
  // Simulation data
  yearByYear: YearSnapshot[];
  simulationStoppedEarly: boolean;
  stoppedReason?: string;
  
  // Projections
  houseProjections: {
    threeYears: HouseProjection | null;
    fiveYears: HouseProjection | null;
    tenYears: HouseProjection | null;
    fifteenYears: HouseProjection | null;
  };
  
  // Kid viability
  kidViability: {
    firstKid: KidViabilityResult;
    secondKid: KidViabilityResult;
    thirdKid: KidViabilityResult;
  };
  
  // Recommendations
  recommendations: string[];
  warnings: string[];
}

export type ViabilityClass = 
  | 'very-viable-stable'
  | 'viable'
  | 'viable-higher-allocation'
  | 'viable-extreme-care'
  | 'viable-when-renting'
  | 'no-viable-path';

export interface HouseProjection {
  year: number;
  age: number;
  totalSavings: number;
  downPaymentRequired: number;
  firstYearPaymentRequired: number;
  maxPossibleHousePrice: number;
  maxSustainableHousePrice: number;
  sustainableDownPayment: number;
  sustainableAnnualPayment: number;
  postMortgageDisposableIncome: number;
  sustainabilityLimited: boolean;
  canAfford: boolean;
}

export interface KidViabilityResult {
  isViable: boolean;
  minimumAge?: number;
  reason?: string;
}

// ===== MAIN CALCULATION FUNCTION =====

/**
 * Calculate Auto Approach results for a specific location
 * 
 * @param profile - User profile from onboarding
 * @param locationName - Name of location (e.g., "Utah" or "Austin, TX")
 * @param simulationYears - How many years to simulate (default 30)
 * @returns Complete calculation results or null if location not found
 * 
 * @example
 * const profile = normalizeOnboardingAnswers(onboardingAnswers);
 * const result = calculateAutoApproach(profile, "Utah", 30);
 * 
 * if (result && result.calculationSuccessful) {
 *   console.log(`Viable: ${result.isViable}`);
 *   console.log(`Years to mortgage: ${result.yearsToMortgage}`);
 * } else {
 *   console.error(result?.errorMessage || "Location not found");
 * }
 */
function calculateAutoApproach(
  profile: UserProfile,
  locationName: string,
  simulationYears: number = 30
): CalculationResult | null {
  
  let locationData: LocationData | null = null;
  
  try {
    // Validate inputs
    if (!profile) {
      console.error('calculateAutoApproach: profile is null or undefined');
      return null;
    }
    
    if (!locationName || typeof locationName !== 'string') {
      console.error('calculateAutoApproach: invalid location name', locationName);
      return null;
    }
    
    // Get location data
    locationData = getLocationData(locationName);
    if (!locationData) {
      console.error(`calculateAutoApproach: Could not find location data for "${locationName}"`);
      return null;
    }
    
    // Validate profile data
    const validationErrors = validateProfile(profile);
    if (validationErrors.length > 0) {
      console.error('calculateAutoApproach: Profile validation errors:', validationErrors);
      return createErrorResult(locationName, locationData, `Invalid profile: ${validationErrors.join(', ')}`);
    }
    
    // Run year-by-year simulation
    console.log(`Starting simulation for ${locationName}, ${simulationYears} years`);
    const simulation = runYearByYearSimulation(profile, locationData, simulationYears);
    
    if (simulation.snapshots.length === 0) {
      return createErrorResult(locationName, locationData, 'Simulation produced no results');
    }
    
    // Analyze results
    const yearsToDebtFree = findYearWhen(simulation.snapshots, s => s.loanDebtEnd === 0);
    const yearsToMortgage = findYearWhen(simulation.snapshots, s => s.hasMortgage);
    
    const ageDebtFree = yearsToDebtFree > 0 ? profile.currentAge + yearsToDebtFree : -1;
    const ageMortgageAcquired = yearsToMortgage > 0 ? profile.currentAge + yearsToMortgage : -1;
    
    // Calculate minimum allocation required FIRST (needed for viability classification)
    const minAllocation = calculateMinimumAllocation(profile, locationData);
    
    // Calculate viability (now considers if user meets minimum allocation)
    const viability = classifyViability(yearsToMortgage, yearsToDebtFree, simulation.snapshots, profile, minAllocation);
    
    // House size projections
    const houseProjections = calculateHouseProjections(profile, locationData, simulation.snapshots);
    
    // Kid viability
    const kidViability = calculateKidViability(profile, locationData);
    
    // Generate recommendations and warnings
    const recommendations = generateRecommendations(profile, viability, minAllocation, yearsToMortgage, simulation.snapshots);
    const warnings = generateWarnings(profile, simulation.snapshots, viability);
    
    return {
      location: locationName,
      locationData,
      calculationSuccessful: true,
      yearsToDebtFree,
      yearsToMortgage,
      ageDebtFree,
      ageMortgageAcquired,
      viabilityClassification: viability,
      isViable: viability !== 'no-viable-path',
      minimumAllocationRequired: minAllocation,
      yearByYear: simulation.snapshots,
      simulationStoppedEarly: simulation.stoppedEarly,
      stoppedReason: simulation.stopReason,
      houseProjections,
      kidViability,
      recommendations,
      warnings,
    };
    
  } catch (error) {
    console.error('calculateAutoApproach: Unexpected error:', error);
    if (!locationData) {
      console.error('calculateAutoApproach: Error occurred before location data was loaded');
      return null;
    }
    return createErrorResult(
      locationName, 
      locationData, 
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}

// ===== VALIDATION =====

function validateProfile(profile: UserProfile): string[] {
  const errors: string[] = [];
  
  if (!profile.currentAge || profile.currentAge < 18 || profile.currentAge > 100) {
    errors.push('Invalid age (must be 18-100)');
  }
  
  if (!profile.userOccupation) {
    errors.push('User occupation is required');
  }
  
  if (profile.studentLoanDebt < 0) {
    errors.push('Student loan debt cannot be negative');
  }
  
  if (profile.studentLoanRate < 0 || profile.studentLoanRate > 1) {
    errors.push('Student loan rate must be between 0 and 1 (e.g., 0.065 for 6.5%)');
  }
  
  if (profile.disposableIncomeAllocation < 0 || profile.disposableIncomeAllocation > 100) {
    errors.push('Allocation must be between 0 and 100');
  }
  
  if (profile.currentSavings < 0) {
    errors.push('Savings cannot be negative');
  }
  
  return errors;
}

// ===== YEAR-BY-YEAR SIMULATION =====

interface SimulationResult {
  snapshots: YearSnapshot[];
  stoppedEarly: boolean;
  stopReason?: string;
}

/**
 * Run the complete year-by-year simulation
 * 
 * This is the core of the calculation engine. It simulates each year:
 * 1. Life events (relationship, kids)
 * 2. Income calculation (user + partner)
 * 3. Cost of living (adjusted COL + housing)
 * 4. Disposable income (income - COL)
 * 5. Priority stack payments (CC → Loan → Savings)
 * 6. Mortgage readiness check
 * 7. Record snapshot
 * 
 * Early exit conditions:
 * - Debt growing for 5+ consecutive years (unviable)
 * - DI negative for 5+ years (structurally unviable)
 * - Main goals achieved (mortgage + debt-free after 10 years)
 */
function runYearByYearSimulation(
  profile: UserProfile,
  locationData: LocationData,
  years: number
): SimulationResult {
  const snapshots: YearSnapshot[] = [];
  
  // Initialize state
  let currentAge = profile.currentAge;
  let loanDebt = profile.studentLoanDebt;
  let savings = Math.max(0, profile.currentSavings); // Ensure non-negative
  let hasMortgage = false;
  let currentHouseholdType = profile.householdType;
  let currentNumKids = profile.numKids || 0;
  let currentNumEarners = profile.numEarners;
  
  // Debt tracking
  let loanDebtGrowthYears = 0;
  let negativeDIYears = 0;
  
  // CC debt tracking
  const ccDebt = profile.creditCardDebt || 0;
  const ccRefreshYears = Math.max(1, Math.round((profile.creditCardRefreshMonths || 36) / 12));
  
  // Relationship tracking
  let relationshipStarted = profile.relationshipStatus === 'linked';
  const plannedRelationshipAge = profile.plannedRelationshipAge || 
    (profile.relationshipPlans === 'yes' || profile.relationshipPlans === 'unsure' 
      ? (profile.currentAge + 5) 
      : undefined);
  
  console.log('Starting simulation with:', {
    currentAge,
    loanDebt,
    savings,
    householdType: currentHouseholdType,
    numKids: currentNumKids,
    numEarners: currentNumEarners,
  });
  
  for (let year = 1; year <= years; year++) {
    const debugNotes: string[] = [];
    const ageThisYear = currentAge + year - 1;
    
    // === LIFE EVENT: RELATIONSHIP START ===
    let relationshipStartedThisYear = false;
    if (!relationshipStarted && plannedRelationshipAge && ageThisYear >= plannedRelationshipAge) {
      relationshipStarted = true;
      relationshipStartedThisYear = true;
      currentNumEarners = 2;
      currentHouseholdType = determineHouseholdType('linked', 2, currentNumKids);
      debugNotes.push(`Relationship started at age ${ageThisYear}`);
    }
    
    // === LIFE EVENT: KIDS BORN ===
    let kidBornThisYear = 0;
    if (profile.plannedKidAges && profile.plannedKidAges.length > 0) {
      const kidIndex = profile.plannedKidAges.findIndex(age => age === ageThisYear);
      if (kidIndex >= 0) {
        // Check hard rules
        const canHaveKid = checkKidHardRules(profile.hardRules, loanDebt, hasMortgage);
        if (canHaveKid) {
          currentNumKids++;
          kidBornThisYear = currentNumKids;
          const relStatus = relationshipStarted ? 'linked' : 'single';
          currentHouseholdType = determineHouseholdType(relStatus as any, currentNumEarners, currentNumKids);
          debugNotes.push(`Kid #${kidBornThisYear} born at age ${ageThisYear}`);
        } else {
          debugNotes.push(`Kid blocked by hard rules at age ${ageThisYear}`);
        }
      }
    }
    
    // === CALCULATE INCOME ===
    const userIncome = getSalary(locationData.name, profile.userOccupation, profile.userSalary);
    let partnerIncome = 0;
    
    if (currentNumEarners === 2) {
      if (profile.partnerOccupation) {
        partnerIncome = getSalary(locationData.name, profile.partnerOccupation, profile.partnerSalary);
        debugNotes.push(`Partner income from occupation: $${partnerIncome}`);
      } else if (profile.usePartnerIncomeDoubling || relationshipStartedThisYear) {
        // Income doubling rule
        partnerIncome = userIncome;
        debugNotes.push(`Partner income doubled: $${partnerIncome}`);
      }
    }
    
    const totalIncome = userIncome + partnerIncome;
    
    if (totalIncome <= 0) {
      console.warn(`Year ${year}: Total income is $0 or negative`);
      return {
        snapshots,
        stoppedEarly: true,
        stopReason: 'No income available',
      };
    }
    
    // === CALCULATE COST OF LIVING ===
    const colKey = getAdjustedCOLKey(currentHouseholdType);
    const adjustedCOL = locationData.adjustedCOL[colKey] || 0;
    
    // Housing cost (rent or mortgage)
    let housingCost = 0;
    if (hasMortgage) {
      housingCost = locationData.housing.annualMortgagePayment || 0;
      debugNotes.push(`Mortgage payment: $${housingCost}`);
    } else {
      const rentType = getRentType(currentHouseholdType);
      if (rentType === '1br') housingCost = locationData.rent.oneBedroomAnnual || 0;
      else if (rentType === '2br') housingCost = locationData.rent.twoBedroomAnnual || 0;
      else housingCost = locationData.rent.threeBedroomAnnual || 0;
      debugNotes.push(`Rent (${rentType}): $${housingCost}`);
    }
    
    const totalCOL = adjustedCOL + housingCost;
    
    // === CALCULATE DISPOSABLE INCOME ===
    const disposableIncome = totalIncome - totalCOL;
    const effectiveDisposableIncome = Math.max(0, disposableIncome * (profile.disposableIncomeAllocation / 100));
    
    // Track negative DI
    if (disposableIncome < 0) {
      negativeDIYears++;
      debugNotes.push(`WARNING: Negative DI year ${negativeDIYears} of ${NEGATIVE_DI_TOLERANCE}`);
      
      if (negativeDIYears >= NEGATIVE_DI_TOLERANCE || disposableIncome < MIN_VIABLE_DI) {
        console.log(`Stopping: Structurally unviable (negative DI for ${negativeDIYears} years)`);
        return {
          snapshots,
          stoppedEarly: true,
          stopReason: 'Structurally unviable - cost of living exceeds income',
        };
      }
    } else {
      negativeDIYears = 0; // Reset counter
    }
    
    // === PAYMENT PRIORITY STACK ===
    let remainingEDI = effectiveDisposableIncome;
    let ccDebtPayment = 0;
    let loanDebtPayment = 0;
    let savingsContribution = 0;
    
    const loanDebtStartYear = loanDebt;
    
    // PRIORITY 1: Credit Card Debt (every refresh cycle)
    if (year % ccRefreshYears === 0 && ccDebt > 0) {
      ccDebtPayment = Math.min(ccDebt, remainingEDI);
      remainingEDI -= ccDebtPayment;
      debugNotes.push(`CC debt payment (refresh cycle): $${ccDebtPayment}`);
    }
    
    // PRIORITY 2: Loan Debt (Student Loans)
    let loanDebtInterest = 0;
    if (loanDebt > 0) {
      // Calculate interest - CRITICAL: Ensure rate is decimal (0.065, not 6.5)
      const interestRate = profile.studentLoanRate;
      if (interestRate > 1) {
        console.error(`ERROR: Interest rate ${interestRate} appears to be percentage, not decimal!`);
        debugNotes.push(`ERROR: Interest rate ${interestRate} > 1, using 0.065 instead`);
        loanDebtInterest = loanDebt * 0.065; // Fallback to 6.5%
      } else {
        loanDebtInterest = loanDebt * interestRate;
      }
      
      const loanDebtWithInterest = loanDebt + loanDebtInterest;
      
      // Target: 36% of income
      const targetLoanPayment = totalIncome * 0.36;
      
      // Actual payment: MIN of (target, remaining EDI, total debt with interest)
      const availableForLoan = Math.min(targetLoanPayment, remainingEDI);
      loanDebtPayment = Math.min(availableForLoan, loanDebtWithInterest);
      
      // Ensure payment is non-negative
      loanDebtPayment = Math.max(0, loanDebtPayment);
      
      // Calculate new debt balance
      const newLoanDebt = Math.max(0, loanDebtWithInterest - loanDebtPayment);
      
      debugNotes.push(
        `Loan: $${loanDebt.toFixed(0)} + $${loanDebtInterest.toFixed(0)} interest = $${loanDebtWithInterest.toFixed(0)}, ` +
        `paid $${loanDebtPayment.toFixed(0)}, new balance: $${newLoanDebt.toFixed(0)}`
      );
      
      // Update debt
      loanDebt = newLoanDebt;
      remainingEDI -= loanDebtPayment;
      remainingEDI = Math.max(0, remainingEDI); // Ensure non-negative
      
      // Track debt growth - FIXED: More lenient conditions
      const debtGrowthThisYear = loanDebt - loanDebtStartYear;
      const debtGrowthPercent = loanDebtStartYear > 0 ? (debtGrowthThisYear / loanDebtStartYear) : 0;
      
      // Only count as "growth" if debt increased by more than 2% (allows for rounding/small interest)
      if (debtGrowthPercent > 0.02) {
        loanDebtGrowthYears++;
        debugNotes.push(`WARNING: Debt grew ${(debtGrowthPercent * 100).toFixed(1)}% (year ${loanDebtGrowthYears} of ${LOAN_DEBT_GROWTH_TOLERANCE})`);
        
        // Only stop if debt has grown for 5+ consecutive years AND grew significantly overall
        if (loanDebtGrowthYears >= LOAN_DEBT_GROWTH_TOLERANCE) {
          const totalDebtGrowth = profile.studentLoanDebt > 0 
            ? (loanDebt - profile.studentLoanDebt) / profile.studentLoanDebt 
            : 0;
          
          if (totalDebtGrowth > 0.5) {
            // Debt grew by 50%+ - truly unsustainable
            console.log(`Stopping: Debt grew from $${profile.studentLoanDebt.toFixed(0)} to $${loanDebt.toFixed(0)} (${(totalDebtGrowth * 100).toFixed(0)}% growth)`);
            return {
              snapshots,
              stoppedEarly: true,
              stopReason: `Unable to pay down debt - grew by ${(totalDebtGrowth * 100).toFixed(0)}% over ${loanDebtGrowthYears} years`,
            };
          } else {
            // Debt growing slowly - continue simulation but note it
            debugNotes.push(`Note: Debt growing slowly but not critically (${(totalDebtGrowth * 100).toFixed(0)}% total growth)`);
            loanDebtGrowthYears = Math.floor(LOAN_DEBT_GROWTH_TOLERANCE / 2); // Reset to half, keep monitoring
          }
        }
      } else if (debtGrowthThisYear < -100) {
        // Debt decreased by $100+ - making progress, reset counter
        loanDebtGrowthYears = 0;
        if (debtGrowthPercent < -0.05) {
          debugNotes.push(`Good progress: Debt decreased ${Math.abs(debtGrowthPercent * 100).toFixed(1)}%`);
        }
      }
      // If debt stayed roughly the same (within 2%), don't change counter
    }
    
    // PRIORITY 3: Savings
    const savingsStartYear = savings;
    if (remainingEDI > 0) {
      savingsContribution = remainingEDI;
      
      // Apply 3% growth to existing savings
      const savingsGrowth = savings * SAVINGS_GROWTH_RATE;
      savings = savings + savingsGrowth + savingsContribution;
      
      debugNotes.push(
        `Savings: $${savingsStartYear.toFixed(0)} + $${savingsGrowth.toFixed(0)} growth + ` +
        `$${savingsContribution.toFixed(0)} contribution = $${savings.toFixed(0)}`
      );
    }
    
    // Ensure savings never go negative
    savings = Math.max(MIN_SAVINGS, savings);
    
    // === CHECK MORTGAGE READINESS ===
    let mortgageAcquiredThisYear = false;
    if (!hasMortgage && loanDebt === 0) {
      const canGetMortgage = checkMortgageHardRules(profile.hardRules, loanDebt);
      
      if (canGetMortgage && locationData.housing) {
        const downPayment = locationData.housing.downPaymentValue || 0;
        const firstYearPayment = locationData.housing.annualMortgagePayment || 0;
        const mortgageThreshold = downPayment + firstYearPayment;
        
        if (savings >= mortgageThreshold && mortgageThreshold > 0) {
          hasMortgage = true;
          mortgageAcquiredThisYear = true;
          savings -= mortgageThreshold;
          savings = Math.max(MIN_SAVINGS, savings); // Ensure non-negative
          debugNotes.push(
            `MORTGAGE ACQUIRED! Paid $${downPayment} down + $${firstYearPayment} first year, ` +
            `new savings: $${savings.toFixed(0)}`
          );
        }
      }
    }
    
    // === RECORD SNAPSHOT ===
    const savingsGrowthThisYear = savingsStartYear * SAVINGS_GROWTH_RATE;
    
    snapshots.push({
      year,
      age: ageThisYear,
      householdType: currentHouseholdType,
      numKids: currentNumKids,
      totalIncome,
      userIncome,
      partnerIncome,
      adjustedCOL,
      housingCost,
      totalCOL,
      disposableIncome,
      effectiveDisposableIncome,
      loanDebtStart: loanDebtStartYear,
      loanDebtEnd: loanDebt,
      loanDebtInterest,
      ccDebtPaid: ccDebtPayment,
      ccDebtPayment,
      loanDebtPayment,
      savingsContribution,
      savingsStart: savingsStartYear,
      savingsEnd: savings,
      savingsGrowth: savingsGrowthThisYear,
      hasMortgage,
      mortgageAcquiredThisYear,
      kidBornThisYear,
      relationshipStartedThisYear,
      debugNotes,
    });
    
    // === EARLY EXIT CONDITIONS ===
    
    // Success condition: Main goals achieved
    if (hasMortgage && loanDebt === 0 && year > 10) {
      console.log(`Success! Mortgage acquired and debt-free by year ${year}`);
      return {
        snapshots,
        stoppedEarly: false,
      };
    }
  }
  
  // Simulation completed full duration
  return {
    snapshots,
    stoppedEarly: false,
  };
}

// ===== HELPER FUNCTIONS =====

function findYearWhen(snapshots: YearSnapshot[], condition: (s: YearSnapshot) => boolean): number {
  const found = snapshots.find(condition);
  return found ? found.year : -1;
}

function checkKidHardRules(hardRules: string[], loanDebt: number, hasMortgage: boolean): boolean {
  if (!hardRules || hardRules.length === 0 || hardRules.includes('none')) {
    return true; // No restrictions
  }
  
  if (hardRules.includes('debt-before-kids') && loanDebt > 0) {
    return false; // Must pay off debt first
  }
  
  if (hardRules.includes('mortgage-before-kids') && !hasMortgage) {
    return false; // Must get mortgage first
  }
  
  return true;
}

function checkMortgageHardRules(hardRules: string[], loanDebt: number): boolean {
  // No blocking hard rules for mortgage (debt must be 0 anyway)
  return true;
}

// Continue in next file...
// ===== PART 2: VIABILITY CLASSIFICATION & PROJECTIONS =====

/**
 * Classify the viability of a location based on timeline and allocation
 * 
 * Classifications:
 * - very-viable-stable: ≤3 years to mortgage, sustainable
 * - viable: ≤5 years to mortgage
 * - viable-higher-allocation: User needs to increase allocation (below minimum required)
 * - viable-extreme-care: ≤12 years, fragile situation
 * - viable-when-renting: >15 years but positive DI
 * - no-viable-path: Cannot achieve mortgage or structural issues
 */
function classifyViability(
  yearsToMortgage: number,
  yearsToDebtFree: number,
  simulation: YearSnapshot[],
  profile: UserProfile,
  minRequiredAllocation: number
): ViabilityClass {
  const userAllocation = profile.disposableIncomeAllocation;
  
  // Check for structural issues
  const hasNegativeDI = simulation.some(s => s.disposableIncome < 0);
  const lastYear = simulation[simulation.length - 1];
  
  if (!lastYear) {
    return 'no-viable-path';
  }
  
  // If never achieves mortgage
  if (yearsToMortgage < 0) {
    // But has positive DI - could rent indefinitely
    if (lastYear.disposableIncome > 0 && !hasNegativeDI) {
      return 'viable-when-renting';
    }
    return 'no-viable-path';
  }
  
  // Check if user's allocation is BELOW minimum required
  // This means they need to allocate MORE to improve their timeline
  if (userAllocation < minRequiredAllocation - 3) {
    // User is significantly below minimum - needs to increase allocation
    return 'viable-higher-allocation';
  }
  
  // User MEETS or EXCEEDS minimum allocation
  // Classification based on TIMELINE
  
  // Very Viable & Stable: Quick path to mortgage with buffer
  if (yearsToMortgage <= 3 && lastYear.savingsEnd > 0) {
    return 'very-viable-stable';
  }
  
  // Viable: Reasonable timeline (4-8 years)
  if (yearsToMortgage <= 8) {
    return 'viable';
  }
  
  // Viable with Extreme Care: Long timeline (9-12 years)
  if (yearsToMortgage <= 12) {
    return 'viable-extreme-care';
  }
  
  // Viable When Renting: Very long timeline but still positive
  if (yearsToMortgage > 12 && yearsToMortgage < 30 && lastYear.disposableIncome > 0) {
    return 'viable-when-renting';
  }
  
  return 'no-viable-path';
}

/**
 * Calculate minimum allocation % needed to achieve mortgage within 15 years
 * 
 * Uses binary search to find the lowest allocation that results in:
 * - Mortgage acquired within 15 years
 * - Positive DI at end of simulation
 * 
 * @returns Percentage (0-100) rounded to nearest 5%
 */
function calculateMinimumAllocation(profile: UserProfile, locationData: LocationData): number {
  // Binary search for minimum viable allocation
  let low = 5; // Start at 5% (very low)
  let high = 100;
  let minViable = 100; // Default to 100% if nothing works
  
  // First check if even 100% works
  const maxTest = { ...profile, disposableIncomeAllocation: 100 };
  const maxSim = runYearByYearSimulation(maxTest, locationData, 20);
  const maxYears = findYearWhen(maxSim.snapshots, s => s.hasMortgage);
  
  if (maxYears < 0) {
    // Even 100% doesn't work - structural problem
    console.log('calculateMinimumAllocation: Even 100% allocation cannot achieve mortgage');
    return 100;
  }
  
  // Binary search
  let iterations = 0;
  while (low <= high && iterations < 20) {
    iterations++;
    const mid = Math.floor((low + high) / 2);
    const testProfile = { ...profile, disposableIncomeAllocation: mid };
    const testSim = runYearByYearSimulation(testProfile, locationData, 20);
    
    // Check if this allocation achieves mortgage in reasonable time
    const yearsToMortgage = findYearWhen(testSim.snapshots, s => s.hasMortgage);

    // Consider viable if: gets mortgage within 15 years AND simulation didn't fail structurally.
    // We do NOT check lastYear.disposableIncome here because post-mortgage DI can go negative
    // (mortgage payments > rent) which is a structural issue unrelated to allocation percentage.
    // Checking DI here caused the binary search to return 100% even when lower allocations worked.
    const isViable = yearsToMortgage > 0 &&
                     yearsToMortgage <= 15 &&
                     !testSim.stoppedEarly;
    
    if (isViable) {
      minViable = mid;
      high = mid - 1; // Try lower
    } else {
      low = mid + 1; // Need higher
    }
  }
  
  // Round to nearest 5%
  return Math.ceil(minViable / 5) * 5;
}

/**
 * Calculate the annual cost factor for mortgage payments using the correct formula
 * 
 * Uses standard 30-year fixed mortgage formula:
 * Monthly Payment = Loan × (r × (1 + r)^n) / ((1 + r)^n - 1)
 * 
 * Then adds property tax + insurance (~1.5% of home value)
 * 
 * @param mortgageRate - Annual mortgage interest rate (e.g., 0.0679 for 6.79%)
 * @param downPaymentPercent - Down payment as decimal (e.g., 0.107 for 10.7%)
 * @returns Annual cost factor as a decimal (e.g., 0.0944 for 9.44% of loan amount)
 */
function calculateAnnualCostFactor(mortgageRate: number, downPaymentPercent: number): number {
  const monthlyRate = mortgageRate / 12;
  const numPayments = 30 * 12; // 30-year mortgage
  
  // Calculate monthly payment factor using mortgage formula
  const monthlyFactor = (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                        (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  // Convert to annual payment factor (as % of loan amount)
  const annualMortgageFactor = monthlyFactor * 12;
  
  // Add property tax + insurance (~1.5% of home value)
  // Since this is relative to home value, not loan amount, we need to adjust
  const propertyTaxInsurance = 0.015; // 1.5% of home value
  
  return annualMortgageFactor + propertyTaxInsurance;
}

/**
 * Calculate total annual costs for a house (mortgage + tax + insurance)
 * 
 * @param housePrice - Total price of the house
 * @param downPaymentPercent - Down payment as decimal
 * @param annualCostFactor - Pre-calculated annual cost factor
 * @returns Total annual costs in dollars
 */
function calculateTotalAnnualCosts(
  housePrice: number,
  downPaymentPercent: number,
  annualCostFactor: number
): number {
  const loanAmount = housePrice * (1 - downPaymentPercent);
  const annualMortgage = loanAmount * (annualCostFactor - 0.015); // Subtract tax/insurance to get just mortgage factor
  const annualTaxInsurance = housePrice * 0.015;
  return annualMortgage + annualTaxInsurance;
}

/**
 * Calculate house size projections for 3, 5, 10, and 15 year milestones
 * 
 * For each milestone, calculates:
 * - Savings-based max: What your savings can afford (down payment + first year costs)
 * - Sustainability-based max: What your income can sustain long-term
 * - The LOWER of the two is the realistic maximum
 * 
 * Uses correct mortgage formula with location-specific rates:
 * - Monthly payment factor from standard mortgage formula
 * - Adds property tax + insurance (1.5% of home value)
 * - No hardcoded rates - uses actual location data
 * 
 * @example
 * const projections = calculateHouseProjections(profile, locationData, simulation);
 * console.log(`5-year house: $${projections.fiveYears?.maxSustainableHousePrice}`);
 * if (projections.fiveYears?.sustainabilityLimited) {
 *   console.log('Limited by income, not savings');
 * }
 */
function calculateHouseProjections(
  profile: UserProfile,
  locationData: LocationData,
  simulation: YearSnapshot[]
): {
  threeYears: HouseProjection | null;
  fiveYears: HouseProjection | null;
  tenYears: HouseProjection | null;
  fifteenYears: HouseProjection | null;
} {
  const targets = [3, 5, 10, 15];
  const projections: any = {
    threeYears: null,
    fiveYears: null,
    tenYears: null,
    fifteenYears: null,
  };
  
  for (const targetYear of targets) {
    const snapshot = simulation.find(s => s.year === targetYear);
    
    const key = targetYear === 3 ? 'threeYears' : 
                targetYear === 5 ? 'fiveYears' :
                targetYear === 10 ? 'tenYears' : 'fifteenYears';
    
    if (!snapshot || !locationData.housing) {
      // Year not reached in simulation - return null
      projections[key] = null;
      continue;
    }
    
    const savings = snapshot.savingsEnd;
    const downPaymentPercent = locationData.housing.downPaymentPercent || 0.107;
    const mortgageRate = locationData.housing.mortgageRate || 0.03;
    
    // Sanity check
    if (downPaymentPercent <= 0 || downPaymentPercent > 1) {
      console.warn(`Invalid down payment percent: ${downPaymentPercent}`);
      projections[key] = null;
      continue;
    }
    
    // Calculate annual cost factor using actual mortgage formula
    const annualCostFactor = calculateAnnualCostFactor(mortgageRate, downPaymentPercent);
    
    // === SAVINGS-BASED CALCULATION ===
    // Formula: Savings = Down Payment + First Year Costs
    // Savings = (House × downPaymentPercent) + ((House × (1 - downPaymentPercent)) × annualCostFactor)
    // Savings = House × (downPaymentPercent + ((1 - downPaymentPercent) × annualCostFactor))
    const totalCostFactor = downPaymentPercent + ((1 - downPaymentPercent) * annualCostFactor);
    const maxPossibleHousePrice = savings / totalCostFactor;
    const downPaymentRequired = maxPossibleHousePrice * downPaymentPercent;
    const firstYearPaymentRequired = calculateTotalAnnualCosts(maxPossibleHousePrice, downPaymentPercent, annualCostFactor);
    
    // === SUSTAINABILITY-BASED CALCULATION ===
    // Max house price where post-mortgage DI >= 0 across ALL future years.
    // This accounts for future kids increasing COL - a house affordable at year 5
    // without kids must still be affordable at year 8+ when kids arrive.

    // Find the worst-case future year: lowest (income - nonHousingCOL) from this year onward
    const futureSnapshots = simulation.filter(s => s.year >= targetYear);
    let worstCaseIncome = snapshot.totalIncome;
    let worstCaseAdjustedCOL = snapshot.adjustedCOL;

    for (const future of futureSnapshots) {
      const futureAvailable = future.totalIncome - future.adjustedCOL;
      const currentWorstAvailable = worstCaseIncome - worstCaseAdjustedCOL;
      if (futureAvailable < currentWorstAvailable) {
        worstCaseIncome = future.totalIncome;
        worstCaseAdjustedCOL = future.adjustedCOL;
      }
    }

    // Binary search for max sustainable price using worst-case future financials
    let sustainablePrice = 0;
    let low = 0;
    let high = maxPossibleHousePrice * 2; // Search up to 2x savings-based max

    for (let i = 0; i < 20; i++) {
      const mid = (low + high) / 2;
      const annualPayment = calculateTotalAnnualCosts(mid, downPaymentPercent, annualCostFactor);
      const postMortgageDI = worstCaseIncome - (worstCaseAdjustedCOL + annualPayment);

      if (postMortgageDI >= 0) {
        sustainablePrice = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    const sustainableDownPayment = sustainablePrice * downPaymentPercent;
    const sustainableAnnualPayment = calculateTotalAnnualCosts(sustainablePrice, downPaymentPercent, annualCostFactor);
    const postMortgageDisposableIncome = worstCaseIncome - (worstCaseAdjustedCOL + sustainableAnnualPayment);
    
    // === FINAL VALUES ===
    const actualMaxPrice = Math.min(maxPossibleHousePrice, sustainablePrice);
    const sustainabilityLimited = sustainablePrice < maxPossibleHousePrice;
    const canAfford = savings >= (sustainableDownPayment + sustainableAnnualPayment);
    
    projections[key] = {
      year: targetYear,
      age: snapshot.age,
      totalSavings: Math.round(savings),
      maxPossibleHousePrice: Math.round(maxPossibleHousePrice),
      downPaymentRequired: Math.round(downPaymentRequired),
      firstYearPaymentRequired: Math.round(firstYearPaymentRequired),
      maxSustainableHousePrice: Math.round(sustainablePrice),
      sustainableDownPayment: Math.round(sustainableDownPayment),
      sustainableAnnualPayment: Math.round(sustainableAnnualPayment),
      postMortgageDisposableIncome: Math.round(postMortgageDisposableIncome),
      sustainabilityLimited,
      canAfford,
    };
  }
  
  return projections;
}

/**
 * Calculate kid viability - minimum age for each kid
 * 
 * Uses binary search to find earliest age where having a kid is viable:
 * - Hard rules allow it
 * - 3 years post-birth have positive DI
 * - Debt not growing
 * - Savings > $5,000
 * 
 * @example
 * const kidViability = calculateKidViability(profile, locationData);
 * if (kidViability.firstKid.isViable) {
 *   console.log(`First kid viable at age ${kidViability.firstKid.minimumAge}`);
 * } else {
 *   console.log(`First kid not viable: ${kidViability.firstKid.reason}`);
 * }
 */
function calculateKidViability(
  profile: UserProfile,
  locationData: LocationData
): {
  firstKid: KidViabilityResult;
  secondKid: KidViabilityResult;
  thirdKid: KidViabilityResult;
} {
  
  // If user doesn't plan kids, mark as not viable
  if (profile.kidsPlan === 'no') {
    const notPlanned: KidViabilityResult = {
      isViable: false,
      reason: 'User does not plan to have kids',
    };
    return {
      firstKid: notPlanned,
      secondKid: notPlanned,
      thirdKid: notPlanned,
    };
  }
  
  // If user already has kids, they're past this calculation
  if (profile.kidsPlan === 'have-kids' && profile.numKids && profile.numKids > 0) {
    return {
      firstKid: { isViable: true, minimumAge: profile.currentAge },
      secondKid: { isViable: true, minimumAge: profile.currentAge },
      thirdKid: { isViable: true, minimumAge: profile.currentAge },
    };
  }
  
  const results: KidViabilityResult[] = [];
  
  // Check viability for up to 3 kids
  for (let kidNum = 1; kidNum <= 3; kidNum++) {
    const minAge = findMinimumViableKidAge(profile, locationData, kidNum);
    results.push(minAge);
  }
  
  return {
    firstKid: results[0],
    secondKid: results[1],
    thirdKid: results[2],
  };
}

function findMinimumViableKidAge(
  profile: UserProfile,
  locationData: LocationData,
  kidNumber: number
): KidViabilityResult {
  
  // Don't short-circuit on hard rules - let the binary search find the age when
  // hard rules ARE satisfied (e.g., after debt is paid off). The simulation already
  // enforces hard rules year-by-year, so the search will naturally skip ages where
  // rules block the birth and find the earliest viable age.

  // Binary search for minimum age
  let low = profile.currentAge;
  let high = profile.currentAge + 20; // Search up to 20 years in future
  let minViableAge = -1;

  for (let iter = 0; iter < 15; iter++) {
    const testAge = Math.floor((low + high) / 2);

    // Create test profile with kid at this age
    const testProfile = {
      ...profile,
      plannedKidAges: [testAge],
    };

    // Run simulation long enough to cover the full search range + 3 years post-birth check
    const testSim = runYearByYearSimulation(testProfile, locationData, 25);
    
    // Find the year when kid is born
    const kidBirthYear = testSim.snapshots.findIndex(s => s.kidBornThisYear === kidNumber);
    
    if (kidBirthYear < 0) {
      // Kid wasn't born (blocked by hard rules probably)
      low = testAge + 1;
      continue;
    }
    
    // Check 3 years after birth
    const threeYearsLater = testSim.snapshots[kidBirthYear + 3];
    
    if (threeYearsLater) {
      const isViable = 
        threeYearsLater.disposableIncome > 0 &&
        threeYearsLater.loanDebtEnd <= threeYearsLater.loanDebtStart &&
        threeYearsLater.savingsEnd > 5000;
      
      if (isViable) {
        minViableAge = testAge;
        high = testAge - 1; // Try earlier
      } else {
        low = testAge + 1; // Need later
      }
    } else {
      low = testAge + 1; // Simulation didn't run long enough
    }
  }
  
  if (minViableAge > 0) {
    return {
      isViable: true,
      minimumAge: minViableAge,
    };
  } else {
    return {
      isViable: false,
      reason: 'Could not find viable age within 20 years',
    };
  }
}

/**
 * Generate personalized recommendations based on viability and simulation results
 */
function generateRecommendations(
  profile: UserProfile,
  viability: ViabilityClass,
  minAllocation: number,
  yearsToMortgage: number,
  simulation: YearSnapshot[]
): string[] {
  const recommendations: string[] = [];
  const currentAllocation = profile.disposableIncomeAllocation;
  
  if (viability === 'very-viable-stable') {
    recommendations.push('Excellent financial position - goals achievable quickly');
    
    if (currentAllocation > 60) {
      const suggested = Math.max(50, minAllocation + 5);
      recommendations.push(`You could reduce allocation to ${suggested}% and still succeed`);
    }
    
    recommendations.push('Consider investing extra savings for long-term growth');
  } else if (viability === 'viable') {
    recommendations.push('Solid path to homeownership');
    
    if (currentAllocation > minAllocation + 10) {
      recommendations.push(`You're using ${currentAllocation}%, but only ${minAllocation}% is needed - you have room to improve quality of life`);
    } else {
      recommendations.push(`Current ${currentAllocation}% allocation is working well`);
    }
  } else if (viability === 'viable-higher-allocation') {
    if (currentAllocation < minAllocation) {
      recommendations.push(`Increase allocation to ${minAllocation}% for better results`);
    } else {
      recommendations.push(`Current ${currentAllocation}% allocation is on track`);
    }
    recommendations.push('Requires disciplined saving');
  } else if (viability === 'viable-extreme-care') {
    if (currentAllocation < minAllocation) {
      recommendations.push(`Minimum ${minAllocation}% allocation needed`);
      recommendations.push('Financial situation is tight - any setback could derail plans');
    } else {
      recommendations.push(`Using ${currentAllocation}% - this is near maximum sustainable level`);
    }
    recommendations.push('Consider: increasing income, reducing expenses, or alternative locations');
    recommendations.push('Build 6-month emergency fund before pursuing homeownership');
  } else if (viability === 'viable-when-renting') {
    recommendations.push('Sustainable while renting, but homeownership is long-term goal');
    recommendations.push('Consider alternative locations for faster homeownership');
    recommendations.push('Focus on career growth to increase income');
  } else {
    recommendations.push('Current plan not financially viable');
    recommendations.push('Try: Different location, lower cost of living, higher income occupation');
    recommendations.push('Or: Delay major purchases, reduce debt, increase allocation');
  }
  
  if (yearsToMortgage > 10 && viability !== 'no-viable-path') {
    recommendations.push('Consider alternative locations for faster homeownership');
  }
  
  // Debt-specific recommendations
  if (profile.studentLoanDebt > 0 && simulation.length > 0) {
    const lastYear = simulation[simulation.length - 1];
    if (lastYear.loanDebtEnd > lastYear.loanDebtStart) {
      recommendations.push('WARNING: Student loan debt is growing - consider increasing allocation or income');
    }
  }
  
  return recommendations;
}

/**
 * Generate warnings about potential issues
 */
function generateWarnings(
  profile: UserProfile,
  simulation: YearSnapshot[],
  viability: ViabilityClass
): string[] {
  const warnings: string[] = [];
  
  if (simulation.length === 0) {
    warnings.push('No simulation data available');
    return warnings;
  }
  
  const lastYear = simulation[simulation.length - 1];
  
  // Check for negative DI
  const negativeDIYears = simulation.filter(s => s.disposableIncome < 0).length;
  if (negativeDIYears > 0) {
    warnings.push(`Negative disposable income for ${negativeDIYears} year(s)`);
  }
  
  // Check for growing debt
  const debtGrowingYears = simulation.filter(s => s.loanDebtEnd > s.loanDebtStart).length;
  if (debtGrowingYears > 0) {
    warnings.push(`Student loan debt growing for ${debtGrowingYears} year(s)`);
  }
  
  // Check allocation
  if (profile.disposableIncomeAllocation > 85) {
    warnings.push('Very high allocation (>85%) - limited quality of life');
  }
  
  // Check if stopped early
  if (simulation.length < 10) {
    warnings.push('Simulation stopped early - may indicate structural issues');
  }
  
  return warnings;
}

/**
 * Create an error result when calculation fails
 */
function createErrorResult(
  locationName: string,
  locationData: LocationData,
  errorMessage: string
): CalculationResult {
  return {
    location: locationName,
    locationData,
    calculationSuccessful: false,
    errorMessage,
    yearsToDebtFree: -1,
    yearsToMortgage: -1,
    ageDebtFree: -1,
    ageMortgageAcquired: -1,
    viabilityClassification: 'no-viable-path',
    isViable: false,
    minimumAllocationRequired: 100,
    yearByYear: [],
    simulationStoppedEarly: true,
    stoppedReason: errorMessage,
    houseProjections: {
      threeYears: null,
      fiveYears: null,
      tenYears: null,
      fifteenYears: null,
    },
    kidViability: {
      firstKid: { isViable: false, reason: 'Calculation failed' },
      secondKid: { isViable: false, reason: 'Calculation failed' },
      thirdKid: { isViable: false, reason: 'Calculation failed' },
    },
    recommendations: ['Calculation failed - please check input data'],
    warnings: [errorMessage],
  };
}

// ===== EXPORTS =====

export {
  calculateAutoApproach,
  runYearByYearSimulation,
  classifyViability,
  calculateMinimumAllocation,
  calculateHouseProjections,
  calculateKidViability,
  generateRecommendations,
  generateWarnings,
  validateProfile,
};
