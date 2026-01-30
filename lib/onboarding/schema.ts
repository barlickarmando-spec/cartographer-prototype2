/**
 * Onboarding wizard schema: steps and fields with optional conditional visibility.
 */

import type { OnboardingAnswers } from "./types";

export type FieldType =
  | "select"
  | "multiselect"
  | "number"
  | "text"
  | "checkbox"
  | "slider"
  | "occupation"
  | "location_situation"
  | "other_debts"
  | "support_entries"
  | "locations_picker";

export interface ShowWhen {
  fieldKey: keyof OnboardingAnswers;
  value: string | string[];
}

export interface SchemaField {
  key: keyof OnboardingAnswers;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  showWhen?: ShowWhen;
  placeholder?: string;
  min?: number;
  max?: number;
  default?: unknown;
  /** For number: step (e.g. 1 or 0.5). For slider: step. */
  step?: number;
}

export interface SchemaStep {
  id: string;
  title: string;
  fields: SchemaField[];
}

const GOAL_OPTIONS = [
  { value: "debt_free_timeline", label: "Debt free timeline" },
  { value: "afford_home_fastest", label: "Where I can afford a home fastest" },
  { value: "rent_vs_buy", label: "Rent long-term vs buy" },
  { value: "city_wealth", label: "Which city/state generates the most wealth" },
  { value: "realistic_own_home", label: "How long until I can realistically own a home" },
  { value: "best_age_kids", label: "Best age financially to have kids" },
  { value: "career_planning", label: "Sustainable long-term career planning" },
  { value: "not_sure", label: "I'm not sure yet / explore" },
];

const CURRENT_STATUS_OPTIONS = [
  { value: "graduated_independent", label: "Graduated and financially independent" },
  { value: "student_independent", label: "Student, financially independent" },
  { value: "student_soon", label: "Student, becoming independent soon" },
  { value: "no_college", label: "No college experience / no intent" },
  { value: "other", label: "Other / in transition" },
];

const RELATIONSHIP_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married / financially linked relationship" },
  { value: "prefer_not", label: "Prefer not to say" },
];

const YES_NO_PREFER = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "prefer_not", label: "Prefer not to say" },
];

const TWO_INCOMES_OPTIONS = [
  { value: "two_incomes", label: "Two incomes (you + partner)" },
  { value: "just_me", label: "Just me" },
];

const FINANCIAL_RELATIONSHIP_OPTIONS = [
  { value: "one_earner", label: "One income earner" },
  { value: "two_earners", label: "Two income earners" },
];

const PLAN_KIDS_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unsure", label: "Unsure" },
  { value: "already", label: "I already have them" },
];

const CAREER_OUTLOOK_OPTIONS = [
  { value: "graduated_working", label: "Graduated, currently working" },
  { value: "no_college_working", label: "No college work, currently working" },
  { value: "student_deciding", label: "Student, still deciding career path" },
  { value: "student_sure", label: "Student, sure of general career path" },
  { value: "other", label: "Other / in transition" },
];

const INCOME_STABILITY_OPTIONS = [
  { value: "very_stable", label: "Very stable" },
  { value: "likely_stable", label: "Likely stable" },
  { value: "uncertain", label: "Uncertain/changing" },
  { value: "offer_not_started", label: "Offer in hand not started" },
];

const SUPPORT_TYPES = [
  { value: "family", label: "Family support" },
  { value: "scholarships", label: "Scholarships/grants" },
  { value: "employer", label: "Employer assistance" },
  { value: "housing", label: "Housing assistance" },
  { value: "partner", label: "Partner support" },
  { value: "none", label: "None" },
];

const SUPPORT_DURATION_OPTIONS = [
  { value: "less_than_1", label: "Less than 1 year" },
  { value: "1_3", label: "1–3 years" },
  { value: "3_5", label: "3–5 years" },
  { value: "indefinitely", label: "Indefinitely" },
  { value: "not_sure", label: "Not sure (assume 3 years)" },
];

