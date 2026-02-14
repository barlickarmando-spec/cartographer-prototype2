/**
 * Auto Approach Calculation Engine
 * Implements the complete financial planning formula with year-by-year simulation
 */

import { UserProfile, HouseholdTypeEnum, determineHouseholdType, getAdjustedCOLKey, getRentType } from './onboarding/types';
import { getLocationData, getSalary, LocationData } from './data-extraction';

// ===== CONSTANTS =====
const SAVINGS_GROWTH_RATE = 0.03; // 3% annual growth on savings
const LOAN_DEBT_INCREASE_TOLERANCE = 1; // Allow loan debt to grow for max 1 consecutive year

// ===== TYPES =====

export interface YearSnapshot {
  year: number;
  age: number;
  householdType: HouseholdTypeEnum;
  numKids: number;
  
  // Income
  totalIncome: number;
  
  // Cost of Living
  adjustedCOL: number;
  housingCost: number; // Rent or mortgage
  totalCOL: number;
  
  // Disposable Income
  disposableIncome: number;
  effectiveDisposableIncome: number; // DI × allocation%
  
  // Debts
  loanDebtStart: number;
  loanDebtEnd: number;
  ccDebtPaid: number;
  
  // Payments
  ccDebtPayment: number;
  loanDebtPayment: number;
  savingsContribution: number;
  
  // Accumulation
  savingsStart: number;
  savingsEnd: number;
  
  // Mortgage
  hasMortgage: boolean;
  mortgageAcquiredThisYear: boolean;
  
  // Flags
  kidBornThisYear: number; // 0 or kid number
  relationshipStartedThisYear: boolean;
}

export interface CalculationResult {
  location: string;
  locationData: LocationData;
  
  // Timeline
  yearsToDebtFree: number;
  yearsToMortgage: number;
  ageDebtFree: number;
  ageMortgageAcquired: number;
  
  // Viability
  viabilityClassification: ViabilityClass;
  isViable: boolean;
  minimumAllocationRequired: number; // Percent
  
  // Year-by-year simulation
  yearByYear: YearSnapshot[];
  
  // House projections
  houseProjections: {
    threeYears: HouseProjection;
    fiveYears: HouseProjection;
    tenYears: HouseProjection;
    fifteenYears: HouseProjection;
  };
  
  // Kid viability
  kidViability: {
    firstKid: KidViabilityResult;
    secondKid: KidViabilityResult;
    thirdKid: KidViabilityResult;
  };
  
  // Recommendations
  recommendations: string[];
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
  maxPossibleHousePrice: number;
  maxSustainableHousePrice: number;
  sustainabilityLimited: boolean;
  annualMortgagePayment: number;
  postMortgageDisposableIncome: number;
}

export interface KidViabilityResult {
  isViable: boolean;
  minimumAge?: number;
  reason?: string;
}

// ===== MAIN CALCULATION FUNCTION =====

/**
 * Run the complete Auto Approach calculation for a location
 */
export function calculateAutoApproach(
  profile: UserProfile,
  locationName: string,
  simulationYears: number = 30
): CalculationResult | null {
  
  // Get location data
  const locationData = getLocationData(locationName);
  if (!locationData) {
    console.error(`Could not find location data for: ${locationName}`);
    return null;
  }
  
  // Run year-by-year simulation
  const simulation = runYearByYearSimulation(profile, locationData, simulationYears);
  
  // Analyze results
  const yearsToDebtFree = findYearWhen(simulation, s => s.loanDebtEnd === 0);
  const yearsToMortgage = findYearWhen(simulation, s => s.hasMortgage);
  
  const ageDebtFree = yearsToDebtFree > 0 ? profile.currentAge + yearsToDebtFree : -1;
  const ageMortgageAcquired = yearsToMortgage > 0 ? profile.currentAge + yearsToMortgage : -1;
  
  // Calculate viability
  const viability = classifyViability(yearsToMortgage, yearsToDebtFree, simulation, profile);
  
  // Calculate minimum allocation required
  const minAllocation = calculateMinimumAllocation(profile, locationData);
  
  // House size projections
  const houseProjections = calculateHouseProjections(profile, locationData, simulation);
  
  // Kid viability
  const kidViability = calculateKidViability(profile, locationData);
  
  // Generate recommendations
  const recommendations = generateRecommendations(profile, viability, minAllocation, yearsToMortgage);
  
  return {
    location: locationName,
    locationData,
    yearsToDebtFree,
    yearsToMortgage,
    ageDebtFree,
    ageMortgageAcquired,
    viabilityClassification: viability,
    isViable: viability !== 'no-viable-path',
    minimumAllocationRequired: minAllocation,
    yearByYear: simulation,
    houseProjections,
    kidViability,
    recommendations,
  };
}

