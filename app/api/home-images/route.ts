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

  // Format price for readable search query: 1400000 -> "$1.4 million"
  const priceNum = parseInt(price, 10);
  let priceLabel: string;
  if (priceNum >= 1000000) {
    priceLabel = `$${(priceNum / 1000000).toFixed(1)} million`;
  } else {
    priceLabel = `$${(priceNum / 1000).toFixed(0)}K`;
  }

  const query = `${location} home for sale ${priceLabel}`;

  // If Google API keys are missing, return empty (not an error)
  if (!apiKey || !cx) {
    return NextResponse.json({ success: true, images: [], query });
  }

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('q', query);
  url.searchParams.set('searchType', 'image');
  url.searchParams.set('num', '6');
  url.searchParams.set('imgSize', 'huge');
  url.searchParams.set('imgType', 'photo');
  url.searchParams.set('safe', 'active');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('cx', cx);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeout);

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
      // Return empty images instead of an error status so the UI degrades gracefully
      return NextResponse.json({ success: true, images: [], query });
    }

    const data = await response.json();
    const images = (data.items || [])
      .filter((item: any) => {
        // Filter out tiny images that would be blurry
        const w = item.image?.width || 0;
        const h = item.image?.height || 0;
        return w >= 400 && h >= 300;
      })
      .map((item: any) => ({
        url: item.link,
        title: item.title,
        contextLink: item.image?.contextLink || '',
        width: item.image?.width || 0,
        height: item.image?.height || 0,
      }));

    return NextResponse.json({ success: true, images, query });
  } catch (err) {
    clearTimeout(timeout);
    console.error('Google Image Search error (returning empty):', err instanceof Error ? err.message : err);
    // Graceful degradation: return empty images, not a 500
    return NextResponse.json({ success: true, images: [], query });
  }
}
