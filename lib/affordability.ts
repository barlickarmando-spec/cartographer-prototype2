import type { UserInputs, SimulationResult } from './types';
import type { Location } from './data';
import { getColForHousehold } from './data';

// Constants
const WAGE_GROWTH = 0.02; // 2% yearly
const COL_INFLATION = 0.03; // 3% yearly
const HOME_VALUE_GROWTH = 0.03; // 3% until mortgage acquired
const SAVINGS_RATE = 0.03; // 3% annual compounding
const SAFETY_BUFFER_PCT = 0.05; // 5% of disposable income
const STUDENT_LOAN_MIN_PCT = 0.05; // 5% of disposable income minimum
const DEFAULT_SAVINGS_RATE = 0.03;
const DEFAULT_ALLOCATION_PCT = 0.70;

// Simulation state per year
interface YearState {
  yearIndex: number;
  age: number;
  salary: number;
  col: number;
  adjustedCol: number;
  disposable: number;
  allocationPool: number;
  safetyBuffer: number;
  studentLoanBalance: number;
  creditCardBalance: number;
  savings: number;
  mortgageAcquired: boolean;
  mortgageYear: number | null;
  mortgagePayment: number;
  homeValue: number;
  numKids: number;
  requiredPayments: number;
  leftover: number;
}

// Calculate annual mortgage payment (30-year fixed)
function calculateMortgagePayment(principal: number, annualRate: number): number {
  if (principal <= 0 || annualRate <= 0) return 0;
  const monthlyRate = annualRate / 12;
  const numMonths = 30 * 12;
  const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numMonths)) / 
    (Math.pow(1 + monthlyRate, numMonths) - 1);
  return monthlyPayment * 12; // annual
}

// Calculate mortgage principal from home value and down payment
function calculateMortgagePrincipal(homeValue: number, downPaymentPct: number): number {
  return homeValue * (1 - downPaymentPct);
}