// ===== YEAR-BY-YEAR SIMULATION =====

function runYearByYearSimulation(
  profile: UserProfile,
  locationData: LocationData,
  years: number
): YearSnapshot[] {
  const snapshots: YearSnapshot[] = [];
  
  // Initialize state
  let currentAge = profile.currentAge;
  let loanDebt = profile.studentLoanDebt;
  let savings = profile.currentSavings;
  let hasMortgage = false;
  let currentHouseholdType = profile.householdType;
  let currentNumKids = profile.numKids;
  let currentNumEarners = profile.numEarners;
  let loanDebtGrowthYears = 0; // Track consecutive years of debt growth
  
  // CC debt tracking
  const ccRefreshYears = Math.round(profile.creditCardRefreshMonths / 12);
  
  // Track relationship timing
  let relationshipStarted = profile.relationshipStatus === 'linked';
  const plannedRelationshipAge = profile.plannedKidAges.length > 0 && !relationshipStarted 
    ? (profile.expectedIndependenceAge || profile.currentAge) + 5 // Default 5 years if not specified
    : undefined;
  
  for (let year = 1; year <= years; year++) {
    const yearStart = year;
    const ageThisYear = currentAge + year - 1;
    
    // === EVENT: RELATIONSHIP START ===
    let relationshipStartedThisYear = false;
    if (!relationshipStarted && plannedRelationshipAge && ageThisYear >= plannedRelationshipAge) {
      relationshipStarted = true;
      relationshipStartedThisYear = true;
      currentNumEarners = 2;
      // Update household type
      currentHouseholdType = determineHouseholdType('linked', 2, currentNumKids);
    }
    
    // === EVENT: KIDS BORN ===
    let kidBornThisYear = 0;
    const plannedKidThisYear = profile.plannedKidAges.find(age => age === ageThisYear);
    if (plannedKidThisYear) {
      // Check hard rules
      const canHaveKid = checkKidHardRules(profile.hardRules, loanDebt, hasMortgage);
      if (canHaveKid) {
        currentNumKids++;
        kidBornThisYear = currentNumKids;
        // Update household type
        const relStatus = relationshipStarted ? 'linked' : 'single';
        currentHouseholdType = determineHouseholdType(relStatus as any, currentNumEarners, currentNumKids);
      }
    }
    
    // === CALCULATE INCOME ===
    const userSalary = getSalary(locationData.name, profile.userOccupation, profile.userSalary);
    let partnerSalary = 0;
    
    if (currentNumEarners === 2) {
      if (profile.partnerOccupation) {
        partnerSalary = getSalary(locationData.name, profile.partnerOccupation, profile.partnerSalary);
      } else if (profile.usePartnerIncomeDoubling) {
        // Income doubling rule
        partnerSalary = userSalary;
      }
    }
    
    const totalIncome = userSalary + partnerSalary;
    
    // === CALCULATE COST OF LIVING ===
    const colKey = getAdjustedCOLKey(currentHouseholdType);
    const adjustedCOL = locationData.adjustedCOL[colKey];
    
    // Housing cost (rent or mortgage)
    let housingCost = 0;
    if (hasMortgage) {
      housingCost = locationData.housing.annualMortgagePayment;
    } else {
      const rentType = getRentType(currentHouseholdType);
      if (rentType === '1br') housingCost = locationData.rent.oneBedroomAnnual;
      else if (rentType === '2br') housingCost = locationData.rent.twoBedroomAnnual;
      else housingCost = locationData.rent.threeBedroomAnnual;
    }
    
    const totalCOL = adjustedCOL + housingCost;
    
    // === CALCULATE DISPOSABLE INCOME ===
    const disposableIncome = totalIncome - totalCOL;
    const effectiveDisposableIncome = disposableIncome * (profile.disposableIncomeAllocation / 100);
    
    // Check for unviable scenario
    if (disposableIncome < 0 && year > 5) {
      // Structurally unviable - COL exceeds income long-term
      break;
    }
    
    // === PAYMENTS (Auto Approach Priority) ===
    let remainingEDI = effectiveDisposableIncome;
    let ccDebtPayment = 0;
    let loanDebtPayment = 0;
    let savingsContribution = 0;
    
    const loanDebtStartYear = loanDebt;
    
    // PRIORITY 1: Credit Card Debt (every refresh cycle)
    if (year % ccRefreshYears === 0 && profile.creditCardDebt > 0) {
      ccDebtPayment = Math.min(profile.creditCardDebt, remainingEDI);
      remainingEDI -= ccDebtPayment;
    }
    
    // PRIORITY 2: Loan Debt (36% rule)
    if (loanDebt > 0) {
      // Calculate interest
      const loanDebtWithInterest = loanDebt * (1 + profile.studentLoanRate);
      
      // 36% target
      const targetLoanPayment = totalIncome * 0.36;
      
      // Actual payment = min(target, remaining EDI, debt amount)
      const maxPayment = Math.min(targetLoanPayment, remainingEDI);
      const interestPayment = loanDebtWithInterest - loanDebt;
      
      // Make sure we at least cover interest (or pay what we can)
      loanDebtPayment = Math.min(maxPayment, loanDebtWithInterest);
      
      loanDebt = Math.max(0, loanDebtWithInterest - loanDebtPayment);
      remainingEDI -= loanDebtPayment;
      
      // Track debt growth
      if (loanDebt > loanDebtStartYear) {
        loanDebtGrowthYears++;
        if (loanDebtGrowthYears > LOAN_DEBT_INCREASE_TOLERANCE) {
          // Unviable - debt growing for too long
          break;
        }
      } else {
        loanDebtGrowthYears = 0; // Reset counter
      }
    }
    
    // PRIORITY 3: Savings
    if (remainingEDI > 0) {
      savingsContribution = remainingEDI;
      
      // Apply growth to existing savings
      const savingsGrowth = savings * SAVINGS_GROWTH_RATE;
      savings = savings + savingsGrowth + savingsContribution;
    }
    
    // === CHECK MORTGAGE READINESS ===
    let mortgageAcquiredThisYear = false;
    if (!hasMortgage && loanDebt === 0) {
      // Check hard rule
      const canGetMortgage = checkMortgageHardRules(profile.hardRules, loanDebt);
      
      if (canGetMortgage) {
        const downPayment = locationData.housing.downPaymentValue;
        const firstYearPayment = locationData.housing.annualMortgagePayment;
        const mortgageThreshold = downPayment + firstYearPayment;
        
        if (savings >= mortgageThreshold) {
          hasMortgage = true;
          mortgageAcquiredThisYear = true;
          savings -= mortgageThreshold;
        }
      }
    }
    
    // === RECORD SNAPSHOT ===
    snapshots.push({
      year: yearStart,
      age: ageThisYear,
      householdType: currentHouseholdType,
      numKids: currentNumKids,
      totalIncome,
      adjustedCOL,
      housingCost,
      totalCOL,
      disposableIncome,
      effectiveDisposableIncome,
      loanDebtStart: loanDebtStartYear,
      loanDebtEnd: loanDebt,
      ccDebtPaid: ccDebtPayment,
      ccDebtPayment,
      loanDebtPayment,
      savingsContribution,
      savingsStart: savings - savingsContribution - (savingsContribution > 0 ? savings * SAVINGS_GROWTH_RATE : 0),
      savingsEnd: savings,
      hasMortgage,
      mortgageAcquiredThisYear,
      kidBornThisYear,
      relationshipStartedThisYear,
    });
    
    // Early exit if mortgage acquired and debt free (accomplished main goals)
    if (hasMortgage && loanDebt === 0 && year > 10) {
      break;
    }
  }
  
  return snapshots;
}

