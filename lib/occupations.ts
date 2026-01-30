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
