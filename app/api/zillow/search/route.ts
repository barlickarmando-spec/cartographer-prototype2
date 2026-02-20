// app/api/zillow/search/route.ts
// Configured for Realty in US API (realty-in-us.p.rapidapi.com)

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { location, minPrice, maxPrice } = body;

    console.log('Realty in US - Searching:', location, minPrice, '-', maxPrice);

    if (!location || !minPrice || !maxPrice) {
      return NextResponse.json(
        { success: false, error: 'Location and price range are required' },
        { status: 400 }
      );
    }

    const rapidApiKey = process.env.RAPIDAPI_KEY;

    if (!rapidApiKey) {
      console.error('RAPIDAPI_KEY not found');
      return NextResponse.json(
        { success: false, error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Parse location for Realty in US API
    // Supports: "City, State" or "State" or "State Code"
    let city = '';
    let stateCode = '';

    const locationParts = location.split(',').map((s: string) => s.trim());
    if (locationParts.length === 2) {
      // Format: "Austin, TX" or "Salt Lake City, UT"
      city = locationParts[0];
      stateCode = locationParts[1];
    } else {
      // Format: "Utah" or "UT" (just state)
      stateCode = location.trim();
    }

    // Build Realty in US API URL
    const url = new URL('https://realty-in-us.p.rapidapi.com/properties/v2/list-for-sale');
    
    if (city) {
      url.searchParams.append('city', city);
    }
    url.searchParams.append('state_code', stateCode);
    url.searchParams.append('price_min', minPrice.toString());
    url.searchParams.append('price_max', maxPrice.toString());
    url.searchParams.append('limit', '20');
    url.searchParams.append('offset', '0');

    console.log('📡 Calling Realty in US API:', url.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'realty-in-us.p.rapidapi.com'
      }
    });

    console.log('📥 API Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Got data from Realty in US');

    // Extract homes from Realty in US response
    let properties = [];
    
    if (data.data?.home_search?.results) {
      properties = data.data.home_search.results;
    } else if (data.properties) {
      properties = data.properties;
    } else if (data.results) {
      properties = data.results;
    } else if (Array.isArray(data)) {
      properties = data;
    } else {
      console.log('📦 Response structure:', Object.keys(data));
      throw new Error('Unexpected API response format');
    }

    console.log(`Found ${properties.length} properties`);

    // Transform to our format
    const homes = properties
      .filter((home: any) => {
        const price = home.list_price || home.price || 0;
        return price >= minPrice && price <= maxPrice;
      })
      .slice(0, 12)
      .map((home: any) => {
        const address = home.location?.address || {};
        const description = home.description || {};
        const photos = home.photos || home.primary_photo || [];
        
        // FIX 3: Safely extract image URL from photos array
        let imgSrc = '';
        if (Array.isArray(photos) && photos.length > 0) {
          imgSrc = photos[0]?.href || '';
        } else if (photos && typeof photos === 'object' && 'href' in photos) {
          imgSrc = photos.href || '';
        }
        
        return {
          zpid: home.property_id || home.id || String(Math.random()),
          address: address.line || home.address || '',
          city: address.city || '',
          state: address.state_code || address.state || '',
          zipcode: address.postal_code || '',
          price: home.list_price || home.price || 0,
          bedrooms: description.beds || home.beds || 0,
          bathrooms: description.baths || home.baths || 0,
          livingArea: description.sqft || home.sqft || 0,
          homeType: description.type || home.prop_type || 'House',
          imgSrc: imgSrc,
          detailUrl: home.href || `https://www.realtor.com/realestateandhomes-detail/${home.property_id}`,
          listingStatus: home.status || home.list_status || 'For Sale',
          daysOnZillow: home.days_on_mls || 0,
        };
      });

    console.log(`Returning ${homes.length} homes`);

    return NextResponse.json({
      success: true,
      homes: homes,
      count: homes.length,
      totalFound: properties.length
    });

  } catch (error) {
    console.error('💥 Realty in US API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch homes',
        homes: []
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'POST to this endpoint with { location, minPrice, maxPrice }',
    apiKeyConfigured: !!process.env.RAPIDAPI_KEY,
    api: 'realty-in-us.p.rapidapi.com'
  });
}
