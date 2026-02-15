/**
 * Calculation Utilities
 * Advanced calculations for house projections and kid viability
 */

import { UserProfile, HouseholdTypeEnum, determineHouseholdType, getAdjustedCOLKey, getRentType } from './onboarding/types';
import { LocationData, getSalary } from './data-extraction';

// ===== HOUSE SIZE PROJECTIONS =====

export interface DetailedHouseProjection {
  year: number;
  age: number;
  totalSavings: number;
  
  // Based on savings alone
  maxPossibleHousePrice: number;
  downPaymentRequired: number;
  firstYearPaymentRequired: number;
  
  // Based on sustainability
  maxSustainableHousePrice: number;
  sustainableDownPayment: number;
  sustainableAnnualPayment: number;
  postMortgageDisposableIncome: number;
  
  // Flags
  sustainabilityLimited: boolean; // True if savings exceed what's sustainable
  canAfford: boolean;
}

/**
 * Calculate detailed house projections at specific year milestones
 */
export function calculateDetailedHouseProjections(
  profile: UserProfile,
  locationData: LocationData,
  simulationSnapshots: any[]
): {
  threeYears: DetailedHouseProjection;
  fiveYears: DetailedHouseProjection;
  tenYears: DetailedHouseProjection;
  fifteenYears: DetailedHouseProjection;
} {
  const projections = {
    threeYears: projectHouseAtYear(3, profile, locationData, simulationSnapshots),
    fiveYears: projectHouseAtYear(5, profile, locationData, simulationSnapshots),
    tenYears: projectHouseAtYear(10, profile, locationData, simulationSnapshots),
    fifteenYears: projectHouseAtYear(15, profile, locationData, simulationSnapshots),
  };
  
  return projections;
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

function projectHouseAtYear(
  targetYear: number,
  profile: UserProfile,
  locationData: LocationData,
  snapshots: any[]
): DetailedHouseProjection {
  const snapshot = snapshots.find(s => s.year === targetYear);
  
  if (!snapshot) {
    // Return empty projection if year not reached
    return {
      year: targetYear,
      age: profile.currentAge + targetYear - 1,
      totalSavings: 0,
      maxPossibleHousePrice: 0,
      downPaymentRequired: 0,
      firstYearPaymentRequired: 0,
      maxSustainableHousePrice: 0,
      sustainableDownPayment: 0,
      sustainableAnnualPayment: 0,
      postMortgageDisposableIncome: 0,
      sustainabilityLimited: false,
      canAfford: false,
    };
  }
  
  // Use no-mortgage savings: "if you saved X years without buying, what could you afford?"
  const savings = snapshot.savingsNoMortgage ?? snapshot.savingsEnd;
  const downPaymentPercent = locationData.housing.downPaymentPercent;
  const mortgageRate = locationData.housing.mortgageRate;

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
  const futureSnapshots = snapshots.filter((s: any) => s.year >= targetYear);
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
  let high = maxPossibleHousePrice * 2; // Start with generous upper bound

  for (let i = 0; i < 20; i++) { // 20 iterations for precision
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
  
  // === FINAL DETERMINATION ===
  const actualMaxPrice = Math.min(maxPossibleHousePrice, sustainablePrice);
  const sustainabilityLimited = sustainablePrice < maxPossibleHousePrice;
  const canAfford = savings >= (sustainableDownPayment + sustainableAnnualPayment);
  
  return {
    year: targetYear,
    age: snapshot.age,
    totalSavings: savings,
    maxPossibleHousePrice,
    downPaymentRequired,
    firstYearPaymentRequired,
    maxSustainableHousePrice: sustainablePrice,
    sustainableDownPayment,
    sustainableAnnualPayment,
    postMortgageDisposableIncome,
    sustainabilityLimited,
    canAfford,
  };
}

// ===== KID VIABILITY =====

export interface DetailedKidViability {
  kidNumber: 1 | 2 | 3;
  isViable: boolean;
  minimumAge?: number;
  blockedByHardRule?: string;
  blockedByFinances?: boolean;
  reason: string;
}

/**
 * Calculate minimum viable age for each kid using binary search + simulation
 */
export function calculateDetailedKidViability(
  profile: UserProfile,
  locationData: LocationData,
  runSimulation: (testProfile: UserProfile) => any[]
): {
  firstKid: DetailedKidViability;
  secondKid: DetailedKidViability;
  thirdKid: DetailedKidViability;
} {
  return {
    firstKid: findMinViableAgeForKid(1, profile, locationData, runSimulation),
    secondKid: findMinViableAgeForKid(2, profile, locationData, runSimulation),
    thirdKid: findMinViableAgeForKid(3, profile, locationData, runSimulation),
  };
}

function findMinViableAgeForKid(
  kidNumber: 1 | 2 | 3,
  profile: UserProfile,
  locationData: LocationData,
  runSimulation: (testProfile: UserProfile) => any[]
): DetailedKidViability {
  const currentAge = profile.currentAge;
  const maxSearchAge = 50;
  
  // Check hard rules first
  if (profile.hardRules.includes('debt-before-kids')) {
    if (profile.studentLoanDebt > 0) {
      return {
        kidNumber,
        isViable: false,
        blockedByHardRule: 'debt-before-kids',
        reason: 'Hard rule requires paying off student debt first. Run simulation to find debt-free age.',
      };
    }
  }
  
  if (profile.hardRules.includes('mortgage-before-kids')) {
    return {
      kidNumber,
      isViable: false,
      blockedByHardRule: 'mortgage-before-kids',
      reason: 'Hard rule requires obtaining mortgage first. Run simulation to find mortgage acquisition age.',
    };
  }
  
  // Kids ASAP rule
  if (profile.hardRules.includes('kids-asap-viable')) {
    const testProfile = { ...profile, plannedKidAges: [currentAge] };
    const testSim = runSimulation(testProfile);
    const isViable = checkKidViabilityInSimulation(testSim, 1);
    
    if (isViable) {
      return {
        kidNumber,
        isViable: true,
        minimumAge: currentAge,
        reason: 'Financially viable now (ASAP rule)',
      };
    }
  }
  
  // Binary search for minimum viable age
  let low = currentAge;
  let high = maxSearchAge;
  let minViableAge = -1;
  
  while (low <= high) {
    const testAge = Math.floor((low + high) / 2);
    
    // Create test profile with kid at this age
    const existingKids = kidNumber - 1;
    const kidAges = [testAge];
    if (existingKids > 1) kidAges.unshift(testAge - 3);
    if (existingKids > 2) kidAges.unshift(testAge - 6);
    
    const testProfile: UserProfile = {
      ...profile,
      plannedKidAges: kidAges,
    };
    
    const testSim = runSimulation(testProfile);
    const isViable = checkKidViabilityInSimulation(testSim, kidNumber);
    
    if (isViable) {
      minViableAge = testAge;
      high = testAge - 1; // Try younger age
    } else {
      low = testAge + 1; // Need older age
    }
  }
  
  if (minViableAge > 0) {
    return {
      kidNumber,
      isViable: true,
      minimumAge: minViableAge,
      reason: `Financially viable at age ${minViableAge}`,
    };
  }
  
  return {
    kidNumber,
    isViable: false,
    blockedByFinances: true,
    reason: 'Not financially viable within reasonable timeframe (checked up to age 50)',
  };
}

function checkKidViabilityInSimulation(snapshots: any[], kidNumber: number): boolean {
  // A kid is viable if:
  // 1. DI stays positive for at least 3 years after birth
  // 2. Debt doesn't grow for 2+ consecutive years after birth
  // 3. Savings don't deplete completely
  
  const kidBirthYear = snapshots.find(s => s.kidBornThisYear === kidNumber);
  if (!kidBirthYear) return false;
  
  const yearIndex = snapshots.indexOf(kidBirthYear);
  const followingYears = snapshots.slice(yearIndex, yearIndex + 3);
  
  if (followingYears.length < 3) return false;
  
  // Check DI stays positive
  const allPositiveDI = followingYears.every(s => s.disposableIncome >= 0);
  if (!allPositiveDI) return false;
  
  // Check debt doesn't grow consecutively
  let consecutiveGrowth = 0;
  for (let i = 0; i < followingYears.length - 1; i++) {
    if (followingYears[i + 1].loanDebtEnd > followingYears[i].loanDebtEnd) {
      consecutiveGrowth++;
      if (consecutiveGrowth >= 2) return false;
    } else {
      consecutiveGrowth = 0;
    }
  }
  
  // Check savings stay above emergency level (at least $5k)
  const minSavings = Math.min(...followingYears.map(s => s.savingsEnd));
  if (minSavings < 5000) return false;
  
  return true;
}

// ===== VIABILITY CLASSIFICATION =====

export function getViabilityDetails(classification: string): {
  color: string;
  label: string;
  description: string;
  emoji: string;
} {
  switch (classification) {
    case 'very-viable-stable':
      return {
        color: 'green',
        label: 'Very Viable & Stable',
        description: 'Excellent financial position with room to reduce allocation',
        emoji: '',
      };
    case 'viable':
      return {
        color: 'blue',
        label: 'Viable',
        description: 'Solid path to homeownership with current allocation',
        emoji: '',
      };
    case 'viable-higher-allocation':
      return {
        color: 'yellow',
        label: 'Viable (Higher Allocation)',
        description: 'Requires 70-80%+ allocation for homeownership',
        emoji: '',
      };
    case 'viable-extreme-care':
      return {
        color: 'orange',
        label: 'Viable (Extreme Care)',
        description: 'Fragile - requires 80-90%+ allocation and discipline',
        emoji: '',
      };
    case 'viable-when-renting':
      return {
        color: 'purple',
        label: 'Viable When Renting',
        description: 'Sustainable while renting, homeownership takes 15+ years',
        emoji: '',
      };
    case 'no-viable-path':
      return {
        color: 'red',
        label: 'No Viable Path',
        description: 'Income insufficient for this location - consider alternatives',
        emoji: '',
      };
    default:
      return {
        color: 'gray',
        label: 'Unknown',
        description: 'Could not determine viability',
        emoji: '',
      };
  }
}

// ===== COMPARISON UTILITIES =====

/**
 * Compare multiple locations and rank them
 */
export interface LocationComparison {
  location: string;
  yearsToMortgage: number;
  viability: string;
  finalSavings: number;
  score: number; // Higher is better
}

export function compareLocations(results: any[]): LocationComparison[] {
  const comparisons = results.map(result => ({
    location: result.location,
    yearsToMortgage: result.yearsToMortgage,
    viability: result.viabilityClassification,
    finalSavings: result.yearByYear[result.yearByYear.length - 1]?.savingsEnd || 0,
    score: calculateLocationScore(result),
  }));
  
  // Sort by score (highest first)
  comparisons.sort((a, b) => b.score - a.score);
  
  return comparisons;
}

function calculateLocationScore(result: any): number {
  let score = 0;
  
  // Viability weight (most important)
  const viabilityScores: Record<string, number> = {
    'very-viable-stable': 100,
    'viable': 80,
    'viable-higher-allocation': 60,
    'viable-extreme-care': 40,
    'viable-when-renting': 20,
    'no-viable-path': 0,
  };
  score += viabilityScores[result.viabilityClassification] || 0;
  
  // Years to mortgage (faster is better)
  if (result.yearsToMortgage > 0) {
    score += Math.max(0, 50 - result.yearsToMortgage * 3);
  }
  
  // Final savings (more is better)
  score += Math.min(30, result.yearByYear[result.yearByYear.length - 1]?.savingsEnd / 10000);
  
  return Math.round(score);
}
