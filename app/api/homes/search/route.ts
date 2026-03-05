// app/api/homes/search/route.ts

import { NextRequest, NextResponse } from 'next/server';

// All US state abbreviations for location parsing
const STATE_ABBREVIATIONS: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY',
};

function parseLocation(location: string): { city: string; stateCode: string } {
  const trimmed = location.trim();
  const lower = trimmed.toLowerCase();

  if (STATE_ABBREVIATIONS[lower]) {
    return { city: '', stateCode: STATE_ABBREVIATIONS[lower] };
  }
  if (/^[A-Z]{2}$/i.test(trimmed)) {
    return { city: '', stateCode: trimmed.toUpperCase() };
  }
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => p.trim());
    const cityPart = parts[0];
    const statePart = parts[1] || '';
    let stateCode = '';
    if (/^[A-Z]{2}$/i.test(statePart)) {
      stateCode = statePart.toUpperCase();
    } else if (STATE_ABBREVIATIONS[statePart.toLowerCase()]) {
      stateCode = STATE_ABBREVIATIONS[statePart.toLowerCase()];
    }
    return { city: cityPart, stateCode };
  }
  return { city: trimmed, stateCode: '' };
}

// Hardcoded API config — env vars don't reliably load on all setups
const API_KEY = process.env.RAPIDAPI_KEY || '3b86e8a737mshcc69ac4077e9c00p18b472jsnc475ce3e84b9';
const API_HOST = process.env.RAPIDAPI_HOST || 'realtor-search.p.rapidapi.com';

const HEADERS = {
  'X-RapidAPI-Key': API_KEY,
  'X-RapidAPI-Host': API_HOST,
};

/**
 * Try multiple endpoint patterns for the realtor-search API.
 * Different RapidAPI Realtor wrappers use different URL structures.
 * We try them in order and use the first one that returns data.
 */
async function fetchFromRealtorAPI(
  city: string,
  stateCode: string,
  minPrice: number,
  maxPrice: number,
): Promise<{ properties: any[]; source: string } | null> {
  const host = API_HOST;
  const baseUrl = `https://${host}`;

  // Build location query string
  const locationQuery = city && stateCode
    ? `${city}, ${stateCode}`
    : city || stateCode;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  // List of endpoint patterns to try (different realtor-search APIs use different paths)
  const endpoints = [
    // Pattern 1: GET /properties with query params
    {
      url: `${baseUrl}/properties?location=${encodeURIComponent(locationQuery)}&minPrice=${minPrice}&maxPrice=${maxPrice}&limit=12&status=for_sale`,
      method: 'GET' as const,
      body: undefined,
    },
    // Pattern 2: GET /search with location
    {
      url: `${baseUrl}/search?location=${encodeURIComponent(locationQuery)}&price_min=${minPrice}&price_max=${maxPrice}&limit=12`,
      method: 'GET' as const,
      body: undefined,
    },
    // Pattern 3: POST /properties/list (like the old realtor.p.rapidapi.com)
    {
      url: `${baseUrl}/properties/list`,
      method: 'POST' as const,
      body: JSON.stringify({
        limit: 12,
        offset: 0,
        status: ['for_sale'],
        sort: { direction: 'desc', field: 'list_date' },
        list_price: { min: minPrice, max: maxPrice },
        ...(city ? { city } : {}),
        ...(stateCode ? { state_code: stateCode } : {}),
      }),
    },
    // Pattern 4: POST /properties/v3/list
    {
      url: `${baseUrl}/properties/v3/list`,
      method: 'POST' as const,
      body: JSON.stringify({
        limit: 12,
        offset: 0,
        status: ['for_sale'],
        sort: { direction: 'desc', field: 'list_date' },
        list_price: { min: minPrice, max: maxPrice },
        ...(city ? { city } : {}),
        ...(stateCode ? { state_code: stateCode } : {}),
      }),
    },
    // Pattern 5: GET /forsale with different param names
    {
      url: `${baseUrl}/forsale?location=${encodeURIComponent(locationQuery)}&price_min=${minPrice}&price_max=${maxPrice}&limit=12&sort=newest`,
      method: 'GET' as const,
      body: undefined,
    },
  ];

  try {
    for (const endpoint of endpoints) {
      try {
        const headers: Record<string, string> = {
          ...HEADERS,
        };
        if (endpoint.method === 'POST') {
          headers['Content-Type'] = 'application/json';
        }

        console.log(`[homes/search] Trying: ${endpoint.method} ${endpoint.url}`);

        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers,
          body: endpoint.body,
          signal: controller.signal,
        });

        console.log(`[homes/search] Response: ${response.status} from ${endpoint.url}`);

        if (!response.ok) {
          // Try next endpoint
          continue;
        }

        const data = await response.json();

        // Try to extract properties from various response shapes
        const properties = extractProperties(data);

        if (properties.length > 0) {
          console.log(`[homes/search] Found ${properties.length} properties from ${endpoint.url}`);
          return { properties, source: 'Realtor.com' };
        }

        // Log the response shape to help debug
        console.log(`[homes/search] Response shape from ${endpoint.url}:`, JSON.stringify(Object.keys(data)).slice(0, 200));
      } catch (endpointErr) {
        // If aborted, don't try more endpoints
        if (controller.signal.aborted) throw endpointErr;
        console.log(`[homes/search] Endpoint failed: ${endpoint.url}`, endpointErr instanceof Error ? endpointErr.message : '');
        continue;
      }
    }
  } finally {
    clearTimeout(timeout);
  }

  return null;
}

