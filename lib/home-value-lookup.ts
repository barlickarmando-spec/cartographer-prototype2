import homeValueData from '@/data/Typical_Home_Value.json';

const DEFAULT_PRICE_PER_SQFT = 200;

interface HomeValueEntry {
  pricePerSqft: number;
  avgHomePrice: number;
}

const data = homeValueData as Record<string, HomeValueEntry>;

// Pre-build a lowercase lookup map for fast case-insensitive matching
const lowerCaseMap = new Map<string, HomeValueEntry>();
for (const [key, value] of Object.entries(data)) {
  lowerCaseMap.set(key.toLowerCase(), value);
}

/**
 * Look up the price per square foot for a location.
 * Handles "City, ST" format by stripping the state suffix.
 * Falls back to DEFAULT_PRICE_PER_SQFT if not found.
 */
export function getPricePerSqft(locationName: string): number {
  // 1. Exact match (handles states like "Alabama")
  if (data[locationName]) {
    return data[locationName].pricePerSqft;
  }

  // 2. Strip ", XX" state suffix for city lookups (e.g., "Austin, TX" -> "Austin")
  const commaIdx = locationName.lastIndexOf(', ');
  if (commaIdx >= 0) {
    const cityOnly = locationName.substring(0, commaIdx).trim();
    if (data[cityOnly]) {
      return data[cityOnly].pricePerSqft;
    }
  }

  // 3. Case-insensitive fallback
  const lowerName = locationName.toLowerCase();
  const match = lowerCaseMap.get(lowerName);
  if (match) return match.pricePerSqft;

  if (commaIdx >= 0) {
    const lowerCity = locationName.substring(0, commaIdx).trim().toLowerCase();
    const cityMatch = lowerCaseMap.get(lowerCity);
    if (cityMatch) return cityMatch.pricePerSqft;
  }

  return DEFAULT_PRICE_PER_SQFT;
}

/**
 * Estimate home size in square feet from a home price and location.
 */
export function estimateHomeSizeSqft(homePrice: number, locationName: string): number {
  if (homePrice <= 0) return 0;
  const pricePerSqft = getPricePerSqft(locationName);
  return Math.round(homePrice / pricePerSqft);
}
