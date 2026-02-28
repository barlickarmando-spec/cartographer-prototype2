/**
 * Shared location filter data: regions, weather/climate categories, state lists, and mappings.
 * Extracted from my-locations page so both onboarding and my-locations can reuse them.
 */

// ===== REGIONS =====

export const REGIONS: Record<string, string[]> = {
  'South': ['Florida', 'Georgia', 'Alabama', 'North Carolina', 'South Carolina', 'Tennessee', 'Kentucky', 'Louisiana', 'Arkansas', 'Mississippi', 'Oklahoma', 'Texas'],
  'Southwest': ['California', 'Nevada', 'Utah', 'Colorado', 'New Mexico', 'Arizona', 'Wyoming'],
  'Pacific Northwest': ['Washington', 'Oregon', 'Idaho', 'Montana'],
  'West Coast': ['Oregon', 'California', 'Washington'],
  'North East': ['Maine', 'New Hampshire', 'Massachusetts', 'Vermont', 'New York', 'Rhode Island', 'Connecticut', 'New Jersey', 'Pennsylvania', 'Delaware'],
  'Mid Atlantic': ['Maryland', 'Virginia', 'Delaware', 'District of Columbia', 'West Virginia', 'New York', 'New Jersey', 'Pennsylvania'],
  'Middle America': ['Oklahoma', 'Kansas', 'Nebraska', 'North Dakota', 'South Dakota', 'Wyoming', 'Arkansas', 'Missouri', 'Iowa'],
  'Midwest': ['Ohio', 'Illinois', 'Iowa', 'Indiana', 'Michigan', 'Minnesota', 'Wisconsin', 'Missouri', 'North Dakota', 'South Dakota'],
  'East Coast': ['Maine', 'New Hampshire', 'Massachusetts', 'Rhode Island', 'Connecticut', 'New York', 'New Jersey', 'Delaware', 'Maryland', 'Virginia', 'North Carolina', 'South Carolina', 'Georgia', 'Florida'],
  'Continental United States': [], // special: all except Alaska & Hawaii
  'Non-Continental United States': ['Alaska', 'Hawaii'],
};

// ===== WEATHER / CLIMATE CATEGORIES =====

export const WEATHER_CATEGORIES: Record<string, { states: string[]; cities: string[] }> = {
  'Extreme Heat (No Snow)': { states: ['Florida', 'Hawaii'], cities: [] },
  'Strong Heat': { states: ['Arizona', 'Nevada', 'New Mexico'], cities: ['Anaheim', 'Los Angeles', 'San Diego', 'El Paso'] },
  'Relative Heat': { states: ['Texas', 'Georgia', 'Alabama', 'Mississippi', 'Louisiana', 'South Carolina', 'Arkansas', 'Oklahoma', 'District of Columbia'], cities: ['Fresno'] },
  'Average': { states: ['Missouri', 'Kentucky', 'Kansas', 'Tennessee', 'North Carolina', 'Maryland', 'Virginia', 'Delaware', 'New Jersey', 'Pennsylvania', 'Ohio'], cities: ['San Jose', 'San Francisco'] },
  'Cold': { states: ['Colorado', 'Utah', 'Idaho', 'Oregon', 'Washington', 'Illinois', 'Indiana', 'New York', 'Connecticut', 'Rhode Island', 'Massachusetts', 'West Virginia'], cities: [] },
  'Extreme Cold': { states: ['Alaska', 'Minnesota', 'Wisconsin', 'Michigan', 'North Dakota', 'South Dakota', 'Montana', 'Wyoming', 'Vermont', 'New Hampshire', 'Maine'], cities: [] },
};

// ===== STATE LISTS =====

export const ALL_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois',
  'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
  'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
  'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
];

// ===== STATE ABBREVIATION MAPPINGS =====

export const STATE_TO_ABBREV: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'District of Columbia': 'DC',
  'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL',
  'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA',
  'Maine': 'ME', 'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN',
  'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK', 'Oregon': 'OR',
  'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD',
  'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA',
  'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
};

export const ABBREV_TO_STATE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_TO_ABBREV).map(([full, abbr]) => [abbr, full])
);

// ===== HELPER FUNCTIONS =====

/**
 * Resolve a set of location filters into a final list of state names.
 * States and regions are additive (OR — expands the pool).
 * Climate/weather is subtractive (AND — narrows the pool).
 */
export function resolveLocationFilters(params: {
  states?: string[];
  regions?: string[];
  climates?: string[];
}): string[] {
  const { states = [], regions = [], climates = [] } = params;

  // Build additive set from specific states + region states
  const additive = new Set<string>();

  for (const s of states) {
    additive.add(s);
  }

  for (const regionName of regions) {
    if (regionName === 'Continental United States') {
      // All except Alaska & Hawaii
      for (const s of ALL_STATES) {
        if (s !== 'Alaska' && s !== 'Hawaii') additive.add(s);
      }
    } else {
      const regionStates = REGIONS[regionName];
      if (regionStates) {
        for (const s of regionStates) additive.add(s);
      }
    }
  }

  // If nothing additive selected, start with all states
  let pool = additive.size > 0 ? Array.from(additive) : [...ALL_STATES];

  // Apply subtractive climate filters (location must match at least one selected climate)
  if (climates.length > 0) {
    const climateStates = new Set<string>();
    for (const climateName of climates) {
      const category = WEATHER_CATEGORIES[climateName];
      if (category) {
        for (const s of category.states) climateStates.add(s);
      }
    }
    pool = pool.filter(s => climateStates.has(s));
  }

  return pool;
}