// ===== HELPER FUNCTIONS =====

function findYearWhen(snapshots: YearSnapshot[], condition: (s: YearSnapshot) => boolean): number {
  const found = snapshots.find(condition);
  return found ? found.year : -1;
}

function checkKidHardRules(hardRules: string[], loanDebt: number, hasMortgage: boolean): boolean {
  if (hardRules.includes('debt-before-kids') && loanDebt > 0) return false;
  if (hardRules.includes('mortgage-before-kids') && !hasMortgage) return false;
  // 'kids-asap-viable' doesn't block, it just forces earlier
  return true;
}

function checkMortgageHardRules(hardRules: string[], loanDebt: number): boolean {
  // No blocking hard rules for mortgage
  return true;
}

function classifyViability(
  yearsToMortgage: number,
  yearsToDebtFree: number,
  simulation: YearSnapshot[],
  profile: UserProfile
): ViabilityClass {
  const allocation = profile.disposableIncomeAllocation;
  
  // Check for structural issues
  const hasNegativeDI = simulation.some(s => s.disposableIncome < 0);
  const lastYear = simulation[simulation.length - 1];
  
  if (hasNegativeDI || yearsToMortgage < 0) {
    return 'no-viable-path';
  }
  
  // Very Viable & Stable
  if (yearsToMortgage <= 3 && allocation <= 75 && lastYear.savingsEnd > 0) {
    return 'very-viable-stable';
  }
  
  // Viable
  if (yearsToMortgage <= 5 && allocation <= 75) {
    return 'viable';
  }
  
  // Viable with Higher Allocation
  if (yearsToMortgage <= 8 && allocation >= 70) {
    return 'viable-higher-allocation';
  }
  
  // Viable with Extreme Care
  if (yearsToMortgage <= 12 && allocation >= 80) {
    return 'viable-extreme-care';
  }
  
  // Viable When Renting
  if (yearsToMortgage > 15 && lastYear.disposableIncome > 0) {
    return 'viable-when-renting';
  }
  
  return 'no-viable-path';
}

