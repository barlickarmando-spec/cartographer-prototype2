/**
 * Normalization Logic
 * Converts raw OnboardingAnswers to normalized UserProfile
 */

import {
  OnboardingAnswers,
  UserProfile,
  RelationshipStatus,
  HouseholdTypeEnum,
  determineHouseholdType,
} from './onboarding-types';

// Constants
const AVERAGE_MARRIAGE_AGE = 30; // National average
const AVERAGE_FIRST_KID_AGE = 32; // National average

/**
 * Normalize onboarding answers into a user profile
 */
export function normalizeOnboardingAnswers(answers: OnboardingAnswers): UserProfile {
  // === Determine current age and independence ===
  let currentAge = answers.currentAge || answers.expectedIndependenceAge || 22;
  const isFinanciallyIndependent = 
    answers.currentSituation === 'graduated-independent' ||
    answers.currentSituation === 'student-independent' ||
    answers.currentSituation === 'no-college' ||
    answers.currentSituation === 'other';
  
  const expectedIndependenceAge = !isFinanciallyIndependent 
    ? (answers.expectedIndependenceAge || 22)
    : undefined;
  
  // === Determine relationship and earners ===
  let relationshipStatus = answers.relationshipStatus;
  let numEarners: 1 | 2 = 1;
  let usePartnerIncomeDoubling = false;
  
  // If single but planning relationship, we'll handle both scenarios
  if (relationshipStatus === 'single' && answers.relationshipPlans === 'yes') {
    // For now, treat as single (calculations will create scenarios)
    usePartnerIncomeDoubling = true; // Flag for later income doubling
  }
  
  if (relationshipStatus === 'linked') {
    // Check if partner occupation is provided
    if (answers.partnerOccupation && answers.partnerOccupation.trim()) {
      numEarners = 2;
    } else {
      // If no partner occupation, assume one earner for now
      numEarners = 1;
    }
  }
  
  // === Determine kids ===
  let numKids = 0;
  const plannedKidAges: number[] = [];
  
  if (answers.kidsPlan === 'have-kids') {
    numKids = answers.numberOfExistingKids || 0;
    
    // If planning more kids
    if (answers.planMoreKids === 'yes' || answers.planMoreKids === 'unsure') {
      const nextKidAge = answers.plannedNextKidAge || currentAge + 3;
      plannedKidAges.push(nextKidAge);
    }
  } else if (answers.kidsPlan === 'yes') {
    const firstKidAge = answers.plannedFirstKidAge || AVERAGE_FIRST_KID_AGE;
    plannedKidAges.push(firstKidAge);
  } else if (answers.kidsPlan === 'unsure') {
    // Add to planned ages for scenario testing
    const firstKidAge = answers.plannedFirstKidAge || AVERAGE_FIRST_KID_AGE;
    plannedKidAges.push(firstKidAge);
  }
  
  // === Determine household type ===
  const householdType = determineHouseholdType(relationshipStatus, numEarners, numKids);
  
  // === Consolidate debt ===
  let totalCCDebt = 0;
  let ccAPR = 0.216; // Default
  let ccRefreshMonths = 36; // Default 3 years
  let carDebt = 0;
  let carDebtRate = 0;
  let otherDebt = 0;
  let otherDebtRate = 0;
  
  for (const debt of answers.additionalDebts) {
    if (debt.type === 'cc-debt') {
      totalCCDebt += debt.totalDebt;
      ccAPR = debt.interestRate;
      if (debt.ccRefreshMonths) ccRefreshMonths = debt.ccRefreshMonths;
    } else if (debt.type === 'car-debt') {
      carDebt += debt.totalDebt;
      carDebtRate = debt.interestRate;
    } else {
      otherDebt += debt.totalDebt;
      otherDebtRate = debt.interestRate;
    }
  }
  
  // Combine student loans
  let totalStudentLoanDebt = answers.userStudentLoanDebt;
  let studentLoanRate = answers.userStudentLoanRate;
  
  if (answers.partnerStudentLoanDebt && answers.partnerStudentLoanDebt > 0) {
    // Weighted average of interest rates
    const userWeight = answers.userStudentLoanDebt;
    const partnerWeight = answers.partnerStudentLoanDebt || 0;
    const totalWeight = userWeight + partnerWeight;
    
    if (totalWeight > 0) {
      studentLoanRate = (
        (userWeight * answers.userStudentLoanRate) +
        (partnerWeight * (answers.partnerStudentLoanRate || 0))
      ) / totalWeight;
    }
    
    totalStudentLoanDebt += answers.partnerStudentLoanDebt;
  }
  
  // === Determine selected locations ===
  let selectedLocations: string[] = [];
  
  switch (answers.locationSituation) {
    case 'currently-live-may-move':
      if (answers.currentLocation) {
        selectedLocations.push(answers.currentLocation);
      }
      selectedLocations.push(...answers.potentialLocations);
      break;
    case 'know-exactly':
      if (answers.exactLocation) {
        selectedLocations = [answers.exactLocation];
      }
      break;
    case 'deciding-between':
      selectedLocations = answers.potentialLocations;
      break;
    case 'no-idea':
      // Empty list means analyze all locations
      selectedLocations = [];
      break;
  }
  
  // Remove duplicates
  selectedLocations = [...new Set(selectedLocations)];
  
  // === Build user profile ===
  return {
    // Demographics
    currentAge,
    isFinanciallyIndependent,
    expectedIndependenceAge,
    
    // Household
    householdType,
    relationshipStatus,
    numEarners,
    numKids,
    
    // Life Planning
    kidsPlan: answers.kidsPlan,
    plannedKidAges,
    hardRules: answers.hardRules,
    
    // Income
    userOccupation: answers.userOccupation,
    userSalary: answers.userSalaryManual,
    partnerOccupation: answers.partnerOccupation,
    partnerSalary: answers.partnerSalaryManual,
    usePartnerIncomeDoubling,
    
    // Debt
    studentLoanDebt: totalStudentLoanDebt,
    studentLoanRate,
    creditCardDebt: totalCCDebt,
    creditCardAPR: ccAPR,
    creditCardRefreshMonths: ccRefreshMonths,
    carDebt,
    carDebtRate,
    otherDebt,
    otherDebtRate,
    
    // Savings
    currentSavings: answers.savingsAccountValue,
    
    // Preferences
    disposableIncomeAllocation: answers.disposableIncomeAllocation,
    
    // Location
    locationSituation: answers.locationSituation,
    selectedLocations,
    currentLocation: answers.currentLocation,
  };
}
