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
    { src: '/location-images/Florida/florida-1.webp', alt: 'Florida scenic view' },
    { src: '/location-images/Florida/florida-2.jpg', alt: 'Florida landscape' },
    { src: '/location-images/Florida/florida-3.jpg', alt: 'Florida coastline' },
    { src: '/location-images/Florida/florida-4.jpg', alt: 'Florida cityscape' },
    { src: '/location-images/Florida/florida-5.jpg', alt: 'Florida sunset' },
  ],
  'Miami': [
    { src: '/location-images/Miami/miami-1.jpg', alt: 'Miami skyline' },
    { src: '/location-images/Miami/miami-2.jpg', alt: 'Miami Beach' },
    { src: '/location-images/Miami/miami-3.jpg', alt: 'Miami waterfront' },
    { src: '/location-images/Miami/miami-4.jpg', alt: 'Miami cityscape' },
    { src: '/location-images/Miami/miami-5.jpg', alt: 'Miami aerial view' },
    { src: '/location-images/Miami/miami-6.jpg', alt: 'Miami downtown' },
  ],
  'Orlando': [
    { src: '/location-images/Orlando/orlando-1.jpg', alt: 'Orlando skyline' },
    { src: '/location-images/Orlando/orlando-2.jpg', alt: 'Orlando cityscape' },
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

  // For cities like "Miami, FL" — try city name first, then state
  const parts = locationName.split(', ');
  if (parts.length >= 2) {
    // Try city name match first (e.g., "Miami" from "Miami, FL")
    const cityName = parts[0].trim();
    if (LOCATION_IMAGES[cityName]) {
      return LOCATION_IMAGES[cityName];
    }

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
