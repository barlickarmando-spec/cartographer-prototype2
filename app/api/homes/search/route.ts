// app/api/homes/search/route.ts
//
// Uses the realty-in-us.p.rapidapi.com API (Realtor.com data) with a 2-step flow:
// 1. /locations/v2/auto-complete → resolve location name to a city/state/slug
// 2. /properties/v3/list         → fetch for-sale listings with photos included

import { NextRequest, NextResponse } from 'next/server';

// ── Config ──────────────────────────────────────────────────────────
const API_KEY = process.env.RAPIDAPI_KEY || '3b86e8a737mshcc69ac4077e9c00p18b472jsnc475ce3e84b9';
const API_HOST = 'realty-in-us.p.rapidapi.com';
const BASE_URL = `https://${API_HOST}`;

const HEADERS: Record<string, string> = {
  'X-RapidAPI-Key': API_KEY,
  'X-RapidAPI-Host': API_HOST,
  'Content-Type': 'application/json',
};

// ── State name → code lookup ────────────────────────────────────────
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

const STATE_NAMES: Record<string, string> = {};
for (const [name, code] of Object.entries(STATE_ABBREVIATIONS)) {
  STATE_NAMES[code] = name.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

const STATE_CAPITALS: Record<string, string> = {
  'AL': 'Montgomery', 'AK': 'Anchorage', 'AZ': 'Phoenix', 'AR': 'Little Rock',
  'CA': 'Los Angeles', 'CO': 'Denver', 'CT': 'Hartford', 'DE': 'Wilmington',
  'FL': 'Miami', 'GA': 'Atlanta', 'HI': 'Honolulu', 'ID': 'Boise',
  'IL': 'Chicago', 'IN': 'Indianapolis', 'IA': 'Des Moines', 'KS': 'Wichita',
  'KY': 'Louisville', 'LA': 'New Orleans', 'ME': 'Portland', 'MD': 'Baltimore',
  'MA': 'Boston', 'MI': 'Detroit', 'MN': 'Minneapolis', 'MS': 'Jackson',
  'MO': 'Kansas City', 'MT': 'Billings', 'NE': 'Omaha', 'NV': 'Las Vegas',
  'NH': 'Manchester', 'NJ': 'Newark', 'NM': 'Albuquerque', 'NY': 'New York',
  'NC': 'Charlotte', 'ND': 'Fargo', 'OH': 'Columbus', 'OK': 'Oklahoma City',
  'OR': 'Portland', 'PA': 'Philadelphia', 'RI': 'Providence', 'SC': 'Charleston',
  'SD': 'Sioux Falls', 'TN': 'Nashville', 'TX': 'Houston', 'UT': 'Salt Lake City',
  'VT': 'Burlington', 'VA': 'Virginia Beach', 'WA': 'Seattle', 'WV': 'Charleston',
  'WI': 'Milwaukee', 'WY': 'Cheyenne',
};

// ── Location parsing ────────────────────────────────────────────────
function parseLocation(location: string): { city: string; stateCode: string } {
  const trimmed = location.trim();
  const lower = trimmed.toLowerCase();

  if (STATE_ABBREVIATIONS[lower]) return { city: '', stateCode: STATE_ABBREVIATIONS[lower] };
  if (/^[A-Z]{2}$/i.test(trimmed)) return { city: '', stateCode: trimmed.toUpperCase() };
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => p.trim());
    const cityPart = parts[0];
    const statePart = parts[1] || '';
    let stateCode = '';
    if (/^[A-Z]{2}$/i.test(statePart)) stateCode = statePart.toUpperCase();
    else if (STATE_ABBREVIATIONS[statePart.toLowerCase()]) stateCode = STATE_ABBREVIATIONS[statePart.toLowerCase()];
    return { city: cityPart, stateCode };
  }
  return { city: trimmed, stateCode: '' };
}

function buildSearchQuery(city: string, stateCode: string): string {
  if (city && stateCode) return `${city}, ${stateCode}`;
  if (city) return city;
  if (stateCode && STATE_NAMES[stateCode]) return STATE_NAMES[stateCode];
  return stateCode;
}

// ── Step 1: Auto-complete location ──────────────────────────────────
// Returns { city, state_code } or null
interface ResolvedLocation {
  city: string;
  state_code: string;
}

