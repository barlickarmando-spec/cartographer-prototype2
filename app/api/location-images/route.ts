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
    return NextResponse.json({ success: true, images: [] });
  }

  const query = `${location} city skyline landscape`;

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('q', query);
  url.searchParams.set('searchType', 'image');
  url.searchParams.set('num', '8');
  url.searchParams.set('imgSize', 'xlarge');
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
      return NextResponse.json({ success: true, images: [] });
    }

    const data = await response.json();
    const images = (data.items || [])
      .filter((item: any) => {
        const w = item.image?.width || 0;
        const h = item.image?.height || 0;
        return w >= 800 && h >= 500;
      })
      .slice(0, 6)
      .map((item: any) => ({
        src: item.link,
        alt: item.title || `${location} photo`,
        width: item.image?.width || 0,
        height: item.image?.height || 0,
      }));

    return NextResponse.json({ success: true, images });
  } catch {
    clearTimeout(timeout);
    return NextResponse.json({ success: true, images: [] });
  }
}
