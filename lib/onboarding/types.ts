/**
 * Updated TypeScript Types for Onboarding
 * Based on the new survey structure with hard rules and partner income doubling
 */

// === STEP 1: Current Situation ===
export type CurrentSituationStatus =
  | 'graduated-independent'
  | 'student-independent'
  | 'student-soon-independent'
  | 'no-college'
  | 'younger-student'
  | 'other';

// === STEP 2: Household & Life Plan ===
export type RelationshipStatus =
  | 'single'
  | 'linked' // Married or financially linked
  | 'prefer-not-say';

export type RelationshipPlan =
  | 'yes'
  | 'no'
  | 'unsure';

export type KidsPlan =
  | 'yes'
  | 'no'
  | 'unsure'
  | 'have-kids';

export type HardRule =
  | 'debt-before-kids'
  | 'mortgage-before-kids'
  | 'kids-asap-viable'
  | 'none';

// === STEP 3: Age & Occupation ===
export type DebtCalculationMethod =
  | 'input-amount'
  | 'estimate-by-major';

// === STEP 4: Financial Portfolio ===
export interface DebtEntry {
  type: 'cc-debt' | 'car-debt' | 'other';
  totalDebt: number;
  interestRate: number; // APR for CC, interest rate for others
  ccRefreshMonths?: number; // Only for CC debt
}

// === STEP 6: Location ===
export type LocationSituation =
  | 'currently-live-may-move'
  | 'know-exactly'
  | 'deciding-between'
  | 'no-idea';

// === Complete Onboarding Answers (Raw User Input) ===
export interface OnboardingAnswers {
  // Step 1: Current Situation
  currentSituation: CurrentSituationStatus;
  
  // Step 2: Household & Life Plan
  relationshipStatus: RelationshipStatus;
  relationshipPlans?: RelationshipPlan; // If single (note: plural)
  plannedRelationshipAge?: number; // If planning relationship
  kidsPlan: KidsPlan;
  firstKidAge?: number; // If planning kids
  secondKidAge?: number; // If planning 2nd kid (optional)
  thirdKidAge?: number; // If planning 3rd kid (optional)
  numKids?: number; // If already have kids
  planMoreKids?: boolean; // If already have kids (boolean not string)
  plannedNextKidAge?: number; // If planning more kids
  hardRules: HardRule[]; // Can select multiple
  
  // Step 3: Age & Occupation
  currentAge?: number; // If independent
  expectedIndependenceAge?: number; // If not independent yet
  userOccupation: string;
  userSalary?: number; // Optional manual override (renamed from userSalaryManual)
  partnerOccupation?: string; // Only if linked/planning relationship
  partnerSalary?: number; // Optional manual override (renamed from partnerSalaryManual)
  
  // Step 4: Financial Portfolio
  userStudentLoanDebt: number;
  userStudentLoanRate: number;
  partnerStudentLoanDebt?: number;
  partnerStudentLoanRate?: number;
  debtCalculationMethod?: DebtCalculationMethod; // For students
  major?: string; // If using estimate by major
  partnerMajor?: string; // For linked students
  additionalDebts: DebtEntry[];
  savingsAccountValue: number;
  
  // Step 5: Allocation
  disposableIncomeAllocation: number; // Percent (0-100)
  
  // Step 6: Location
  locationSituation: LocationSituation;
  currentLocation?: string; // State name
  potentialLocations: string[]; // State names
  exactLocation?: string; // State name if know exactly
}

// === Normalized User Profile (For Calculations) ===
export interface UserProfile {
  // Demographics
  currentAge: number;
  isFinanciallyIndependent: boolean;
  expectedIndependenceAge?: number;
  
  // Household Type
  householdType: HouseholdTypeEnum;
  relationshipStatus: RelationshipStatus;
  relationshipPlans?: RelationshipPlan;
  plannedRelationshipAge?: number;
  numEarners: 1 | 2;
  numKids: number;
  
  // Life Planning
  kidsPlan: KidsPlan;
  plannedKidAges: number[]; // Ages when kids are planned
  hardRules: HardRule[];
  
  // Income
  userOccupation: string;
  userSalary?: number; // Manual override if provided
  partnerOccupation?: string;
  partnerSalary?: number;
  usePartnerIncomeDoubling: boolean; // If using the doubling rule
  
  // Debt
  studentLoanDebt: number; // Combined user + partner
  studentLoanRate: number; // Weighted average
  creditCardDebt: number;
  creditCardAPR: number;
  creditCardRefreshMonths: number;
  carDebt: number;
  carDebtRate: number;
  otherDebt: number;
  otherDebtRate: number;
  
  // Savings
  currentSavings: number;
  
  // Preferences
  disposableIncomeAllocation: number; // Percent
  