async function autoCompleteLocation(query: string): Promise<ResolvedLocation | null> {
  const url = `${BASE_URL}/locations/v2/auto-complete?input=${encodeURIComponent(query)}`;
  console.log(`[homes/search] Auto-complete: ${url}`);

  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    console.log(`[homes/search] Auto-complete failed: ${res.status}`);
    return null;
  }

  const json = await res.json();
  const autocomplete = json.autocomplete || [];

  if (!Array.isArray(autocomplete) || autocomplete.length === 0) {
    console.log('[homes/search] Auto-complete returned no results');
    return null;
  }

  // Prefer city-type results
  for (const item of autocomplete) {
    if (item.area_type === 'city' && item.city && item.state_code) {
      console.log(`[homes/search] Resolved to city: ${item.city}, ${item.state_code}`);
      return { city: item.city, state_code: item.state_code };
    }
  }

  // Fall back to any result with city + state_code
  for (const item of autocomplete) {
    if (item.city && item.state_code) {
      console.log(`[homes/search] Resolved to: ${item.city}, ${item.state_code}`);
      return { city: item.city, state_code: item.state_code };
    }
  }

  // State-only: use the capital
  const first = autocomplete[0];
  if (first.state_code) {
    const capital = STATE_CAPITALS[first.state_code];
    if (capital) {
      console.log(`[homes/search] State fallback: ${capital}, ${first.state_code}`);
      return { city: capital, state_code: first.state_code };
    }
  }

  console.log('[homes/search] Auto-complete: no usable result:', JSON.stringify(first).slice(0, 200));
  return null;
}

// ── Step 2: Search for-sale listings via POST /properties/v3/list ────
const MAX_LISTINGS = 42;
const RESULTS_PER_PAGE = 42;

async function searchListings(
  loc: ResolvedLocation,
  minPrice: number,
  maxPrice: number,
): Promise<{ listings: any[]; totalAvailable: number } | null> {

  // Try with price filters first, then without
  const bodyVariants = [
    {
      city: loc.city,
      state_code: loc.state_code,
      status: ['for_sale'],
      sort: { direction: 'desc', field: 'list_date' },
      list_price: { min: minPrice, max: maxPrice },
      limit: RESULTS_PER_PAGE,
      offset: 0,
    },
    {
      city: loc.city,
      state_code: loc.state_code,
      status: ['for_sale'],
      sort: { direction: 'desc', field: 'list_date' },
      limit: RESULTS_PER_PAGE,
      offset: 0,
    },
  ];

  for (const body of bodyVariants) {
    try {
      console.log(`[homes/search] POST /properties/v3/list:`, JSON.stringify(body).slice(0, 200));

      const res = await fetch(`${BASE_URL}/properties/v3/list`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        console.log(`[homes/search] List failed: ${res.status}`);
        continue;
      }

      const json = await res.json();

      // The v3/list response: { data: { home_search: { total, results: [...] } } }
      const homeSearch = json.data?.home_search || json.data?.results || {};
      let results = homeSearch.results || homeSearch || [];
      if (!Array.isArray(results)) {
        // Try alternate response shapes
        results = json.data?.properties || json.properties || json.results || json.data || [];
      }
      if (!Array.isArray(results)) results = [];

      const total = homeSearch.total || json.data?.total || json.total || results.length;

      console.log(`[homes/search] Got ${results.length} listings (${total} total available)`);

      if (results.length > 0) {
        return { listings: results.slice(0, MAX_LISTINGS), totalAvailable: total };
      }
    } catch (e) {
      console.log(`[homes/search] List error:`, e instanceof Error ? e.message : e);
    }
  }

  return null;
}

