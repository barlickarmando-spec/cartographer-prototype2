/**
 * Data Extraction Utility - UPDATED
 * Extracts location-specific data from ALL THREE TABS of State_City_Data_Final.json
 * - Tab A: rough_affordability_model (States - salary + economic)
 * - Tab B: rough_affordability_model_citie (Cities - salary + economic)
 * - Tab C: rough_housing_model (States + Cities - detailed COL + rent)
 */

import stateData from '@/data/State_City_Data_Final.json';

// ===== CITY NAME ALIAS MAP =====
// Sheet B (salary) and Sheet C (housing) use different names for the same cities.
// Maps Sheet B name (lowercase) → Sheet C canonical name (lowercase).
const CITY_ALIASES: Record<string, string> = {
  'orange county': 'anaheim',
  'broward/palm beach': 'fort lauderdale',
  'new york': 'new york city',
};

// Reverse: Sheet C name (lowercase) → Sheet B name (lowercase).
const CITY_ALIASES_REVERSE: Record<string, string> = {
  'anaheim': 'orange county',
  'fort lauderdale': 'broward/palm beach',
  'new york city': 'new york',
};

// Junk entries in Sheet B that should be excluded from all lookups
const EXCLUDED_CITY_NAMES = new Set(['national average:', 'median:']);

// Types for extracted data
export interface LocationData {
  name: string; // "Utah" or "Austin"
  displayName: string; // "Utah" or "Austin, TX"
  type: 'state' | 'city';
  state: string; // State abbreviation or full name
  
  // Salaries by occupation
  salaries: {
    management: number;
    businessAndOperations: number;
    computerAndMathematics: number;
    architectureAndEngineering: number;
    lifePhysicalSocialScience: number;
    communityService: number;
    legalWork: number;
    educationTrainingLibrary: number;
    artsDesignEntertainmentSportsMedia: number;
    healthcarePractitionersTechnical: number;
    healthcareSupport: number;
    protectiveService: number;
    foodPreparationServing: number;
    cleaningMaintenance: number;
    personalCareService: number;
    salesRelated: number;
    officeAdministrativeSupport: number;
    farmingFishingForestry: number;
    constructionExtraction: number;
    installationMaintenanceRepair: number;
    production: number;
    transportationMaterialMoving: number;
    overallAverage: number;
  };
  
  // Housing/Mortgage data
  housing: {
    medianHomeValue: number;
    smallHomeValue: number;
    largeHomeValue: number;
    veryLargeHomeValue: number;
    mortgageRate: number;
    downPaymentPercent: number;
    downPaymentValue: number;
    annualMortgagePayment: number;
    appreciationRate: number; // Annual home value appreciation rate (derived from 5-year % change)
  };
  
  // Cost of Living (Adjusted - non-housing)
  adjustedCOL: {
    onePerson: number;
    oneWorkerOneAdult: number;
    twoEarners: number;
    singleParentOneKid: number;
    singleParentTwoKids: number;
    singleParentThreeKids: number;
    familyThreeOneWorker: number;
    familyFourOneWorker: number;
    familyFiveOneWorker: number;
    familyThreeTwoWorkers: number;
    familyFourTwoWorkers: number;
    familyFiveTwoWorkers: number;
  };
  
  // Rent costs by bedroom size
  rent: {
    oneBedroomAnnual: number;
    oneBedroomSqFt: number;
    twoBedroomAnnual: number;
    twoBedroomSqFt: number;
    threeBedroomAnnual: number;
    threeBedroomSqFt: number;
  };
  
  // Other metrics
  creditCardDebt: {
    averageDebt: number;
    averageAPR: number;
  };
}

/**
 * Get location data for a specific state or city
 * @param locationName - Can be "Utah", "Austin", "Austin, TX", etc.
 */
export function getLocationData(locationName: string): LocationData | null {
  // Clean up input
  const cleanName = locationName.trim();
  
  // Try to find as state first (Tab A + Tab C)
  const stateDataResult = findStateData(cleanName);
  if (stateDataResult) return stateDataResult;
  
  // Try to find as city (Tab B + Tab C)
  const cityDataResult = findCityData(cleanName);
  if (cityDataResult) return cityDataResult;
  
  console.error(`Could not find data for location: ${locationName}`);
  return null;
}

