import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get('location');

  if (!location) {
    return NextResponse.json({ success: false, error: 'location is required' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !cx) {
    console.log('[location-images] Missing GOOGLE_API_KEY or GOOGLE_SEARCH_ENGINE_ID');
    return NextResponse.json({ success: true, images: [] });
  }

  // Try multiple queries in order of specificity for best results
  const queries = [
    `${location} city skyline aerial view`,
    `${location} downtown cityscape`,
  ];

  for (const query of queries) {
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('q', query);
    url.searchParams.set('searchType', 'image');
    url.searchParams.set('num', '10');
    url.searchParams.set('imgSize', 'xlarge');
    url.searchParams.set('imgType', 'photo');
    url.searchParams.set('safe', 'active');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', cx);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      console.log(`[location-images] Fetching: ${query}`);
      const response = await fetch(url.toString(), { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.log(`[location-images] Google API error ${response.status}: ${errText.slice(0, 300)}`);
        continue;
      }

      const data = await response.json();
      console.log(`[location-images] Got ${data.items?.length || 0} raw results for "${query}"`);

      const images = (data.items || [])
        .filter((item: any) => {
          const w = item.image?.width || 0;
          const h = item.image?.height || 0;
          return w >= 600 && h >= 400;
        })
        .slice(0, 8)
        .map((item: any) => ({
          src: item.link,
          alt: item.title || `${location} photo`,
          width: item.image?.width || 0,
          height: item.image?.height || 0,
        }));

      if (images.length > 0) {
        console.log(`[location-images] Returning ${images.length} images for "${location}"`);
        return NextResponse.json({ success: true, images });
      }
    } catch (e) {
      clearTimeout(timeout);
      console.log(`[location-images] Fetch error for "${query}":`, e instanceof Error ? e.message : e);
    }
  }

  console.log(`[location-images] No images found for "${location}"`);
  return NextResponse.json({ success: true, images: [] });
}