// Run a single simulation year
function simulateYear(
  prev: YearState,
  inputs: UserInputs,
  location: Location,
  candidatePurchaseYear: number | null,
  targetHomeValue?: number
): YearState {
  const year = prev.yearIndex + 1;
  const age = prev.age + 1;
  
  // Calculate salary with wage growth
  let salary = prev.salary * (1 + WAGE_GROWTH);
  
  // Handle second earner if applicable
  if (inputs.householdType === "marriedTwoIncome" && inputs.occupation2) {
    const salary2 = inputs.salary2 || location.salaries?.[inputs.occupation2] || 0;
    salary += salary2 * Math.pow(1 + WAGE_GROWTH, year);
  }
  
  // Determine number of kids this year
  const numKids = inputs.kidsAges?.filter(kidAge => {
    const kidYear = kidAge - (inputs.age || 25);
    return year >= kidYear && year < kidYear + 18; // kid present for 18 years
  }).length || 0;
  
  const numWorkers = inputs.householdType === "marriedTwoIncome" ? 2 : 1;
  
  // Get COL for this household configuration
  let col = getColForHousehold(location, inputs.householdType, numKids, numWorkers, false) || 0;
  let adjustedCol = getColForHousehold(location, inputs.householdType, numKids, numWorkers, true) || col;
  
  // Apply COL inflation
  col = col * Math.pow(1 + COL_INFLATION, year);
  adjustedCol = adjustedCol * Math.pow(1 + COL_INFLATION, year);
  
  // Use adjusted COL if mortgage acquired, otherwise regular COL
  let effectiveCol = prev.mortgageAcquired ? adjustedCol : col;
  
  // Calculate initial disposable income (will recalculate if mortgage acquired)
  let disposable = Math.max(0, salary - effectiveCol);
  
  // Mortgage payment (if acquired)
  let mortgagePayment = prev.mortgagePayment;
  let mortgageAcquired = prev.mortgageAcquired;
  let mortgageYear = prev.mortgageYear;
  let homeValue = prev.homeValue;
  
  // Check if we can acquire mortgage this year
  if (!mortgageAcquired && (candidatePurchaseYear === null || year >= candidatePurchaseYear)) {
    const targetValue = targetHomeValue || location.typicalHomeValue || 0;
    if (targetValue > 0) {
      const downPaymentPct = location.downPaymentPct || 0.20;
      const mortgageRate = location.mortgageRate || 0.065;
      
      // Home value grows until purchase
      const currentHomeValue = targetValue * Math.pow(1 + HOME_VALUE_GROWTH, year);
      homeValue = currentHomeValue;
      
      const downPayment = currentHomeValue * downPaymentPct;
      const principal = calculateMortgagePrincipal(currentHomeValue, downPaymentPct);
      const annualPayment = calculateMortgagePayment(principal, mortgageRate);
      const year1PaymentTarget = annualPayment;
      
      const acquisitionTarget = downPayment + year1PaymentTarget;
      
      if (prev.savings >= acquisitionTarget) {
        mortgageAcquired = true;
        mortgageYear = year;
        mortgagePayment = annualPayment;
        // Update COL to adjusted after mortgage
        effectiveCol = adjustedCol;
        // Recalculate disposable with adjusted COL
        disposable = Math.max(0, salary - effectiveCol);
      }
    }
  }
  
  // Allocation pool and safety buffer
  const allocationPct = inputs.allocationPercent ?? DEFAULT_ALLOCATION_PCT;
  const allocationPool = disposable * allocationPct;
  const safetyBuffer = disposable * SAFETY_BUFFER_PCT;
  
  // Required payments
  let requiredPayments = 0;
  
  // Student loan payment
  let studentLoanBalance = prev.studentLoanBalance;
  if (inputs.studentLoan && studentLoanBalance > 0) {
    const interest = studentLoanBalance * inputs.studentLoan.rate;
    const minPayment = Math.max(interest, allocationPool * STUDENT_LOAN_MIN_PCT);
    const payment = Math.min(minPayment, studentLoanBalance + interest);
    requiredPayments += payment;
    studentLoanBalance = Math.max(0, studentLoanBalance + interest - payment);
  }
  
  // Credit card payment
  let creditCardBalance = prev.creditCardBalance;
  if (inputs.creditCard && creditCardBalance > 0) {
    const isRefreshYear = inputs.creditCard.refreshInterval 
      ? year % inputs.creditCard.refreshInterval === 0
      : false;
    
    if (isRefreshYear && inputs.creditCard.annualRefresh) {
      creditCardBalance += inputs.creditCard.annualRefresh;
    }
    
    if (year === 0 || isRefreshYear) {
      // Pay full balance with interest in year 0 or refresh year
      const total = creditCardBalance * (1 + inputs.creditCard.apr);
      requiredPayments += total;
      creditCardBalance = 0;
    } else {
      // Pay off over 5 years
      const total = creditCardBalance * (1 + inputs.creditCard.apr);
      const payment = total / 5;
      requiredPayments += payment;
      creditCardBalance = Math.max(0, creditCardBalance * (1 + inputs.creditCard.apr) - payment);
    }
  }
  
  // Add mortgage payment to required if acquired
  if (mortgageAcquired) {
    requiredPayments += mortgagePayment;
  }
  
  // Calculate leftover after required payments and buffer
  const leftover = Math.max(0, allocationPool - requiredPayments - safetyBuffer);
  
  // Update savings
  const savingsRate = inputs.savingsRate ?? DEFAULT_SAVINGS_RATE;
  let savings = prev.savings * (1 + savingsRate);
  
  if (!mortgageAcquired) {
    // Pre-mortgage: leftover goes to mortgage savings
    savings += leftover;
  } else {
    // Post-mortgage: leftover goes to extra loan payments (but we track separately)
    // For now, just track savings growth
  }
  
  return {
    yearIndex: year,
    age,
    salary,
    col,
    adjustedCol,
    disposable,
    allocationPool,
    safetyBuffer,
    studentLoanBalance,
    creditCardBalance,
    savings,
    mortgageAcquired,
    mortgageYear,
    mortgagePayment,
    homeValue,
    numKids,
    requiredPayments,
    leftover,
  };
}

