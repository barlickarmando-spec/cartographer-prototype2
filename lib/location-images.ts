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
  'Alabama': [
    { src: '/location-images/Alabama/Alabama.jpg', alt: 'Alabama scenic view' },
    { src: '/location-images/Alabama/Alabama 2.jpg', alt: 'Alabama landscape' },
    { src: '/location-images/Alabama/Alabama 3.jpg', alt: 'Alabama cityscape' },
  ],
  'Alaska': [
    { src: '/location-images/Alaska/Alaska.jpg', alt: 'Alaska scenic view' },
    { src: '/location-images/Alaska/Alaska 2.jpg', alt: 'Alaska landscape' },
    { src: '/location-images/Alaska/alaska 3.jpg', alt: 'Alaska wilderness' },
    { src: '/location-images/Alaska/Alaska 4.jpg', alt: 'Alaska mountains' },
  ],
  'Arizona': [
    { src: '/location-images/Arizona/Arizona.jpg', alt: 'Arizona scenic view' },
    { src: '/location-images/Arizona/Arizona 2.jpg', alt: 'Arizona landscape' },
    { src: '/location-images/Arizona/Arizona 3.jpg', alt: 'Arizona desert' },
    { src: '/location-images/Arizona/Arizona 4.jpg', alt: 'Arizona canyon' },
  ],
  'Arkansas': [
    { src: '/location-images/Arkansas/Arkansas.jpg', alt: 'Arkansas scenic view' },
    { src: '/location-images/Arkansas/Arkansas 2.jpg', alt: 'Arkansas landscape' },
    { src: '/location-images/Arkansas/Arkansas 3.jpg', alt: 'Arkansas nature' },
  ],
  'California': [
    { src: '/location-images/California/California.jpg', alt: 'California scenic view' },
    { src: '/location-images/California/California 2.jpg', alt: 'California coastline' },
    { src: '/location-images/California/California 3.jpg', alt: 'California cityscape' },
    { src: '/location-images/California/California 4.jpg', alt: 'California landscape' },
    { src: '/location-images/California/California 5.jpg', alt: 'California sunset' },
  ],
  'Colorado': [
    { src: '/location-images/Colorado/Colorado.jpg', alt: 'Colorado scenic view' },
    { src: '/location-images/Colorado/Colorado 2.jpg', alt: 'Colorado mountains' },
    { src: '/location-images/Colorado/Colorado 3.jpg', alt: 'Colorado landscape' },
  ],
  'Connecticut': [
    { src: '/location-images/Connecticut/Connecticut.jpg', alt: 'Connecticut scenic view' },
    { src: '/location-images/Connecticut/Connecticut 2.jpg', alt: 'Connecticut landscape' },
    { src: '/location-images/Connecticut/Connecticut 3.jpg', alt: 'Connecticut town' },
    { src: '/location-images/Connecticut/Connecticut 4.jpg', alt: 'Connecticut coastline' },
  ],
  'Delaware': [
    { src: '/location-images/Delaware/Delaware.jpg', alt: 'Delaware scenic view' },
    { src: '/location-images/Delaware/Delaware 2.jpg', alt: 'Delaware landscape' },
    { src: '/location-images/Delaware/Delaware 3.jpg', alt: 'Delaware coastline' },
  ],
  'District of Columbia': [
    { src: '/location-images/District of Columbia/District of Columbia.jpg', alt: 'Washington DC scenic view' },
    { src: '/location-images/District of Columbia/District of Columbia 2.jpg', alt: 'Washington DC monuments' },
    { src: '/location-images/District of Columbia/District of Columbia 3.jpg', alt: 'Washington DC cityscape' },
  ],
  'Florida': [
    { src: '/location-images/Florida/Florida image 1.webp', alt: 'Florida scenic view' },
    { src: '/location-images/Florida/Florida Image 2.jpg', alt: 'Florida landscape' },
    { src: '/location-images/Florida/Florida Image 3.jpg', alt: 'Florida coastline' },
    { src: '/location-images/Florida/Florida Image 4.jpg', alt: 'Florida cityscape' },
    { src: '/location-images/Florida/Florida Image 5.jpg', alt: 'Florida sunset' },
  ],
  'Georgia': [
    { src: '/location-images/Georgia/Georgia.jpg', alt: 'Georgia scenic view' },
    { src: '/location-images/Georgia/Georgia 2.jpg', alt: 'Georgia landscape' },
    { src: '/location-images/Georgia/Georgia 3.jpg', alt: 'Georgia cityscape' },
  ],
  'Idaho': [
    { src: '/location-images/Idaho/Idaho.jpg', alt: 'Idaho scenic view' },
    { src: '/location-images/Idaho/Idaho 2.jpg', alt: 'Idaho mountains' },
    { src: '/location-images/Idaho/Idaho 3.jpg', alt: 'Idaho landscape' },
  ],
  'Illinois': [
    { src: '/location-images/Illinois/Illinois.jpg', alt: 'Illinois scenic view' },
    { src: '/location-images/Illinois/Illinois 2.jpg', alt: 'Illinois cityscape' },
    { src: '/location-images/Illinois/Illinois 3.jpeg', alt: 'Illinois skyline' },
    { src: '/location-images/Illinois/Illinois 4.jpeg', alt: 'Illinois landscape' },
    { src: '/location-images/Illinois/Illinois 5.jpg', alt: 'Illinois downtown' },
    { src: '/location-images/Illinois/Illinois 6.jpg', alt: 'Illinois architecture' },
  ],
  'Indiana': [
    { src: '/location-images/Indiana/StateCapitolIndiana.jpg', alt: 'Indiana State Capitol' },
    { src: '/location-images/Indiana/These-Are-the-Best-Indiana-Cities-for-Your-Home-Search.jpg', alt: 'Indiana cities' },
    { src: '/location-images/Indiana/09-90803239-rivers.jpg', alt: 'Indiana rivers' },
    { src: '/location-images/Indiana/istockphoto-1068061900-612x612.jpg', alt: 'Indiana landscape' },
    { src: '/location-images/Indiana/istockphoto-1150746507-612x612.jpg', alt: 'Indiana scenic view' },
  ],
  'Iowa': [
    { src: '/location-images/Iowa/Iowa_City_Downtown_June_2021_(cropped).jpg', alt: 'Iowa City downtown' },
    { src: '/location-images/Iowa/Courier-Headers-22-1080x675-1-1.jpg', alt: 'Iowa landscape' },
    { src: '/location-images/Iowa/bs18-iowa-crop-editorial.jpg', alt: 'Iowa farmland' },
    { src: '/location-images/Iowa/download.jpg', alt: 'Iowa scenic view' },
    { src: '/location-images/Iowa/download (1).jpg', alt: 'Iowa cityscape' },
  ],
  'Miami': [
    { src: '/location-images/Miami/Miami Image 1.jpg', alt: 'Miami skyline' },
    { src: '/location-images/Miami/Miami Image 2.jpg', alt: 'Miami Beach' },
    { src: '/location-images/Miami/Miami Image 3.jpg', alt: 'Miami waterfront' },
    { src: '/location-images/Miami/Miami Image 4.jpg', alt: 'Miami cityscape' },
    { src: '/location-images/Miami/Miami Image 5.jpg', alt: 'Miami aerial view' },
    { src: '/location-images/Miami/download.jpg', alt: 'Miami downtown' },
  ],
  'Orlando': [
    { src: '/location-images/Orlando/Orlando Image 1.jpg', alt: 'Orlando skyline' },
    { src: '/location-images/Orlando/Orlando Image 2.jpg', alt: 'Orlando cityscape' },
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
