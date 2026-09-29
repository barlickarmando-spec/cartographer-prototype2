/**
 * Occupation keys matching JSON columns D–Y (spreadsheet export).
 * Exact spellings from the workbook.
 */

export const OCCUPATION_KEYS = [
  "Management",
  "Business and Operations",
  "Computer and Mathematics",
  "Architecture and Engineering",
  "Life, Physical, and Social Science",
  "Community Service",
  "Legal Work",
  "Education, Training, Library",
  "Arts, Design, Entertainment, Sports, Media",
  "Healthcare Practioners and Technical Work",
  "Healthcare Support",
  "Protective Service",
  "Food Preparation and Serving",
  "Cleaning and Maintenance",
  "Personal Care and Service",
  "Sales and Related",
  "Office and Administrative Support",
  "Farming, Fishing, and Forestry",
  "Construction and Extraction",
  "Insallation, Maintenance, and Repair",
  "Production",
  "Transportation and Material Moving",
] as const;

export type OccupationKey = (typeof OCCUPATION_KEYS)[number];

const OCCUPATION_SET = new Set<string>(OCCUPATION_KEYS);

export function isOccupationKey(x: string): x is OccupationKey {
  return OCCUPATION_SET.has(x);
}

/**
 * Annual salary growth rates by occupation sector.
 * Based on BLS Employment Cost Index and Occupational Outlook Handbook trends.
 */
export const OCCUPATION_GROWTH_RATES: Record<OccupationKey, number> = {
  "Management": 0.035,
  "Business and Operations": 0.032,
  "Computer and Mathematics": 0.042,
  "Architecture and Engineering": 0.035,
  "Life, Physical, and Social Science": 0.030,
  "Community Service": 0.025,
  "Legal Work": 0.033,
  "Education, Training, Library": 0.022,
  "Arts, Design, Entertainment, Sports, Media": 0.028,
  "Healthcare Practioners and Technical Work": 0.038,
  "Healthcare Support": 0.030,
  "Protective Service": 0.025,
  "Food Preparation and Serving": 0.020,
  "Cleaning and Maintenance": 0.020,
  "Personal Care and Service": 0.023,
  "Sales and Related": 0.025,
  "Office and Administrative Support": 0.018,
  "Farming, Fishing, and Forestry": 0.015,
  "Construction and Extraction": 0.030,
  "Insallation, Maintenance, and Repair": 0.028,
  "Production": 0.022,
  "Transportation and Material Moving": 0.025,
};

const AVG_GROWTH_RATE =
  Object.values(OCCUPATION_GROWTH_RATES).reduce((s, r) => s + r, 0) /
  Object.values(OCCUPATION_GROWTH_RATES).length;

export function getOccupationGrowthRate(occupation: string): number {
  if (isOccupationKey(occupation)) return OCCUPATION_GROWTH_RATES[occupation];
  return AVG_GROWTH_RATE;
}

const FULL_GROWTH_YEARS = 15;
const TAPER_END_YEAR = 25;
const MAX_MULTIPLIER = 3.0;

export function getGrowingSalary(baseSalary: number, annualRate: number, year: number): number {
  let salary: number;
  if (year <= FULL_GROWTH_YEARS) {
    salary = baseSalary * Math.pow(1 + annualRate, year);
  } else if (year <= TAPER_END_YEAR) {
    const atFull = baseSalary * Math.pow(1 + annualRate, FULL_GROWTH_YEARS);
    salary = atFull * Math.pow(1 + annualRate / 2, year - FULL_GROWTH_YEARS);
  } else {
    const atFull = baseSalary * Math.pow(1 + annualRate, FULL_GROWTH_YEARS);
    salary = atFull * Math.pow(1 + annualRate / 2, TAPER_END_YEAR - FULL_GROWTH_YEARS);
  }
  return Math.min(salary, baseSalary * MAX_MULTIPLIER);
}