/**
 * Find state data from Tab A (affordability) + Tab C (housing)
 */
function findStateData(stateName: string): LocationData | null {
  const data = stateData as any;
  const nameLower = stateName.toLowerCase().trim();

  // Tab A: State affordability/salary data
  const affordabilityData = data.rough_affordability_model?.find((item: any) =>
    item.State?.trim()?.toLowerCase() === nameLower
  );

  // Tab C: State housing/COL data
  const housingData = data.rough_housing_model?.find((item: any) =>
    item.Classification === 'State' &&
    (item['City/State']?.trim()?.toLowerCase() === nameLower ||
     item.State?.trim()?.toLowerCase() === nameLower)
  );

  if (!affordabilityData || !housingData) {
    return null;
  }

  return buildLocationData(affordabilityData, housingData, 'state', stateName);
}

/**
 * Find city data from Tab B (city affordability) + Tab C (city housing).
 * Uses alias mapping to bridge naming differences between sheets and
 * trims whitespace from raw data fields.
 */
function findCityData(cityName: string): LocationData | null {
  const data = stateData as any;

  // Handle "City, ST" format
  let searchCity = cityName;
  let parentState: string | undefined;

  if (cityName.includes(',')) {
    const parts = cityName.split(',').map(p => p.trim());
    searchCity = parts[0];
    parentState = parts[1];
  }

  const searchLower = searchCity.toLowerCase().trim();

  // Skip junk entries
  if (EXCLUDED_CITY_NAMES.has(searchLower)) return null;

  // Determine alias names to also try
  const aliasForSheetC = CITY_ALIASES[searchLower];       // If input is Sheet B name, get Sheet C name
  const aliasForSheetB = CITY_ALIASES_REVERSE[searchLower]; // If input is Sheet C name, get Sheet B name

  // Tab B: City affordability/salary data (trim whitespace on comparisons)
  const findInSheetB = (name: string) => {
    const nameLower = name.toLowerCase().trim();
    return data.rough_affordability_model_citie?.find((item: any) => {
      const itemCity = item['City/County']?.trim()?.toLowerCase();
      if (EXCLUDED_CITY_NAMES.has(itemCity)) return false;
      const cityMatch = itemCity === nameLower;
      if (!parentState) return cityMatch;
      const itemState = item.State?.trim()?.toLowerCase();
      const stateMatch = itemState === parentState.toLowerCase().trim();
      return cityMatch && stateMatch;
    });
  };

  let affordabilityData = findInSheetB(searchCity);
  if (!affordabilityData && aliasForSheetB) {
    affordabilityData = findInSheetB(aliasForSheetB);
  }

  // Tab C: City housing/COL data (trim whitespace on comparisons)
  const findInSheetC = (name: string) => {
    const nameLower = name.toLowerCase().trim();
    return data.rough_housing_model?.find((item: any) => {
      if (item.Classification !== 'City') return false;
      const itemCity = item['City/State']?.trim()?.toLowerCase();
      const cityMatch = itemCity === nameLower;
      if (!parentState) return cityMatch;
      const itemState = item.State?.trim()?.toLowerCase();
      const stateMatch = itemState === parentState.toLowerCase().trim();
      return cityMatch && stateMatch;
    });
  };

  let housingData = findInSheetC(searchCity);
  if (!housingData && aliasForSheetC) {
    housingData = findInSheetC(aliasForSheetC);
  }

  if (!affordabilityData || !housingData) {
    return null;
  }

  // Use the Sheet C canonical name for display
  const canonicalName = housingData['City/State']?.trim() || searchCity;
  return buildLocationData(affordabilityData, housingData, 'city', canonicalName, housingData.State?.trim());
}

/**
 * Build unified LocationData from affordability + housing data
 */
