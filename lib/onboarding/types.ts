/**
 * Strict types for onboarding: raw answers and normalized user profile.
 */

import type { LocationOption } from "@/lib/locations";
import type { OccupationKey } from "@/lib/occupations";

/** Single option in a select (value + label) */
export type SelectOption = { value: string; label: string };

/** One "other debt" row: category, balance, interest rate */
export interface OtherDebtRow {
  category: string;
  balance: number;
  interestRate: number;
}

/** One financial support entry (type + duration + affects + amount) */
export interface FinancialSupportEntry {
  type: string;
  duration: string;
  affects: string;
  annualAmount: number | null;
}

/**
 * Raw onboarding answers — exactly what the user selected/typed.
 * All keys that can be collected across the 9 steps.
 */
export interface OnboardingAnswers {
  // Step 1: goal
  goal?: string;

  // Step 2: current status
  currentStatus?: string;
  currentAge?: number;
  expectedIndependenceAge?: number;
  expectedGraduationAge?: number;

  // Step 3: household & life plan
  relationshipStatus?: string;
  planToMarry?: string;
  twoIncomesOrJustMe?: string;
  financialRelationship?: string;
  partnerStatus?: string;
  planKids?: string;
  plannedKidAge?: number | null;
  testKidViability?: string;
  existingKidsCount?: number;
  planMoreKids?: string;
  moreKidsPlannedAge?: number | null;
  moreKidsTestViability?: string;

  // Step 4: career
  careerOutlook?: string;
  occupation?: string;
  salary?: number | null;
  useOccupationEstimate?: boolean;
  expectPayIncrease?: string;
  incomeStability?: string;
  studentInterests?: string[];
  studentTopChoiceOnly?: string;
  partnerOccupation?: string;
  partnerSalary?: number | null;
  partnerUseEstimate?: boolean;
  partnerExpectPayIncrease?: string;
  partnerIncomeStability?: string;

  // Step 5: financial support
  supportEntries?: FinancialSupportEntry[];

  // Step 6: debt & savings
  studentLoanBalance?: number;
  studentLoanRate?: number;
  creditCardDebt?: number | null;
  ccApr?: number | null;
  otherDebts?: OtherDebtRow[];
  savings?: number | null;
  savingsRate?: number | null;

  // Step 7: preferences
  allocationPercent?: number;
  priority?: string;
  mortgageTimelineWillingness?: string;
  desiredHouseSize?: string;
  tradeoffPreference?: string;

  // Step 8: locations
  locationSituation?: string;
  currentLocation?: LocationOption | null;
  selectedLocations?: LocationOption[];
  /** Derived: currentLocation?.id ?? selectedLocations?.[0]?.id ?? null */
  defaultLocationId?: string | null;
  noIdeaLocations?: boolean;

  // Step 9: no new fields (review only)
}

/**
 * Normalized user profile — output of onboarding normalization.
 * Includes derived flags computed during normalization.
 */

/** Career block in normalized profile (occupation keys from workbook). */
export interface UserProfileCareer {
  primaryOccupation: OccupationKey;
  partnerOccupation: OccupationKey | null;
}

export interface UserProfileLocations {
  defaultLocationId: string | null;
  currentLocation: LocationOption | null;
  consideredLocations: LocationOption[];
}

export interface UserProfile {
  // Raw answers (copied for reference)
  raw: OnboardingAnswers;

  // Derived flags
  isStudent: boolean;
  isFinanciallyIndependent: boolean;
  expectedIndependenceAge: number | null;
  householdType: "single" | "partnered" | "married" | "unknown";
  numEarners: number;
  kidsPlan: "none" | "planned" | "existing" | "unsure";
  locationMode: "moving" | "fixed" | "choosing" | "unknown";
  locations: UserProfileLocations;
  career: UserProfileCareer;
}
