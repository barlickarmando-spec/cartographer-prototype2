// components/RealZillowHomes.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface ZillowHome {
  zpid: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  livingArea: number;
  homeType: string;
  imgSrc: string;
  detailUrl: string;
  listingStatus: string;
  daysOnZillow: number;
}

interface RealZillowHomesProps {
  location: string;
  targetPrice: number;
  priceRange?: number;
}

export default function RealZillowHomes({ 
  location, 
  targetPrice,
  priceRange = 50000 
}: RealZillowHomesProps) {
  const [homes, setHomes] = useState<ZillowHome[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const minPrice = Math.round(targetPrice - priceRange);
  const maxPrice = Math.round(targetPrice + priceRange);

  // FIX 1: Memoize fetchHomes to prevent unnecessary re-renders
  const fetchHomes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching homes for:', location, minPrice, maxPrice);

      const response = await fetch('/api/zillow/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location,
          minPrice,
          maxPrice,
        }),
      });

      const data = await response.json();
      console.log('📦 API Response:', data);

      if (data.success && data.homes && data.homes.length > 0) {
        setHomes(data.homes);
        console.log(`Loaded ${data.homes.length} homes`);
      } else {
        setError(data.error || 'No homes found in this price range');
        console.log('No homes found');
      }
    } catch (err) {
      console.error('Error fetching homes:', err);
      setError('Unable to load homes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [location, minPrice, maxPrice]); // FIX 1: Add dependencies

  // FIX 4: Add fetchHomes to useEffect dependencies
  useEffect(() => {
    fetchHomes();
  }, [fetchHomes]);

  // Build Zillow search URL for fallback
  const formattedLocation = location.toLowerCase()
    .replace(/,?\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  
  const zillowSearchUrl = `https://www.zillow.com/homes/${formattedLocation}_rb/?searchQueryState=%7B%22pagination%22%3A%7B%7D%2C%22isMapVisible%22%3Afalse%2C%22filterState%22%3A%7B%22price%22%3A%7B%22min%22%3A${minPrice}%2C%22max%22%3A${maxPrice}%7D%7D%2C%22isListVisible%22%3Atrue%7D`;

  if (loading) {
    return (
      <div className="py-12">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5BA4E5]"></div>
          <p className="text-[#6B7280] text-sm">Loading real homes from Zillow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#6B7280] mb-1">
            Real homes for sale in <strong>{location}</strong>
          </p>
          <p className="text-xs text-[#9CA3AF]">
            ${(minPrice / 1000).toFixed(0)}K - ${(maxPrice / 1000).toFixed(0)}K
            {homes.length > 0 && ` • ${homes.length} listing${homes.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        {!error && (
          <button
            onClick={fetchHomes}
            className="text-sm text-[#5BA4E5] hover:text-[#4A93D4] font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800 mb-1">Unable to load listings</h3>
              <p className="text-sm text-yellow-700 mb-3">{error}</p>
              <a
                href={zillowSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#5BA4E5] text-white rounded-lg hover:bg-[#4A93D4] transition-colors text-sm font-medium"
              >
                View Homes on Zillow Instead
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Homes Grid */}
      {homes.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {homes.map((home, index) => (
              // FIX 5: Use composite key to ensure uniqueness
              <HomeCard key={`${home.zpid}-${index}`} home={home} />
            ))}
          </div>

          {/* View More on Zillow */}
          <div className="flex justify-center">
            <a
              href={zillowSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#5BA4E5] text-white rounded-lg hover:bg-[#4A93D4] transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              See More Homes on Zillow
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </>
      )}
    </div>
  );
}

// Home Card Component
function HomeCard({ home }: { home: ZillowHome }) {
  return (
    <a
      href={home.detailUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-white rounded-xl border border-[#E5E7EB] overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
    >
      {/* Home Image */}
      <div className="relative h-48 bg-gray-100">
        {home.imgSrc ? (
          <Image
            src={home.imgSrc}
            alt={`${home.address}, ${home.city}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={(e) => {
              // FIX 2: Handle image loading errors gracefully
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
            unoptimized={!home.imgSrc.includes('ap.rdcpix.com') && !home.imgSrc.includes('ssl.cdn-redfin.com')}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
        )}
        
        {/* Status Badge */}
        {home.listingStatus && (
          <div className="absolute top-3 left-3 bg-[#5BA4E5] text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            {home.listingStatus}
          </div>
        )}

        {/* Days on Zillow */}
        {home.daysOnZillow !== undefined && home.daysOnZillow < 7 && (
          <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
            NEW
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
      </div>

      {/* Home Details */}
      <div className="p-4">
        {/* Price */}
        <p className="text-2xl font-bold text-[#2C3E50] mb-2">
          ${(home.price / 1000).toFixed(0)}K
        </p>

        {/* Beds/Baths/SqFt */}
        <div className="flex items-center gap-3 text-sm text-[#6B7280] mb-3">
          <span className="font-medium">{home.bedrooms} bd</span>
          <span>•</span>
          <span className="font-medium">{home.bathrooms} ba</span>
          <span>•</span>
          <span className="font-medium">{home.livingArea?.toLocaleString()} sqft</span>
        </div>

        {/* Address */}
        <p className="text-sm text-[#2C3E50] font-medium mb-1">
          {home.address}
        </p>
        <p className="text-xs text-[#9CA3AF] mb-2">
          {home.city}, {home.state} {home.zipcode}
        </p>

        {/* Home Type */}
        {home.homeType && (
          <p className="text-xs text-[#5BA4E5] font-medium">
            {home.homeType}
          </p>
        )}

        {/* View Details CTA */}
        <div className="mt-3 pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
          <span className="text-xs text-[#9CA3AF]">View on Zillow</span>
          <svg className="w-4 h-4 text-[#5BA4E5] group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </a>
  );
}
