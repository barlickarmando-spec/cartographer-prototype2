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

  // Full state name
  if (STATE_ABBREVIATIONS[lower]) {
    return { city: '', stateCode: STATE_ABBREVIATIONS[lower] };
  }

  // Already a 2-letter code
  if (/^[A-Z]{2}$/i.test(trimmed)) {
    return { city: '', stateCode: trimmed.toUpperCase() };
  }

  // "City, ST" format
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

  // Just a city name
  return { city: trimmed, stateCode: '' };
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
      // No API key — return empty so the UI shows browse links
      return NextResponse.json({
        success: true,
        homes: [],
        count: 0,
        source: 'Sample listings',
      });
    }

    const { city: searchCity, stateCode } = parseLocation(location);

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
        return NextResponse.json({
          success: true,
          homes: [],
          count: 0,
          source: 'Realtor.com',
        });
      }

      const homes = properties.slice(0, 12).map((prop: any) => {
        const loc = prop.location || {};
        const address = loc.address || {};
        const description = prop.description || {};

        // Extract photo URL - try multiple paths
        let photoUrl = '';
        if (prop.primary_photo?.href) {
          photoUrl = prop.primary_photo.href;
        } else if (Array.isArray(prop.photos) && prop.photos.length > 0) {
          photoUrl = prop.photos[0]?.href || prop.photos[0] || '';
        } else if (prop.thumbnail) {
          photoUrl = prop.thumbnail;
        }

        // Build direct listing URL using permalink (the real specific listing link)
        let listingUrl = '';
        if (prop.permalink) {
          listingUrl = `https://www.realtor.com/realestateandhomes-detail/${prop.permalink}`;
        } else if (prop.property_id) {
          listingUrl = `https://www.realtor.com/realestateandhomes-detail/${prop.property_id}`;
        } else {
          // Fallback to search page for this city
          const city = (address.city || '').replace(/\s+/g, '-');
          const st = address.state_code || address.state || '';
          listingUrl = `https://www.realtor.com/realestateandhomes-search/${city}_${st}`;
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
          listingUrl,
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
      console.error('Realtor API fetch error:', fetchErr instanceof Error ? fetchErr.message : fetchErr);
      // Network error / timeout — return empty so UI shows browse links
      return NextResponse.json({
        success: true,
        homes: [],
        count: 0,
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
