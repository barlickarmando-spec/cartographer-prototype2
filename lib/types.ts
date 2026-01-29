// User input types for questionnaire
export type HouseholdType = "single" | "marriedOneIncome" | "marriedTwoIncome";

export type CareerStatus = 
  | "highSchool"
  | "undergraduate"
  | "graduate"
  | "postgrad"
  | "earlyCareer"
  | "midCareer"
  | "lateCareer"
  | "retired";

export type Approach = "auto" | "balanced" | "aggressive" | "conservative";

export type MortgageTimeline = "asap" | 3 | 5 | 10 | 20;

export interface StudentLoanDebt {
  balance: number;
  rate: number; // annual rate
}

export interface CreditCardDebt {
  balance: number;
  apr: number; // annual percentage rate
  annualRefresh?: number; // optional: new debt added annually
  refreshInterval?: number; // optional: refresh every N years
}

export interface UserInputs {
  // Basic info
  age?: number;
  householdType: HouseholdType;
  careerStatus: CareerStatus;
  
  // Occupations and salaries
  occupation1?: string; // occupation field key
  salary1?: number; // override salary
  occupation2?: string; // for second earner
  salary2?: number; // override salary for second earner
  
  // Kids
  kidsAges?: number[]; // up to 3 future kids ages
  
  // Debts
  studentLoan?: StudentLoanDebt;
  creditCard?: CreditCardDebt;
  
  // Financial parameters
  savingsRate?: number; // default 0.03
  allocationPercent?: number; // default 0.70
  approach: Approach;
  mortgageTimeline: MortgageTimeline;
  
  // Location selection
  selectedLocations: string[]; // location IDs
  
  // Optional personalization
  personalizationText?: string;
}

// Simulation result types
export interface SimulationResult {
  locationId: string;
  isViable: boolean;
  viabilityTier: "Excellent" | "Good" | "Borderline" | "Low" | "Not Viable";
  yearsToMortgage: number | null;
  mortgageYear: number | null;
  yearsToDebtFree: number | null;
  confidenceScore: number; // 0-100
  confidenceLabel: string;
  minimumAllocationPercentNeeded: number | null;
  estimatedAffordableHouseValues: {
    horizon3?: number;
    horizon5?: number;
    horizon10?: number;
    horizon20?: number;
  };
  recommendedScore: number; // combined score
  // Additional details
  estimatedSalary?: number;
  qualityOfLifeScore?: number;
  timeToHomeOwnership?: number; // same as yearsToMortgage
  minimumStableAgeForKids?: number;
  medianHomeValue?: number;
  targetHomeValue?: number;
  estimatedHouseSize?: {
    horizon3?: string;
    horizon5?: string;
    horizon10?: string;
    horizon20?: string;
  };
}

export interface SavedScenario {
  id: string;
  inputs: UserInputs;
  locationIds: string[];
  timestamp: number;
  results?: SimulationResult[];
}
