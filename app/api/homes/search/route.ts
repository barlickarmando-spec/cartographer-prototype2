// app/api/homes/search/route.ts

import { NextRequest, NextResponse } from 'next/server';

// Realistic fallback data keyed by state code, used when the external API is
// unreachable (no internet, key expired, rate-limited, etc.).
const FALLBACK_HOMES: Record<string, Array<{
  id: string; address: string; city: string; state: string; zipcode: string;
  price: number; bedrooms: number; bathrooms: number; sqft: number;
  homeType: string; photoUrl: string; listingUrl: string; status: string;
}>> = {
  ID: [
    { id: 'fb-id-1', address: '1234 Maple Ridge Dr', city: 'Boise', state: 'ID', zipcode: '83702', price: 385000, bedrooms: 3, bathrooms: 2, sqft: 1650, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Boise_ID', status: 'for_sale' },
    { id: 'fb-id-2', address: '5678 Eagle View Ln', city: 'Meridian', state: 'ID', zipcode: '83646', price: 420000, bedrooms: 4, bathrooms: 2.5, sqft: 2100, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Meridian_ID', status: 'for_sale' },
    { id: 'fb-id-3', address: '910 River Birch Ave', city: 'Nampa', state: 'ID', zipcode: '83687', price: 310000, bedrooms: 3, bathrooms: 2, sqft: 1450, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Nampa_ID', status: 'for_sale' },
    { id: 'fb-id-4', address: '2200 Summit Park Way', city: 'Boise', state: 'ID', zipcode: '83706', price: 475000, bedrooms: 4, bathrooms: 3, sqft: 2400, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Boise_ID', status: 'for_sale' },
  ],
  UT: [
    { id: 'fb-ut-1', address: '345 Canyon Crest Dr', city: 'Provo', state: 'UT', zipcode: '84604', price: 395000, bedrooms: 3, bathrooms: 2, sqft: 1700, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Provo_UT', status: 'for_sale' },
    { id: 'fb-ut-2', address: '789 Wasatch Blvd', city: 'Salt Lake City', state: 'UT', zipcode: '84109', price: 520000, bedrooms: 4, bathrooms: 3, sqft: 2300, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Salt-Lake-City_UT', status: 'for_sale' },
    { id: 'fb-ut-3', address: '1560 Redstone Ln', city: 'Lehi', state: 'UT', zipcode: '84043', price: 445000, bedrooms: 4, bathrooms: 2.5, sqft: 2050, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Lehi_UT', status: 'for_sale' },
  ],
  TX: [
    { id: 'fb-tx-1', address: '4501 Bluebonnet Trail', city: 'Austin', state: 'TX', zipcode: '78745', price: 375000, bedrooms: 3, bathrooms: 2, sqft: 1600, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Austin_TX', status: 'for_sale' },
    { id: 'fb-tx-2', address: '2890 Live Oak Ct', city: 'San Antonio', state: 'TX', zipcode: '78258', price: 310000, bedrooms: 4, bathrooms: 2.5, sqft: 2200, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/San-Antonio_TX', status: 'for_sale' },
    { id: 'fb-tx-3', address: '1723 Magnolia Dr', city: 'Dallas', state: 'TX', zipcode: '75214', price: 425000, bedrooms: 3, bathrooms: 2, sqft: 1800, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Dallas_TX', status: 'for_sale' },
    { id: 'fb-tx-4', address: '6100 Pecan Valley Rd', city: 'Houston', state: 'TX', zipcode: '77096', price: 295000, bedrooms: 3, bathrooms: 2, sqft: 1550, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Houston_TX', status: 'for_sale' },
  ],
  FL: [
    { id: 'fb-fl-1', address: '820 Palm Harbor Blvd', city: 'Tampa', state: 'FL', zipcode: '33611', price: 365000, bedrooms: 3, bathrooms: 2, sqft: 1500, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Tampa_FL', status: 'for_sale' },
    { id: 'fb-fl-2', address: '1450 Ocean Breeze Way', city: 'Jacksonville', state: 'FL', zipcode: '32256', price: 320000, bedrooms: 4, bathrooms: 2, sqft: 1900, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Jacksonville_FL', status: 'for_sale' },
    { id: 'fb-fl-3', address: '3300 Coral Ridge Dr', city: 'Orlando', state: 'FL', zipcode: '32812', price: 410000, bedrooms: 4, bathrooms: 3, sqft: 2100, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Orlando_FL', status: 'for_sale' },
  ],
  AZ: [
    { id: 'fb-az-1', address: '5600 Saguaro Vista Rd', city: 'Phoenix', state: 'AZ', zipcode: '85044', price: 380000, bedrooms: 3, bathrooms: 2, sqft: 1700, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Phoenix_AZ', status: 'for_sale' },
    { id: 'fb-az-2', address: '2100 Desert Willow Ln', city: 'Scottsdale', state: 'AZ', zipcode: '85260', price: 525000, bedrooms: 4, bathrooms: 3, sqft: 2500, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Scottsdale_AZ', status: 'for_sale' },
    { id: 'fb-az-3', address: '890 Mesa Grande Ave', city: 'Mesa', state: 'AZ', zipcode: '85213', price: 340000, bedrooms: 3, bathrooms: 2, sqft: 1550, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Mesa_AZ', status: 'for_sale' },
  ],
  CO: [
    { id: 'fb-co-1', address: '1800 Aspen Creek Dr', city: 'Denver', state: 'CO', zipcode: '80220', price: 485000, bedrooms: 3, bathrooms: 2, sqft: 1600, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Denver_CO', status: 'for_sale' },
    { id: 'fb-co-2', address: '3450 Mountain View Rd', city: 'Colorado Springs', state: 'CO', zipcode: '80918', price: 395000, bedrooms: 4, bathrooms: 2.5, sqft: 2100, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Colorado-Springs_CO', status: 'for_sale' },
    { id: 'fb-co-3', address: '720 Elk Meadow Ln', city: 'Fort Collins', state: 'CO', zipcode: '80525', price: 440000, bedrooms: 3, bathrooms: 2, sqft: 1750, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Fort-Collins_CO', status: 'for_sale' },
  ],
  NV: [
    { id: 'fb-nv-1', address: '4200 Desert Rose Ave', city: 'Las Vegas', state: 'NV', zipcode: '89135', price: 410000, bedrooms: 4, bathrooms: 3, sqft: 2200, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Las-Vegas_NV', status: 'for_sale' },
    { id: 'fb-nv-2', address: '1560 Silver State Pkwy', city: 'Henderson', state: 'NV', zipcode: '89052', price: 375000, bedrooms: 3, bathrooms: 2, sqft: 1650, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Henderson_NV', status: 'for_sale' },
    { id: 'fb-nv-3', address: '890 Sierra Vista Dr', city: 'Reno', state: 'NV', zipcode: '89511', price: 450000, bedrooms: 3, bathrooms: 2.5, sqft: 1800, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Reno_NV', status: 'for_sale' },
  ],
  CA: [
    { id: 'fb-ca-1', address: '2300 Pacific Heights Blvd', city: 'Sacramento', state: 'CA', zipcode: '95822', price: 450000, bedrooms: 3, bathrooms: 2, sqft: 1400, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Sacramento_CA', status: 'for_sale' },
    { id: 'fb-ca-2', address: '1800 Golden Gate Ave', city: 'Fresno', state: 'CA', zipcode: '93720', price: 350000, bedrooms: 3, bathrooms: 2, sqft: 1600, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Fresno_CA', status: 'for_sale' },
    { id: 'fb-ca-3', address: '4500 Redwood Valley Rd', city: 'Bakersfield', state: 'CA', zipcode: '93312', price: 310000, bedrooms: 4, bathrooms: 2, sqft: 1850, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Bakersfield_CA', status: 'for_sale' },
  ],
  OR: [
    { id: 'fb-or-1', address: '1650 Cascade View Ln', city: 'Portland', state: 'OR', zipcode: '97206', price: 425000, bedrooms: 3, bathrooms: 2, sqft: 1500, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Portland_OR', status: 'for_sale' },
    { id: 'fb-or-2', address: '3200 Willamette Dr', city: 'Salem', state: 'OR', zipcode: '97302', price: 360000, bedrooms: 4, bathrooms: 2.5, sqft: 1900, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Salem_OR', status: 'for_sale' },
    { id: 'fb-or-3', address: '780 Rogue River Rd', city: 'Bend', state: 'OR', zipcode: '97701', price: 510000, bedrooms: 3, bathrooms: 2, sqft: 1650, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Bend_OR', status: 'for_sale' },
  ],
  WA: [
    { id: 'fb-wa-1', address: '2400 Rainier Vista Dr', city: 'Tacoma', state: 'WA', zipcode: '98405', price: 415000, bedrooms: 3, bathrooms: 2, sqft: 1500, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Tacoma_WA', status: 'for_sale' },
    { id: 'fb-wa-2', address: '1100 Evergreen Blvd', city: 'Spokane', state: 'WA', zipcode: '99203', price: 340000, bedrooms: 4, bathrooms: 2, sqft: 1800, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Spokane_WA', status: 'for_sale' },
    { id: 'fb-wa-3', address: '5800 Olympic View Ct', city: 'Vancouver', state: 'WA', zipcode: '98684', price: 460000, bedrooms: 4, bathrooms: 2.5, sqft: 2100, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Vancouver_WA', status: 'for_sale' },
  ],
  MT: [
    { id: 'fb-mt-1', address: '1200 Big Sky Trail', city: 'Billings', state: 'MT', zipcode: '59102', price: 340000, bedrooms: 3, bathrooms: 2, sqft: 1600, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Billings_MT', status: 'for_sale' },
    { id: 'fb-mt-2', address: '890 Gallatin Valley Rd', city: 'Bozeman', state: 'MT', zipcode: '59718', price: 550000, bedrooms: 3, bathrooms: 2, sqft: 1750, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Bozeman_MT', status: 'for_sale' },
  ],
  WY: [
    { id: 'fb-wy-1', address: '450 Wind River Rd', city: 'Cheyenne', state: 'WY', zipcode: '82001', price: 295000, bedrooms: 3, bathrooms: 2, sqft: 1500, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Cheyenne_WY', status: 'for_sale' },
    { id: 'fb-wy-2', address: '1800 Teton View Ln', city: 'Casper', state: 'WY', zipcode: '82604', price: 270000, bedrooms: 4, bathrooms: 2, sqft: 1700, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Casper_WY', status: 'for_sale' },
  ],
  NC: [
    { id: 'fb-nc-1', address: '3200 Magnolia Creek Dr', city: 'Charlotte', state: 'NC', zipcode: '28270', price: 370000, bedrooms: 3, bathrooms: 2.5, sqft: 1800, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Charlotte_NC', status: 'for_sale' },
    { id: 'fb-nc-2', address: '1450 Blue Ridge Pkwy', city: 'Raleigh', state: 'NC', zipcode: '27615', price: 415000, bedrooms: 4, bathrooms: 3, sqft: 2200, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Raleigh_NC', status: 'for_sale' },
  ],
  GA: [
    { id: 'fb-ga-1', address: '2800 Peachtree Commons Dr', city: 'Atlanta', state: 'GA', zipcode: '30341', price: 355000, bedrooms: 3, bathrooms: 2, sqft: 1600, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Atlanta_GA', status: 'for_sale' },
    { id: 'fb-ga-2', address: '1900 Savannah Oaks Ln', city: 'Savannah', state: 'GA', zipcode: '31406', price: 290000, bedrooms: 3, bathrooms: 2, sqft: 1450, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Savannah_GA', status: 'for_sale' },
  ],
  TN: [
    { id: 'fb-tn-1', address: '1600 Music Row Blvd', city: 'Nashville', state: 'TN', zipcode: '37215', price: 425000, bedrooms: 3, bathrooms: 2, sqft: 1650, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Nashville_TN', status: 'for_sale' },
    { id: 'fb-tn-2', address: '3400 River Bend Dr', city: 'Knoxville', state: 'TN', zipcode: '37919', price: 310000, bedrooms: 4, bathrooms: 2, sqft: 1900, homeType: 'Single Family', photoUrl: '', listingUrl: 'https://www.realtor.com/realestateandhomes-search/Knoxville_TN', status: 'for_sale' },
  ],
};

// All US state abbreviations for fallback lookup
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

function resolveStateCode(location: string): string {
  const lower = location.toLowerCase().trim();

  // Full state name
  if (STATE_ABBREVIATIONS[lower]) return STATE_ABBREVIATIONS[lower];

  // Already a 2-letter code
  if (/^[A-Z]{2}$/.test(location.trim())) return location.trim();

  // "City, ST" format
  if (location.includes(',')) {
    const parts = location.split(',').map(p => p.trim());
    const statepart = parts[parts.length - 1];
    if (/^[A-Z]{2}$/i.test(statepart)) return statepart.toUpperCase();
    if (STATE_ABBREVIATIONS[statepart.toLowerCase()]) return STATE_ABBREVIATIONS[statepart.toLowerCase()];
  }

  return '';
}

function getFallbackHomes(location: string, minPrice: number, maxPrice: number) {
  const stateCode = resolveStateCode(location);

  // Try exact state match first
  let homes = FALLBACK_HOMES[stateCode] || [];

  // If no match, build a generic set from all fallback data
  if (homes.length === 0) {
    homes = Object.values(FALLBACK_HOMES).flat().slice(0, 6);
  }

  // Filter by price range (generous: +/- 40% of range)
  const priceFloor = minPrice * 0.6;
  const priceCeiling = maxPrice * 1.4;
  const filtered = homes.filter(h => h.price >= priceFloor && h.price <= priceCeiling);

  return filtered.length > 0 ? filtered : homes;
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

    const rapidApiKey = process.env.RAPIDAPI_KEY;

    if (!rapidApiKey) {
      // No API key — return fallback data
      const fallback = getFallbackHomes(location, minPrice, maxPrice);
      return NextResponse.json({
        success: true,
        homes: fallback,
        count: fallback.length,
        source: 'Sample listings',
      });
    }

    // Parse location
    let searchCity = '';
    let stateCode = '';
    const locationLower = location.toLowerCase().trim();

    if (STATE_ABBREVIATIONS[locationLower]) {
      stateCode = STATE_ABBREVIATIONS[locationLower];
    } else if (/^[A-Z]{2}$/i.test(location.trim())) {
      stateCode = location.trim().toUpperCase();
    } else if (location.includes(',')) {
      const parts = location.split(',').map((p: string) => p.trim());
      searchCity = parts[0];
      stateCode = parts[1]?.toUpperCase() || '';
    } else {
      searchCity = location;
    }

    // Build the POST body for Realtor API v3
    const apiBody: Record<string, unknown> = {
      limit: 12,
      offset: 0,
      status: ['for_sale'],
      sort: { direction: 'desc', field: 'list_date' },
      list_price: { min: minPrice, max: maxPrice },
    };

    if (searchCity) apiBody.city = searchCity;
    if (stateCode) apiBody.state_code = stateCode;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch('https://realtor.p.rapidapi.com/properties/v3/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': 'realtor.p.rapidapi.com',
        },
        body: JSON.stringify(apiBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();

      // Extract properties from various possible response shapes
      let properties: any[] = [];
      if (data.data?.home_search?.results) {
        properties = data.data.home_search.results;
      } else if (data.data?.results) {
        properties = data.data.results;
      } else if (Array.isArray(data.properties)) {
        properties = data.properties;
      } else if (Array.isArray(data.listings)) {
        properties = data.listings;
      }

      if (properties.length === 0) {
        // API returned empty — use fallback
        const fallback = getFallbackHomes(location, minPrice, maxPrice);
        return NextResponse.json({
          success: true,
          homes: fallback,
          count: fallback.length,
          source: 'Sample listings',
        });
      }

      const homes = properties.slice(0, 12).map((prop: any) => {
        const loc = prop.location || {};
        const address = loc.address || {};
        const description = prop.description || {};

        let photoUrl = '';
        if (prop.primary_photo?.href) {
          photoUrl = prop.primary_photo.href;
        } else if (Array.isArray(prop.photos) && prop.photos.length > 0) {
          photoUrl = prop.photos[0].href || prop.photos[0];
        } else if (prop.thumbnail) {
          photoUrl = prop.thumbnail;
        }

        return {
          id: prop.property_id || prop.listing_id || String(Math.random()),
          address: address.line || address.street_name || '',
          city: address.city || '',
          state: address.state_code || address.state || '',
          zipcode: address.postal_code || '',
          price: prop.list_price || 0,
          bedrooms: description.beds || description.bedrooms || 0,
          bathrooms: description.baths || description.bathrooms || 0,
          sqft: description.sqft || description.lot_sqft || 0,
          homeType: description.type || 'Single Family',
          photoUrl,
          listingUrl: prop.permalink
            ? `https://www.realtor.com/realestateandhomes-detail/${prop.permalink}`
            : `https://www.realtor.com/realestateandhomes-detail/${prop.property_id}`,
          status: prop.status || 'for_sale',
        };
      });

      return NextResponse.json({
        success: true,
        homes,
        count: homes.length,
        source: 'Realtor.com',
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      // Network error / timeout / DNS failure — use fallback
      console.error('Realtor API fetch error (using fallback):', fetchErr instanceof Error ? fetchErr.message : fetchErr);
      const fallback = getFallbackHomes(location, minPrice, maxPrice);
      return NextResponse.json({
        success: true,
        homes: fallback,
        count: fallback.length,
        source: 'Sample listings',
      });
    }
  } catch (error) {
    console.error('Search error:', error);
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

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Real estate search API',
    apiKeyConfigured: !!process.env.RAPIDAPI_KEY,
  });
}