function buildLocationData(
  affordabilityData: any,
  housingData: any,
  type: 'state' | 'city',
  name: string,
  stateCode?: string
): LocationData {
  // Extract three bedroom rent data (from 3BR columns or estimate from 2BR)
  const threeBedroomRent = housingData['Average Annual Rent (Three Bedroom)'] || 
                           (housingData['Average Annual Rent'] * 1.3);
  const threeBedroomSqFt = housingData['Corresponding Apartment Size (Sq Ft.).2'] || 
                          (housingData['Corresponding Apartment Size (Sq Ft.)'] * 1.2);
  
  const displayName = type === 'city' && stateCode 
    ? `${name}, ${stateCode}`
    : name;
  
  return {
    name,
    displayName,
    type,
    state: stateCode || housingData.State || affordabilityData.State || '',
    
    salaries: {
      management: affordabilityData['Management'] || 0,
      businessAndOperations: affordabilityData['Business and Operations'] || 0,
      computerAndMathematics: affordabilityData['Computer and Mathematics'] || 0,
      architectureAndEngineering: affordabilityData['Architecture and Engineering'] || 0,
      lifePhysicalSocialScience: affordabilityData['Life, Physical, and Social Science'] || 0,
      communityService: affordabilityData['Community Service'] || 0,
      legalWork: affordabilityData['Legal Work'] || 0,
      educationTrainingLibrary: affordabilityData['Education, Training, Library'] || 0,
      artsDesignEntertainmentSportsMedia: affordabilityData['Arts, Design, Entertainment, Sports, Media'] || 0,
      healthcarePractitionersTechnical: affordabilityData['Healthcare Practioners and Technical Work'] || 0,
      healthcareSupport: affordabilityData['Healthcare Support'] || 0,
      protectiveService: affordabilityData['Protective Service'] || 0,
      foodPreparationServing: affordabilityData['Food Preparation and Serving'] || 0,
      cleaningMaintenance: affordabilityData['Cleaning and Maintenance'] || 0,
      personalCareService: affordabilityData['Personal Care and Service'] || 0,
      salesRelated: affordabilityData['Sales and Related'] || 0,
      officeAdministrativeSupport: affordabilityData['Office and Administrative Support'] || 0,
      farmingFishingForestry: affordabilityData['Farming, Fishing, and Forestry'] || 0,
      constructionExtraction: affordabilityData['Construction and Extraction'] || 0,
      installationMaintenanceRepair: affordabilityData['Insallation, Maintenance, and Repair'] || 0,
      production: affordabilityData['Production'] || 0,
      transportationMaterialMoving: affordabilityData['Transportation and Material Moving'] || 0,
      overallAverage: affordabilityData['Overall Average'] || 0,
    },
    
    housing: {
      medianHomeValue: affordabilityData['Typical Home Value (Single Family Normal)'] ||
                       affordabilityData['Typical Home Value (Single Family)'] ||
                       housingData['Typical Home Value (Single Family Normal)'] || 0,
      smallHomeValue: affordabilityData['Typical Home Value (Small)'] || 
                      housingData['Typical Home Value (Small)'] || 0,
      largeHomeValue: affordabilityData['Typical Home Value (Large)'] || 
                      housingData['Typical Home Value (Large)'] || 0,
      veryLargeHomeValue: affordabilityData['Typical Home Value (Very Large)'] || 
                          housingData['Typical Home Value (Very Large)'] || 0,
      mortgageRate: affordabilityData['Average Mortgage Rate (Fixed 30 Year)'] || 
                    housingData['Average Mortgage Rate (Fixed 30 Year)'] || 0.065,
      downPaymentPercent: affordabilityData['Median Mortgage Down Payment %'] || 
                          housingData['Median Mortgage Down Payment %'] || 0.1,
      downPaymentValue: affordabilityData['Median Mortgage Down Payment Total Value'] || 
                        housingData['Median Mortgage Down Payment Total Value'] || 0,
      annualMortgagePayment: affordabilityData['Median Annual Overall Payment'] ||
                             housingData['Median Annual Overall Payment'] || 0,
      appreciationRate: (() => {
        // Convert 5-year % change to annual rate: (1 + pct)^(1/5) - 1
        const fiveYearPct = parseFloat(affordabilityData['% Change in Median Home Value by State (5 Years)']) || 0;
        if (fiveYearPct > 0 && fiveYearPct < 5) {
          return Math.pow(1 + fiveYearPct, 1 / 5) - 1;
        }
        return 0.038; // National average fallback
      })(),
    },
    
    adjustedCOL: {
      onePerson: housingData['Adjusted Cost of Living (1 Person)'] || 0,
      oneWorkerOneAdult: housingData['Adjusted Cost of Living (1 Worker + 1 Adult)'] || 0,
      twoEarners: housingData['Adjusted Cost of Living (2 earners)'] || 0,
      singleParentOneKid: housingData['Adjusted Cost of Living (Single Parent 1 Kid)'] || 0,
      singleParentTwoKids: housingData['Adjusted Cost of Living (Single Parent 2 Kids)'] || 0,
      singleParentThreeKids: housingData['Adjusted Cost of Living (Single Parent 3 Kids)'] || 0,
      familyThreeOneWorker: housingData['Adjusted Cost of Living (Family of 3, 1 Worker)'] || 0,
      familyFourOneWorker: housingData['Adjusted Cost of Living (Family of 4, 1 Worker)'] || 0,
      familyFiveOneWorker: housingData['Adjusted Cost of Living (Family of 5, 1 Worker)'] || 0,
      familyThreeTwoWorkers: housingData['Adjusted Cost of Living (Family of 3, 2 Workers)'] || 0,
      familyFourTwoWorkers: housingData['Adjusted Cost of Living (Family of 4, 2 Workers)'] || 0,
      familyFiveTwoWorkers: housingData['Adjusted Cost of Living (Family of 5, 2 Workers)'] || 0,
    },
    
    rent: {
      oneBedroomAnnual: housingData['Average Annual Rent (Single)'] || 0,
      oneBedroomSqFt: housingData['Corresponding Apartment Size (Sq Ft.).1'] || 0,
      twoBedroomAnnual: housingData['Average Annual Rent'] || 0,
      twoBedroomSqFt: housingData['Corresponding Apartment Size (Sq Ft.)'] || 0,
      threeBedroomAnnual: threeBedroomRent,
      threeBedroomSqFt: threeBedroomSqFt,
    },
    
    creditCardDebt: {
      averageDebt: affordabilityData['Average Credit Card Debt'] || 0,
      averageAPR: affordabilityData['Average Annual APR'] || 0.216,
    },
  };
}

