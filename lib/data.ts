import combinedData from '@/data/data_json_combined.json';

export type LocationType = "state" | "city";

export type Location = {
  id: string; // "state:FL" or "city:Miami, FL"
  type: LocationType;
  name: string; // "Florida" or "Miami"
  stateAbbr?: string; // for cities
  stateName?: string;
  // affordability inputs
  typicalHomeValue?: number;
  mortgageRate?: number; // annual
  downPaymentPct?: number; // decimal
  // Cost of living columns: must include variants for household types
  colAnnual?: {
    single?: number;
    marriedOneIncome?: number;
    marriedTwoIncome?: number;
    // with kids variants as available
    singleParent1Kid?: number;
    familyOf3_2Workers?: number;
    familyOf4_2Workers?: number;
    familyOf5_2Workers?: number;
    familyOf3_1Worker?: number;
    familyOf4_1Worker?: number;
    familyOf5_1Worker?: number;
    // keep flexible
    [key: string]: number | undefined;
  };
  // Adjusted COL after mortgage (if present in data)
  adjustedColAnnual?: {
    single?: number;
    marriedOneIncome?: number;
    marriedTwoIncome?: number;
    singleParent1Kid?: number;
    familyOf3_2Workers?: number;
    familyOf4_2Workers?: number;
    familyOf5_2Workers?: number;
    familyOf3_1Worker?: number;
    familyOf4_1Worker?: number;
    familyOf5_1Worker?: number;
    [key: string]: number | undefined;
  };
  // salaries by occupation code or label
  salaries?: Record<string, number>; // occupation.value -> salary
  qualityOfLife?: {
    score?: number; // optional
    [k: string]: number | undefined;
  };
};

// State abbreviations mapping
const STATE_ABBREVIATIONS: Record<string, string> = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
  "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
  "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
  "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
  "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
  "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
  "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
  "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
  "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
  "Wisconsin": "WI", "Wyoming": "WY", "District of Columbia": "DC"
};

// Occupation field mapping
const OCCUPATION_FIELDS = [
  "management", "businessAndOperations", "computerAndMathematics",
  "architectureAndEngineering", "lifePhysicalAndSocialScience", "communityService",
  "legalWork", "educationTrainingLibrary", "artsDesignEntertainmentSportsMedia",
  "healthcarePractionersAndTechnicalWork", "healthcareSupport", "protectiveService",
  "foodPreparationAndServing", "cleaningAndMaintenance", "personalCareAndService",
  "salesAndRelated", "officeAndAdministrativeSupport", "farmingFishingAndForestry",
  "constructionAndExtraction", "insallationMaintenanceAndRepair", "production",
  "transportationAndMaterialMoving", "overallAverage"
];

// Helper to map household type to COL key
function getColKey(householdType: string, numKids: number, numWorkers: number): string {
  if (householdType === "single") {
    return numKids === 0 ? "single" : `singleParent${numKids}Kid`;
  }
  if (householdType === "marriedOneIncome" || householdType === "marriedTwoIncome") {
    const workers = householdType === "marriedTwoIncome" ? 2 : 1;
    if (numKids === 0) {
      return workers === 2 ? "marriedTwoIncome" : "marriedOneIncome";
    }
    const familySize = 2 + numKids; // 2 adults + kids
    return `familyOf${familySize}_${workers}Worker${workers > 1 ? 's' : ''}`;
  }
  return "single"; // fallback
}

// Helper to map household type to adjusted COL key
function getAdjustedColKey(householdType: string, numKids: number, numWorkers: number): string {
  return getColKey(householdType, numKids, numWorkers);
}

// Normalize housing data COL fields
function normalizeColFromHousing(housing: any): Location['colAnnual'] {
  if (!housing) return undefined;
  
  return {
    single: housing.annualCostOfLiving1Person ?? undefined,
    marriedOneIncome: housing.annualCostOfLiving1Worker1Adult ?? undefined,
    marriedTwoIncome: housing.annualCostOfLiving2Earners ?? undefined,
    singleParent1Kid: housing.annualCostOfLivingSingleParent1Kid ?? undefined,
    singleParent2Kids: housing.annualCostOfLivingSingleParent2Kids ?? undefined,
    singleParent3Kids: housing.annualCostOfLivingSingleParent3Kids ?? undefined,
    familyOf3_1Worker: housing.annualCostOfLivingFamilyOf31Worker ?? undefined,
    familyOf4_1Worker: housing.annualCostOfLivingFamilyOf41Worker ?? undefined,
    familyOf5_1Worker: housing.annualCostOfLivingFamilyOf51Worker ?? undefined,
    familyOf3_2Workers: housing.annualCostOfLivingFamilyOf32Workers ?? undefined,
    familyOf4_2Workers: housing.annualCostOfLivingFamilyOf42Workers ?? undefined,
    familyOf5_2Workers: housing.annualCostOfLivingFamilyOf52Workers ?? undefined,
  };
}

function normalizeAdjustedColFromHousing(housing: any): Location['adjustedColAnnual'] {
  if (!housing) return undefined;
  
  return {
    single: housing.adjustedCostOfLiving1Person ?? undefined,
    marriedOneIncome: housing.adjustedCostOfLiving1Worker1Adult ?? undefined,
    marriedTwoIncome: housing.adjustedCostOfLiving2Earners ?? undefined,
    singleParent1Kid: housing.adjustedCostOfLivingSingleParent1Kid ?? undefined,
    singleParent2Kids: housing.adjustedCostOfLivingSingleParent2Kids ?? undefined,
    singleParent3Kids: housing.adjustedCostOfLivingSingleParent3Kids ?? undefined,
    familyOf3_1Worker: housing.adjustedCostOfLivingFamilyOf31Worker ?? undefined,
    familyOf4_1Worker: housing.adjustedCostOfLivingFamilyOf41Worker ?? undefined,
    familyOf5_1Worker: housing.adjustedCostOfLivingFamilyOf51Worker ?? undefined,
    familyOf3_2Workers: housing.adjustedCostOfLivingFamilyOf32Workers ?? undefined,
    familyOf4_2Workers: housing.adjustedCostOfLivingFamilyOf42Workers ?? undefined,
    familyOf5_2Workers: housing.adjustedCostOfLivingFamilyOf52Workers ?? undefined,
  };
}