  // Location
  locationSituation: LocationSituation;
  selectedLocations: string[]; // List of states to analyze
  currentLocation?: string;
}

// === Household Type Enum (12 Types) ===
export enum HouseholdTypeEnum {
  OnePerson = '1-person',
  OneWorkerOneAdult = '1-worker-1-adult',
  TwoEarners = '2-earners',
  SingleParentOneKid = 'single-parent-1-kid',
  SingleParentTwoKids = 'single-parent-2-kids',
  SingleParentThreeKids = 'single-parent-3-kids',
  FamilyThreeOneWorker = 'family-3-1-worker',
  FamilyFourOneWorker = 'family-4-1-worker',
  FamilyFiveOneWorker = 'family-5-1-worker',
  FamilyThreeTwoWorkers = 'family-3-2-workers',
  FamilyFourTwoWorkers = 'family-4-2-workers',
  FamilyFiveTwoWorkers = 'family-5-2-workers',
}

/**
 * Helper function to determine household type from relationship status and kids
 */
export function determineHouseholdType(
  relationshipStatus: RelationshipStatus,
  numEarners: number,
  numKids: number
): HouseholdTypeEnum {
  // Single person
  if (relationshipStatus === 'single' && numKids === 0) {
    return HouseholdTypeEnum.OnePerson;
  }
  
  // Single parent
  if (relationshipStatus === 'single' && numKids > 0) {
    if (numKids === 1) return HouseholdTypeEnum.SingleParentOneKid;
    if (numKids === 2) return HouseholdTypeEnum.SingleParentTwoKids;
    return HouseholdTypeEnum.SingleParentThreeKids;
  }
  
  // Linked/Married with no kids
  if (numKids === 0) {
    if (numEarners === 1) return HouseholdTypeEnum.OneWorkerOneAdult;
    return HouseholdTypeEnum.TwoEarners;
  }
  
  // Linked/Married with kids
  if (numEarners === 1) {
    if (numKids + 2 === 3) return HouseholdTypeEnum.FamilyThreeOneWorker;
    if (numKids + 2 === 4) return HouseholdTypeEnum.FamilyFourOneWorker;
    return HouseholdTypeEnum.FamilyFiveOneWorker;
  }
  
  // Two earners with kids
  if (numKids + 2 === 3) return HouseholdTypeEnum.FamilyThreeTwoWorkers;
  if (numKids + 2 === 4) return HouseholdTypeEnum.FamilyFourTwoWorkers;
  return HouseholdTypeEnum.FamilyFiveTwoWorkers;
}

/**
 * Map household type enum to adjusted COL field names in location data
 */
export function getAdjustedCOLKey(householdType: HouseholdTypeEnum): keyof import('../data-extraction').LocationData['adjustedCOL'] {
  const mapping: Record<HouseholdTypeEnum, keyof import('../data-extraction').LocationData['adjustedCOL']> = {
    [HouseholdTypeEnum.OnePerson]: 'onePerson',
    [HouseholdTypeEnum.OneWorkerOneAdult]: 'oneWorkerOneAdult',
    [HouseholdTypeEnum.TwoEarners]: 'twoEarners',
    [HouseholdTypeEnum.SingleParentOneKid]: 'singleParentOneKid',
    [HouseholdTypeEnum.SingleParentTwoKids]: 'singleParentTwoKids',
    [HouseholdTypeEnum.SingleParentThreeKids]: 'singleParentThreeKids',
    [HouseholdTypeEnum.FamilyThreeOneWorker]: 'familyThreeOneWorker',
    [HouseholdTypeEnum.FamilyFourOneWorker]: 'familyFourOneWorker',
    [HouseholdTypeEnum.FamilyFiveOneWorker]: 'familyFiveOneWorker',
    [HouseholdTypeEnum.FamilyThreeTwoWorkers]: 'familyThreeTwoWorkers',
    [HouseholdTypeEnum.FamilyFourTwoWorkers]: 'familyFourTwoWorkers',
    [HouseholdTypeEnum.FamilyFiveTwoWorkers]: 'familyFiveTwoWorkers',
  };
  return mapping[householdType];
}

/**
 * Get rent type (1br, 2br, 3br) based on household type
 */
export function getRentType(householdType: HouseholdTypeEnum): '1br' | '2br' | '3br' {
  if (householdType === HouseholdTypeEnum.OnePerson ||
      householdType === HouseholdTypeEnum.OneWorkerOneAdult ||
      householdType === HouseholdTypeEnum.TwoEarners) {
    return '1br';
  }
  
  if (householdType === HouseholdTypeEnum.SingleParentOneKid ||
      householdType === HouseholdTypeEnum.FamilyThreeOneWorker ||
      householdType === HouseholdTypeEnum.FamilyThreeTwoWorkers) {
    return '2br';
  }
  
  return '3br';
}
