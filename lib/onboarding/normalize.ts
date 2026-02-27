/**
 * Normalize OnboardingAnswers into UserProfile for calculations
 * Handles partner income doubling rule, debt consolidation, household type determination,
 * scenario-based kid planning, conditional debts, annual expenses, and location filtering.
 */

import {
  OnboardingAnswers,
  UserProfile,
  HouseholdTypeEnum,
  determineHouseholdType,
  HardRule,
  DebtEntry,
  AnnualExpense,
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
  const numEarners: 1 | 2 = relationshipStatus === 'linked' ? 2 : 1;
  const numKids = answers.kidsPlan === 'have-kids' ? (answers.numKids || 0) : 0;

  const householdType = determineHouseholdType(relationshipStatus, numEarners, numKids);

  // === Life Planning: Scenario-based kid planning ===
  const kidsPlan = answers.kidsPlan;
  const kidsKnowledge = answers.kidsKnowledge;
  const plannedKidAges: number[] = [];
  let declaredKidCount = 0;

  if (kidsPlan === 'yes') {
    if (kidsKnowledge === 'know-count') {
      // User knows how many kids they want
      declaredKidCount = Math.min(answers.declaredKidCount || 0, 3);

      // Build ages array from user input or defaults
      const defaultAges = [32, 34, 36];
      for (let i = 0; i < declaredKidCount; i++) {
        let age: number | undefined;
        if (i === 0) age = answers.firstKidAge;
        else if (i === 1) age = answers.secondKidAge;
        else if (i === 2) age = answers.thirdKidAge;

        // Validate: must be >= previous age
        const prevAge = i > 0 ? plannedKidAges[i - 1] : 0;
        if (age && age >= prevAge) {
          plannedKidAges.push(age);
        } else {
          plannedKidAges.push(Math.max(defaultAges[i], prevAge));
        }
      }
    } else if (kidsKnowledge === 'dont-know-count') {
      // User wants kids but doesn't know how many — engine will run scenarios
      declaredKidCount = 0;
      // Leave plannedKidAges empty — engine handles scenario branching
    } else {
      // Legacy path: kidsPlan === 'yes' without kidsKnowledge (backward compat)
      if (answers.firstKidAge) {
        plannedKidAges.push(answers.firstKidAge);
        declaredKidCount++;
      }
      if (answers.secondKidAge && answers.secondKidAge >= (answers.firstKidAge || 0)) {
        plannedKidAges.push(answers.secondKidAge);
        declaredKidCount++;
      }
      if (answers.thirdKidAge && answers.thirdKidAge >= (answers.secondKidAge || 0)) {
        plannedKidAges.push(answers.thirdKidAge);
        declaredKidCount++;
      }
    }
  } else if (kidsPlan === 'unsure') {
    // Model 1 kid at 32, engine will apply buffer as if 2 kids for stress testing
    declaredKidCount = 1;
    plannedKidAges.push(answers.firstKidAge || 32);
  } else if (kidsPlan === 'have-kids' && answers.plannedNextKidAge) {
    declaredKidCount = numKids;
    plannedKidAges.push(answers.plannedNextKidAge);
  } else if (kidsPlan === 'have-kids') {
    declaredKidCount = numKids;
  }

  // Hard rules
  const hardRules: HardRule[] = answers.hardRules || ['none'];

  // === Income ===
  const userOccupation = answers.userOccupation || 'Management';
  const userSalary = answers.userSalary;
  const partnerOccupation = answers.partnerOccupation;
  const partnerSalary = answers.partnerSalary;

  const usePartnerIncomeDoubling =
    relationshipStatus === 'linked' && !partnerOccupation && !partnerSalary;

  // Salary override for current location
  const currentSalaryOverride = answers.currentSalaryOverride;
  const currentSalaryLocation = answers.currentSalaryLocation;

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

  // Flatten immediate debts (no startAge or conditions) into legacy fields
  // Keep conditional debts separate for the engine event system
  let creditCardDebt = 0;
  let creditCardAPR = 0.216;
  let creditCardRefreshMonths = 12;
  let carDebt = 0;
  let carDebtRate = 0.07;
  let otherDebt = 0;
  let otherDebtRate = 0.06;
  const conditionalDebts: DebtEntry[] = [];

  for (const debt of answers.additionalDebts || []) {
    // Debts with conditions go to the conditional list for engine processing
    if (debt.startAge || debt.onlyAfterDebtFree || debt.onlyIfViable) {
      conditionalDebts.push(debt);
      continue;
    }

    // Immediate debts get flattened into legacy fields
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

  // === Annual Expenses ===
  const annualExpenses: AnnualExpense[] = answers.additionalExpenses || [];

  // === Savings ===
  const currentSavings = answers.savingsAccountValue || 0;

  // === Allocation (default changed from 75 to 50) ===
  const disposableIncomeAllocation = answers.disposableIncomeAllocation || 50;

  // === Location ===
  const locationSituation = answers.locationSituation;
  const selectedLocations: string[] = [];

  if (locationSituation !== 'no-idea') {
    if (answers.exactLocation) {
      selectedLocations.push(answers.exactLocation);
    }

    if (answers.potentialLocations && answers.potentialLocations.length > 0) {
      selectedLocations.push(...answers.potentialLocations);
    }

    if (answers.currentLocation && !selectedLocations.includes(answers.currentLocation)) {
      selectedLocations.push(answers.currentLocation);
    }
  }

  const currentLocation = answers.currentLocation;
  const locationRegions = answers.locationRegions || [];
  const locationClimate = answers.locationClimate || [];
  const locationPriority = answers.locationPriority || 'combination';

  // === Build Profile ===
  return {
    currentAge,
    isFinanciallyIndependent,
    expectedIndependenceAge,
    householdType,
    relationshipStatus,
    relationshipPlans: answers.relationshipPlans,
    plannedRelationshipAge: answers.plannedRelationshipAge,
    numEarners,
    numKids,
    kidsPlan,
    kidsKnowledge,
    declaredKidCount,
    plannedKidAges,
    hardRules,
    userOccupation,
    userSalary,
    partnerOccupation,
    partnerSalary,
    usePartnerIncomeDoubling,
    currentSalaryOverride,
    currentSalaryLocation,
    studentLoanDebt: totalLoanDebt,
    studentLoanRate,
    creditCardDebt,
    creditCardAPR,
    creditCardRefreshMonths,
    carDebt,
    carDebtRate,
    otherDebt,
    otherDebtRate,
    conditionalDebts,
    annualExpenses,
    currentSavings,
    disposableIncomeAllocation,
    locationSituation,
    selectedLocations,
    currentLocation,
    locationRegions,
    locationClimate,
    locationPriority,
  };
}