// Run full simulation
function runSimulation(
  inputs: UserInputs,
  location: Location,
  candidatePurchaseYear: number | null = null,
  targetHomeValue?: number,
  maxYears: number = 30
): YearState[] {
  const startAge = inputs.age || 25;
  const numWorkers = inputs.householdType === "marriedTwoIncome" ? 2 : 1;
  
  // Get initial salary
  const occupation1 = inputs.occupation1 || "overallAverage";
  const salary1 = inputs.salary1 ?? location.salaries?.[occupation1] ?? 50000;
  let initialSalary = salary1;
  
  if (inputs.householdType === "marriedTwoIncome" && inputs.occupation2) {
    const salary2 = inputs.salary2 ?? location.salaries?.[inputs.occupation2] ?? 50000;
    initialSalary += salary2;
  }
  
  // Get initial COL
  const initialCol = getColForHousehold(location, inputs.householdType, 0, numWorkers, false) || 50000;
  
  // Initial state
  const initialState: YearState = {
    yearIndex: -1,
    age: startAge - 1,
    salary: initialSalary,
    col: initialCol,
    adjustedCol: getColForHousehold(location, inputs.householdType, 0, numWorkers, true) || initialCol,
    disposable: Math.max(0, initialSalary - initialCol),
    allocationPool: 0,
    safetyBuffer: 0,
    studentLoanBalance: inputs.studentLoan?.balance || 0,
    creditCardBalance: inputs.creditCard?.balance || 0,
    savings: 0,
    mortgageAcquired: false,
    mortgageYear: null,
    mortgagePayment: 0,
    homeValue: location.typicalHomeValue || 0,
    numKids: 0,
    requiredPayments: 0,
    leftover: 0,
  };
  
  const states: YearState[] = [initialState];
  
  for (let year = 0; year < maxYears; year++) {
    const prev = states[states.length - 1];
    const next = simulateYear(prev, inputs, location, candidatePurchaseYear, targetHomeValue);
    states.push(next);
    
    // Early termination if mortgage acquired and all debts paid
    if (next.mortgageAcquired && 
        next.studentLoanBalance === 0 && 
        next.creditCardBalance === 0 &&
        candidatePurchaseYear !== null) {
      break;
    }
  }
  
  return states;
}

// Check post-mortgage viability
function checkPostMortgageViability(states: YearState[]): {
  isViable: boolean;
  worstMarginRatio: number;
  failureYear: number | null;
} {
  let worstMarginRatio = Infinity;
  let failureYear: number | null = null;
  
  for (const state of states) {
    if (!state.mortgageAcquired) continue;
    
    const margin = state.allocationPool - state.requiredPayments - state.safetyBuffer;
    const marginRatio = state.allocationPool > 0 ? margin / state.allocationPool : -1;
    
    if (marginRatio < worstMarginRatio) {
      worstMarginRatio = marginRatio;
    }
    
    if (margin < 0 && failureYear === null) {
      failureYear = state.yearIndex;
    }
  }
  
  return {
    isViable: failureYear === null && worstMarginRatio >= 0,
    worstMarginRatio: worstMarginRatio === Infinity ? -1 : worstMarginRatio,
    failureYear,
  };
}

// Calculate confidence score
function calculateConfidenceScore(
  states: YearState[],
  yearsToMortgage: number | null,
  yearsToDebtFree: number | null,
  worstMarginRatio: number
): { score: number; label: string } {
  let score = 0;
  
  // Margin Safety (0-40)
  const marginScore = Math.max(0, Math.min(40, (worstMarginRatio + 0.05) * 200));
  score += marginScore;
  
  // Mortgage Achievability (0-25)
  let mortgageScore = 0;
  if (yearsToMortgage !== null) {
    if (yearsToMortgage <= 3) mortgageScore = 25;
    else if (yearsToMortgage <= 5) mortgageScore = 20;
    else if (yearsToMortgage <= 10) mortgageScore = 15;
    else if (yearsToMortgage <= 15) mortgageScore = 10;
    else mortgageScore = 5;
  }
  score += mortgageScore;
  
  // Debt Trajectory (0-25)
  let debtScore = 0;
  if (yearsToDebtFree !== null) {
    if (yearsToDebtFree <= 5) debtScore = 25;
    else if (yearsToDebtFree <= 10) debtScore = 20;
    else if (yearsToDebtFree <= 15) debtScore = 15;
    else if (yearsToDebtFree <= 20) debtScore = 10;
    else debtScore = 5;
  } else {
    // Check if debt is declining
    const debtTrend = states.map(s => s.studentLoanBalance + s.creditCardBalance);
    const isDeclining = debtTrend.every((val, i) => i === 0 || val <= debtTrend[i - 1]);
    debtScore = isDeclining ? 15 : 5;
  }
  score += debtScore;
  
  // Shock Resilience (0-10) - check if COL shocks from kids are handled
  let shockScore = 10;
  for (const state of states) {
    if (state.numKids > 0 && state.mortgageAcquired) {
      const margin = state.allocationPool - state.requiredPayments - state.safetyBuffer;
      if (margin < 0) {
        shockScore -= 2;
      }
    }
  }
  shockScore = Math.max(0, shockScore);
  score += shockScore;
  
  // Label
  let label = "Low";
  if (score >= 85) label = "Excellent";
  else if (score >= 70) label = "Good";
  else if (score >= 55) label = "Moderate";
  else if (score >= 40) label = "Fair";
  
  return { score: Math.round(score), label };
}

