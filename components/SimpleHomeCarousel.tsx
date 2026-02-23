// components/SimpleHomeCarousel.tsx
'use client';

interface SimpleHomeCarouselProps {
  location: string;
  targetPrice: number;
  priceRange?: number;
}

function buildGoogleImageSearchUrl(location: string, priceLabel: string): string {
  const query = encodeURIComponent(`${location} home for sale ${priceLabel}`);
  return `https://www.google.com/search?q=${query}&tbm=isch`;
}

function formatPrice(price: number): string {
  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(1)}M`;
  }
  return `$${(price / 1000).toFixed(0)}K`;
}

export default function SimpleHomeCarousel({
  location,
  targetPrice,
  priceRange = 50000
}: SimpleHomeCarouselProps) {
  const minPrice = Math.round(targetPrice - priceRange);
  const maxPrice = Math.round(targetPrice + priceRange);
  const priceLabel = formatPrice(targetPrice);
  const googleSearchUrl = buildGoogleImageSearchUrl(location, priceLabel);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-[#2C3E50] mb-2">
          {location} Homes ~ {priceLabel}
        </h3>
        <p className="text-sm text-[#6B7280]">
          {formatPrice(minPrice)} - {formatPrice(maxPrice)} price range
        </p>
      </div>

      {/* Google Image Search CTA */}
      <div className="bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] border-2 border-[#5BA4E5] rounded-2xl p-6 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 bg-[#5BA4E5] text-white p-3 rounded-full">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-[#2C3E50] text-lg mb-2">
              Browse homes in {location}
            </h4>
            <p className="text-sm text-[#6B7280] mb-4">
              Search for homes in <strong>{location}</strong> in the {formatPrice(minPrice)} - {formatPrice(maxPrice)} range on Google Images.
            </p>
            <a
              href={googleSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#5BA4E5] to-[#4A93D4] text-white rounded-xl hover:from-[#4A93D4] hover:to-[#3982C3] transition-all transform hover:scale-105 font-bold text-lg shadow-xl"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search on Google
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
