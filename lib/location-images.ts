/**
 * Location image data for hero carousels on location detail pages.
 * Maps location names to arrays of image objects.
 *
 * To add images for a new location:
 * 1. Add images to /public/location-images/{LocationName}/
 * 2. Add an entry here with the location name as key
 */

export interface LocationImage {
  src: string;
  alt: string;
}

const LOCATION_IMAGES: Record<string, LocationImage[]> = {
  'Florida': [
    { src: '/location-images/Florida/florida-wetlands.png', alt: 'Florida wetlands and palm trees' },
    { src: '/location-images/Florida/florida-highway.png', alt: 'Florida highway and canal aerial view' },
    { src: '/location-images/Florida/florida-miami.png', alt: 'Miami skyline with palm trees' },
    { src: '/location-images/Florida/florida-orlando.png', alt: 'Orlando Lake Eola at sunset' },
    { src: '/location-images/Florida/florida-beach.png', alt: 'Florida beach sunset aerial view' },
  ],
};

/**
 * Get images for a location. Checks exact name first, then state name.
 * Returns null if no images are configured for this location.
 */
export function getLocationImages(locationName: string): LocationImage[] | null {
  // Direct match
  if (LOCATION_IMAGES[locationName]) {
    return LOCATION_IMAGES[locationName];
  }

  // For cities like "Miami, FL" — try to match the state
  const parts = locationName.split(', ');
  if (parts.length >= 2) {
    const stateAbbrev = parts[parts.length - 1].trim();
    // Try matching by abbreviation using a reverse lookup
    const stateNames: Record<string, string> = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
      'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
      'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
      'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
      'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
      'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
      'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
      'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
      'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
      'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
      'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
      'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
      'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia',
    };
    const stateName = stateNames[stateAbbrev];
    if (stateName && LOCATION_IMAGES[stateName]) {
      return LOCATION_IMAGES[stateName];
    }
  }

  return null;
}