// Determine viability tier
function getViabilityTier(
  isViable: boolean,
  confidence: number,
  worstMarginRatio: number
): SimulationResult['viabilityTier'] {
  if (!isViable) return "Not Viable";
  if (confidence >= 85 && worstMarginRatio >= 0.10) return "Excellent";
  if (confidence >= 70) return "Good";
  if (confidence >= 55) return "Borderline";
  return "Low";
}

// Find minimum allocation percent needed
function findMinimumAllocationPercent(
  inputs: UserInputs,
  location: Location,
  maxYears: number = 30
): number | null {
  for (let pct = 0.30; pct <= 0.90; pct += 0.01) {
    const testInputs = { ...inputs, allocationPercent: pct };
    const states = runSimulation(testInputs, location, null, undefined, maxYears);
    const mortgageYear = states.find(s => s.mortgageAcquired)?.yearIndex ?? null;
    
    if (mortgageYear === null) continue;
    
    const viability = checkPostMortgageViability(states);
    if (viability.isViable) {
      return Math.round(pct * 100) / 100;
    }
  }
  return null;
}

// Calculate affordable house value for a timeframe
function calculateAffordableHouseValue(
  inputs: UserInputs,
  location: Location,
  timeframe: number
): number | null {
  const downPaymentPct = location.downPaymentPct || 0.20;
  const mortgageRate = location.mortgageRate || 0.065;
  
  // Binary search for maximum affordable house value
  let low = 0;
  let high = (location.typicalHomeValue || 1000000) * 3; // reasonable upper bound
  let best = 0;
  
  for (let iter = 0; iter < 50; iter++) {
    const testValue = (low + high) / 2;
    const states = runSimulation(inputs, location, timeframe, testValue, timeframe + 5);
    
    const finalState = states[states.length - 1];
    const principal = calculateMortgagePrincipal(testValue, downPaymentPct);
    const annualPayment = calculateMortgagePayment(principal, mortgageRate);
    const downPayment = testValue * downPaymentPct;
    const needed = downPayment + annualPayment;
    
    if (finalState.savings >= needed) {
      // Check viability with this house
      const viabilityStates = runSimulation(inputs, location, timeframe, testValue, timeframe + 20);
      const viability = checkPostMortgageViability(viabilityStates);
      
      if (viability.isViable) {
        best = testValue;
        low = testValue;
      } else {
        high = testValue;
      }
    } else {
      high = testValue;
    }
  }
  
  return best > 0 ? Math.round(best) : null;
}