const SUPPORT_AFFECTS_OPTIONS = [
  { value: "living", label: "Living costs" },
  { value: "debt", label: "Debt" },
  { value: "both", label: "Both" },
  { value: "not_sure", label: "Not sure" },
];

const PRIORITY_OPTIONS = [
  { value: "mortgage", label: "Mortgage" },
  { value: "debt", label: "Debt" },
  { value: "wealth", label: "Wealth" },
  { value: "middle", label: "Middle" },
  { value: "all", label: "All" },
];

const MORTGAGE_TIMELINE_OPTIONS = [
  { value: "3_yrs", label: "3 years" },
  { value: "5_yrs", label: "5 years" },
  { value: "10_plus", label: "10+" },
  { value: "unsure", label: "Unsure" },
];

const HOUSE_SIZE_OPTIONS = [
  { value: "depends", label: "Depends" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "very_large", label: "Very large" },
];

const TRADEOFF_OPTIONS = [
  { value: "speed", label: "Speed" },
  { value: "size", label: "Size" },
  { value: "middle", label: "Middle" },
  { value: "unsure", label: "Unsure" },
];

const OCCUPATION_INTERESTS = [
  { value: "Software Engineer", label: "Software Engineer" },
  { value: "Nurse", label: "Nurse" },
  { value: "Teacher", label: "Teacher" },
  { value: "Doctor", label: "Doctor" },
  { value: "Accountant", label: "Accountant" },
  { value: "Data Scientist", label: "Data Scientist" },
  { value: "Marketing", label: "Marketing" },
  { value: "Sales", label: "Sales" },
  { value: "Design", label: "Design" },
  { value: "Legal", label: "Legal" },
  { value: "Engineering", label: "Engineering" },
  { value: "Healthcare", label: "Healthcare" },
  { value: "Finance", label: "Finance" },
  { value: "Other", label: "Other" },
];

const LOCATION_SITUATION_OPTIONS = [
  { value: "moving", label: "I currently live/work somewhere and may move soon" },
  { value: "know_exactly", label: "I know exactly where I will live" },
  { value: "deciding", label: "I'm deciding between a few places" },
  { value: "no_idea", label: "I have no idea and want the best fit" },
];

