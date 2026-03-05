// app/api/homes/search/route.ts
//
// Uses the realtor-search.p.rapidapi.com API with a 2-step flow:
// 1. /auto-complete  → resolve location name to a zip/city ID
// 2. /property/search-sale → fetch for-sale listings using that ID
// 3. /property/get-photos  → fetch photos for each listing (if needed)

import { NextRequest, NextResponse } from 'next/server';

// ── Config ──────────────────────────────────────────────────────────
const API_KEY = process.env.RAPIDAPI_KEY || '3b86e8a737mshcc69ac4077e9c00p18b472jsnc475ce3e84b9';
const API_HOST = process.env.RAPIDAPI_HOST || 'realtor-search.p.rapidapi.com';
const BASE_URL = `https://${API_HOST}`;

const HEADERS: Record<string, string> = {
  'X-RapidAPI-Key': API_KEY,
  'X-RapidAPI-Host': API_HOST,
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

// Reverse lookup: code → full name
const STATE_NAMES: Record<string, string> = {};
for (const [name, code] of Object.entries(STATE_ABBREVIATIONS)) {
  STATE_NAMES[code] = name.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

// State capitals for fallback when only a state is given
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

// Build a human-readable search query for the auto-complete API
function buildSearchQuery(city: string, stateCode: string): string {
  if (city && stateCode) return `${city}, ${stateCode}`;
  if (city) return city;
  // For state-only, use the full state name (auto-complete works better with it)
  if (stateCode && STATE_NAMES[stateCode]) return STATE_NAMES[stateCode];
  return stateCode;
}

// ── Step 1: Auto-complete location → get a "City, ST" string ────────
async function autoCompleteLocation(query: string): Promise<string | null> {
  const url = `${BASE_URL}/auto-complete?input=${encodeURIComponent(query)}`;
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
  const results = json.data || json.results || json;

  if (!Array.isArray(results) || results.length === 0) {
    console.log('[homes/search] Auto-complete returned no results');
    return null;
  }

  // The search-sale API works best with "City, ST" format.
  // Priority: find any result with city + state_code.

  // First, look for a city-type result anywhere in results
  for (const r of results) {
    if (r.city && r.state_code) {
      console.log(`[homes/search] Resolved to: ${r.city}, ${r.state_code}`);
      return `${r.city}, ${r.state_code}`;
    }
  }

  // For state-only queries, try the state's capital as fallback
  const first = results[0];
  if (first.state_code) {
    const capital = STATE_CAPITALS[first.state_code];
    if (capital) {
      console.log(`[homes/search] State query fallback: using capital "${capital}, ${first.state_code}"`);
      return `${capital}, ${first.state_code}`;
    }
  }

  // Last resort: zip code or slug
  for (const r of results) {
    if (r.postal_code) return r.postal_code;
  }

  console.log('[homes/search] Auto-complete: no usable ID in result:', JSON.stringify(first).slice(0, 200));
  return null;
}

// ── Step 2: Search for-sale listings ────────────────────────────────
async function searchForSale(
  locationId: string,
  minPrice: number,
  maxPrice: number,
): Promise<any[] | null> {
  // Try with price filters first, then fall back without them
  const paramSets = [
    // Attempt 1: with price filters
    new URLSearchParams({
      location: locationId,
      sort_by: 'RelevantListings',
      search_within_x_miles: '50',
      price_min: String(minPrice),
      price_max: String(maxPrice),
    }),
    // Attempt 2: without price filters (API may not support them)
    new URLSearchParams({
      location: locationId,
      sort_by: 'RelevantListings',
      search_within_x_miles: '50',
    }),
  ];

  for (const params of paramSets) {
    const url = `${BASE_URL}/property/search-sale?${params.toString()}`;
    console.log(`[homes/search] Search for sale: ${url}`);

    try {
      const res = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        console.log(`[homes/search] Search failed: ${res.status}`);
        continue;
      }

      const json = await res.json();
      let listings = json.data || json.properties || json.results || json.listings || json.homes || [];

      if (!Array.isArray(listings) && json.data && typeof json.data === 'object') {
        for (const key of Object.keys(json.data)) {
          if (Array.isArray(json.data[key]) && json.data[key].length > 0) {
            listings = json.data[key];
            break;
          }
        }
      }

      if (Array.isArray(listings) && listings.length > 0) {
        console.log(`[homes/search] Found ${listings.length} listings`);
        return listings;
      }
    } catch (e) {
      console.log(`[homes/search] Search attempt error:`, e instanceof Error ? e.message : e);
    }
  }

  console.log(`[homes/search] No listings found after all attempts`);
  return null;
}

// ── Step 3: Get photos for a property ───────────────────────────────
async function getPhotos(propertyId: string, listingId: string): Promise<string> {
  // The property_id param is base64-encoded JSON
  const idPayload = JSON.stringify({ property_id: propertyId, listing_id: listingId });
  const encoded = Buffer.from(idPayload).toString('base64');

  const url = `${BASE_URL}/property/get-photos?property_id=${encodeURIComponent(encoded)}`;

  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return '';

    const json = await res.json();
    const photos = json.data || json.photos || json.images || [];

    if (Array.isArray(photos) && photos.length > 0) {
      const first = photos[0];
      if (typeof first === 'string') return first;
      return first?.href || first?.url || first?.src || first?.photo || '';
    }

    // Maybe photos are nested
    if (json.data?.photos && Array.isArray(json.data.photos) && json.data.photos.length > 0) {
      const first = json.data.photos[0];
      return first?.href || first?.url || first?.src || '';
    }
  } catch {
    // Silently fail — photo is optional
  }

  return '';
}