// Main affordability calculation function
export function calculateAffordability(
  inputs: UserInputs,
  location: Location
): SimulationResult {
  const mortgageTimeline = inputs.mortgageTimeline === "asap" 
    ? null 
    : (typeof inputs.mortgageTimeline === 'number' ? inputs.mortgageTimeline : 10);
  
  const maxYears = mortgageTimeline ? mortgageTimeline + 10 : 30;
  
  // Try different candidate purchase years to find viable one
  let bestResult: SimulationResult | null = null;
  let bestCandidateYear: number | null = null;
  
  const candidates = mortgageTimeline 
    ? [mortgageTimeline] 
    : Array.from({ length: Math.min(20, maxYears) }, (_, i) => i);
  
  for (const candidateYear of candidates) {
    const states = runSimulation(inputs, location, candidateYear, undefined, maxYears);
    const mortgageState = states.find(s => s.mortgageAcquired);
    
    if (!mortgageState) continue;
    
    const viability = checkPostMortgageViability(states);
    
    if (viability.isViable) {
      const yearsToMortgage = mortgageState.yearIndex;
      const debtFreeState = states.find(s => 
        s.studentLoanBalance === 0 && s.creditCardBalance === 0 && s.mortgageAcquired
      );
      const yearsToDebtFree = debtFreeState ? debtFreeState.yearIndex : null;
      
      const confidence = calculateConfidenceScore(states, yearsToMortgage, yearsToDebtFree, viability.worstMarginRatio);
      
      const result: SimulationResult = {
        locationId: location.id,
        isViable: true,
        viabilityTier: getViabilityTier(true, confidence.score, viability.worstMarginRatio),
        yearsToMortgage,
        mortgageYear: mortgageState.yearIndex,
        yearsToDebtFree,
        confidenceScore: confidence.score,
        confidenceLabel: confidence.label,
        minimumAllocationPercentNeeded: findMinimumAllocationPercent(inputs, location, maxYears),
        estimatedAffordableHouseValues: {},
        recommendedScore: confidence.score + (location.qualityOfLife?.score || 0) * 0.1,
        estimatedSalary: states[0].salary,
        qualityOfLifeScore: location.qualityOfLife?.score,
        timeToHomeOwnership: yearsToMortgage,
        medianHomeValue: location.typicalHomeValue,
        targetHomeValue: mortgageState.homeValue,
      };
      
      if (!bestResult || result.confidenceScore > bestResult.confidenceScore) {
        bestResult = result;
        bestCandidateYear = candidateYear;
      }
    }
  }
  
  // If no viable candidate found, still compute result
  if (!bestResult) {
    const states = runSimulation(inputs, location, null, undefined, maxYears);
    const mortgageState = states.find(s => s.mortgageAcquired);
    const viability = checkPostMortgageViability(states);
    
    const yearsToMortgage = mortgageState?.yearIndex ?? null;
    const debtFreeState = states.find(s => 
      s.studentLoanBalance === 0 && s.creditCardBalance === 0 && s.mortgageAcquired
    );
    const yearsToDebtFree = debtFreeState ? debtFreeState.yearIndex : null;
    
    const confidence = calculateConfidenceScore(states, yearsToMortgage, yearsToDebtFree, viability.worstMarginRatio);
    
    bestResult = {
      locationId: location.id,
      isViable: false,
      viabilityTier: "Not Viable",
      yearsToMortgage,
      mortgageYear: mortgageState?.yearIndex ?? null,
      yearsToDebtFree,
      confidenceScore: confidence.score,
      confidenceLabel: confidence.label,
      minimumAllocationPercentNeeded: null,
      estimatedAffordableHouseValues: {},
      recommendedScore: confidence.score,
      estimatedSalary: states[0].salary,
      qualityOfLifeScore: location.qualityOfLife?.score,
      timeToHomeOwnership: yearsToMortgage,
      medianHomeValue: location.typicalHomeValue,
      targetHomeValue: mortgageState?.homeValue,
    };
  }
  
  // Calculate timeframe-based house values if in timeframe mode
  if (mortgageTimeline && typeof mortgageTimeline === 'number') {
    const horizons = [3, 5, 10, 20] as const;
    for (const horizon of horizons) {
      const value = calculateAffordableHouseValue(inputs, location, horizon);
      if (value) {
        bestResult.estimatedAffordableHouseValues[`horizon${horizon}`] = value;
        
        // Estimate house size tier
        const median = location.typicalHomeValue || 0;
        if (median > 0) {
          const ratio = value / median;
          let tier = "Small";
          if (ratio >= 1.5) tier = "Very Large";
          else if (ratio >= 1.2) tier = "Large";
          else if (ratio >= 0.8) tier = "Normal";
          bestResult.estimatedHouseSize = bestResult.estimatedHouseSize || {};
          bestResult.estimatedHouseSize[`horizon${horizon}`] = tier;
        }
      }
    }
  }
  
  return bestResult;
}
