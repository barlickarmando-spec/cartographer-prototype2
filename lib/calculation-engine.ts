/**
 * AUTO APPROACH CALCULATION ENGINE - BULLETPROOF VERSION
 * 
 * This engine implements the complete Auto Approach Formula with:
 * - Comprehensive error handling
 * - Edge case protection
 * - Detailed logging
 * - Graceful degradation
 */

import { UserProfile, HouseholdTypeEnum, determineHouseholdType, getAdjustedCOLKey, getRentType, DebtEntry, AnnualExpense } from './onboarding/types';
import { getLocationData, getSalary, LocationData } from './data-extraction';
import { getTypicalHomeValue, getPricePerSqft } from './home-value-lookup';

// ===== CONSTANTS =====
const SAVINGS_GROWTH_RATE = 0.03; // 3% annual growth on savings
const LOAN_DEBT_GROWTH_TOLERANCE = 5; // Allow loan debt to grow for max 5 consecutive years
const NEGATIVE_DI_TOLERANCE = 5; // Allow negative DI for max 5 years before declaring unviable
const MIN_VIABLE_DI = -5000; // Minimum DI before structural failure (very negative)
const MIN_SAVINGS = 0; // Savings cannot go negative
const LARGE_SQFT = 3000; // Threshold for "large" house classification

/** Quick price formatter for internal assumption strings */
function formatPrice(n: number): string {
  return '$' + Math.round(n).toLocaleString();
}

// ===== KIDS-BASED SQFT HELPERS =====

/**
 * Derive the total number of planned kids from the user profile.
 * Includes existing kids + any future kids in plannedKidAges that fall
 * after the current age (i.e. haven't been born yet in the simulation).
 */
function getPlannedKidsCount(profile: UserProfile): number {
  if (profile.kidsPlan === 'no') return 0;

  const existingKids = profile.numKids || 0;

  // plannedKidAges may include ages for kids that are already accounted for
  // via numKids. Count only planned ages beyond existing kids.
  const futureKids = profile.plannedKidAges
    ? Math.max(0, profile.plannedKidAges.length - existingKids)
    : 0;

  // For 'unsure', assume at least 1 if no ages are specified
  if (profile.kidsPlan === 'unsure' && existingKids === 0 && futureKids === 0) {
    return 1;
  }

  return existingKids + futureKids;
}

/**
 * Return the recommended minimum sqft for a household based on how many
 * kids they plan to have (or already have).
 *
 *   0 kids → 1,200 sqft  (single / couple)
 *   1 kid  → 1,600 sqft
 *   2 kids → 2,200 sqft  (matches the old fixed baseline)
 *   3+ kids→ 2,600 sqft
 */
function getRequiredSqFt(plannedKids: number): number {
  if (plannedKids <= 0) return 1200;
  if (plannedKids === 1) return 1600;
  if (plannedKids === 2) return 2200;
  return 2600; // 3+
}

/**
 * Target sqft for the "fastest to homeownership" projection.
 * These are the minimum livable targets for the quickest ownership path.
 *
 *   0 kids → 1,600 sqft
 *   1 kid  → 1,800 sqft
 *   2+ kids→ 2,200 sqft
 */
function getFastestHomeownershipSqFt(plannedKids: number): number {
  if (plannedKids <= 0) return 1600;
  if (plannedKids === 1) return 1800;
  return 2200; // 2+
}

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
  savingsNoMortgage: number; // Hypothetical savings if no house was ever purchased (for projections)
  
  // Mortgage
  hasMortgage: boolean;
  mortgageAcquiredThisYear: boolean;
  
  // Life Events
  kidBornThisYear: number;
  relationshipStartedThisYear: boolean;

  // Annual expenses injected into COL
  annualExpensesTotal: number;

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
  
  // Viability (Layer 1 — Structural Tier)
  viabilityClassification: ViabilityClass;
  isViable: boolean;
  minimumAllocationRequired: number;

  // Numeric Score (Layer 2 — Precision 0-10)
  numericScore: number;

  // House Size Classification (Layer 3 — Relative to Median)
  houseClassification: HouseSizeClassification;

  // Kids-based sqft analysis
  requiredSqFt: number;            // Sqft the family needs based on planned kids
  largeSqFt: number;               // Threshold for "large" house (LARGE_SQFT constant)
  requiredHousePrice: number;      // Price of a requiredSqFt home in this location
  largeHousePrice: number;         // Price of a LARGE_SQFT home in this location
  projectedSqFt: number;           // Projected affordable sqft (from best projection)
  sqFtViable: boolean;             // Can they afford at least requiredSqFt?
  houseTag: string;                // Human-readable house size label
  assumptions: string[];           // Key assumptions used in the calculation
  baselineSqFtLabel: string;       // Dynamic label replacing "2,200 sqft" (e.g. "1,600 sqft for 1-kid family")

  // Fastest to homeownership
  fastestHomeSqFt: number;           // Target sqft for fastest path (1600/1800/2200)
  fastestHomeProjection: HouseProjection | null; // Projection for fastest path

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
    maxAffordable: HouseProjection | null;
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

