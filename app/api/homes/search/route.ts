// app/api/homes/search/route.ts
//
// Two-tier real estate search:
// Primary:  realtor-search.p.rapidapi.com  (auto-complete → search-sale → get-photos)
// Fallback: realty-in-us.p.rapidapi.com    (auto-complete → properties/v3/list)

import { NextRequest, NextResponse } from 'next/server';

// ── Config ──────────────────────────────────────────────────────────
const API_KEY = process.env.RAPIDAPI_KEY || '3b86e8a737mshcc69ac4077e9c00p18b472jsnc475ce3e84b9';

// Primary API
const PRIMARY_HOST = 'realtor-search.p.rapidapi.com';
const PRIMARY_URL = `https://${PRIMARY_HOST}`;
const PRIMARY_HEADERS: Record<string, string> = {
  'X-RapidAPI-Key': API_KEY,
  'X-RapidAPI-Host': PRIMARY_HOST,
};

// Fallback API
const FALLBACK_HOST = 'realty-in-us.p.rapidapi.com';
const FALLBACK_URL = `https://${FALLBACK_HOST}`;
const FALLBACK_HEADERS: Record<string, string> = {
  'X-RapidAPI-Key': API_KEY,
  'X-RapidAPI-Host': FALLBACK_HOST,
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

function upgradePhotoUrl(url: string): string {
  if (!url) return url;
  let upgraded = url;
  if (/rdcpix\.com/i.test(upgraded)) {
    // rdcpix size codes: s=small(140px), t=tiny, m=medium(280px), l=large(640px)
    // Upgrade s/t/m to l (large) — 'od' (original) often 404s so stick with 'l'
    upgraded = upgraded.replace(/-w\d+_h\d+(_x2)?/g, '');
    upgraded = upgraded.replace(/([0-9a-f])[stm](-[a-z])/gi, '$1l$2');
    upgraded = upgraded.replace(/([0-9a-f])[stm](\.jpg)/gi, '$1l$2');
  } else {
    upgraded = upgraded.replace(/-w\d+_h\d+(_x2)?/g, '-w1024_h768');
    upgraded = upgraded.replace(/\/([^/]+)s\.jpg$/i, '/$1l.jpg');
  }
  upgraded = upgraded.replace(/\/thumbs\//, '/');
  return upgraded;
}

const MAX_LISTINGS = 42;

// ── Shared: normalize a listing into our Home interface ─────────────
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

  photoUrl = upgradePhotoUrl(photoUrl);

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

// =====================================================================
// PRIMARY API: realtor-search.p.rapidapi.com
// =====================================================================

async function primaryAutoComplete(query: string): Promise<string | null> {
  const url = `${PRIMARY_URL}/auto-complete?input=${encodeURIComponent(query)}`;
  console.log(`[homes/search][primary] Auto-complete: ${url}`);

  const res = await fetch(url, {
    headers: PRIMARY_HEADERS,
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    console.log(`[homes/search][primary] Auto-complete failed: ${res.status}`);
    return null;
  }

  const json = await res.json();
  const results = json.data || json.results || json;

  if (!Array.isArray(results) || results.length === 0) {
    console.log('[homes/search][primary] Auto-complete returned no results');
    return null;
  }

  for (const r of results) {
    if (r.city && r.state_code) {
      console.log(`[homes/search][primary] Resolved to: ${r.city}, ${r.state_code}`);
      return `${r.city}, ${r.state_code}`;
    }
  }

  const first = results[0];
  if (first.state_code) {
    const capital = STATE_CAPITALS[first.state_code];
    if (capital) {
      console.log(`[homes/search][primary] State fallback: ${capital}, ${first.state_code}`);
      return `${capital}, ${first.state_code}`;
    }
  }

  for (const r of results) {
    if (r.postal_code) return r.postal_code;
  }

  console.log('[homes/search][primary] No usable ID:', JSON.stringify(first).slice(0, 200));
  return null;
}

function extractListings(json: any): any[] {
  let listings = json.data || json.properties || json.results || json.listings || json.homes || [];

  if (!Array.isArray(listings) && json.data && typeof json.data === 'object') {
    if (json.data.home_search?.results && Array.isArray(json.data.home_search.results)) {
      return json.data.home_search.results;
    }
    for (const key of Object.keys(json.data)) {
      if (Array.isArray(json.data[key]) && json.data[key].length > 0) {
        return json.data[key];
      }
    }
  }

  return Array.isArray(listings) ? listings : [];
}

const MAX_PAGES = 5;

async function primarySearchForSale(
  locationId: string,
  minPrice: number,
  maxPrice: number,
): Promise<{ listings: any[]; totalAvailable: number } | null> {

  const baseParamSets = [
    {
      location: locationId,
      sort_by: 'RelevantListings',
      search_within_x_miles: '50',
      price_min: String(minPrice),
      price_max: String(maxPrice),
    },
    {
      location: locationId,
      sort_by: 'RelevantListings',
      search_within_x_miles: '50',
    },
  ];

  for (const baseParams of baseParamSets) {
    try {
      const page1Params = new URLSearchParams({ ...baseParams, page: '1' });
      const url1 = `${PRIMARY_URL}/property/search-sale?${page1Params.toString()}`;
      console.log(`[homes/search][primary] Search page 1: ${url1}`);

      const res1 = await fetch(url1, {
        headers: PRIMARY_HEADERS,
        signal: AbortSignal.timeout(12000),
      });

      if (!res1.ok) {
        console.log(`[homes/search][primary] Search page 1 failed: ${res1.status}`);
        continue;
      }

      const json1 = await res1.json();
      const page1Listings = extractListings(json1);
      const totalResultCount = json1.totalResultCount || json1.total || json1.meta?.total || 0;
      const perPage = page1Listings.length;

      console.log(`[homes/search][primary] Page 1: ${perPage} listings, total: ${totalResultCount}`);

      if (perPage === 0) continue;

      const allListings = [...page1Listings];

      if (totalResultCount > perPage && allListings.length < MAX_LISTINGS) {
        const totalPages = Math.min(MAX_PAGES, Math.ceil(totalResultCount / Math.max(perPage, 1)));
        const pagePromises: Promise<any[]>[] = [];

        for (let p = 2; p <= totalPages; p++) {
          if (allListings.length + (p - 2) * perPage >= MAX_LISTINGS) break;
          const pageParams = new URLSearchParams({ ...baseParams, page: String(p) });
          const pageUrl = `${PRIMARY_URL}/property/search-sale?${pageParams.toString()}`;
          console.log(`[homes/search][primary] Queueing page ${p}`);

          pagePromises.push(
            fetch(pageUrl, { headers: PRIMARY_HEADERS, signal: AbortSignal.timeout(12000) })
              .then(async (res) => {
                if (!res.ok) return [];
                const json = await res.json();
                return extractListings(json);
              })
              .catch((e) => {
                console.log(`[homes/search][primary] Page ${p} error:`, e instanceof Error ? e.message : e);
                return [];
              })
          );
        }

        const additionalPages = await Promise.all(pagePromises);
        for (const pageResults of additionalPages) {
          allListings.push(...pageResults);
        }
      }

      console.log(`[homes/search][primary] Total fetched: ${allListings.length} (${totalResultCount} available)`);
      return { listings: allListings, totalAvailable: totalResultCount || allListings.length };

    } catch (e) {
      console.log(`[homes/search][primary] Search error:`, e instanceof Error ? e.message : e);
    }
  }

  return null;
}

async function primaryGetPhotos(propertyId: string, listingId: string): Promise<string> {
  const idPayload = JSON.stringify({ property_id: propertyId, listing_id: listingId });
  const encoded = Buffer.from(idPayload).toString('base64');
  const url = `${PRIMARY_URL}/property/get-photos?property_id=${encodeURIComponent(encoded)}`;

  try {
    const res = await fetch(url, {
      headers: PRIMARY_HEADERS,
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

    if (json.data?.photos && Array.isArray(json.data.photos) && json.data.photos.length > 0) {
      const first = json.data.photos[0];
      return first?.href || first?.url || first?.src || '';
    }
  } catch {
    // Photo fetch is optional
  }
  return '';
}

// =====================================================================
// FALLBACK API: realty-in-us.p.rapidapi.com
// =====================================================================

interface FallbackLocation {
  city: string;
  state_code: string;
}

async function fallbackAutoComplete(query: string): Promise<FallbackLocation | null> {
  const url = `${FALLBACK_URL}/locations/v2/auto-complete?input=${encodeURIComponent(query)}`;
  console.log(`[homes/search][fallback] Auto-complete: ${url}`);

  const res = await fetch(url, {
    headers: FALLBACK_HEADERS,
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    console.log(`[homes/search][fallback] Auto-complete failed: ${res.status}`);
    return null;
  }

  const json = await res.json();
  const autocomplete = json.autocomplete || [];

  if (!Array.isArray(autocomplete) || autocomplete.length === 0) {
    console.log('[homes/search][fallback] Auto-complete returned no results');
    return null;
  }

  for (const item of autocomplete) {
    if (item.area_type === 'city' && item.city && item.state_code) {
      console.log(`[homes/search][fallback] Resolved to city: ${item.city}, ${item.state_code}`);
      return { city: item.city, state_code: item.state_code };
    }
  }

  for (const item of autocomplete) {
    if (item.city && item.state_code) {
      console.log(`[homes/search][fallback] Resolved to: ${item.city}, ${item.state_code}`);
      return { city: item.city, state_code: item.state_code };
    }
  }

  const first = autocomplete[0];
  if (first.state_code) {
    const capital = STATE_CAPITALS[first.state_code];
    if (capital) {
      console.log(`[homes/search][fallback] State fallback: ${capital}, ${first.state_code}`);
      return { city: capital, state_code: first.state_code };
    }
  }

  console.log('[homes/search][fallback] No usable result:', JSON.stringify(first).slice(0, 200));
  return null;
}

async function fallbackSearchListings(
  loc: FallbackLocation,
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
      console.log(`[homes/search][fallback] POST /properties/v3/list:`, JSON.stringify(body).slice(0, 200));

      const res = await fetch(`${FALLBACK_URL}/properties/v3/list`, {
        method: 'POST',
        headers: FALLBACK_HEADERS,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        console.log(`[homes/search][fallback] List failed: ${res.status}`);
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
      console.log(`[homes/search][fallback] Got ${results.length} listings (${total} total)`);

      if (results.length > 0) {
        return { listings: results.slice(0, MAX_LISTINGS), totalAvailable: total };
      }
    } catch (e) {
      console.log(`[homes/search][fallback] List error:`, e instanceof Error ? e.message : e);
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
    const { location, minPrice, maxPrice, preferredApi } = body;

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
    let source = 'none';

    // Determine API order based on preferredApi param
    const tryPrimary = !preferredApi || preferredApi === 'realtor-search';
    const tryFallback = !preferredApi || preferredApi === 'realty-in-us';
    debug.preferredApi = preferredApi || 'auto';

    // ── Try primary API (realtor-search) ──
    if (tryPrimary) {
      try {
        const locationId = await primaryAutoComplete(searchQuery);
        debug.primaryLocationId = locationId;

        if (locationId) {
          const result = await primarySearchForSale(locationId, minPrice, maxPrice);
          if (result && result.listings.length > 0) {
            listings = result.listings;
            totalAvailable = result.totalAvailable;
            source = 'realtor-search';
          }
        }
        debug.primaryCount = listings.length;
      } catch (e) {
        console.log('[homes/search] Primary API error:', e instanceof Error ? e.message : e);
        debug.primaryError = e instanceof Error ? e.message : String(e);
      }
    }

    // ── Try realty-in-us (as fallback or if preferred) ──
    if (listings.length === 0 && tryFallback) {
      console.log('[homes/search] Trying realty-in-us...');
      try {
        const resolved = await fallbackAutoComplete(searchQuery);
        debug.fallbackResolved = resolved;

        if (resolved) {
          const result = await fallbackSearchListings(resolved, minPrice, maxPrice);
          if (result && result.listings.length > 0) {
            listings = result.listings;
            totalAvailable = result.totalAvailable;
            source = 'realty-in-us';
          }
        }
        debug.fallbackCount = listings.length;
      } catch (e) {
        console.log('[homes/search] Fallback API error:', e instanceof Error ? e.message : e);
        debug.fallbackError = e instanceof Error ? e.message : String(e);
      }
    }

    debug.rawListingCount = listings.length;
    debug.source = source;

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
        // Keep all results — real listings are better than fallback
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

    // Fetch photos for primary API listings that are missing them
    if (source === 'realtor-search') {
      const needPhotos = homes.filter(h => h._propertyId && !h.photoUrl).slice(0, 12);
      if (needPhotos.length > 0) {
        debug.fetchingPhotosFor = needPhotos.length;
        const photoPromises = needPhotos.map(async (home) => {
          const url = await primaryGetPhotos(home._propertyId!, home._listingId || '');
          if (url) home.photoUrl = upgradePhotoUrl(url);
        });
        await Promise.allSettled(photoPromises);
      }
    }

    // Remove internal fields
    const cleaned = homes.map(({ _propertyId, _listingId, ...rest }) => rest);
    debug.finalCount = cleaned.length;
    debug.finalWithPhotos = cleaned.filter(h => h.photoUrl).length;

    return NextResponse.json({
      success: true,
      homes: cleaned,
      count: cleaned.length,
      totalAvailable,
      source,
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

    // Test primary
    try {
      const locationId = await primaryAutoComplete(searchQuery);
      steps.push({ step: 'primary-auto-complete', resolved: locationId });

      if (locationId) {
        const result = await primarySearchForSale(locationId, 100000, 500000);
        const firstListing = result?.listings?.[0];
        steps.push({
          step: 'primary-search-sale',
          totalAvailable: result?.totalAvailable,
          listingCount: result?.listings?.length || 0,
          firstListingKeys: firstListing ? Object.keys(firstListing) : null,
        });
      }
    } catch (e) {
      steps.push({ step: 'primary-error', error: e instanceof Error ? e.message : String(e) });
    }

    // Test fallback
    try {
      const resolved = await fallbackAutoComplete(searchQuery);
      steps.push({ step: 'fallback-auto-complete', resolved });

      if (resolved) {
        const result = await fallbackSearchListings(resolved, 100000, 500000);
        const firstListing = result?.listings?.[0];
        steps.push({
          step: 'fallback-properties-list',
          totalAvailable: result?.totalAvailable,
          listingCount: result?.listings?.length || 0,
          samplePhoto: firstListing?.primary_photo?.href || 'none',
        });
      }
    } catch (e) {
      steps.push({ step: 'fallback-error', error: e instanceof Error ? e.message : String(e) });
    }

    return NextResponse.json({
      primaryHost: PRIMARY_HOST,
      fallbackHost: FALLBACK_HOST,
      apiKeyConfigured: !!API_KEY,
      locationInput: testLocation,
      searchQuery,
      steps,
    });
  }

  return NextResponse.json({
    status: 'ready',
    message: 'Real estate search API — primary: realtor-search, fallback: realty-in-us — add ?test=Boise to test',
    apiKeyConfigured: !!API_KEY,
    primaryHost: PRIMARY_HOST,
    fallbackHost: FALLBACK_HOST,
  });
}
