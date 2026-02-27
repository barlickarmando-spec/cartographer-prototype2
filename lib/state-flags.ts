// State code mapping for flags
export const STATE_CODES: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
  'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
  'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
  'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
  'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
  'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
  'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
  'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
  'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC'
};

// Reverse lookup: state code -> state name
export const STATE_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_CODES).map(([name, code]) => [code, name])
);

// Get the flag image path for a state name
export function getStateFlagPath(stateName: string): string {
  const jpgStates = ['Illinois', 'New Jersey', 'New York'];
  const ext = jpgStates.includes(stateName) ? 'jpg' : 'png';
  return `/flags/${stateName} Flag.${ext}`;
}

/**
 * Extract the state name from a location string.
 * Handles both state names ("Florida") and city formats ("Austin, TX").
 * Returns the full state name or undefined if not found.
 */
export function getStateNameFromLocation(location: string): string | undefined {
  // Direct state name match
  if (STATE_CODES[location]) return location;

  // City format: "Austin, TX" or "New York City, NY"
  const parts = location.split(', ');
  if (parts.length >= 2) {
    const stateAbbrev = parts[parts.length - 1].trim();
    if (STATE_NAMES[stateAbbrev]) return STATE_NAMES[stateAbbrev];
    // Maybe it's a full state name after the comma
    if (STATE_CODES[stateAbbrev]) return stateAbbrev;
  }

  return undefined;
}