// ── Upgrade photo URL to higher resolution ──────────────────────────
function upgradePhotoUrl(url: string): string {
  if (!url) return url;

  let upgraded = url;

  if (/rdcpix\.com/i.test(upgraded)) {
    upgraded = upgraded.replace(/-w\d+_h\d+(_x2)?/g, '');
    upgraded = upgraded.replace(/([0-9a-f])[smt](-f)/i, '$1l$2');
    upgraded = upgraded.replace(/([0-9a-f])[smt](\.jpg)/i, '$1l$2');
  } else {
    upgraded = upgraded.replace(/-w\d+_h\d+(_x2)?/g, '-w1024_h768');
    upgraded = upgraded.replace(/\/([^/]+)s\.jpg$/i, '/$1l.jpg');
  }

  upgraded = upgraded.replace(/\/thumbs\//, '/');
  return upgraded;
}

// ── Normalize a listing into our Home interface ─────────────────────
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
  const loc = prop.location || {};
  const addr = loc.address || prop.address || {};
  const desc = prop.description || {};

  let address = '';
  if (typeof addr === 'string') address = addr;
  else address = addr.line || addr.street_name || addr.street || addr.full || prop.street_address || '';

  const city = addr.city || prop.city || loc.city || '';
  const state = addr.state_code || addr.state || prop.state_code || prop.state || loc.state_code || '';
  const zipcode = addr.postal_code || addr.zip || prop.zip || prop.zipcode || loc.postal_code || '';
  const price = prop.list_price || prop.price || desc.list_price || desc.price || 0;
  const bedrooms = desc.beds || prop.beds || prop.bedrooms || 0;
  const bathrooms = desc.baths || prop.baths || prop.bathrooms || 0;
  const sqft = desc.sqft || prop.sqft || prop.building_size?.size || 0;
  const rawType = desc.type || prop.prop_type || prop.property_type || prop.type || 'single_family';
  const homeType = rawType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

  // Photo — v3/list includes primary_photo and photos in results
  let photoUrl = '';
  if (prop.primary_photo?.href) {
    photoUrl = prop.primary_photo.href;
  } else if (Array.isArray(prop.photos) && prop.photos.length > 0) {
    const f = prop.photos[0];
    photoUrl = typeof f === 'string' ? f : (f?.href || f?.url || '');
  } else if (prop.photo?.href) {
    photoUrl = prop.photo.href;
  } else if (typeof prop.thumbnail === 'string' && prop.thumbnail.startsWith('http')) {
    photoUrl = prop.thumbnail;
  }

  photoUrl = upgradePhotoUrl(photoUrl);

  // Listing URL
  let listingUrl = '';
  if (prop.permalink) {
    listingUrl = prop.permalink.startsWith('http') ? prop.permalink : `https://www.realtor.com/realestateandhomes-detail/${prop.permalink}`;
  } else if (prop.href) {
    listingUrl = prop.href.startsWith('http') ? prop.href : `https://www.realtor.com${prop.href}`;
  } else if (prop.property_id) {
    listingUrl = `https://www.realtor.com/realestateandhomes-detail/${prop.property_id}`;
  } else {
    const citySlug = (city || '').replace(/\s+/g, '-');
    listingUrl = `https://www.realtor.com/realestateandhomes-search/${citySlug}_${state}`;
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

// ── POST handler (used by the carousel component) ───────────────────
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

    const debug: Record<string, any> = {};

    if (!API_KEY) {
      return NextResponse.json({ success: true, homes: [], count: 0, source: 'no_api_key' });
    }

    const { city, stateCode } = parseLocation(location);
    const searchQuery = buildSearchQuery(city, stateCode);
    debug.searchQuery = searchQuery;

    // Step 1: Auto-complete to resolve location
    const resolved = await autoCompleteLocation(searchQuery);
    debug.resolved = resolved;

    if (!resolved) {
      return NextResponse.json({ success: true, homes: [], count: 0, totalAvailable: 0, source: 'location_not_found', debug });
    }

    // Step 2: Search listings
    const result = await searchListings(resolved, minPrice, maxPrice);

    if (!result || result.listings.length === 0) {
      return NextResponse.json({ success: true, homes: [], count: 0, totalAvailable: 0, source: 'no_results', debug });
    }

    debug.rawListingCount = result.listings.length;
    debug.totalAvailable = result.totalAvailable;

    // Step 3: Normalize
    let homes = result.listings.map(normalizeProperty);
    debug.withPhotos = homes.filter(h => h.photoUrl).length;

    // Step 4: Sort — prefer homes with photos, then by price closeness
    const targetPrice = (minPrice + maxPrice) / 2;
    homes.sort((a, b) => {
      const aHasPhoto = a.photoUrl ? 0 : 1;
      const bHasPhoto = b.photoUrl ? 0 : 1;
      if (aHasPhoto !== bHasPhoto) return aHasPhoto - bHasPhoto;
      const aDist = a.price === 0 ? Infinity : Math.abs(a.price - targetPrice);
      const bDist = b.price === 0 ? Infinity : Math.abs(b.price - targetPrice);
      return aDist - bDist;
    });

    homes = homes.slice(0, MAX_LISTINGS);
    debug.finalCount = homes.length;

    return NextResponse.json({
      success: true,
      homes,
      count: homes.length,
      totalAvailable: result.totalAvailable,
      source: 'Realtor.com',
      debug,
    });
  } catch (error) {
    console.error('[homes/search] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to search', homes: [] },
      { status: 500 }
    );
  }
}

// ── GET debug endpoint ──────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const testLocation = request.nextUrl.searchParams.get('test');

  if (testLocation) {
    const { city, stateCode } = parseLocation(testLocation);
    const searchQuery = buildSearchQuery(city, stateCode);
    const steps: any[] = [];

    // Step 1: Auto-complete
    try {
      const resolved = await autoCompleteLocation(searchQuery);
      steps.push({ step: 'auto-complete', resolved });

      // Step 2: Search listings
      if (resolved) {
        const result = await searchListings(resolved, 100000, 500000);
        const firstListing = result?.listings?.[0];
        steps.push({
          step: 'properties/v3/list',
          totalAvailable: result?.totalAvailable,
          listingCount: result?.listings?.length || 0,
          firstListingKeys: firstListing ? Object.keys(firstListing) : null,
          samplePhoto: firstListing?.primary_photo?.href || 'none',
        });
      }
    } catch (e) {
      steps.push({ step: 'error', error: e instanceof Error ? e.message : String(e) });
    }

    return NextResponse.json({
      host: API_HOST,
      apiKeyConfigured: !!API_KEY,
      locationInput: testLocation,
      searchQuery,
      steps,
    });
  }

  return NextResponse.json({
    status: 'ready',
    message: 'Real estate search API (realty-in-us) — add ?test=Boise to test',
    apiKeyConfigured: !!API_KEY,
    apiHost: API_HOST,
  });
}