/**
 * Get salary for a specific occupation in a location
 */
export function getSalary(locationName: string, occupation: string, manualOverride?: number): number {
  if (manualOverride !== undefined && manualOverride > 0) {
    return manualOverride;
  }
  
  const locationData = getLocationData(locationName);
  if (!locationData) return 0;
  
  // Map occupation to salary key
  const occupationKey = occupation.toLowerCase().replace(/[^a-z]/g, '');
  const salaries = locationData.salaries;
  
  // Try to match occupation
  if (occupationKey.includes('management')) return salaries.management;
  if (occupationKey.includes('business')) return salaries.businessAndOperations;
  if (occupationKey.includes('computer') || occupationKey.includes('math')) return salaries.computerAndMathematics;
  if (occupationKey.includes('architect') || occupationKey.includes('engineer')) return salaries.architectureAndEngineering;
  if (occupationKey.includes('science')) return salaries.lifePhysicalSocialScience;
  if (occupationKey.includes('community')) return salaries.communityService;
  if (occupationKey.includes('legal')) return salaries.legalWork;
  if (occupationKey.includes('education') || occupationKey.includes('teach')) return salaries.educationTrainingLibrary;
  if (occupationKey.includes('arts') || occupationKey.includes('design') || occupationKey.includes('media')) return salaries.artsDesignEntertainmentSportsMedia;
  if (occupationKey.includes('healthcare') && occupationKey.includes('practitioner')) return salaries.healthcarePractitionersTechnical;
  if (occupationKey.includes('healthcare') && occupationKey.includes('support')) return salaries.healthcareSupport;
  if (occupationKey.includes('protective') || occupationKey.includes('police')) return salaries.protectiveService;
  if (occupationKey.includes('food')) return salaries.foodPreparationServing;
  if (occupationKey.includes('clean') || occupationKey.includes('maintenance')) return salaries.cleaningMaintenance;
  if (occupationKey.includes('personal') || occupationKey.includes('care')) return salaries.personalCareService;
  if (occupationKey.includes('sales')) return salaries.salesRelated;
  if (occupationKey.includes('office') || occupationKey.includes('admin')) return salaries.officeAdministrativeSupport;
  if (occupationKey.includes('farm') || occupationKey.includes('fish')) return salaries.farmingFishingForestry;
  if (occupationKey.includes('construction')) return salaries.constructionExtraction;
  if (occupationKey.includes('install') || occupationKey.includes('repair')) return salaries.installationMaintenanceRepair;
  if (occupationKey.includes('production')) return salaries.production;
  if (occupationKey.includes('transport')) return salaries.transportationMaterialMoving;
  
  // Default to overall average
  return salaries.overallAverage;
}

