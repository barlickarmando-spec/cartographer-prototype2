/**
 * Normalize OnboardingAnswers into UserProfile for calculations
 * Handles partner income doubling rule, debt consolidation, and household type determination
 */

import {
  OnboardingAnswers,
  UserProfile,
  HouseholdTypeEnum,
  determineHouseholdType,
  HardRule,
} from './types';

/**
 * Convert raw onboarding answers into normalized UserProfile
 */
export function normalizeOnboardingAnswers(answers: OnboardingAnswers): UserProfile {
  // === Demographics ===
  const isFinanciallyIndependent =
    answers.currentSituation === 'graduated-independent' ||
    answers.currentSituation === 'student-independent';
  
  const currentAge = answers.currentAge || answers.expectedIndependenceAge || 22;
  const expectedIndependenceAge = !isFinanciallyIndependent ? answers.expectedIndependenceAge : undefined;
  
  // === Household ===
  const relationshipStatus = answers.relationshipStatus;
  const numEarners: 1 | 2 = relationshipStatus === 'linked' && answers.partnerOccupation ? 2 : 1;
  const numKids = answers.kidsPlan === 'have-kids' ? (answers.numKids || 0) : 0;
  
  const householdType = determineHouseholdType(relationshipStatus, numEarners, numKids);
  
  // === Life Planning ===
  const kidsPlan = answers.kidsPlan;
  const plannedKidAges: number[] = [];
  
  if (answers.firstKidAge) {
    plannedKidAges.push(answers.firstKidAge);
  }
  
  if (answers.plannedNextKidAge) {
    plannedKidAges.push(answers.plannedNextKidAge);
  }
  
  // Hard rules (can be multiple, but we'll take the first for calculations)
  const hardRules: HardRule[] = answers.hardRules || ['none'];
  
  // === Income ===
  const userOccupation = answers.userOccupation || 'Management';
  const userSalary = answers.userSalary;
  const partnerOccupation = answers.partnerOccupation;
  const partnerSalary = answers.partnerSalary;
  
  // Partner income doubling rule: If linked but no partner occupation specified
  const usePartnerIncomeDoubling =
    relationshipStatus === 'linked' && !partnerOccupation && !partnerSalary;
  
  // === Debt ===
  const userLoanDebt = answers.userStudentLoanDebt || 0;
  const userLoanRate = answers.userStudentLoanRate || 0.05;
  const partnerLoanDebt = answers.partnerStudentLoanDebt || 0;
  const partnerLoanRate = answers.partnerStudentLoanRate || 0.05;
  
  // Combined student loan debt (weighted average rate)
  const totalLoanDebt = userLoanDebt + partnerLoanDebt;
  const studentLoanRate =
    totalLoanDebt > 0
      ? (userLoanDebt * userLoanRate + partnerLoanDebt * partnerLoanRate) / totalLoanDebt
      : 0.05;
  
  // Additional debts
  let creditCardDebt = 0;
  let creditCardAPR = 0.216; // Default 21.6%
  let creditCardRefreshMonths = 12; // Default 1 year refresh
  let carDebt = 0;
  let carDebtRate = 0.07; // Default 7%
  let otherDebt = 0;
  let otherDebtRate = 0.06; // Default 6%
  
  for (const debt of answers.additionalDebts || []) {
    if (debt.type === 'cc-debt') {
      creditCardDebt += debt.totalDebt;
      creditCardAPR = debt.interestRate || 0.216;
      creditCardRefreshMonths = debt.ccRefreshMonths || 12;
    } else if (debt.type === 'car-debt') {
      carDebt += debt.totalDebt;
      carDebtRate = debt.interestRate || 0.07;
    } else {
      otherDebt += debt.totalDebt;
      otherDebtRate = debt.interestRate || 0.06;
    }
  }
  
  // === Savings ===
  const currentSavings = answers.savingsAccountValue || 0;
  
  // === Allocation ===
  const disposableIncomeAllocation = answers.disposableIncomeAllocation || 75;
  
  // === Location ===
  const locationSituation = answers.locationSituation;
  const selectedLocations: string[] = [];
  
  if (answers.exactLocation) {
    selectedLocations.push(answers.exactLocation);
  }
  
  if (answers.potentialLocations && answers.potentialLocations.length > 0) {
    selectedLocations.push(...answers.potentialLocations);
  }
  
  if (answers.currentLocation && !selectedLocations.includes(answers.currentLocation)) {
    selectedLocations.push(answers.currentLocation);
  }
  
  // If no locations selected, default to "Utah" (or any default you prefer)
  if (selectedLocations.length === 0) {
    selectedLocations.push('Utah');
  }
  
  const currentLocation = answers.currentLocation;
  
  // === Build Profile ===
  return {
    currentAge,
    isFinanciallyIndependent,
    expectedIndependenceAge,
    householdType,
    relationshipStatus,
    numEarners,
    numKids,
    kidsPlan,
    plannedKidAges,
    hardRules,
    userOccupation,
    userSalary,
    partnerOccupation,
    partnerSalary,
    usePartnerIncomeDoubling,
    studentLoanDebt: totalLoanDebt,
    studentLoanRate,
    creditCardDebt,
    creditCardAPR,
    creditCardRefreshMonths,
    carDebt,
    carDebtRate,
    otherDebt,
    otherDebtRate,
    currentSavings,
    disposableIncomeAllocation,
    locationSituation,
    selectedLocations,
    currentLocation,
  };
}
