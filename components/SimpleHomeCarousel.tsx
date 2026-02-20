// components/SimpleHomeCarousel.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';

interface SimpleHomeCarouselProps {
  location: string;
  targetPrice: number;
  priceRange?: number;
}

// Photos grouped by price tier so images match what you'd actually find
const photosByTier: Record<string, { url: string; label: string; beds: number; baths: number; sqftPer1k: number }[]> = {
  starter: [
    { url: 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=1200&h=900&fit=crop&q=80', label: 'Ranch-Style Home', beds: 2, baths: 1, sqftPer1k: 5.5 },
    { url: 'https://images.unsplash.com/photo-1605146769289-440113cc3d00?w=1200&h=900&fit=crop&q=80', label: 'Townhouse', beds: 2, baths: 1.5, sqftPer1k: 5 },
    { url: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=1200&h=900&fit=crop&q=80', label: 'Starter Home', beds: 3, baths: 1, sqftPer1k: 6 },
    { url: 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=1200&h=900&fit=crop&q=80', label: 'Cozy Bungalow', beds: 2, baths: 1, sqftPer1k: 5 },
    { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&h=900&fit=crop&q=80', label: 'Compact Home', beds: 3, baths: 2, sqftPer1k: 5.5 },
  ],
  mid: [
    { url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=900&fit=crop&q=80', label: 'Suburban Single-Family', beds: 3, baths: 2, sqftPer1k: 5 },
    { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=900&fit=crop&q=80', label: 'Family Home', beds: 4, baths: 2.5, sqftPer1k: 5.5 },
    { url: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=1200&h=900&fit=crop&q=80', label: 'Split-Level Home', beds: 4, baths: 2, sqftPer1k: 5 },
    { url: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=1200&h=900&fit=crop&q=80', label: 'Colonial-Style', beds: 3, baths: 2.5, sqftPer1k: 5.5 },
    { url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&h=900&fit=crop&q=80', label: 'Modern Suburban', beds: 4, baths: 3, sqftPer1k: 6 },
  ],
  upper: [
    { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=900&fit=crop&q=80', label: 'Modern Craftsman', beds: 4, baths: 3, sqftPer1k: 5 },
    { url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&h=900&fit=crop&q=80', label: 'Contemporary Home', beds: 4, baths: 3.5, sqftPer1k: 5.5 },
    { url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&h=900&fit=crop&q=80', label: 'Modern Farmhouse', beds: 5, baths: 3, sqftPer1k: 5.5 },
    { url: 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=1200&h=900&fit=crop&q=80', label: 'Executive Home', beds: 5, baths: 3.5, sqftPer1k: 5 },
    { url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&h=900&fit=crop&q=80', label: 'Estate Home', beds: 5, baths: 4, sqftPer1k: 6 },
  ],
  luxury: [
    { url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&h=900&fit=crop&q=80', label: 'Luxury Modern', beds: 5, baths: 4, sqftPer1k: 5 },
    { url: 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=1200&h=900&fit=crop&q=80', label: 'Custom Build', beds: 5, baths: 4.5, sqftPer1k: 5.5 },
    { url: 'https://images.unsplash.com/photo-1628624747186-a941c476b7ef?w=1200&h=900&fit=crop&q=80', label: 'Luxury Estate', beds: 6, baths: 5, sqftPer1k: 6 },
    { url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&h=900&fit=crop&q=80', label: 'Designer Home', beds: 5, baths: 4, sqftPer1k: 5.5 },
    { url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&h=900&fit=crop&q=80', label: 'Grand Estate', beds: 6, baths: 5, sqftPer1k: 6 },
  ],
};

function getTier(price: number): string {
  if (price < 200000) return 'starter';
  if (price < 400000) return 'mid';
  if (price < 700000) return 'upper';
  return 'luxury';
}

function buildZillowUrl(location: string, minPrice: number, maxPrice: number): string {
  // Convert "Salt Lake City, UT" → "salt-lake-city-ut"
  // Convert "Utah" → "utah"
  const slug = location
    .replace(/,\s*/g, '-')
    .replace(/\s+/g, '-')
    .toLowerCase();

  const filterState = {
    price: { min: minPrice, max: maxPrice },
    ah: { value: true },
  };

  const searchQueryState = encodeURIComponent(
    JSON.stringify({ filterState, isListVisible: true, isMapVisible: true })
  );

  return `https://www.zillow.com/${slug}/?searchQueryState=${searchQueryState}`;
}

export default function SimpleHomeCarousel({
  location,
  targetPrice,
  priceRange = 50000
}: SimpleHomeCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const minPrice = Math.round(targetPrice - priceRange);
  const maxPrice = Math.round(targetPrice + priceRange);

  const zillowSearchUrl = buildZillowUrl(location, minPrice, maxPrice);

  // Pick photos that match the price tier
  const tier = getTier(targetPrice);
  const tierPhotos = photosByTier[tier];

  const homes = tierPhotos.map((photo, i) => {
    const fraction = i / (tierPhotos.length - 1); // 0 to 1
    const price = Math.round(minPrice + fraction * (maxPrice - minPrice));
    const sqft = Math.round(price / 1000 * photo.sqftPer1k);

    return {
      id: i + 1,
      imageUrl: photo.url,
      price,
      priceLabel: `$${(price / 1000).toFixed(0)}K`,
      title: photo.label,
      description: `${photo.label} in ${location}`,
      beds: photo.beds,
      baths: photo.baths,
      sqft,
      isTarget: i === Math.floor(tierPhotos.length / 2),
    };
  });

  const currentHome = homes[currentSlide];

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % homes.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + homes.length) % homes.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-[#2C3E50] mb-2">
          Explore Homes in {location}
        </h3>
        <p className="text-sm text-[#6B7280]">
          ${(minPrice / 1000).toFixed(0)}K - ${(maxPrice / 1000).toFixed(0)}K price range
        </p>
      </div>

      {/* Main Carousel Image - Clicks to Zillow */}
      <a
        href={zillowSearchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer shadow-xl"
      >
        {/* Image */}
        <div className="relative w-full h-full">
          <Image
            src={currentHome.imageUrl}
            alt={currentHome.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700"
            sizes="(max-width: 768px) 100vw, 1200px"
            priority={currentSlide === 0}
          />
        </div>

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        {/* Target badge */}
        {currentHome.isTarget && (
          <div className="absolute top-6 right-6 bg-gradient-to-r from-[#5BA4E5] to-[#4A93D4] text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-2xl z-10 flex items-center gap-2">
            Your Target Range
          </div>
        )}

        {/* Click to view badge */}
        <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-sm px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg z-10 group-hover:bg-[#5BA4E5] group-hover:text-white transition-all duration-300 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Click to View Real Homes on Zillow
        </div>

        {/* Home details */}
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white z-10">
          <p className="text-sm font-medium uppercase tracking-wide opacity-90 mb-2">
            {currentHome.title}
          </p>
          <p className="text-4xl font-bold mb-3">
            {currentHome.priceLabel}
          </p>
          <p className="text-base opacity-90 mb-4">
            {currentHome.description}
          </p>
          <div className="flex items-center gap-6 text-sm font-medium">
            <span className="flex items-center gap-2">
              {currentHome.beds} beds
            </span>
            <span className="flex items-center gap-2">
              {currentHome.baths} baths
            </span>
            <span className="flex items-center gap-2">
              ~{currentHome.sqft.toLocaleString()} sqft
            </span>
          </div>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-[#5BA4E5]/0 group-hover:bg-[#5BA4E5]/20 transition-colors duration-300" />
      </a>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={(e) => { e.preventDefault(); prevSlide(); }}
          className="bg-white border-2 border-gray-200 hover:border-[#5BA4E5] text-[#2C3E50] hover:text-[#5BA4E5] p-3 rounded-full shadow-md transition-all hover:scale-110"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Slide indicators */}
        <div className="flex gap-2">
          {homes.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2.5 rounded-full transition-all ${
                index === currentSlide 
                  ? 'bg-[#5BA4E5] w-10' 
                  : 'bg-gray-300 hover:bg-gray-400 w-2.5'
              }`}
            />
          ))}
        </div>

        <button
          onClick={(e) => { e.preventDefault(); nextSlide(); }}
          className="bg-white border-2 border-gray-200 hover:border-[#5BA4E5] text-[#2C3E50] hover:text-[#5BA4E5] p-3 rounded-full shadow-md transition-all hover:scale-110"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Thumbnail strip */}
      <div className="grid grid-cols-5 gap-3">
        {homes.map((home, index) => (
          <button
            key={home.id}
            onClick={() => setCurrentSlide(index)}
            className={`relative aspect-[4/3] rounded-lg overflow-hidden border-3 transition-all ${
              index === currentSlide 
                ? 'border-[#5BA4E5] ring-2 ring-[#5BA4E5] ring-offset-2 scale-105' 
                : 'border-gray-200 hover:border-[#5BA4E5]/50 hover:scale-102'
            }`}
          >
            <Image
              src={home.imageUrl}
              alt={home.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 20vw, 15vw"
            />
            <div className={`absolute inset-0 transition-opacity ${
              index === currentSlide ? 'bg-black/0' : 'bg-black/40 hover:bg-black/20'
            }`} />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <p className="text-white text-xs font-semibold">{home.priceLabel}</p>
            </div>
          </button>
        ))}
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] border-2 border-[#5BA4E5] rounded-2xl p-6 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 bg-[#5BA4E5] text-white p-3 rounded-full">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-[#2C3E50] text-lg mb-2">
              Ready to see real listings?
            </h4>
            <p className="text-sm text-[#6B7280] mb-4">
              These images represent typical homes in your price range. Click any image above or the button below to browse <strong>actual available homes in {location}</strong> on Zillow, perfectly filtered to your ${(minPrice / 1000).toFixed(0)}K - ${(maxPrice / 1000).toFixed(0)}K budget.
            </p>
            <a
              href={zillowSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#5BA4E5] to-[#4A93D4] text-white rounded-xl hover:from-[#4A93D4] hover:to-[#3982C3] transition-all transform hover:scale-105 font-bold text-lg shadow-xl"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Browse Real Homes on Zillow
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