/**
 * Get all available locations (states + cities)
 * Returns array of { name, displayName, type }
 */
export function getAllLocations(): { name: string; displayName: string; type: 'state' | 'city' }[] {
  const data = stateData as any;
  const locations: { name: string; displayName: string; type: 'state' | 'city' }[] = [];

  // Get all states from Tab C housing model
  const states = data.rough_housing_model
    ?.filter((item: any) => item.Classification === 'State')
    .map((item: any) => {
      const name = (item['City/State'] || item.State || '').trim();
      return { name, displayName: name, type: 'state' as const };
    })
    .filter((item: any) => item.name && !EXCLUDED_CITY_NAMES.has(item.name.toLowerCase())) || [];

  // Get all cities from Tab C housing model
  const cities = data.rough_housing_model
    ?.filter((item: any) => item.Classification === 'City')
    .map((item: any) => {
      const name = (item['City/State'] || '').trim();
      const state = (item.State || '').trim();
      return { name, displayName: `${name}, ${state}`, type: 'city' as const };
    })
    .filter((item: any) => item.name && !EXCLUDED_CITY_NAMES.has(item.name.toLowerCase())) || [];

  // Combine and sort
  locations.push(...states, ...cities);
  locations.sort((a, b) => {
    // States first, then cities, alphabetically within each group
    if (a.type !== b.type) {
      return a.type === 'state' ? -1 : 1;
    }
    return a.displayName.localeCompare(b.displayName);
  });

  return locations;
}

/**
 * Get just states (for simpler dropdowns)
 */
export function getAllStates(): string[] {
  const data = stateData as any;
  return data.rough_housing_model
    ?.filter((item: any) => item.Classification === 'State')
    .map((item: any) => (item['City/State'] || item.State || '').trim())
    .filter((name: string) => name && name.length > 0 && !EXCLUDED_CITY_NAMES.has(name.toLowerCase()))
    .sort() || [];
}

/**
 * Get just cities with their state codes
 */
export function getAllCities(): { name: string; displayName: string; state: string }[] {
  const data = stateData as any;
  return data.rough_housing_model
    ?.filter((item: any) => item.Classification === 'City')
    .map((item: any) => {
      const name = (item['City/State'] || '').trim();
      const state = (item.State || '').trim();
      return { name, displayName: `${name}, ${state}`, state };
    })
    .filter((item: any) => item.name && !EXCLUDED_CITY_NAMES.has(item.name.toLowerCase()))
    .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName)) || [];
}

/**
 * Get occupation list for dropdowns
 */
export function getOccupationList(): string[] {
  return [
    'Management',
    'Business and Operations',
    'Computer and Mathematics',
    'Architecture and Engineering',
    'Life, Physical, and Social Science',
    'Community Service',
    'Legal Work',
    'Education, Training, Library',
    'Arts, Design, Entertainment, Sports, Media',
    'Healthcare Practitioners and Technical Work',
    'Healthcare Support',
    'Protective Service',
    'Food Preparation and Serving',
    'Cleaning and Maintenance',
    'Personal Care and Service',
    'Sales and Related',
    'Office and Administrative Support',
    'Farming, Fishing, and Forestry',
    'Construction and Extraction',
    'Installation, Maintenance, and Repair',
    'Production',
    'Transportation and Material Moving',
  ];
}