/**
 * Extract property listings from various possible API response shapes.
 */
function extractProperties(data: any): any[] {
  if (!data) return [];

  // Common response paths used by different Realtor APIs
  const paths = [
    data.data?.home_search?.results,
    data.data?.results,
    data.results,
    data.properties,
    data.listings,
    data.data?.properties,
    data.data?.listings,
    data.homes,
    data.data?.homes,
    data.data,
  ];

  for (const candidate of paths) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate;
    }
  }

  // If data itself is an array
  if (Array.isArray(data) && data.length > 0) {
    return data;
  }

  return [];
}

/**
 * Normalize a single property from various API formats into our Home interface.
 */
function normalizeProperty(prop: any): {
  id: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  homeType: string;
  photoUrl: string;
  listingUrl: string;
  status: string;
} {
  // Handle nested location/address structures (realtor.p.rapidapi.com format)
  const loc = prop.location || {};
  const addr = loc.address || prop.address || {};
  const desc = prop.description || {};

  // Extract address string
  let address = '';
  if (typeof addr === 'string') {
    address = addr;
  } else {
    address = addr.line || addr.street_name || addr.street || addr.full || prop.street_address || prop.address_line || '';
  }

  // Extract city
  const city = addr.city || prop.city || loc.city || '';

  // Extract state
  const state = addr.state_code || addr.state || prop.state_code || prop.state || loc.state_code || '';

  // Extract zipcode
  const zipcode = addr.postal_code || addr.zip || prop.zip || prop.zipcode || prop.postal_code || loc.postal_code || '';

  // Extract price
  const price = prop.list_price || prop.price || prop.listPrice || desc.price || 0;

  // Extract bedrooms/bathrooms
  const bedrooms = desc.beds || desc.bedrooms || prop.beds || prop.bedrooms || 0;
  const bathrooms = desc.baths || desc.bathrooms || prop.baths || prop.bathrooms || 0;

  // Extract sqft
  const sqft = desc.sqft || prop.sqft || prop.square_feet || prop.lot_sqft || desc.lot_sqft || 0;

  // Extract home type
  const homeType = desc.type || prop.type || prop.property_type || prop.homeType || 'Single Family';

  // Extract photo URL — try multiple paths
  let photoUrl = '';
  if (prop.primary_photo?.href) {
    photoUrl = prop.primary_photo.href;
  } else if (prop.photo?.href) {
    photoUrl = prop.photo.href;
  } else if (typeof prop.thumbnail === 'string' && prop.thumbnail.startsWith('http')) {
    photoUrl = prop.thumbnail;
  } else if (typeof prop.image === 'string' && prop.image.startsWith('http')) {
    photoUrl = prop.image;
  } else if (typeof prop.photo_url === 'string' && prop.photo_url.startsWith('http')) {
    photoUrl = prop.photo_url;
  } else if (typeof prop.imageUrl === 'string' && prop.imageUrl.startsWith('http')) {
    photoUrl = prop.imageUrl;
  } else if (Array.isArray(prop.photos) && prop.photos.length > 0) {
    const first = prop.photos[0];
    photoUrl = (typeof first === 'string' ? first : first?.href || first?.url || '') || '';
  } else if (Array.isArray(prop.images) && prop.images.length > 0) {
    const first = prop.images[0];
    photoUrl = (typeof first === 'string' ? first : first?.href || first?.url || '') || '';
  }

  // Build listing URL
  let listingUrl = '';
  if (prop.permalink) {
    listingUrl = prop.permalink.startsWith('http')
      ? prop.permalink
      : `https://www.realtor.com/realestateandhomes-detail/${prop.permalink}`;
  } else if (prop.url && typeof prop.url === 'string') {
    listingUrl = prop.url.startsWith('http') ? prop.url : `https://www.realtor.com${prop.url}`;
  } else if (prop.detail_url) {
    listingUrl = prop.detail_url.startsWith('http') ? prop.detail_url : `https://www.realtor.com${prop.detail_url}`;
  } else if (prop.property_id) {
    listingUrl = `https://www.realtor.com/realestateandhomes-detail/${prop.property_id}`;
  } else if (prop.listing_id) {
    listingUrl = `https://www.realtor.com/realestateandhomes-detail/${prop.listing_id}`;
  } else {
    // Fallback: build a search URL for the specific city
    const citySlug = (city || '').replace(/\s+/g, '-');
    const stateSlug = state || '';
    listingUrl = `https://www.realtor.com/realestateandhomes-search/${citySlug}_${stateSlug}`;
  }

  return {
    id: prop.property_id || prop.listing_id || prop.id || String(Math.random()),
    address,
    city,
    state,
    zipcode,
    price,
    bedrooms,
    bathrooms,
    sqft,
    homeType,
    photoUrl,
    listingUrl,
    status: prop.status || 'for_sale',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { location, minPrice, maxPrice } = body;

    if (!location || !minPrice || !maxPrice) {
      return NextResponse.json(
        { success: false, error: 'Location and price range required' },
        { status: 400 }
      );
    }

    if (!API_KEY) {
      return NextResponse.json({
        success: true,
        homes: [],
        count: 0,
        source: 'no_api_key',
      });
    }

    const { city, stateCode } = parseLocation(location);

    try {
      const result = await fetchFromRealtorAPI(city, stateCode, minPrice, maxPrice);

      if (!result || result.properties.length === 0) {
        console.log('[homes/search] No properties found from any endpoint');
        return NextResponse.json({
          success: true,
          homes: [],
          count: 0,
          source: 'no_results',
        });
      }

      const homes = result.properties.slice(0, 12).map(normalizeProperty);

      // Log first home shape for debugging
      if (homes.length > 0) {
        console.log('[homes/search] First normalized home:', JSON.stringify(homes[0]).slice(0, 300));
      }

      return NextResponse.json({
        success: true,
        homes,
        count: homes.length,
        source: result.source,
      });
    } catch (fetchErr) {
      console.error('[homes/search] All endpoints failed:', fetchErr instanceof Error ? fetchErr.message : fetchErr);
      return NextResponse.json({
        success: true,
        homes: [],
        count: 0,
        source: 'api_error',
      });
    }
  } catch (error) {
    console.error('[homes/search] Request error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search homes',
        homes: [],
      },
      { status: 500 }
    );
  }
}