// Module-level cache
let cachedLocations: Location[] | null = null;

export function loadCombinedData() {
  return combinedData;
}

export function normalizeLocations(): Location[] {
  if (cachedLocations) return cachedLocations;
  
  const data = loadCombinedData();
  const locations: Location[] = [];
  
  // Normalize states
  const states = Array.isArray(data.states) ? data.states : [];
  const housingStates = Array.isArray(data.housing?.states) ? data.housing.states : [];
  
  for (const state of states) {
    const stateName = state.name || "";
    const stateAbbr = STATE_ABBREVIATIONS[stateName] || "";
    const housing = housingStates.find((h: any) => h.name === stateName);
    
    // Extract salaries
    const salaries: Record<string, number> = {};
    for (const field of OCCUPATION_FIELDS) {
      const value = state[field];
      if (typeof value === 'number' && !isNaN(value)) {
        salaries[field] = value;
      }
    }
    
    locations.push({
      id: `state:${stateAbbr}`,
      type: "state",
      name: stateName,
      stateAbbr,
      typicalHomeValue: typeof state.typicalHomeValueSingleFamilyNormal === 'number' 
        ? state.typicalHomeValueSingleFamilyNormal 
        : undefined,
      mortgageRate: typeof state.averageMortgageRateFixed30Year === 'number'
        ? state.averageMortgageRateFixed30Year
        : undefined,
      downPaymentPct: typeof state.medianMortgageDownPayment === 'number'
        ? state.medianMortgageDownPayment
        : undefined,
      colAnnual: normalizeColFromHousing(housing),
      adjustedColAnnual: normalizeAdjustedColFromHousing(housing),
      salaries: Object.keys(salaries).length > 0 ? salaries : undefined,
    });
  }
  
  // Normalize cities
  const cities = Array.isArray(data.cities) ? data.cities : [];
  const housingCities = Array.isArray(data.housing?.cities) ? data.housing.cities : [];
  
  for (const city of cities) {
    const cityName = city.name || "";
    const cityState = city.state || "";
    const housing = housingCities.find((h: any) => h.name === cityName && h.state === cityState);
    
    // Find state name from abbreviation
    const stateName = Object.entries(STATE_ABBREVIATIONS).find(([_, abbr]) => abbr === cityState)?.[0] || "";
    
    // Extract salaries
    const salaries: Record<string, number> = {};
    for (const field of OCCUPATION_FIELDS) {
      const value = city[field];
      if (typeof value === 'number' && !isNaN(value)) {
        salaries[field] = value;
      }
    }
    
    locations.push({
      id: `city:${cityName}, ${cityState}`,
      type: "city",
      name: cityName,
      stateAbbr: cityState,
      stateName,
      typicalHomeValue: typeof city.typicalHomeValueSingleFamily === 'number'
        ? city.typicalHomeValueSingleFamily
        : undefined,
      mortgageRate: typeof city.averageMortgageRateFixed30Year === 'number'
        ? city.averageMortgageRateFixed30Year
        : undefined,
      downPaymentPct: typeof city.medianMortgageDownPayment === 'number'
        ? city.medianMortgageDownPayment
        : undefined,
      colAnnual: normalizeColFromHousing(housing),
      adjustedColAnnual: normalizeAdjustedColFromHousing(housing),
      salaries: Object.keys(salaries).length > 0 ? salaries : undefined,
    });
  }
  
  cachedLocations = locations;
  return locations;
}

export function getStates(): Array<{label: string; value: string}> {
  const locations = normalizeLocations();
  return locations
    .filter(loc => loc.type === "state")
    .map(loc => ({
      label: loc.name,
      value: loc.stateAbbr || "",
    }))
    .filter(item => item.value)
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getCities(): Array<{label: string; value: string; stateAbbr: string}> {
  const locations = normalizeLocations();
  return locations
    .filter(loc => loc.type === "city")
    .map(loc => ({
      label: `${loc.name}, ${loc.stateAbbr}`,
      value: loc.id,
      stateAbbr: loc.stateAbbr || "",
    }))
    .filter(item => item.stateAbbr)
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getLocationsByIds(ids: string[]): Location[] {
  const locations = normalizeLocations();
  return ids
    .map(id => locations.find(loc => loc.id === id))
    .filter((loc): loc is Location => loc !== undefined);
}

export function findLocationById(id: string): Location | undefined {
  const locations = normalizeLocations();
  return locations.find(loc => loc.id === id);
}

// Helper to get COL for a specific household configuration
export function getColForHousehold(
  location: Location,
  householdType: string,
  numKids: number,
  numWorkers: number,
  useAdjusted: boolean = false
): number | undefined {
  const colData = useAdjusted ? location.adjustedColAnnual : location.colAnnual;
  if (!colData) return undefined;
  
  const key = useAdjusted 
    ? getAdjustedColKey(householdType, numKids, numWorkers)
    : getColKey(householdType, numKids, numWorkers);
  
  return colData[key];
}