function calculateMinimumAllocation(profile: UserProfile, locationData: LocationData): number {
  // Binary search for minimum viable allocation
  // This is a simplified version - can be enhanced
  let low = 0;
  let high = 100;
  let result = 100;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const testProfile = { ...profile, disposableIncomeAllocation: mid };
    const testSim = runYearByYearSimulation(testProfile, locationData, 20);
    const yearsToMortgage = findYearWhen(testSim, s => s.hasMortgage);
    
    if (yearsToMortgage > 0 && yearsToMortgage <= 12) {
      result = mid;
      high = mid - 1; // Try lower
    } else {
      low = mid + 1; // Need higher
    }
  }
  
  return result;
}

function calculateHouseProjections(
  profile: UserProfile,
  locationData: LocationData,
  baseSimulation: YearSnapshot[]
): any {
  const targets = [3, 5, 10, 15];
  const projections: any = {};
  
  for (const targetYear of targets) {
    const snapshot = baseSimulation.find(s => s.year === targetYear);
    if (!snapshot) continue;
    
    const savings = snapshot.savingsEnd;
    const downPaymentPercent = locationData.housing.downPaymentPercent;
    const mortgageRate = locationData.housing.mortgageRate;
    
    // Max possible house (savings-based)
    const maxPossibleHousePrice = savings / (downPaymentPercent + 0.0613); // Rough estimate
    
    // Check sustainability
    const annualPayment = maxPossibleHousePrice * 0.0613; // Rough annual payment
    const postMortgageDI = snapshot.totalIncome - (snapshot.adjustedCOL + annualPayment);
    
    const key = targetYear === 3 ? 'threeYears' : 
                targetYear === 5 ? 'fiveYears' :
                targetYear === 10 ? 'tenYears' : 'fifteenYears';
    
    projections[key] = {
      year: targetYear,
      age: snapshot.age,
      totalSavings: savings,
      maxPossibleHousePrice,
      maxSustainableHousePrice: postMortgageDI >= 0 ? maxPossibleHousePrice : locationData.housing.medianHomeValue,
      sustainabilityLimited: postMortgageDI < 0,
      annualMortgagePayment: annualPayment,
      postMortgageDisposableIncome: postMortgageDI,
    };
  }
  
  return projections;
}

function calculateKidViability(profile: UserProfile, locationData: LocationData): any {
  // Simplified kid viability - can be enhanced with full simulation
  return {
    firstKid: { isViable: true, minimumAge: profile.currentAge + 3 },
    secondKid: { isViable: true, minimumAge: profile.currentAge + 6 },
    thirdKid: { isViable: true, minimumAge: profile.currentAge + 9 },
  };
}

function generateRecommendations(
  profile: UserProfile,
  viability: ViabilityClass,
  minAllocation: number,
  yearsToMortgage: number
): string[] {
  const recommendations: string[] = [];
  
  if (viability === 'very-viable-stable') {
    recommendations.push('✅ Excellent financial position - consider investing discretionary income');
    recommendations.push('✅ You can afford to reduce allocation to 50-60% for better quality of life');
  } else if (viability === 'viable') {
    recommendations.push('✅ Solid path to homeownership');
    recommendations.push('💡 Maintain current allocation for best results');
  } else if (viability === 'viable-higher-allocation') {
    recommendations.push('⚠️ Requires disciplined saving');
    recommendations.push(`💡 Minimum allocation needed: ${minAllocation}%`);
  } else if (viability === 'viable-extreme-care') {
    recommendations.push('⚠️ Fragile financial situation');
    recommendations.push('💡 Consider increasing income or reducing expenses');
    recommendations.push('💡 Build emergency fund before pursuing homeownership');
  }
  
  if (yearsToMortgage > 10) {
    recommendations.push('🏠 Consider alternative locations for faster homeownership');
  }
  
  return recommendations;
}