export const ONBOARDING_SCHEMA: SchemaStep[] = [
  {
    id: "step1_goal",
    title: "What do you want to figure out right now?",
    fields: [
      { key: "goal", label: "Primary goal", type: "select", options: GOAL_OPTIONS, required: true },
    ],
  },
  {
    id: "step2_status",
    title: "Current status",
    fields: [
      { key: "currentStatus", label: "Current status", type: "select", options: CURRENT_STATUS_OPTIONS, required: true },
      { key: "currentAge", label: "Current age", type: "number", required: true, showWhen: { fieldKey: "currentStatus", value: "graduated_independent" }, min: 18, max: 120 },
      { key: "expectedIndependenceAge", label: "Expected age of independence", type: "number", required: true, showWhen: { fieldKey: "currentStatus", value: "student_soon" }, min: 18, max: 120 },
      { key: "expectedGraduationAge", label: "Expected graduation/independence age", type: "number", required: true, showWhen: { fieldKey: "currentStatus", value: "student_independent" }, min: 18, max: 120 },
    ],
  },
  {
    id: "step3_household",
    title: "Household & life plan",
    fields: [
      { key: "relationshipStatus", label: "Relationship status", type: "select", options: RELATIONSHIP_OPTIONS, required: true },
      { key: "planToMarry", label: "Do you plan on getting married?", type: "select", options: YES_NO_PREFER, required: true, showWhen: { fieldKey: "relationshipStatus", value: "single" } },
      { key: "twoIncomesOrJustMe", label: "Calculate with two incomes or just you?", type: "select", options: TWO_INCOMES_OPTIONS, required: true, showWhen: { fieldKey: "planToMarry", value: "yes" } },
      { key: "financialRelationship", label: "Financial relationship", type: "select", options: FINANCIAL_RELATIONSHIP_OPTIONS, required: true, showWhen: { fieldKey: "relationshipStatus", value: "married" } },
      { key: "partnerStatus", label: "Partner status", type: "select", options: CURRENT_STATUS_OPTIONS, required: false, showWhen: { fieldKey: "relationshipStatus", value: "married" } },
      { key: "planKids", label: "Do you plan on having kids?", type: "select", options: PLAN_KIDS_OPTIONS, required: true },
      { key: "plannedKidAge", label: "Planned age to have kids", type: "number", required: false, showWhen: { fieldKey: "planKids", value: "yes" }, min: 18, max: 60 },
      { key: "testKidViability", label: "Should we test kid viability?", type: "select", options: YES_NO_PREFER, required: true, showWhen: { fieldKey: "planKids", value: "unsure" } },
      { key: "existingKidsCount", label: "Number of kids", type: "number", required: true, showWhen: { fieldKey: "planKids", value: "already" }, min: 1, max: 20 },
      { key: "planMoreKids", label: "Plan to have more?", type: "select", options: [...YES_NO_PREFER, { value: "unsure", label: "Unsure" }], required: true, showWhen: { fieldKey: "planKids", value: "already" } },
      { key: "moreKidsPlannedAge", label: "Planned age for more kids", type: "number", required: false, showWhen: { fieldKey: "planMoreKids", value: "yes" }, min: 18, max: 60 },
      { key: "moreKidsTestViability", label: "Should we test kid viability?", type: "select", options: YES_NO_PREFER, required: true, showWhen: { fieldKey: "planMoreKids", value: "unsure" } },
    ],
  },
  {
    id: "step4_career",
    title: "Career path",
    fields: [
      { key: "careerOutlook", label: "Current career outlook", type: "select", options: CAREER_OUTLOOK_OPTIONS, required: true },
      { key: "occupation", label: "Occupation", type: "occupation", required: true, showWhen: { fieldKey: "careerOutlook", value: ["graduated_working", "no_college_working"] } },
      { key: "salary", label: "Salary (annual)", type: "number", required: false, showWhen: { fieldKey: "careerOutlook", value: ["graduated_working", "no_college_working"] }, min: 0 },
      { key: "useOccupationEstimate", label: "Use occupation estimate instead", type: "checkbox", required: false, showWhen: { fieldKey: "careerOutlook", value: ["graduated_working", "no_college_working"] }, default: false },
      { key: "expectPayIncrease", label: "Do you expect to increase pay soon?", type: "select", options: YES_NO_PREFER, required: false, showWhen: { fieldKey: "careerOutlook", value: ["graduated_working", "no_college_working"] } },
      { key: "incomeStability", label: "Income stability", type: "select", options: INCOME_STABILITY_OPTIONS, required: true, showWhen: { fieldKey: "careerOutlook", value: ["graduated_working", "no_college_working"] } },
      { key: "studentInterests", label: "Pick interests / occupations (multi-select, rank top 3)", type: "multiselect", required: true, showWhen: { fieldKey: "careerOutlook", value: "student_deciding" }, options: OCCUPATION_INTERESTS },
      { key: "studentTopChoiceOnly", label: "Use top choice only or weigh all?", type: "select", options: [{ value: "top_only", label: "Top choice only" }, { value: "weigh_all", label: "Weigh all" }], required: true, showWhen: { fieldKey: "careerOutlook", value: "student_deciding" } },
      { key: "partnerOccupation", label: "Partner occupation", type: "occupation", required: false, showWhen: { fieldKey: "financialRelationship", value: "two_earners" } },
      { key: "partnerSalary", label: "Partner salary (annual)", type: "number", required: false, showWhen: { fieldKey: "financialRelationship", value: "two_earners" }, min: 0 },
      { key: "partnerUseEstimate", label: "Use occupation estimate for partner", type: "checkbox", required: false, showWhen: { fieldKey: "financialRelationship", value: "two_earners" }, default: false },
      { key: "partnerExpectPayIncrease", label: "Partner expect pay increase soon?", type: "select", options: YES_NO_PREFER, required: false, showWhen: { fieldKey: "financialRelationship", value: "two_earners" } },
      { key: "partnerIncomeStability", label: "Partner income stability", type: "select", options: INCOME_STABILITY_OPTIONS, required: false, showWhen: { fieldKey: "financialRelationship", value: "two_earners" } },
    ],
  },
  {
    id: "step5_support",
    title: "Financial support",
    fields: [
      { key: "supportEntries", label: "Support types and details", type: "support_entries", required: false },
    ],
  },
  {
    id: "step6_debt",
    title: "Debt & savings snapshot",
    fields: [
      { key: "studentLoanBalance", label: "Student loan balance ($)", type: "number", required: true, min: 0 },
      { key: "studentLoanRate", label: "Student loan interest rate (%)", type: "number", required: true, min: 0, max: 30 },
      { key: "creditCardDebt", label: "Credit card debt ($)", type: "number", required: false, min: 0 },
      { key: "ccApr", label: "Credit card APR (%)", type: "number", required: false, min: 0, max: 50 },
      { key: "otherDebts", label: "Other debts", type: "other_debts", required: false },
      { key: "savings", label: "Savings ($)", type: "number", required: false, min: 0 },
      { key: "savingsRate", label: "Savings interest rate (%)", type: "number", required: false, min: 0, max: 20 },
    ],
  },
  {
    id: "step7_prefs",
    title: "Preferences",
    fields: [
      { key: "allocationPercent", label: "% of disposable income for debts + savings", type: "slider", required: true, min: 0, max: 100, default: 50, step: 5 },
      { key: "priority", label: "Priority", type: "select", options: PRIORITY_OPTIONS, required: true },
      { key: "mortgageTimelineWillingness", label: "Mortgage timeline willingness", type: "select", options: MORTGAGE_TIMELINE_OPTIONS, required: true },
      { key: "desiredHouseSize", label: "Desired house size", type: "select", options: HOUSE_SIZE_OPTIONS, required: true },
      { key: "tradeoffPreference", label: "Tradeoff preference", type: "select", options: TRADEOFF_OPTIONS, required: true },
    ],
  },
  {
    id: "step8_locations",
    title: "Locations",
    fields: [
      { key: "locationSituation", label: "Situation", type: "select", options: LOCATION_SITUATION_OPTIONS, required: true },
      { key: "currentLocation", label: "Current location", type: "locations_picker", required: false, showWhen: { fieldKey: "locationSituation", value: "moving" } },
      { key: "selectedLocations", label: "Locations", type: "locations_picker", required: true, showWhen: { fieldKey: "locationSituation", value: "know_exactly" } },
      { key: "selectedLocations", label: "Potential locations", type: "locations_picker", required: false, showWhen: { fieldKey: "locationSituation", value: "moving" } },
      { key: "selectedLocations", label: "Locations deciding between", type: "locations_picker", required: false, showWhen: { fieldKey: "locationSituation", value: "deciding" } },
    ],
  },
  {
    id: "step9_review",
    title: "Review & Finish",
    fields: [],
  },
];

/**
 * Check if a field should be visible given current answers.
 */
export function isFieldVisible(field: SchemaField, answers: OnboardingAnswers): boolean {
  if (!field.showWhen) return true;
  const raw = answers[field.showWhen.fieldKey];
  const val = Array.isArray(raw) ? raw.join(",") : String(raw ?? "");
  const matchVal = field.showWhen.value;
  if (Array.isArray(matchVal)) return matchVal.some((v) => val === v);
  return val === matchVal;
}

/**
 * For step 6: ccApr is required only when creditCardDebt > 0.
 */
export function isCcAprRequired(answers: OnboardingAnswers): boolean {
  const debt = answers.creditCardDebt;
  return typeof debt === "number" && debt > 0;
}

/**
 * Get visible fields for a step.
 */
export function getVisibleFieldsForStep(step: SchemaStep, answers: OnboardingAnswers): SchemaField[] {
  return step.fields.filter((f) => isFieldVisible(f, answers));
}

export { SUPPORT_TYPES, SUPPORT_DURATION_OPTIONS, SUPPORT_AFFECTS_OPTIONS };
