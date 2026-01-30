/**
 * Static list of US states for location searchable dropdown.
 * No external lib; used for suggestions in onboarding.
 */

export const US_STATES: string[] = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming",
];

/**
 * Filter states by search string (case-insensitive prefix/substring).
 */
export function filterStates(search: string, limit = 15): string[] {
  const q = search.trim().toLowerCase();
  if (!q) return US_STATES.slice(0, limit);
  return US_STATES.filter((s) => s.toLowerCase().includes(q)).slice(0, limit);
}
