// components/SimpleHomeCarousel.tsx
'use client';

import { useState, useEffect, useRef } from 'react';

interface SimpleHomeCarouselProps {
  location: string;
  targetPrice: number;
  priceRange?: number;
}

interface Home {
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
}

function formatPrice(price: number): string {
  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(1)}M`;
  }
  return `$${(price / 1000).toFixed(0)}K`;
}

function buildZillowUrl(location: string, minPrice: number, maxPrice: number): string {
  const formatted = location.toLowerCase()
    .replace(/,?\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  return `https://www.zillow.com/homes/${formatted}_rb/?searchQueryState=%7B%22pagination%22%3A%7B%7D%2C%22isMapVisible%22%3Afalse%2C%22filterState%22%3A%7B%22price%22%3A%7B%22min%22%3A${minPrice}%2C%22max%22%3A${maxPrice}%7D%2C%22beds%22%3A%7B%22min%22%3A2%7D%7D%2C%22isListVisible%22%3Atrue%7D`;
}

export default function SimpleHomeCarousel({
  location,
  targetPrice,
  priceRange = 50000
}: SimpleHomeCarouselProps) {
  const [homes, setHomes] = useState<Home[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const minPrice = Math.round(targetPrice - priceRange);
  const maxPrice = Math.round(targetPrice + priceRange);
  const priceLabel = formatPrice(targetPrice);

  useEffect(() => {
    let cancelled = false;

    async function fetchHomes() {
      setLoading(true);
      setError(false);

      try {
        const res = await fetch('/api/homes/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location,
            minPrice,
            maxPrice,
          }),
        });

        if (!res.ok) throw new Error('API error');

        const data = await res.json();

        if (!cancelled) {
          if (data.success && data.homes && data.homes.length > 0) {
            setHomes(data.homes);
          } else {
            setHomes([]);
          }
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setHomes([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchHomes();
    return () => { cancelled = true; };
  }, [location, targetPrice, priceRange, minPrice, maxPrice]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }

  function scroll(direction: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 304; // w-72 (288px) + gap-4 (16px)
    el.scrollBy({
      left: direction === 'left' ? -cardWidth : cardWidth,
      behavior: 'smooth',
    });
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[#2C3E50] mb-2">
            {location} Homes ~ {priceLabel}
          </h3>
          <p className="text-sm text-[#6B7280]">Searching for homes...</p>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-72 bg-white rounded-xl border border-[#E5E7EB] overflow-hidden animate-pulse"
            >
              <div className="h-48 bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE]" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-[#E5E7EB] rounded w-24" />
                <div className="h-4 bg-[#E5E7EB] rounded w-40" />
                <div className="h-4 bg-[#E5E7EB] rounded w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error or empty state — Zillow fallback
  if (error || homes.length === 0) {
    const zillowUrl = buildZillowUrl(location, minPrice, maxPrice);

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[#2C3E50] mb-2">
            {location} Homes ~ {priceLabel}
          </h3>
          <p className="text-sm text-[#6B7280]">
            {formatPrice(minPrice)} - {formatPrice(maxPrice)} price range
          </p>
        </div>
        <div className="bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] border-2 border-[#5BA4E5] rounded-2xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 bg-[#5BA4E5] text-white p-3 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-[#2C3E50] text-lg mb-2">
                Browse homes in {location}
              </h4>
              <p className="text-sm text-[#6B7280] mb-4">
                {error
                  ? "We couldn't load listings right now. Browse homes on Zillow instead."
                  : `No listings found in this price range. Try browsing on Zillow for more options.`}
              </p>
              <a
                href={zillowUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#5BA4E5] to-[#4A93D4] text-white rounded-xl hover:from-[#4A93D4] hover:to-[#3982C3] transition-all transform hover:scale-105 font-bold text-lg shadow-xl"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Browse on Zillow
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

  // Success state — carousel with real listings
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#2C3E50] mb-1">
            {location} Homes ~ {priceLabel}
          </h3>
          <p className="text-sm text-[#6B7280]">
            {formatPrice(minPrice)} - {formatPrice(maxPrice)} | {homes.length} listing{homes.length !== 1 ? 's' : ''} found
          </p>
        </div>
        {/* Desktop arrow buttons */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="p-2 rounded-full border border-[#E5E7EB] text-[#5BA4E5] disabled:opacity-30 disabled:cursor-default hover:bg-[#EFF6FF] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="p-2 rounded-full border border-[#E5E7EB] text-[#5BA4E5] disabled:opacity-30 disabled:cursor-default hover:bg-[#EFF6FF] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable carousel */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
        style={{ scrollbarWidth: 'thin' }}
      >
        {homes.map((home) => (
          <HomeListingCard key={home.id} home={home} />
        ))}
      </div>
    </div>
  );
}

function HomeListingCard({ home }: { home: Home }) {
  const [imgError, setImgError] = useState(false);

  const formattedPrice = formatPrice(home.price);

  const listingUrl = home.listingUrl.startsWith('http')
    ? home.listingUrl
    : `https://www.realtor.com/realestateandhomes-detail/${home.listingUrl}`;

  return (
    <a
      href={listingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 w-72 snap-start bg-white rounded-xl border border-[#E5E7EB] overflow-hidden hover:shadow-xl transition-all duration-300 group"
    >
      {/* Image area */}
      <div className="relative h-48 bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] overflow-hidden">
        {home.photoUrl && !imgError ? (
          <img
            src={home.photoUrl}
            alt={`Home at ${home.address}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <svg className="w-16 h-16 text-[#5BA4E5] opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
        )}
        {/* Price badge */}
        <div className="absolute top-3 left-3 bg-[#5BA4E5] text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
          {formattedPrice}
        </div>
      </div>

      {/* Details */}
      <div className="p-4">
        {/* Beds / Baths / Sqft */}
        <div className="flex items-center gap-3 text-sm text-[#6B7280] mb-2">
          <span className="font-medium">{home.bedrooms} bd</span>
          <span>|</span>
          <span className="font-medium">{home.bathrooms} ba</span>
          {home.sqft > 0 && (
            <>
              <span>|</span>
              <span className="font-medium">{home.sqft.toLocaleString()} sqft</span>
            </>
          )}
        </div>

        {/* Address */}
        <p className="text-sm font-medium text-[#2C3E50] truncate">
          {home.address}
        </p>
        <p className="text-xs text-[#9CA3AF] truncate">
          {home.city}, {home.state} {home.zipcode}
        </p>

        {/* CTA footer */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#E5E7EB]">
          <span className="text-xs text-[#9CA3AF]">Realtor.com</span>
          <div className="flex items-center gap-1 text-[#5BA4E5] group-hover:gap-2 transition-all">
            <span className="text-xs font-medium">View Listing</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </a>
  );
}