// ── Upgrade photo URL to higher resolution ──────────────────────────
function upgradePhotoUrl(url: string): string {
  if (!url) return url;

  let upgraded = url;

  // rdcpix URLs use letter suffixes for size: s=small, m=medium, l=large, od=original
  // Example working large URL: http://nh.rdcpix.com/<hash>l-f<id>l.jpg
  if (/rdcpix\.com/i.test(upgraded)) {
    // Pattern: <hash><size>-f<id><size>.jpg → replace size letters with 'l' (large)
    // Handle dimension-based URLs first: strip -w{n}_h{n} entirely
    upgraded = upgraded.replace(/-w\d+_h\d+(_x2)?/g, '');
    // Upgrade size suffix before -f to 'l': e.g. ...3s-f... → ...3l-f...
    upgraded = upgraded.replace(/([0-9a-f])[smt](-f)/i, '$1l$2');
    // Upgrade trailing size suffix: e.g. ...932s.jpg → ...932l.jpg
    upgraded = upgraded.replace(/([0-9a-f])[smt](\.jpg)/i, '$1l$2');
  } else {
    // Non-rdcpix URLs: try dimension upgrade
    upgraded = upgraded.replace(/-w\d+_h\d+(_x2)?/g, '-w1024_h768');
    // s.jpg → l.jpg for other CDNs
    upgraded = upgraded.replace(/\/([^/]+)s\.jpg$/i, '/$1l.jpg');
  }

  // If URL has a "thumbs" path segment, try removing it for full-size
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
  _propertyId?: string;
  _listingId?: string;
} {
  const loc = prop.location || {};
  const addr = loc.address || prop.address || {};
  const desc = prop.description || {};

  let address = '';
  if (typeof addr === 'string') address = addr;
  else address = addr.line || addr.street_name || addr.street || addr.full || prop.street_address || prop.address_line || '';

  const city = addr.city || prop.city || loc.city || '';
  const state = addr.state_code || addr.state || prop.state_code || prop.state || loc.state_code || '';
  const zipcode = addr.postal_code || addr.zip || prop.zip || prop.zipcode || prop.postal_code || loc.postal_code || '';
  const price = prop.list_price || prop.price || prop.listPrice || desc.price || 0;
  const bedrooms = desc.beds || desc.bedrooms || prop.beds || prop.bedrooms || 0;
  const bathrooms = desc.baths || desc.bathrooms || prop.baths || prop.bathrooms || 0;
  const sqft = desc.sqft || prop.sqft || prop.square_feet || prop.lot_sqft || desc.lot_sqft || 0;
  const rawType = desc.type || prop.type || prop.property_type || prop.homeType || 'single_family';
  // Convert snake_case to Title Case (e.g., "single_family" → "Single Family")
  const homeType = rawType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

  // Photo URL — prefer photos array (often has larger images) over primary_photo thumbnail
  let photoUrl = '';
  if (Array.isArray(prop.photos) && prop.photos.length > 0) {
    const f = prop.photos[0];
    photoUrl = typeof f === 'string' ? f : (f?.href || f?.url || '');
  }
  if (!photoUrl && prop.primary_photo?.href) photoUrl = prop.primary_photo.href;
  if (!photoUrl && prop.photo?.href) photoUrl = prop.photo?.href;
  if (!photoUrl && typeof prop.thumbnail === 'string' && prop.thumbnail.startsWith('http')) photoUrl = prop.thumbnail;
  if (!photoUrl && typeof prop.image === 'string' && prop.image.startsWith('http')) photoUrl = prop.image;
  if (!photoUrl && typeof prop.photo_url === 'string' && prop.photo_url.startsWith('http')) photoUrl = prop.photo_url;
  if (!photoUrl && typeof prop.imageUrl === 'string' && prop.imageUrl.startsWith('http')) photoUrl = prop.imageUrl;

  // Upgrade to higher resolution version
  photoUrl = upgradePhotoUrl(photoUrl);

  // Listing URL — build from permalink or property_id
  let listingUrl = '';
  if (prop.permalink) {
    listingUrl = prop.permalink.startsWith('http') ? prop.permalink : `https://www.realtor.com/realestateandhomes-detail/${prop.permalink}`;
  } else if (prop.href) {
    listingUrl = prop.href.startsWith('http') ? prop.href : `https://www.realtor.com${prop.href}`;
  } else if (prop.url && typeof prop.url === 'string') {
    listingUrl = prop.url.startsWith('http') ? prop.url : `https://www.realtor.com${prop.url}`;
  } else if (prop.detail_url) {
    listingUrl = prop.detail_url.startsWith('http') ? prop.detail_url : `https://www.realtor.com${prop.detail_url}`;
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
    _propertyId: prop.property_id || '',
    _listingId: prop.listing_id || '',
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

    // Step 1: Auto-complete to get location ID
    const locationId = await autoCompleteLocation(searchQuery);
    debug.locationId = locationId;
    if (!locationId) {
      return NextResponse.json({ success: true, homes: [], count: 0, source: 'location_not_found', debug });
    }

    // Step 2: Search for-sale listings
    const listings = await searchForSale(locationId, minPrice, maxPrice);
    debug.rawListingCount = listings?.length || 0;
    if (!listings || listings.length === 0) {
      return NextResponse.json({ success: true, homes: [], count: 0, source: 'no_results', debug });
    }

    // Step 3: Normalize all listings
    let homes = listings.map(normalizeProperty);
    debug.normalizedCount = homes.length;
    debug.withPhotos = homes.filter(h => h.photoUrl).length;
    debug.samplePhotoUrl = homes.find(h => h.photoUrl)?.photoUrl || 'none';
    debug.pricesFound = homes.slice(0, 5).map(h => h.price);

    // Step 4: Prefer homes in price range, but keep unpriced and near-range homes
    // Sort: in-range first, then by closeness to target price
    const targetPrice = (minPrice + maxPrice) / 2;
    const priceSpan = maxPrice - minPrice;
    const wideMin = minPrice - priceSpan * 0.5;
    const wideMax = maxPrice + priceSpan * 0.5;

    // Keep homes that are in wider range OR have no price listed
    homes = homes.filter(h => h.price === 0 || (h.price >= wideMin && h.price <= wideMax));

    // Sort: exact range first, then by distance from target
    homes.sort((a, b) => {
      const aInRange = a.price >= minPrice && a.price <= maxPrice ? 0 : 1;
      const bInRange = b.price >= minPrice && b.price <= maxPrice ? 0 : 1;
      if (aInRange !== bInRange) return aInRange - bInRange;
      const aDist = a.price === 0 ? Infinity : Math.abs(a.price - targetPrice);
      const bDist = b.price === 0 ? Infinity : Math.abs(b.price - targetPrice);
      return aDist - bDist;
    });

    debug.inPriceRange = homes.filter(h => h.price >= minPrice && h.price <= maxPrice).length;
    debug.totalAfterFilter = homes.length;
    homes = homes.slice(0, 24);

    // Step 5: Fetch high-res photos via get-photos endpoint for all listings with property IDs
    const withIds = homes.filter(h => h._propertyId).slice(0, 24);
    if (withIds.length > 0) {
      debug.fetchingPhotosFor = withIds.length;
      const photoPromises = withIds.map(async (home) => {
        const url = await getPhotos(home._propertyId!, home._listingId || '');
        if (url) home.photoUrl = upgradePhotoUrl(url);
      });
      await Promise.allSettled(photoPromises);
    }

    // Remove internal fields
    const cleaned = homes.map(({ _propertyId, _listingId, ...rest }) => rest);
    debug.finalCount = cleaned.length;
    debug.finalWithPhotos = cleaned.filter(h => h.photoUrl).length;
    debug.photoUrls = cleaned.slice(0, 4).map(h => h.photoUrl || 'none');

    return NextResponse.json({
      success: true,
      homes: cleaned,
      count: cleaned.length,
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
    let locationId: string | null = null;
    try {
      const acUrl = `${BASE_URL}/auto-complete?input=${encodeURIComponent(searchQuery)}`;
      const acRes = await fetch(acUrl, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
      const acJson = await acRes.json();
      const acData = acJson.data || acJson.results || acJson;
      const firstResult = Array.isArray(acData) && acData.length > 0 ? acData[0] : null;

      // Extract location ID — prefer City, ST format
      if (Array.isArray(acData)) {
        for (const r of acData) {
          if (r.city && r.state_code) { locationId = `${r.city}, ${r.state_code}`; break; }
        }
      }
      if (!locationId && firstResult?.postal_code) locationId = firstResult.postal_code;
      if (!locationId && firstResult?.state_code && STATE_CAPITALS[firstResult.state_code]) {
        locationId = `${STATE_CAPITALS[firstResult.state_code]}, ${firstResult.state_code}`;
      }

      steps.push({
        step: 'auto-complete',
        url: acUrl,
        status: acRes.status,
        resultCount: Array.isArray(acData) ? acData.length : 0,
        resolvedLocationId: locationId,
        firstResult: firstResult ? JSON.stringify(firstResult).slice(0, 400) : null,
      });
    } catch (e) {
      steps.push({ step: 'auto-complete', error: e instanceof Error ? e.message : String(e) });
    }

    // Step 2: Try search-sale with multiple location ID formats
    // The API example used a zip code (12746), so slug_id might not work
    const acFirst = steps[0]?.firstResult ? JSON.parse(steps[0].firstResult) : null;
    const locationFormats: { label: string; value: string }[] = [];

    // Based on testing: API wants "City, ST" format + search_within_x_miles param
    if (acFirst?.city && acFirst?.state_code) locationFormats.push({ label: 'city_state', value: `${acFirst.city}, ${acFirst.state_code}` });
    if (locationId) locationFormats.push({ label: 'resolved_id', value: locationId });

    for (const fmt of locationFormats) {
      try {
        const searchUrl = `${BASE_URL}/property/search-sale?location=${encodeURIComponent(fmt.value)}&sort_by=RelevantListings&search_within_x_miles=50`;
        const searchRes = await fetch(searchUrl, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
        const searchJson = await searchRes.json();

        const listings = Array.isArray(searchJson.data) ? searchJson.data : [];
        const firstListing = listings[0] || null;

        steps.push({
          step: `search-sale (${fmt.label}: ${fmt.value})`,
          url: searchUrl,
          status: searchRes.status,
          message: searchJson.message,
          totalResultCount: searchJson.totalResultCount,
          listingCount: listings.length,
          firstListingKeys: firstListing ? Object.keys(firstListing) : null,
          firstListingFull: firstListing ? JSON.stringify(firstListing).slice(0, 2000) : null,
        });

        // If we got results, stop trying
        if (searchJson.totalResultCount > 0) break;
      } catch (e) {
        steps.push({ step: `search-sale (${fmt.label})`, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return NextResponse.json({
      host: API_HOST,
      apiKeyConfigured: !!API_KEY,
      locationInput: testLocation,
      searchQuery,
      locationParsed: { city, stateCode },
      steps,
    });
  }

  return NextResponse.json({
    status: 'ready',
    message: 'Real estate search API — add ?test=Boise to test the 2-step flow',
    apiKeyConfigured: !!API_KEY,
    apiHost: API_HOST,
  });
}
