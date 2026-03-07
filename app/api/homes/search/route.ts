// app/api/homes/search/route.ts
//
// Real estate search using realty-in-us.p.rapidapi.com
// (auto-complete → properties/v3/list)

import { NextRequest, NextResponse } from 'next/server';

// ── Config ──────────────────────────────────────────────────────────
const API_KEY = process.env.RAPIDAPI_KEY || '';

const API_HOST = 'realty-in-us.p.rapidapi.com';
const API_URL = `https://${API_HOST}`;
const API_HEADERS: Record<string, string> = {
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

// ── Shared utilities ────────────────────────────────────────────────
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

/**
 * Upgrade a photo URL to high resolution.
 * rdcpix CDN supports arbitrary width/height parameters.
 * We request 1280x960 for card display (sharp on 2x Retina).
 */
function upgradePhotoUrl(url: string): string {
  if (!url) return url;
  let upgraded = url.replace(/(-w)\d+/, '$11280');
  upgraded = upgraded.replace(/(_h)\d+/, '$1960');
  upgraded = upgraded.replace(/\/thumbs\//, '/');
  upgraded = upgraded.replace(/([_-])s(\.\w+)$/, '$1l$2');
  upgraded = upgraded.replace(/([?&])w=\d+/, '$1w=1280');
  upgraded = upgraded.replace(/([?&])h=\d+/, '$1h=960');
  return upgraded;
}

/**
 * Get an even higher resolution URL for full-screen / modal display.
 * Targets 1920x1440 for crisp rendering on large screens.
 */
function getFullResPhotoUrl(url: string): string {
  if (!url) return url;
  let upgraded = url.replace(/(-w)\d+/, '$11920');
  upgraded = upgraded.replace(/(_h)\d+/, '$11440');
  upgraded = upgraded.replace(/\/thumbs\//, '/');
  upgraded = upgraded.replace(/([_-])s(\.\w+)$/, '$1l$2');
  upgraded = upgraded.replace(/([?&])w=\d+/, '$1w=1920');
  upgraded = upgraded.replace(/([?&])h=\d+/, '$1h=1440');
  return upgraded;
}

const MAX_LISTINGS = 42;

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
  fullResPhotoUrl: string;
  listingUrl: string;
  status: string;
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
  const price = prop.list_price || prop.price || prop.listPrice || desc.price || desc.list_price || 0;
  const bedrooms = desc.beds || desc.bedrooms || prop.beds || prop.bedrooms || 0;
  const bathrooms = desc.baths || desc.bathrooms || prop.baths || prop.bathrooms || 0;
  const sqft = desc.sqft || prop.sqft || prop.square_feet || prop.lot_sqft || prop.building_size?.size || desc.lot_sqft || 0;
  const rawType = desc.type || prop.type || prop.property_type || prop.prop_type || prop.homeType || 'single_family';
  const homeType = rawType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

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

  const rawPhotoUrl = photoUrl;
  const fullResPhoto = getFullResPhotoUrl(photoUrl);
  photoUrl = upgradePhotoUrl(photoUrl);
  if (rawPhotoUrl && rawPhotoUrl !== photoUrl) {
    console.log(`[photos] ${rawPhotoUrl} → ${photoUrl}`);
  }

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
    fullResPhotoUrl: fullResPhoto,
    listingUrl,
    status: prop.status || 'for_sale',
  };
}

// =====================================================================
// API: realty-in-us.p.rapidapi.com
// =====================================================================

interface ResolvedLocation {
  city: string;
  state_code: string;
}

async function autoComplete(query: string): Promise<ResolvedLocation | null> {
  const url = `${API_URL}/locations/v2/auto-complete?input=${encodeURIComponent(query)}`;
  console.log(`[homes/search] Auto-complete: ${url}`);

  const res = await fetch(url, {
    headers: API_HEADERS,
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

  for (const item of autocomplete) {
    if (item.area_type === 'city' && item.city && item.state_code) {
      console.log(`[homes/search] Resolved to city: ${item.city}, ${item.state_code}`);
      return { city: item.city, state_code: item.state_code };
    }
  }

  for (const item of autocomplete) {
    if (item.city && item.state_code) {
      console.log(`[homes/search] Resolved to: ${item.city}, ${item.state_code}`);
      return { city: item.city, state_code: item.state_code };
    }
  }

  const first = autocomplete[0];
  if (first.state_code) {
    const capital = STATE_CAPITALS[first.state_code];
    if (capital) {
      console.log(`[homes/search] State fallback: ${capital}, ${first.state_code}`);
      return { city: capital, state_code: first.state_code };
    }
  }

  console.log('[homes/search] No usable result:', JSON.stringify(first).slice(0, 200));
  return null;
}

async function searchListings(
  loc: ResolvedLocation,
  minPrice: number,
  maxPrice: number,
): Promise<{ listings: any[]; totalAvailable: number } | null> {

  const bodyVariants = [
    {
      city: loc.city,
      state_code: loc.state_code,
      status: ['for_sale'],
      sort: { direction: 'desc', field: 'list_date' },
      list_price: { min: minPrice, max: maxPrice },
      limit: 42,
      offset: 0,
    },
    {
      city: loc.city,
      state_code: loc.state_code,
      status: ['for_sale'],
      sort: { direction: 'desc', field: 'list_date' },
      limit: 42,
      offset: 0,
    },
  ];

  for (const body of bodyVariants) {
    try {
      console.log(`[homes/search] POST /properties/v3/list:`, JSON.stringify(body).slice(0, 200));

      const res = await fetch(`${API_URL}/properties/v3/list`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        console.log(`[homes/search] List failed: ${res.status}`);
        continue;
      }

      const json = await res.json();
      const homeSearch = json.data?.home_search || json.data?.results || {};
      let results = homeSearch.results || homeSearch || [];
      if (!Array.isArray(results)) {
        results = json.data?.properties || json.properties || json.results || json.data || [];
      }
      if (!Array.isArray(results)) results = [];

      const total = homeSearch.total || json.data?.total || json.total || results.length;
      console.log(`[homes/search] Got ${results.length} listings (${total} total)`);

      if (results.length > 0) {
        return { listings: results.slice(0, MAX_LISTINGS), totalAvailable: total };
      }
    } catch (e) {
      console.log(`[homes/search] List error:`, e instanceof Error ? e.message : e);
    }
  }

  return null;
}

// =====================================================================
// POST handler (used by the carousel component)
// =====================================================================
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
    debug.parsedCity = city;
    debug.parsedStateCode = stateCode;

    let listings: any[] = [];
    let totalAvailable = 0;

    // ── Resolve location and search ──
    try {
      console.log('[homes/search] Searching realty-in-us...');
      const resolved = await autoComplete(searchQuery);
      debug.resolved = resolved;

      if (resolved) {
        const result = await searchListings(resolved, minPrice, maxPrice);
        if (result && result.listings.length > 0) {
          listings = result.listings;
          totalAvailable = result.totalAvailable;
        }
      }
      debug.listingCount = listings.length;
    } catch (e) {
      console.log('[homes/search] API error:', e instanceof Error ? e.message : e);
      debug.error = e instanceof Error ? e.message : String(e);
    }

    debug.rawListingCount = listings.length;
    debug.source = 'realty-in-us';

    if (listings.length === 0) {
      return NextResponse.json({ success: true, homes: [], count: 0, totalAvailable: 0, source: 'no_results', debug });
    }

    // Normalize all listings
    let homes = listings.map(normalizeProperty);
    debug.normalizedCount = homes.length;
    debug.withPhotos = homes.filter(h => h.photoUrl).length;

    // Price filter with graceful degradation for mismatched markets
    const beforeFilter = homes.length;
    const strictFiltered = homes.filter(h => {
      if (h.price === 0) return true;
      return h.price >= minPrice && h.price <= maxPrice;
    });

    const MIN_RESULTS = 6;
    if (strictFiltered.length >= MIN_RESULTS) {
      homes = strictFiltered;
      debug.priceFilterMode = 'strict';
    } else {
      // Expand range by ±50%
      const range = maxPrice - minPrice;
      const expandedMin = Math.max(0, minPrice - range * 0.5);
      const expandedMax = maxPrice + range * 0.5;
      const expandedFiltered = homes.filter(h => {
        if (h.price === 0) return true;
        return h.price >= expandedMin && h.price <= expandedMax;
      });

      if (expandedFiltered.length >= MIN_RESULTS) {
        homes = expandedFiltered;
        debug.priceFilterMode = 'expanded';
        debug.expandedRange = { min: expandedMin, max: expandedMax };
      } else {
        // Keep all results — real listings are better than nothing
        debug.priceFilterMode = 'none';
      }
    }
    debug.filteredOut = beforeFilter - homes.length;
    debug.afterPriceFilter = homes.length;

    // Sort — prefer homes with photos, then by closeness to target price
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
    debug.finalWithPhotos = homes.filter(h => h.photoUrl).length;
    debug.samplePhotoUrls = homes.slice(0, 3).map(h => h.photoUrl).filter(Boolean);

    return NextResponse.json({
      success: true,
      homes,
      count: homes.length,
      totalAvailable,
      source: 'realty-in-us',
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

    try {
      const resolved = await autoComplete(searchQuery);
      steps.push({ step: 'auto-complete', resolved });

      if (resolved) {
        const result = await searchListings(resolved, 100000, 500000);
        const firstListing = result?.listings?.[0];
        steps.push({
          step: 'properties-list',
          totalAvailable: result?.totalAvailable,
          listingCount: result?.listings?.length || 0,
          samplePhotoRaw: firstListing?.primary_photo?.href || 'none',
          samplePhotoUpgraded: firstListing?.primary_photo?.href ? upgradePhotoUrl(firstListing.primary_photo.href) : 'none',
        });
      }
    } catch (e) {
      steps.push({ step: 'error', error: e instanceof Error ? e.message : String(e) });
    }

    return NextResponse.json({
      apiHost: API_HOST,
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
