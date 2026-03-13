/**
 * Maps county/SVG city names to the canonical data key names used in
 * CITY_COORDINATES and the calculation hooks.
 *
 * The SVG county paths sometimes use different names (e.g. "Miami-Dade")
 * than the data layer (e.g. "Miami"). This map resolves those mismatches
 * so heat maps can look up the correct calculation data.
 */
export const COUNTY_TO_DATA_CITY: Record<string, string> = {
  'Miami-Dade': 'Miami',
};

/**
 * Resolve a county/SVG city name to its canonical data key.
 * Returns the original name if no alias exists.
 */
export function resolveCountyCityName(countyName: string): string {
  return COUNTY_TO_DATA_CITY[countyName] || countyName;
}