// Debug endpoint - shows API config and lets you test manually
export async function GET(request: NextRequest) {
  const testLocation = request.nextUrl.searchParams.get('test');

  if (testLocation) {
    // Test mode: try to fetch and return raw API response shape
    const { city, stateCode } = parseLocation(testLocation);
    const host = API_HOST;

    const locationQuery = city && stateCode ? `${city}, ${stateCode}` : city || stateCode;

    // Try all likely URL patterns for "Search for sale" endpoint
    const endpoints = [
      `https://${host}/searchForSale?location=${encodeURIComponent(locationQuery)}&minPrice=200000&maxPrice=500000&limit=3`,
      `https://${host}/search-for-sale?location=${encodeURIComponent(locationQuery)}&minPrice=200000&maxPrice=500000&limit=3`,
      `https://${host}/searchforsale?location=${encodeURIComponent(locationQuery)}&minPrice=200000&maxPrice=500000&limit=3`,
      `https://${host}/search_for_sale?location=${encodeURIComponent(locationQuery)}&minPrice=200000&maxPrice=500000&limit=3`,
      `https://${host}/forSale?location=${encodeURIComponent(locationQuery)}&minPrice=200000&maxPrice=500000&limit=3`,
      `https://${host}/for-sale?location=${encodeURIComponent(locationQuery)}&minPrice=200000&maxPrice=500000&limit=3`,
      `https://${host}/autoComplete?input=${encodeURIComponent(locationQuery)}`,
      `https://${host}/auto-complete?input=${encodeURIComponent(locationQuery)}`,
    ];

    const results: any[] = [];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          headers: HEADERS,
          signal: AbortSignal.timeout(8000),
        });
        const text = await res.text();
        let parsed;
        try { parsed = JSON.parse(text); } catch { parsed = text.slice(0, 500); }
        results.push({
          url,
          status: res.status,
          keys: parsed && typeof parsed === 'object' ? Object.keys(parsed) : null,
          preview: JSON.stringify(parsed).slice(0, 500),
        });
      } catch (e) {
        results.push({
          url,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return NextResponse.json({
      host,
      apiKeyConfigured: !!API_KEY,
      locationParsed: { city, stateCode },
      endpointTests: results,
    });
  }

  return NextResponse.json({
    status: 'ready',
    message: 'Real estate search API - add ?test=Idaho to test endpoints',
    apiKeyConfigured: !!API_KEY,
    apiHost: API_HOST,
  });
}
