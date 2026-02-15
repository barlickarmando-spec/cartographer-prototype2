// app/api/homes/search/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { location, minPrice, maxPrice } = body;

    console.log('Searching for real homes:', { location, minPrice, maxPrice });

    if (!location || !minPrice || !maxPrice) {
      return NextResponse.json(
        { success: false, error: 'Location and price range required' },
        { status: 400 }
      );
    }

    const rapidApiKey = process.env.RAPIDAPI_KEY;

    if (!rapidApiKey) {
      return NextResponse.json(
        { success: false, error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Parse location into city and state
    let searchLocation = location;
    let stateCode = '';
    
    // If it's just a state name, we need to handle it
    const stateAbbreviations: Record<string, string> = {
      'idaho': 'ID', 'utah': 'UT', 'texas': 'TX', 'california': 'CA',
      'florida': 'FL', 'arizona': 'AZ', 'colorado': 'CO', 'nevada': 'NV',
      'oregon': 'OR', 'washington': 'WA', 'montana': 'MT', 'wyoming': 'WY',
      // Add more as needed
    };
    
    const locationLower = location.toLowerCase().trim();
    
    // Check if it's a full state name
    if (stateAbbreviations[locationLower]) {
      stateCode = stateAbbreviations[locationLower];
      searchLocation = stateCode; // Search by state code
    } else if (location.includes(',')) {
      // "Boise, ID" format
      const parts = location.split(',').map(p => p.trim());
      searchLocation = parts[0];
      stateCode = parts[1];
    }

    console.log('📍 Formatted search:', { searchLocation, stateCode });

    // Try Realtor API (commonly available free tier)
    const url = new URL('https://realtor.p.rapidapi.com/properties/v3/list');
    url.searchParams.append('location', searchLocation);
    url.searchParams.append('price_min', minPrice.toString());
    url.searchParams.append('price_max', maxPrice.toString());
    url.searchParams.append('beds_min', '2');
    url.searchParams.append('limit', '12');
    url.searchParams.append('sort', 'relevance');

    console.log('🔗 API URL:', url.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'realtor.p.rapidapi.com'
      }
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', errorText);
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    console.log('Got data');

    // Extract properties
    let properties = [];
    if (data.data && data.data.home_search && data.data.home_search.results) {
      properties = data.data.home_search.results;
    } else if (data.properties && Array.isArray(data.properties)) {
      properties = data.properties;
    } else if (data.listings && Array.isArray(data.listings)) {
      properties = data.listings;
    }

    console.log(`Found ${properties.length} properties`);

    if (properties.length === 0) {
      return NextResponse.json({
        success: true,
        homes: [],
        count: 0,
        message: 'No homes found in this area/price range'
      });
    }

    // Transform to our format
    const homes = properties.slice(0, 12).map((prop: any) => {
      const location = prop.location || {};
      const address = location.address || {};
      const description = prop.description || {};
      
      // Get primary photo
      let photoUrl = '';
      if (prop.primary_photo && prop.primary_photo.href) {
        photoUrl = prop.primary_photo.href;
      } else if (prop.photos && Array.isArray(prop.photos) && prop.photos.length > 0) {
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
        photoUrl: photoUrl,
        listingUrl: prop.permalink || `https://www.realtor.com/realestateandhomes-detail/${prop.property_id}`,
        status: prop.status || 'for_sale',
      };
    });

    console.log(`Returning ${homes.length} homes`);

    return NextResponse.json({
      success: true,
      homes: homes,
      count: homes.length,
      source: 'Realtor.com'
    });

  } catch (error) {
    console.error('💥 Search error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to search homes',
        homes: []
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Real estate search API',
    apiKeyConfigured: !!process.env.RAPIDAPI_KEY
  });
}