export type HouseSizeClassification =
  | 'very-viable-stable-large-house'
  | 'viable-large-house'
  | 'viable-medium-house'
  | 'very-viable-stable-medium-house'
  | 'somewhat-viable-small-house';

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
    
    // Pre-compute kid viability to find minimum viable ages
    // When kids-asap-viable is selected, use these ages as hard birth dates
    const kidViability = calculateKidViability(profile, locationData);
    const hasAsapRule = profile.hardRules && profile.hardRules.includes('kids-asap-viable');

    let simProfile = profile;
    if (hasAsapRule && profile.kidsPlan !== 'no') {
      const viableAges: number[] = [];
      if (kidViability.firstKid.isViable && kidViability.firstKid.minimumAge != null) {
        viableAges.push(kidViability.firstKid.minimumAge);
      }
      if (kidViability.secondKid.isViable && kidViability.secondKid.minimumAge != null) {
        viableAges.push(kidViability.secondKid.minimumAge);
      }
      if (kidViability.thirdKid.isViable && kidViability.thirdKid.minimumAge != null) {
        viableAges.push(kidViability.thirdKid.minimumAge);
      }
      if (viableAges.length > 0) {
        simProfile = {
          ...profile,
          plannedKidAges: viableAges,
          declaredKidCount: viableAges.length,
        };
      }
    }

    // Run year-by-year simulation
    console.log(`Starting simulation for ${locationName}, ${simulationYears} years`);
    const simulation = runYearByYearSimulation(simProfile, locationData, simulationYears);
    
    if (simulation.snapshots.length === 0) {
      return createErrorResult(locationName, locationData, 'Simulation produced no results');
    }
    
    // Analyze results
    const yearsToDebtFree = findYearWhen(simulation.snapshots, s => s.loanDebtEnd === 0);
    const yearsToMortgage = findYearWhen(simulation.snapshots, s => s.hasMortgage);
    
    const ageDebtFree = yearsToDebtFree > 0 ? profile.currentAge + yearsToDebtFree : -1;
    const ageMortgageAcquired = yearsToMortgage > 0 ? profile.currentAge + yearsToMortgage : -1;
    
    // House size projections (computed first — needed by unified viability)
    const houseProjections = calculateHouseProjections(profile, locationData, simulation.snapshots);

    // Minimum allocation required (needed for viability classification)
    const minAllocation = calculateMinimumAllocation(profile, locationData);

    // Location-specific pricing
    const locationPricePerSqft = getPricePerSqft(locationName);

    // Kids-based sqft thresholds
    const plannedKids = getPlannedKidsCount(profile);
    const requiredSqFt = getRequiredSqFt(plannedKids);
    const largeSqFt = LARGE_SQFT;
    const requiredHousePrice = requiredSqFt * locationPricePerSqft;
    const largeHousePrice = largeSqFt * locationPricePerSqft;

    // Best projected price (for sqft analysis)
    const bestProjection = houseProjections.maxAffordable
      || houseProjections.fifteenYears
      || houseProjections.tenYears
      || houseProjections.fiveYears
      || houseProjections.threeYears;
    const projectedMaxPrice = bestProjection?.maxSustainableHousePrice ?? 0;
    const projectedSqFt = locationPricePerSqft > 0 ? projectedMaxPrice / locationPricePerSqft : 0;

    // Unified viability + house size classification (benchmarked against kids-based required home)
    let { viability, houseClassification, sqFtViable, houseTag } = classifyViabilityAndHouseSize(
      yearsToMortgage, simulation.snapshots, profile, minAllocation,
      houseProjections, locationPricePerSqft, requiredHousePrice, largeHousePrice, requiredSqFt
    );

    // Kid viability (already computed above, before main simulation)

    // Numeric Score (0-10 precision) — now includes Home Size Fit component
    const numericScore = calculateNumericScore(
      viability, yearsToMortgage, simulation.snapshots, minAllocation,
      kidViability, projectedMaxPrice, requiredHousePrice
    );

    // Build assumptions list
    const assumptions: string[] = [
      `Family needs ${requiredSqFt.toLocaleString()} sqft (${plannedKids} kid${plannedKids !== 1 ? 's' : ''} planned)`,
      `Location price: ~$${locationPricePerSqft}/sqft`,
      `Required home price: ${formatPrice(requiredHousePrice)}`,
    ];
    if (projectedMaxPrice > 0) {
      assumptions.push(`Projected max affordable: ${formatPrice(projectedMaxPrice)} (~${Math.round(projectedSqFt).toLocaleString()} sqft)`);
    }

    // Dynamic baseline label (replaces hardcoded "2,200 sqft")
    const baselineSqFtLabel = `${requiredSqFt.toLocaleString()} sqft`;

    // === FASTEST TO HOMEOWNERSHIP ===
    const fastestHomeSqFt = getFastestHomeownershipSqFt(plannedKids);
    const fastestHomeProjection = calculateFastestToTarget(
      fastestHomeSqFt, locationPricePerSqft, profile, locationData, simulation.snapshots
    );

    // === STRICT NON-VIABLE CHECK: "unsure" about kids → account for 1 kid ===
    // If user is "unsure" about kids and not already flagged as no-viable-path,
    // check if adding 1 kid would put them in the red (COL > income).
    if (viability !== 'no-viable-path' && profile.kidsPlan === 'unsure' && (profile.numKids || 0) === 0) {
      // Determine household type with 1 kid
      const relStatus = profile.relationshipStatus === 'linked' ? 'linked' : 'single';
      const withKidHousehold = determineHouseholdType(relStatus as any, profile.numEarners, 1);
      const colKeyWithKid = getAdjustedCOLKey(withKidHousehold);
      const adjustedCOLWithKid = locationData.adjustedCOL[colKeyWithKid] || 0;

      // Check if COL with 1 kid + housing exceeds income
      const year1Income = simulation.snapshots[0]?.totalIncome ?? 0;
      const year1Housing = simulation.snapshots[0]?.housingCost ?? 0;
      const totalCOLWithKid = adjustedCOLWithKid + year1Housing;

      if (totalCOLWithKid > year1Income) {
        // Adding 1 kid would put them in the red
        viability = 'no-viable-path' as ViabilityClass;
      }
    }

    // Generate recommendations and warnings (now sqft-aware)
    const recommendations = generateRecommendations(
      profile, viability, minAllocation, yearsToMortgage, simulation.snapshots,
      sqFtViable, requiredSqFt, Math.round(projectedSqFt)
    );
    const warnings = generateWarnings(
      profile, simulation.snapshots, viability,
      sqFtViable, requiredSqFt, Math.round(projectedSqFt)
    );

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
      numericScore,
      houseClassification,
      requiredSqFt,
      largeSqFt,
      requiredHousePrice: Math.round(requiredHousePrice),
      largeHousePrice: Math.round(largeHousePrice),
      projectedSqFt: Math.round(projectedSqFt),
      sqFtViable,
      houseTag,
      assumptions,
      baselineSqFtLabel,
      fastestHomeSqFt,
      fastestHomeProjection,
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

  // Merge all non-CC debts (student loans + car + other) into one loan pool with blended rate
  const initialStudentDebt = profile.studentLoanDebt || 0;
  const initialCarDebt = profile.carDebt || 0;
  const initialOtherDebt = profile.otherDebt || 0;
  const totalNonCCDebt = initialStudentDebt + initialCarDebt + initialOtherDebt;
  const blendedLoanRate = totalNonCCDebt > 0
    ? (initialStudentDebt * (profile.studentLoanRate || 0.05) +
       initialCarDebt * (profile.carDebtRate || 0.07) +
       initialOtherDebt * (profile.otherDebtRate || 0.06)) / totalNonCCDebt
    : (profile.studentLoanRate || 0.05);
  let loanDebt = totalNonCCDebt;
  let effectiveLoanRate = blendedLoanRate;

  let savings = Math.max(0, profile.currentSavings); // Ensure non-negative
  let hasMortgage = false;
  let savingsNoMortgage = Math.max(0, profile.currentSavings); // Hypothetical savings if no house is ever purchased
  let currentHouseholdType = profile.householdType;
  let currentNumKids = profile.numKids || 0;
  let currentNumEarners = profile.numEarners;

  // Debt tracking
  let loanDebtGrowthYears = 0;
  let negativeDIYears = 0;

  // CC debt tracking — mutable so conditional CC debts can increase the refresh amount
  let ccDebtAmount = profile.creditCardDebt || 0;
  const ccRefreshYears = Math.max(1, Math.round((profile.creditCardRefreshMonths || 36) / 12));

  // Conditional debt tracking
  const activeConditionalDebts = new Set<number>();
  let lastYearScore = 5; // Assume viable initially for onlyIfViable checks
  
  // Relationship tracking
  let relationshipStarted = profile.relationshipStatus === 'linked';
  const plannedRelationshipAge = profile.plannedRelationshipAge || 
    (profile.relationshipPlans === 'yes' || profile.relationshipPlans === 'unsure' 
      ? (profile.currentAge + 5) 
      : undefined);
  
  // Pre-calculate mortgage costs using proper mortgage formula (not pre-calculated location data)
  // This ensures TotalCOL = nonHousingCOL + housingCost with proper mortgage math
  // Use typical home value (2,200 sqft house) from our price-per-sqft data as the target
  const typicalValue = getTypicalHomeValue(locationData.name);
  const medianHomePrice = typicalValue > 0 ? typicalValue : (locationData.housing.medianHomeValue || 0);
  const downPaymentPct = locationData.housing.downPaymentPercent || 0.107;
  const mortgageRateVal = locationData.housing.mortgageRate || 0.065;
  const annualCostFac = calculateAnnualCostFactor(mortgageRateVal, downPaymentPct);
  const medianDownPayment = medianHomePrice * downPaymentPct;
  const medianAnnualPayment = calculateTotalAnnualCosts(medianHomePrice, downPaymentPct, annualCostFac);

  // State for chosen house after mortgage acquisition
  // housePriceChosen and its annual payment are set at acquisition time
  let chosenHousePrice = 0;
  let calculatedAnnualMortgagePayment = 0;

  // === YEAR 1 SAVINGS WATERFALL ===
  // Apply initial savings to debts in priority order: CC → loans → remainder stays as savings
  if (savings > 0 && ccDebtAmount > 0) {
    const ccPayoff = Math.min(savings, ccDebtAmount);
    savings -= ccPayoff;
    ccDebtAmount -= ccPayoff;
    console.log(`Savings waterfall: Paid $${ccPayoff} CC debt, remaining savings: $${savings}`);
  }
  if (savings > 0 && loanDebt > 0) {
    const loanPayoff = Math.min(savings, loanDebt);
    savings -= loanPayoff;
    loanDebt -= loanPayoff;
    console.log(`Savings waterfall: Paid $${loanPayoff} loan debt, remaining savings: $${savings}`);
  }
  savingsNoMortgage = savings; // Update hypothetical savings to match

  console.log('Starting simulation with:', {
    currentAge,
    loanDebt,
    savings,
    householdType: currentHouseholdType,
    numKids: currentNumKids,
    numEarners: currentNumEarners,
    medianHomePrice: Math.round(medianHomePrice),
    formulaDownPayment: Math.round(medianDownPayment),
    formulaAnnualPayment: Math.round(medianAnnualPayment),
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
    const maxPlannedKids = Math.min(3, profile.declaredKidCount || (profile.plannedKidAges?.length || 0));
    const hasAsapRule = profile.hardRules && profile.hardRules.includes('kids-asap-viable');
    const canHaveKidByRules = checkKidHardRules(profile.hardRules, loanDebt, hasMortgage, ccDebtAmount);

    if (hasAsapRule && profile.plannedKidAges && profile.plannedKidAges.length > 0) {
      // kids-asap-viable: birth kids at pre-computed minimum viable ages unconditionally
      // (viable ages were injected by calculateAutoApproach from kidViability results)
      const kidsScheduled = profile.plannedKidAges.filter(age => age <= ageThisYear).length;
      if (kidsScheduled > currentNumKids && currentNumKids < 3) {
        currentNumKids++;
        kidBornThisYear = currentNumKids;
        const relStatus = relationshipStarted ? 'linked' : 'single';
        currentHouseholdType = determineHouseholdType(relStatus as any, currentNumEarners, currentNumKids);
        debugNotes.push(`Kid #${kidBornThisYear} born at age ${ageThisYear} (kids-asap-viable)`);
      }
    } else if (profile.plannedKidAges && profile.plannedKidAges.length > 0) {
      // Standard path: check if a kid is scheduled at or after planned age
      // kidsOwed tracks kids whose planned age has passed but were blocked by hard rules
      const kidsOwed = profile.plannedKidAges.filter(age => age <= ageThisYear).length - currentNumKids;
      if (kidsOwed > 0 && currentNumKids < 3) {
        if (canHaveKidByRules) {
          currentNumKids++;
          kidBornThisYear = currentNumKids;
          const relStatus = relationshipStarted ? 'linked' : 'single';
          currentHouseholdType = determineHouseholdType(relStatus as any, currentNumEarners, currentNumKids);
          const wasDeferred = !profile.plannedKidAges.includes(ageThisYear);
          debugNotes.push(`Kid #${kidBornThisYear} born at age ${ageThisYear}${wasDeferred ? ' (deferred by hard rules)' : ''}`);
        } else {
          debugNotes.push(`Kid deferred by hard rules at age ${ageThisYear}`);
        }
      }
    }

    // === CONDITIONAL DEBT INJECTION ===
    // Check conditional debts and activate them when conditions are met
    for (let i = 0; i < (profile.conditionalDebts || []).length; i++) {
      if (activeConditionalDebts.has(i)) continue; // Already activated
      const debt = profile.conditionalDebts[i];
      if (debt.startAge && ageThisYear < debt.startAge) continue;
      if (debt.onlyAfterDebtFree && loanDebt > 0) continue;
      if (debt.onlyIfViable && lastYearScore < 5) continue;

      // Activate this debt
      activeConditionalDebts.add(i);
      if (debt.type === 'cc-debt') {
        // CC debts increase the refresh amount
        ccDebtAmount += debt.totalDebt;
        debugNotes.push(`Conditional CC debt activated: ${debt.label || 'CC'} $${debt.totalDebt}`);
      } else {
        // Non-CC debts merge into loan pool with blended rate
        const oldTotal = loanDebt;
        const oldRate = effectiveLoanRate;
        loanDebt += debt.totalDebt;
        effectiveLoanRate = loanDebt > 0
          ? (oldTotal * oldRate + debt.totalDebt * (debt.interestRate || 0.06)) / loanDebt
          : oldRate;
        debugNotes.push(`Conditional debt activated: ${debt.label || debt.type} $${debt.totalDebt} at ${(debt.interestRate * 100).toFixed(1)}%`);
      }
    }

    // === CALCULATE INCOME ===
    // Salary override: use user's known salary for their current location, location averages elsewhere
    const userIncome = (profile.currentSalaryOverride && locationData.displayName === profile.currentSalaryLocation)
      ? profile.currentSalaryOverride
      : getSalary(locationData.name, profile.userOccupation, profile.userSalary);
    let partnerIncome = 0;
    
    if (currentNumEarners === 2) {
      if (profile.partnerOccupation) {
        // Use partner salary override for current location, location averages elsewhere
        const partnerSalaryForLocation = (profile.partnerSalary && locationData.displayName === profile.currentSalaryLocation)
          ? profile.partnerSalary
          : getSalary(locationData.name, profile.partnerOccupation, undefined);
        partnerIncome = partnerSalaryForLocation;
        debugNotes.push(`Partner income from occupation: $${partnerIncome}`);
      } else if (profile.partnerSalary) {
        // Partner salary provided directly without occupation
        partnerIncome = profile.partnerSalary;
        debugNotes.push(`Partner income from manual salary: $${partnerIncome}`);
      } else if (profile.usePartnerIncomeDoubling || relationshipStarted) {
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
    const baseCOL = locationData.adjustedCOL[colKey] || 0;

    // Add annual expenses (conditional on age, debt-free status, and viability)
    let annualExpensesTotal = 0;
    for (const expense of profile.annualExpenses || []) {
      if (expense.startAge && ageThisYear < expense.startAge) continue;
      if (expense.onlyAfterDebtFree && loanDebt > 0) continue;
      if (expense.onlyIfViable && lastYearScore < 5) continue;
      annualExpensesTotal += expense.annualCost;
    }
    const adjustedCOL = baseCOL + annualExpensesTotal;
    if (annualExpensesTotal > 0) {
      debugNotes.push(`Annual expenses: $${annualExpensesTotal} added to COL`);
    }

    // Housing cost: rent BEFORE mortgage, calculated mortgage payment AFTER
    // HARD LOCK: housingCost is ALWAYS rent OR mortgage, NEVER both
    // HARD LOCK: After mortgageActive=true, rent must NEVER be included again
    const bedroomSize = getRentType(currentHouseholdType);
    let housingCost = 0;
    if (hasMortgage) {
      // Use the dynamically calculated mortgage payment for the chosen house
      housingCost = calculatedAnnualMortgagePayment;
      debugNotes.push(`Mortgage payment: $${Math.round(housingCost)} (on $${Math.round(chosenHousePrice)} home)`);
    } else {
      // Rent based on bedroom size for current household type
      if (bedroomSize === '1br') housingCost = locationData.rent.oneBedroomAnnual || 0;
      else if (bedroomSize === '2br') housingCost = locationData.rent.twoBedroomAnnual || 0;
      else housingCost = locationData.rent.threeBedroomAnnual || 0;
      debugNotes.push(`Rent (${bedroomSize}): $${housingCost}`);
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
    if (year % ccRefreshYears === 0 && ccDebtAmount > 0) {
      ccDebtPayment = Math.min(ccDebtAmount, remainingEDI);
      remainingEDI -= ccDebtPayment;
      debugNotes.push(`CC debt payment (refresh cycle): $${ccDebtPayment}`);
    }

    // PRIORITY 2: Loan Debt (all non-CC debts merged into single pool)
    let loanDebtInterest = 0;
    if (loanDebt > 0) {
      // Calculate interest using blended rate — CRITICAL: Ensure rate is decimal (0.065, not 6.5)
      const interestRate = effectiveLoanRate;
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
          const totalDebtGrowth = totalNonCCDebt > 0
            ? (loanDebt - totalNonCCDebt) / totalNonCCDebt
            : 0;

          if (totalDebtGrowth > 0.5) {
            // Debt grew by 50%+ - truly unsustainable
            console.log(`Stopping: Debt grew from $${totalNonCCDebt.toFixed(0)} to $${loanDebt.toFixed(0)} (${(totalDebtGrowth * 100).toFixed(0)}% growth)`);
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
    // Per algorithm: savings = savings * (1 + savingsGrowthRate) + remainingEDI
    // Growth applies ALWAYS (even if no new contribution), then add remaining EDI
    const savingsStartYear = savings;
    savingsContribution = Math.max(0, remainingEDI);
    const savingsGrowth = savings * SAVINGS_GROWTH_RATE;
    savings = savings + savingsGrowth + savingsContribution;

    debugNotes.push(
      `Savings: $${savingsStartYear.toFixed(0)} + $${savingsGrowth.toFixed(0)} growth + ` +
      `$${savingsContribution.toFixed(0)} contribution = $${savings.toFixed(0)}`
    );

    // Ensure savings never go negative
    savings = Math.max(MIN_SAVINGS, savings);

    // === TRACK NO-MORTGAGE SAVINGS (for house projections) ===
    // House projections answer "if you saved X years without buying, what could you afford?"
    // Before mortgage acquisition, both paths are identical.
    // After mortgage acquisition, this path continues with rent instead of mortgage.
    if (!hasMortgage) {
      // Pre-mortgage: both paths are identical (both paying rent, same debt, same savings)
      savingsNoMortgage = savings;
    } else {
      // Post-mortgage: compute what savings would be if still renting
      // Debt is 0 (mortgage requires loanDebt === 0), so all EDI goes to savings
      const rentTypeNM = getRentType(currentHouseholdType);
      let rentCostNM = 0;
      if (rentTypeNM === '1br') rentCostNM = locationData.rent.oneBedroomAnnual || 0;
      else if (rentTypeNM === '2br') rentCostNM = locationData.rent.twoBedroomAnnual || 0;
      else rentCostNM = locationData.rent.threeBedroomAnnual || 0;

      const nmDI = totalIncome - (adjustedCOL + rentCostNM);
      const nmEDI = Math.max(0, nmDI * (profile.disposableIncomeAllocation / 100));
      const nmGrowth = savingsNoMortgage * SAVINGS_GROWTH_RATE;
      savingsNoMortgage = savingsNoMortgage + nmGrowth + nmEDI;
      savingsNoMortgage = Math.max(MIN_SAVINGS, savingsNoMortgage);
    }

    // === CHECK MORTGAGE READINESS ===
    // Mortgage acquisition: when savings >= downPayment + firstYearPayment (formula-calculated)
    // housePriceChosen = median home price for this location
    // After this point, rent must NEVER be used again
    let mortgageAcquiredThisYear = false;
    if (!hasMortgage && loanDebt === 0) {
      const canGetMortgage = checkMortgageHardRules(profile.hardRules, loanDebt);

      if (canGetMortgage && medianHomePrice > 0) {
        // Use formula-calculated mortgage costs (not pre-calculated location data values)
        // required = downPaymentPercent * housePriceChosen + annualMortgagePayment(housePriceChosen)
        const mortgageThreshold = medianDownPayment + medianAnnualPayment;

        if (savings >= mortgageThreshold && mortgageThreshold > 0) {
          hasMortgage = true;
          mortgageAcquiredThisYear = true;
          chosenHousePrice = medianHomePrice;
          calculatedAnnualMortgagePayment = medianAnnualPayment;
          savings -= mortgageThreshold;
          savings = Math.max(MIN_SAVINGS, savings);
          debugNotes.push(
            `MORTGAGE ACQUIRED! House: $${Math.round(chosenHousePrice)}, ` +
            `Down payment: $${Math.round(medianDownPayment)} (${(downPaymentPct * 100).toFixed(1)}%), ` +
            `Annual payment: $${Math.round(medianAnnualPayment)}, ` +
            `Remaining savings: $${Math.round(savings)}`
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
      savingsNoMortgage,
      hasMortgage,
      mortgageAcquiredThisYear,
      kidBornThisYear,
      relationshipStartedThisYear,
      annualExpensesTotal,
      debugNotes,
    });

    // Update lastYearScore for conditional debt/expense checks in the next iteration
    // Quick heuristic: positive DI + savings growing = likely viable (score >= 5)
    if (disposableIncome < 0) {
      lastYearScore = Math.max(0, lastYearScore - 2);
    } else if (savings > savingsStartYear && loanDebt <= loanDebtStartYear) {
      lastYearScore = Math.min(10, lastYearScore + 1);
    }

    // === EARLY EXIT CONDITIONS ===
    
    // Success condition: Main goals achieved
    if (hasMortgage && loanDebt === 0 && year >= 15) {
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

function checkKidHardRules(hardRules: string[], loanDebt: number, hasMortgage: boolean, ccDebt: number = 0): boolean {
  if (!hardRules || hardRules.length === 0 || hardRules.includes('none')) {
    return true; // No restrictions
  }

  // debt-before-kids: check ALL active debt (not just student loans)
  const totalDebt = loanDebt + ccDebt;
  if (hardRules.includes('debt-before-kids') && totalDebt > 0) {
    return false; // Must pay off ALL debt first
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
 * Downgrade a viability tier by one level.
 * Used when the sqft gate shows the user can't afford the required house size.
 */
function downgradeTier(tier: ViabilityClass): ViabilityClass {
  switch (tier) {
    case 'very-viable-stable': return 'viable';
    case 'viable': return 'viable-extreme-care';
    case 'viable-higher-allocation': return 'viable-extreme-care';
    case 'viable-extreme-care': return 'viable-when-renting';
    case 'viable-when-renting': return 'viable-when-renting'; // Never downgrade below renting — no-viable-path is reserved for truly "in the red"
    case 'no-viable-path': return 'no-viable-path';
  }
}

/**
 * Derive a human-readable house tag from projected sqft vs. required sqft.
 */
function deriveHouseTag(projectedSqft: number, requiredSqFt: number, largeSqFt: number): string {
  if (projectedSqft >= largeSqFt) return 'Spacious Family Home';
  if (projectedSqft >= requiredSqFt) return 'Right-Sized for Your Family';
  if (projectedSqft >= 1000) return 'Cozy Starter Home';
  if (projectedSqft > 0) return 'Compact Living';
  return 'Unknown';
}

/**
 * Unified viability + house size classification using kids-based sqft
 * thresholds as the core benchmark.
 *
 * Instead of a fixed 2,200 sqft / typicalHomeValue, the benchmark is now
 * `requiredHousePrice` (price of a house matching the family's needs)
 * and `largeHousePrice` (price of a LARGE_SQFT house).
 *
 *   • CAN afford requiredHousePrice → viability determined by timeline
 *   • CANNOT afford required        → viability DOWNGRADED via downgradeTier()
 *
 * House size classification remains sqft-based:
 *   Small:  < requiredSqFt
 *   Medium: requiredSqFt – LARGE_SQFT
 *   Large:  > LARGE_SQFT
 *
 * Guardrail: Large house label blocked if post-mortgage margin < 5% income
 */
function classifyViabilityAndHouseSize(
  yearsToMortgage: number,
  simulation: YearSnapshot[],
  profile: UserProfile,
  minRequiredAllocation: number,
  houseProjections: {
    threeYears: HouseProjection | null;
    fiveYears: HouseProjection | null;
    tenYears: HouseProjection | null;
    fifteenYears: HouseProjection | null;
    maxAffordable: HouseProjection | null;
  },
  pricePerSqft: number,
  requiredHousePrice: number,
  largeHousePrice: number,
  requiredSqFt: number
): { viability: ViabilityClass; houseClassification: HouseSizeClassification; sqFtViable: boolean; houseTag: string } {
  const userAllocation = profile.disposableIncomeAllocation;
  const hasNegativeDI = simulation.some(s => s.disposableIncome < 0);
  const lastYear = simulation[simulation.length - 1];

  // --- Projected house price & sqft ---
  const bestProjection = houseProjections.maxAffordable
    || houseProjections.fifteenYears
    || houseProjections.tenYears
    || houseProjections.fiveYears
    || houseProjections.threeYears;
  const projectedPrice = bestProjection?.maxSustainableHousePrice ?? 0;
  const projectedSqft = pricePerSqft > 0 ? projectedPrice / pricePerSqft : 0;
  const canAffordRequired = requiredHousePrice > 0 && projectedPrice >= requiredHousePrice;
  const sqFtViable = projectedSqft >= requiredSqFt;
  const houseTag = deriveHouseTag(projectedSqft, requiredSqFt, LARGE_SQFT);

  // --- House size classification (pure sqft) ---
  let largeHouseBlocked = false;
  if (projectedSqft > LARGE_SQFT && bestProjection && simulation.length > 0) {
    let worstIncome = Infinity;
    let worstCOL = 0;
    for (const snap of simulation) {
      if (snap.totalIncome > 0 && snap.totalIncome < worstIncome) {
        worstIncome = snap.totalIncome;
        worstCOL = snap.adjustedCOL;
      }
    }
    if (worstIncome < Infinity) {
      const margin = worstIncome - worstCOL - bestProjection.sustainableAnnualPayment;
      if (margin < worstIncome * 0.05) largeHouseBlocked = true;
    }
  }

  let houseClassification: HouseSizeClassification;
  if (!largeHouseBlocked && projectedSqft > LARGE_SQFT && yearsToMortgage > 0 && yearsToMortgage <= 5 && userAllocation <= 75) {
    houseClassification = 'very-viable-stable-large-house';
  } else if (!largeHouseBlocked && projectedSqft > LARGE_SQFT) {
    houseClassification = 'viable-large-house';
  } else if (projectedSqft >= 1501 && yearsToMortgage > 0 && yearsToMortgage <= 6) {
    houseClassification = 'very-viable-stable-medium-house';
  } else if (projectedSqft >= 1501) {
    houseClassification = 'viable-medium-house';
  } else {
    houseClassification = 'somewhat-viable-small-house';
  }

  // --- "In the red" check: strictly COL > income ---
  // Count years where disposable income is negative (losing money)
  const negDIYears = simulation.filter(s => s.disposableIncome < 0).length;
  const firstYearNegative = simulation.length > 0 && simulation[0].disposableIncome < 0;
  // Truly "in the red" = first year is negative OR majority of years are negative
  const isInTheRed = firstYearNegative || (negDIYears > simulation.length * 0.5);

  // --- Structural failure ---
  if (!lastYear) {
    return { viability: 'no-viable-path', houseClassification: 'somewhat-viable-small-house', sqFtViable: false, houseTag: 'Unknown' };
  }

  // --- Never achieves mortgage ---
  if (yearsToMortgage < 0) {
    // Only "no-viable-path" if truly in the red (losing money)
    if (isInTheRed) {
      return { viability: 'no-viable-path', houseClassification, sqFtViable, houseTag };
    }
    return { viability: 'viable-when-renting', houseClassification, sqFtViable, houseTag };
  }

  // --- Allocation below minimum ---
  if (userAllocation < minRequiredAllocation - 3 && minRequiredAllocation < 100) {
    return { viability: 'viable-higher-allocation', houseClassification, sqFtViable, houseTag };
  }

  // --- CAN afford the required home ---
  if (canAffordRequired) {
    let tier: ViabilityClass;
    if (yearsToMortgage <= 3 && lastYear.savingsEnd > 0) {
      tier = 'very-viable-stable';
    } else if (yearsToMortgage <= 8) {
      tier = 'viable';
    } else if (yearsToMortgage <= 12) {
      tier = 'viable-extreme-care';
    } else {
      tier = 'viable-when-renting';
    }
    return { viability: tier, houseClassification, sqFtViable, houseTag };
  }

  // --- CANNOT afford required home — viability downgraded via sqft gate ---

  // Medium house (1,501+ sqft): still viable but tighter thresholds, then downgrade
  if (projectedSqft >= 1501) {
    let tier: ViabilityClass;
    if (yearsToMortgage <= 5) {
      tier = 'viable';
    } else if (yearsToMortgage <= 10) {
      tier = 'viable-extreme-care';
    } else {
      tier = 'viable-when-renting';
    }
    // Apply sqft gate: downgrade because they can't meet their family's sqft needs
    return { viability: downgradeTier(tier), houseClassification, sqFtViable, houseTag };
  }

  // Small house (1,000-1,500 sqft): viable only with extreme care, then downgrade
  if (projectedSqft >= 1000) {
    let tier: ViabilityClass;
    if (yearsToMortgage <= 8) {
      tier = 'viable-extreme-care';
    } else {
      tier = 'viable-when-renting';
    }
    return { viability: downgradeTier(tier), houseClassification, sqFtViable, houseTag };
  }

  // Very small (< 1,000 sqft): essentially renting territory
  // Only no-viable-path if truly in the red
  if (isInTheRed) {
    return { viability: 'no-viable-path', houseClassification, sqFtViable, houseTag };
  }
  return { viability: 'viable-when-renting', houseClassification, sqFtViable, houseTag };
}

// Keep backward-compatible wrappers for exports
function classifyViability(
  yearsToMortgage: number,
  _yearsToDebtFree: number,
  simulation: YearSnapshot[],
  profile: UserProfile,
  minRequiredAllocation: number
): ViabilityClass {
  // Stub — only used by exports; real logic is in classifyViabilityAndHouseSize
  const lastYear = simulation[simulation.length - 1];
  const hasNegativeDI = simulation.some(s => s.disposableIncome < 0);
  if (!lastYear) return 'no-viable-path';
  if (yearsToMortgage < 0) {
    return (lastYear.disposableIncome > 0 && !hasNegativeDI) ? 'viable-when-renting' : 'no-viable-path';
  }
  if (profile.disposableIncomeAllocation < minRequiredAllocation - 3 && minRequiredAllocation < 100) return 'viable-higher-allocation';
  if (yearsToMortgage <= 3 && lastYear.savingsEnd > 0) return 'very-viable-stable';
  if (yearsToMortgage <= 8) return 'viable';
  if (yearsToMortgage <= 12) return 'viable-extreme-care';
  if (lastYear.disposableIncome > 0) return 'viable-when-renting';
  return 'no-viable-path';
}

function classifyHouseSize(
  houseProjections: { threeYears: HouseProjection | null; fiveYears: HouseProjection | null; tenYears: HouseProjection | null; fifteenYears: HouseProjection | null; maxAffordable: HouseProjection | null },
  pricePerSqft: number,
  yearsToMortgage: number,
  allocationPercent: number,
  simulation: YearSnapshot[]
): HouseSizeClassification {
  const bestProjection = houseProjections.maxAffordable || houseProjections.fifteenYears || houseProjections.tenYears || houseProjections.fiveYears || houseProjections.threeYears;
  const projectedSqft = pricePerSqft > 0 ? (bestProjection?.maxSustainableHousePrice ?? 0) / pricePerSqft : 0;
  if (projectedSqft > 3000 && yearsToMortgage > 0 && yearsToMortgage <= 5 && allocationPercent <= 75) return 'very-viable-stable-large-house';
  if (projectedSqft > 3000) return 'viable-large-house';
  if (projectedSqft >= 1501 && yearsToMortgage > 0 && yearsToMortgage <= 6) return 'very-viable-stable-medium-house';
  if (projectedSqft >= 1501) return 'viable-medium-house';
  return 'somewhat-viable-small-house';
}

/**
 * Calculate numeric viability score (0-10) using 5 weighted components:
 *   Structural Stability (0-4) + Mortgage Speed (0-2) + Allocation Pressure (0-2)
 *   + Resilience (0-2) + Home Size Fit (-1.0 to +1.7)
 *
 * The 5th component (Home Size Fit) adjusts the score based on how well the
 * projected max affordable house price covers the family's required house price.
 */
function calculateNumericScore(
  viability: ViabilityClass,
  yearsToMortgage: number,
  simulation: YearSnapshot[],
  minRequiredAllocation: number,
  kidViability: { firstKid: KidViabilityResult; secondKid: KidViabilityResult; thirdKid: KidViabilityResult },
  projectedMaxPrice: number,
  requiredHousePrice: number
): number {
  const lastYear = simulation[simulation.length - 1];

  // === Structural Stability (0-4) ===
  let structural = 0;
  switch (viability) {
    case 'no-viable-path': structural = 0; break;
    case 'viable-when-renting': structural = 1; break;
    case 'viable-extreme-care': structural = 2; break;
    case 'viable-higher-allocation':
    case 'viable': structural = 3; break;
    case 'very-viable-stable':
      structural = (lastYear && lastYear.savingsEnd > 0) ? 4 : 3;
      break;
  }

  // === Mortgage Speed (0-2) ===
  let speed = 0;
  if (yearsToMortgage < 0) {
    speed = 0;
  } else if (yearsToMortgage <= 3) {
    speed = 2;
  } else if (yearsToMortgage <= 5) {
    speed = 1.5;
  } else if (yearsToMortgage <= 7) {
    speed = 1;
  } else if (yearsToMortgage <= 10) {
    speed = 0.5;
  } else {
    speed = 0;
  }

  // === Allocation Pressure (0-2) ===
  let allocation = 0;
  if (minRequiredAllocation <= 70) {
    allocation = 2;
  } else if (minRequiredAllocation <= 75) {
    allocation = 1.5;
  } else if (minRequiredAllocation <= 85) {
    allocation = 1;
  } else if (minRequiredAllocation <= 95) {
    allocation = 0.5;
  } else {
    allocation = 0;
  }

  // === Resilience (0-2) ===
  let resilience = 0;
  const kidsViable = kidViability.firstKid.isViable;
  const savingsGrowing = lastYear && simulation.length > 1
    ? lastYear.savingsEnd > simulation[0].savingsEnd
    : false;

  if (kidsViable && savingsGrowing) {
    resilience = 2;
  } else if (kidsViable) {
    resilience = 1;
  } else {
    resilience = 0;
  }

  // === Home Size Fit (-1.0 to +1.7) ===
  // How well does the projected max price cover the family's required house price?
  let homeSizeFit = 0;
  if (requiredHousePrice > 0 && projectedMaxPrice > 0) {
    const ratio = projectedMaxPrice / requiredHousePrice;
    if (ratio >= 1.5) {
      homeSizeFit = 1.7;  // Can afford 50%+ more than needed
    } else if (ratio >= 1.2) {
      homeSizeFit = 1.3;
    } else if (ratio >= 1.0) {
      homeSizeFit = 1.0;  // Can afford exactly what's needed
    } else if (ratio >= 0.8) {
      homeSizeFit = 0.0;  // A bit short
    } else if (ratio >= 0.5) {
      homeSizeFit = -0.5;
    } else {
      homeSizeFit = -1.0; // Far below required
    }
  } else if (requiredHousePrice > 0) {
    // No projected price at all
    homeSizeFit = -1.0;
  }

  // Clamp 0-10, round to 1 decimal
  const raw = structural + speed + allocation + resilience + homeSizeFit;
  return Math.round(Math.min(10, Math.max(0, raw)) * 10) / 10;
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
  maxAffordable: HouseProjection | null;
} {
  const targets = [3, 5, 10, 15];
  const projections: any = {
    threeYears: null,
    fiveYears: null,
    tenYears: null,
    fifteenYears: null,
    maxAffordable: null,
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
    
    // Use no-mortgage savings: "if you saved X years without buying, what could you afford?"
    const savings = snapshot.savingsNoMortgage;
    const downPaymentPercent = locationData.housing.downPaymentPercent || 0.107;
    const mortgageRate = locationData.housing.mortgageRate || 0.065;
    
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
    // Max house price where annual mortgage fits within the ALLOCATED portion of DI
    // across ALL future years. This accounts for future kids increasing COL - a house
    // affordable at year 5 without kids must still be affordable at year 8+ when kids arrive.
    const allocationPercent = profile.disposableIncomeAllocation / 100;

    // Find the worst-case future year: lowest allocated DI from this year onward
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

    // The max annual payment is the allocated portion of worst-case DI
    const worstCaseDI = worstCaseIncome - worstCaseAdjustedCOL;
    const maxAnnualPayment = Math.max(0, worstCaseDI * allocationPercent);

    // Binary search for max sustainable price using worst-case allocated DI
    let sustainablePrice = 0;
    let low = 0;
    let high = maxPossibleHousePrice * 2; // Search up to 2x savings-based max

    for (let i = 0; i < 20; i++) {
      const mid = (low + high) / 2;
      const annualPayment = calculateTotalAnnualCosts(mid, downPaymentPercent, annualCostFactor);

      if (annualPayment <= maxAnnualPayment) {
        sustainablePrice = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    const sustainableDownPayment = sustainablePrice * downPaymentPercent;
    const sustainableAnnualPayment = calculateTotalAnnualCosts(sustainablePrice, downPaymentPercent, annualCostFactor);
    const postMortgageDisposableIncome = worstCaseDI - sustainableAnnualPayment;
    
    // === FINAL VALUES ===
    // Use the LOWER of savings-based and income-based max — this is what
    // the user can actually afford RIGHT NOW at this point in the timeline.
    const actualMaxPrice = Math.min(maxPossibleHousePrice, sustainablePrice);
    const actualDP = actualMaxPrice * downPaymentPercent;
    const actualAP = calculateTotalAnnualCosts(actualMaxPrice, downPaymentPercent, annualCostFactor);
    const actualPostMortgageDI = worstCaseDI - actualAP;
    const sustainabilityLimited = sustainablePrice < maxPossibleHousePrice;

    projections[key] = {
      year: targetYear,
      age: snapshot.age,
      totalSavings: Math.round(savings),
      maxPossibleHousePrice: Math.round(maxPossibleHousePrice),
      downPaymentRequired: Math.round(actualDP),
      firstYearPaymentRequired: Math.round(actualAP),
      maxSustainableHousePrice: Math.round(actualMaxPrice),
      sustainableDownPayment: Math.round(actualDP),
      sustainableAnnualPayment: Math.round(actualAP),
      postMortgageDisposableIncome: Math.round(actualPostMortgageDI),
      sustainabilityLimited,
      canAfford: true,
    };
  }

  // === MAX AFFORDABLE PROJECTION ===
  // The sustainability ceiling: the absolute max house price your income can ever support,
  // regardless of how long you save. Uses the worst-case (income - adjustedCOL) across
  // ALL simulation years to find the income-based cap.
  if (simulation.length > 0 && locationData.housing) {
    const downPaymentPercent = locationData.housing.downPaymentPercent || 0.107;
    const mortgageRate = locationData.housing.mortgageRate || 0.065;
    const annualCostFactor = calculateAnnualCostFactor(mortgageRate, downPaymentPercent);
    const allocationPercent = profile.disposableIncomeAllocation / 100;

    // Find worst-case (income - adjustedCOL) across entire simulation
    let worstCaseIncome = simulation[0].totalIncome;
    let worstCaseAdjustedCOL = simulation[0].adjustedCOL;
    for (const snap of simulation) {
      const available = snap.totalIncome - snap.adjustedCOL;
      const currentWorst = worstCaseIncome - worstCaseAdjustedCOL;
      if (available < currentWorst) {
        worstCaseIncome = snap.totalIncome;
        worstCaseAdjustedCOL = snap.adjustedCOL;
      }
    }

    const worstCaseDI = worstCaseIncome - worstCaseAdjustedCOL;
    const maxAnnualPayment = Math.max(0, worstCaseDI * allocationPercent);

    // Binary search for max sustainable price
    let sustainablePrice = 0;
    let low = 0;
    let high = 10_000_000; // Search up to $10M
    for (let i = 0; i < 25; i++) {
      const mid = (low + high) / 2;
      const annualPayment = calculateTotalAnnualCosts(mid, downPaymentPercent, annualCostFactor);
      if (annualPayment <= maxAnnualPayment) {
        sustainablePrice = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    // Find when savings first meet this sustainability cap's threshold
    const totalCostFactor = downPaymentPercent + ((1 - downPaymentPercent) * annualCostFactor);
    const savingsNeeded = sustainablePrice * totalCostFactor;
    const capReachedSnapshot = simulation.find(s => s.savingsNoMortgage >= savingsNeeded);

    // Use the last simulation year as reference for savings
    const lastSnapshot = simulation[simulation.length - 1];
    const refSnapshot = capReachedSnapshot || lastSnapshot;
    const maxSavings = refSnapshot.savingsNoMortgage;

    // Savings-based max at the reference year
    const maxPossibleHousePrice = maxSavings / totalCostFactor;
    const actualMax = Math.min(maxPossibleHousePrice, sustainablePrice);

    // Use the LOWER of savings-based and income-based max
    const actualMaxDP = actualMax * downPaymentPercent;
    const actualMaxAP = calculateTotalAnnualCosts(actualMax, downPaymentPercent, annualCostFactor);
    const actualMaxPostDI = worstCaseDI - actualMaxAP;

    projections.maxAffordable = {
      year: refSnapshot.year,
      age: refSnapshot.age,
      totalSavings: Math.round(maxSavings),
      maxPossibleHousePrice: Math.round(maxPossibleHousePrice),
      downPaymentRequired: Math.round(actualMaxDP),
      firstYearPaymentRequired: Math.round(actualMaxAP),
      maxSustainableHousePrice: Math.round(actualMax),
      sustainableDownPayment: Math.round(actualMaxDP),
      sustainableAnnualPayment: Math.round(actualMaxAP),
      postMortgageDisposableIncome: Math.round(actualMaxPostDI),
      sustainabilityLimited: sustainablePrice < maxPossibleHousePrice,
      canAfford: true,
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

  // If user already has kids, mark existing ones and calculate additional
  const existingKids = (profile.kidsPlan === 'have-kids' && profile.numKids) ? profile.numKids : 0;
  const alreadyHave: KidViabilityResult = { isViable: true, minimumAge: profile.currentAge, reason: 'already-have' };

  if (existingKids >= 3) {
    return { firstKid: alreadyHave, secondKid: alreadyHave, thirdKid: alreadyHave };
  }

  // Build results: mark existing kids as already-have, calculate the rest
  const results: KidViabilityResult[] = [];
  const previousKidAges: number[] = [];

  for (let kidNum = 1; kidNum <= 3; kidNum++) {
    if (kidNum <= existingKids) {
      // User already has this kid — existing kids are baked into the simulation's
      // starting currentNumKids, so no previousKidAges entry needed
      results.push(alreadyHave);
    } else {
      // Calculate minimum viable age for this additional kid
      const result = findMinimumViableKidAge(profile, locationData, kidNum, previousKidAges);
      results.push(result);
      if (result.isViable && result.minimumAge !== undefined) {
        previousKidAges.push(result.minimumAge);
      }
    }
  }

  return { firstKid: results[0], secondKid: results[1], thirdKid: results[2] };
}

function findMinimumViableKidAge(
  profile: UserProfile,
  locationData: LocationData,
  kidNumber: number,
  previousKidAges: number[]
): KidViabilityResult {

  // If previous kid wasn't viable, this one can't be either
  if (kidNumber > 1 && previousKidAges.length < kidNumber - 1) {
    return {
      isViable: false,
      reason: `Child #${kidNumber - 1} is not viable, so #${kidNumber} cannot be either`,
    };
  }

  // The earliest this kid can be born is after the previous kid
  const searchStart = previousKidAges.length > 0
    ? Math.max(profile.currentAge, previousKidAges[previousKidAges.length - 1] + 1)
    : profile.currentAge;
  const searchEnd = profile.currentAge + 25;

  // Linear search: test every year to find the earliest viable age
  for (let testAge = searchStart; testAge <= searchEnd; testAge++) {
    // Build cumulative kid ages: all previous kids + this kid at testAge
    const testKidAges = [...previousKidAges, testAge];

    const testProfile = {
      ...profile,
      plannedKidAges: testKidAges,
    };

    // Run simulation long enough to cover testAge + 3 years post-birth check
    const simYears = (testAge - profile.currentAge) + 5;
    const testSim = runYearByYearSimulation(testProfile, locationData, Math.max(simYears, 10));

    // Find the year when THIS kid (kidNumber) is born
    const kidBirthIdx = testSim.snapshots.findIndex(s => s.kidBornThisYear === kidNumber);

    if (kidBirthIdx < 0) {
      // Kid wasn't born (blocked by hard rules) — try next year
      continue;
    }

    // Check 3 years after birth
    const threeYearsLater = testSim.snapshots[kidBirthIdx + 3];

    if (threeYearsLater) {
      const isViable =
        threeYearsLater.disposableIncome > 0 &&
        threeYearsLater.loanDebtEnd <= threeYearsLater.loanDebtStart &&
        threeYearsLater.savingsEnd > 5000;

      if (isViable) {
        return {
          isViable: true,
          minimumAge: testAge,
        };
      }
    }
  }

  return {
    isViable: false,
    reason: 'Could not find viable age within 25 years',
  };
}

/**
 * Generate personalized recommendations based on viability and simulation results
 */
function generateRecommendations(
  profile: UserProfile,
  viability: ViabilityClass,
  minAllocation: number,
  yearsToMortgage: number,
  simulation: YearSnapshot[],
  sqFtViable: boolean = true,
  requiredSqFt: number = 2200,
  projectedSqFt: number = 0
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

  // Sqft-aware recommendations
  if (!sqFtViable && projectedSqFt > 0 && viability !== 'no-viable-path') {
    const deficit = requiredSqFt - projectedSqFt;
    recommendations.push(
      `Your projected home (~${projectedSqFt.toLocaleString()} sqft) is ${deficit.toLocaleString()} sqft short of the ${requiredSqFt.toLocaleString()} sqft your family needs`
    );
    recommendations.push('Consider a lower-cost location, increasing income, or adjusting family timeline to close the gap');
  } else if (sqFtViable && projectedSqFt >= LARGE_SQFT && viability !== 'no-viable-path') {
    recommendations.push(`Great news: you can afford ${projectedSqFt.toLocaleString()} sqft — well above your family's ${requiredSqFt.toLocaleString()} sqft need`);
  }

  // Debt-specific recommendations
  const totalInitialDebt = (profile.studentLoanDebt || 0) + (profile.carDebt || 0) + (profile.otherDebt || 0);
  if (totalInitialDebt > 0 && simulation.length > 0) {
    const lastYear = simulation[simulation.length - 1];
    if (lastYear.loanDebtEnd > lastYear.loanDebtStart) {
      recommendations.push('WARNING: Debt is growing - consider increasing allocation or income');
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
  viability: ViabilityClass,
  sqFtViable: boolean = true,
  requiredSqFt: number = 2200,
  projectedSqFt: number = 0
): string[] {
  const warnings: string[] = [];

  if (simulation.length === 0) {
    warnings.push('No simulation data available');
    return warnings;
  }

  // Check for negative DI
  const negativeDIYears = simulation.filter(s => s.disposableIncome < 0).length;
  if (negativeDIYears > 0) {
    warnings.push(`Negative discretionary income for ${negativeDIYears} year(s)`);
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

  // Sqft-aware warning
  if (!sqFtViable && projectedSqFt > 0) {
    warnings.push(
      `Projected home (~${projectedSqFt.toLocaleString()} sqft) is below the ${requiredSqFt.toLocaleString()} sqft your family needs`
    );
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
    numericScore: 0,
    houseClassification: 'somewhat-viable-small-house',
    requiredSqFt: 0,
    largeSqFt: LARGE_SQFT,
    requiredHousePrice: 0,
    largeHousePrice: 0,
    projectedSqFt: 0,
    sqFtViable: false,
    houseTag: 'Unknown',
    assumptions: [],
    baselineSqFtLabel: 'home',
    fastestHomeSqFt: 0,
    fastestHomeProjection: null,
    yearByYear: [],
    simulationStoppedEarly: true,
    stoppedReason: errorMessage,
    houseProjections: {
      threeYears: null,
      fiveYears: null,
      tenYears: null,
      fifteenYears: null,
      maxAffordable: null,
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

// ===== PROJECTION HELPERS (exported for UI) =====

/**
 * Calculate a house projection for an arbitrary year from existing simulation data.
 * Used by the custom search feature on the profile page.
 */
function calculateProjectionForYear(
  yearTarget: number,
  profile: UserProfile,
  locationData: LocationData,
  simulation: YearSnapshot[]
): HouseProjection | null {
  // Find the snapshot closest to the target year (round up if between years)
  const roundedYear = Math.max(1, Math.ceil(yearTarget));
  const snapshot = simulation.find(s => s.year === roundedYear) || simulation[simulation.length - 1];
  if (!snapshot || !locationData.housing) return null;

  const savings = snapshot.savingsNoMortgage;
  const downPaymentPercent = locationData.housing.downPaymentPercent || 0.107;
  const mortgageRate = locationData.housing.mortgageRate || 0.065;
  const annualCostFactor = calculateAnnualCostFactor(mortgageRate, downPaymentPercent);
  const allocationPercent = profile.disposableIncomeAllocation / 100;

  // Savings-based max
  const totalCostFactor = downPaymentPercent + ((1 - downPaymentPercent) * annualCostFactor);
  const maxPossibleHousePrice = savings / totalCostFactor;

  // Sustainability-based max (worst-case future DI from this year onward)
  const futureSnapshots = simulation.filter(s => s.year >= roundedYear);
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

  const worstCaseDI = worstCaseIncome - worstCaseAdjustedCOL;
  const maxAnnualPayment = Math.max(0, worstCaseDI * allocationPercent);

  // Binary search for max sustainable price
  let sustainablePrice = 0;
  let low = 0;
  let high = maxPossibleHousePrice * 2;
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    const annualPayment = calculateTotalAnnualCosts(mid, downPaymentPercent, annualCostFactor);
    if (annualPayment <= maxAnnualPayment) {
      sustainablePrice = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  // Use the LOWER of savings-based and income-based max — what you can
  // actually afford at this point with your current savings.
  const actualMax = Math.min(maxPossibleHousePrice, sustainablePrice);
  const actualDP = actualMax * downPaymentPercent;
  const actualAP = calculateTotalAnnualCosts(actualMax, downPaymentPercent, annualCostFactor);
  const actualPostDI = worstCaseDI - actualAP;

  return {
    year: roundedYear,
    age: snapshot.age,
    totalSavings: Math.round(savings),
    maxPossibleHousePrice: Math.round(maxPossibleHousePrice),
    downPaymentRequired: Math.round(actualDP),
    firstYearPaymentRequired: Math.round(actualAP),
    maxSustainableHousePrice: Math.round(actualMax),
    sustainableDownPayment: Math.round(actualDP),
    sustainableAnnualPayment: Math.round(actualAP),
    postMortgageDisposableIncome: Math.round(actualPostDI),
    sustainabilityLimited: sustainablePrice < maxPossibleHousePrice,
    canAfford: true,
  };
}

/**
 * Find the fastest path to affording a house of a given sqft target.
 * Returns the projection for the earliest year where the user can afford it,
 * or null if it's never reachable within the simulation.
 */
function calculateFastestToTarget(
  targetSqFt: number,
  pricePerSqft: number,
  profile: UserProfile,
  locationData: LocationData,
  simulation: YearSnapshot[]
): HouseProjection | null {
  if (pricePerSqft <= 0 || targetSqFt <= 0 || simulation.length === 0) return null;

  const targetPrice = targetSqFt * pricePerSqft;
  const downPaymentPercent = locationData.housing.downPaymentPercent || 0.107;
  const mortgageRate = locationData.housing.mortgageRate || 0.065;
  const annualCostFactor = calculateAnnualCostFactor(mortgageRate, downPaymentPercent);
  const allocationPercent = profile.disposableIncomeAllocation / 100;
  const annualPaymentForTarget = calculateTotalAnnualCosts(targetPrice, downPaymentPercent, annualCostFactor);

  // Savings needed: down payment + first year mortgage payment (same formula as calculateHouseProjections)
  const downPayment = targetPrice * downPaymentPercent;
  const savingsNeeded = downPayment + annualPaymentForTarget;

  // Find the first year where:
  // 1. Savings cover down payment + first year payment
  // 2. Future worst-case DI can sustain the annual cost (checked from that year onward, not globally)
  for (const snap of simulation) {
    if (snap.savingsNoMortgage >= savingsNeeded) {
      // Check sustainability from THIS year onward (not global worst-case)
      const futureSnapshots = simulation.filter(s => s.year >= snap.year);
      let worstFutureDI = snap.totalIncome - snap.adjustedCOL;
      for (const future of futureSnapshots) {
        const di = future.totalIncome - future.adjustedCOL;
        if (di < worstFutureDI) worstFutureDI = di;
      }
      const maxAnnualPayment = Math.max(0, worstFutureDI * allocationPercent);

      if (annualPaymentForTarget <= maxAnnualPayment) {
        return {
          year: snap.year,
          age: snap.age,
          totalSavings: Math.round(snap.savingsNoMortgage),
          maxPossibleHousePrice: Math.round(snap.savingsNoMortgage / (downPaymentPercent + ((1 - downPaymentPercent) * annualCostFactor))),
          downPaymentRequired: Math.round(downPayment),
          firstYearPaymentRequired: Math.round(annualPaymentForTarget),
          maxSustainableHousePrice: Math.round(targetPrice),
          sustainableDownPayment: Math.round(downPayment),
          sustainableAnnualPayment: Math.round(annualPaymentForTarget),
          postMortgageDisposableIncome: Math.round(worstFutureDI - annualPaymentForTarget),
          sustainabilityLimited: false,
          canAfford: true,
        };
      }
    }
  }

  // Can't reach it within simulation period
  return null;
}

// ===== MULTI-SCENARIO KID BRANCHING =====

/**
 * Calculate with kid scenario branching based on kidsKnowledge.
 *
 * - 'know-count' or undefined: single simulation with declared kids (standard path)
 * - 'dont-know-count': run 0/1/2/3 kid scenarios, prefer 2 if viable (score >= 5)
 * - 'unsure': handled by normalize.ts (1 kid at 32), falls through to standard path
 */
function calculateWithKidScenarios(
  profile: UserProfile,
  locationName: string,
  simulationYears: number = 30
): CalculationResult | null {
  // Standard path: known count, unsure (already set up by normalize), or no kidsKnowledge
  if (!profile.kidsKnowledge || profile.kidsKnowledge === 'know-count') {
    return calculateAutoApproach(profile, locationName, simulationYears);
  }

  // 'dont-know-count': run scenarios for 0, 1, 2, 3 kids
  const defaultAges = [32, 34, 36].map(age => Math.max(age, profile.currentAge + 1));

  const scenarios: (CalculationResult | null)[] = [];
  for (let numKids = 0; numKids <= 3; numKids++) {
    const testProfile: UserProfile = {
      ...profile,
      plannedKidAges: defaultAges.slice(0, numKids),
      declaredKidCount: numKids,
      kidsPlan: numKids === 0 ? 'no' : 'yes',
    };
    scenarios.push(calculateAutoApproach(testProfile, locationName, simulationYears));
  }

  // Prefer 2 kids if viable (score >= 5), else 1, else 3, else 0
  const preference = [2, 1, 3, 0];
  for (const target of preference) {
    const result = scenarios[target];
    if (result && result.calculationSuccessful && result.numericScore >= 5) {
      return result;
    }
  }

  // Fallback: return the 0-kids result (most likely to succeed)
  return scenarios[0] || calculateAutoApproach(profile, locationName, simulationYears);
}

// ===== EXPORTS =====

export {
  calculateAutoApproach,
  calculateWithKidScenarios,
  runYearByYearSimulation,
  classifyViability,
  calculateNumericScore,
  classifyHouseSize,
  calculateMinimumAllocation,
  calculateHouseProjections,
  calculateKidViability,
  calculateProjectionForYear,
  calculateFastestToTarget,
  generateRecommendations,
  generateWarnings,
  validateProfile,
};
