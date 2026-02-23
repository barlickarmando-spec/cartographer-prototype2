import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get('location');
  const price = searchParams.get('price');

  if (!location || !price) {
    return NextResponse.json(
      { success: false, error: 'location and price are required' },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !cx) {
    return NextResponse.json(
      { success: false, error: 'Google API not configured' },
      { status: 500 }
    );
  }

  // Format price for readable search query: 1400000 → "$1.4 million"
  const priceNum = parseInt(price, 10);
  let priceLabel: string;
  if (priceNum >= 1000000) {
    priceLabel = `$${(priceNum / 1000000).toFixed(1)} million`;
  } else {
    priceLabel = `$${(priceNum / 1000).toFixed(0)}K`;
  }

  const query = `${location} home for sale ${priceLabel}`;

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('q', query);
  url.searchParams.set('searchType', 'image');
  url.searchParams.set('num', '5');
  url.searchParams.set('imgSize', 'xlarge');
  url.searchParams.set('safe', 'active');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('cx', cx);

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      let errorDetail = `Google API returned ${response.status}`;
      try {
        const errJson = await response.json();
        const googleMsg = errJson?.error?.message || '';
        const googleReason = errJson?.error?.errors?.[0]?.reason || '';
        errorDetail = `Google API ${response.status}: ${googleMsg} (${googleReason})`;
        console.error('Google API error:', errorDetail);
      } catch {
        const errorText = await response.text();
        console.error('Google API error:', response.status, errorText);
      }
      return NextResponse.json(
        { success: false, error: errorDetail },
        { status: 502 }
      );
    }

    const data = await response.json();
    const images = (data.items || []).map((item: any) => ({
      url: item.link,
      title: item.title,
      contextLink: item.image?.contextLink || '',
    }));

    return NextResponse.json({ success: true, images, query });
  } catch (err) {
    console.error('Google Image Search error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}
