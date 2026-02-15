// components/SimpleHomeCarousel.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';

interface SimpleHomeCarouselProps {
  location: string;
  targetPrice: number;
  priceRange?: number;
}

export default function SimpleHomeCarousel({ 
  location, 
  targetPrice,
  priceRange = 50000 
}: SimpleHomeCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const minPrice = Math.round(targetPrice - priceRange);
  const maxPrice = Math.round(targetPrice + priceRange);
  
  // Build Zillow search URL with location properly embedded in search query
  // This ensures it searches the selected location, not user's default location
  
  // Create search query state object
  const searchQueryState = {
    pagination: {},
    usersSearchTerm: location, // THIS IS KEY - tells Zillow what location to search
    mapBounds: {},
    regionSelection: [],
    isMapVisible: true,
    filterState: {
      price: {
        min: minPrice,
        max: maxPrice
      },
      beds: {
        min: 2
      }
    },
    isListVisible: true
  };
  
  // Encode the search state
  const encodedSearchState = encodeURIComponent(JSON.stringify(searchQueryState));
  
  // Build final URL
  const zillowSearchUrl = `https://www.zillow.com/homes/${encodeURIComponent(location)}_rb/?searchQueryState=${encodedSearchState}`;
  
  console.log('🔗 Zillow URL for', location, ':', zillowSearchUrl);

  // Stock photos from Unsplash (free, legal, commercial use)
  const homes = [
    {
      id: 1,
      imageUrl: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=900&fit=crop&q=80',
      priceRange: `$${(minPrice / 1000).toFixed(0)}K - $${((minPrice + maxPrice) / 2 / 1000).toFixed(0)}K`,
      title: 'Entry-Level Homes',
      description: `Starter homes in ${location}`,
      beds: 3,
      baths: 2,
      sqft: Math.round(minPrice / 250),
      credit: 'Photo by Breno Assis on Unsplash'
    },
    {
      id: 2,
      imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=900&fit=crop&q=80',
      priceRange: `~$${(targetPrice / 1000).toFixed(0)}K`,
      title: 'Your Target Price',
      description: `Perfect fit for your budget in ${location}`,
      beds: 4,
      baths: 2.5,
      sqft: Math.round(targetPrice / 250),
      credit: 'Photo by Grovemade on Unsplash',
      isTarget: true
    },
    {
      id: 3,
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=900&fit=crop&q=80',
      priceRange: `$${((minPrice + maxPrice) / 2 / 1000).toFixed(0)}K - $${(maxPrice / 1000).toFixed(0)}K`,
      title: 'Upper-Range Homes',
      description: `Premium options in ${location}`,
      beds: 5,
      baths: 3,
      sqft: Math.round(maxPrice / 250),
      credit: 'Photo by Ralph (Ravi) Kayden on Unsplash'
    },
    {
      id: 4,
      imageUrl: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=1200&h=900&fit=crop&q=80',
      priceRange: `$${(minPrice / 1000).toFixed(0)}K - $${(maxPrice / 1000).toFixed(0)}K`,
      title: 'Family Homes',
      description: `Spacious family homes in ${location}`,
      beds: 4,
      baths: 2.5,
      sqft: Math.round(((minPrice + maxPrice) / 2) / 250),
      credit: 'Photo by Francesca Tosolini on Unsplash'
    },
    {
      id: 5,
      imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&h=900&fit=crop&q=80',
      priceRange: `$${(minPrice / 1000).toFixed(0)}K - $${(maxPrice / 1000).toFixed(0)}K`,
      title: 'Move-In Ready',
      description: `Ready-to-go homes in ${location}`,
      beds: 3,
      baths: 2,
      sqft: Math.round(minPrice / 250),
      credit: 'Photo by Avi Waxman on Unsplash'
    },
  ];

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
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
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
            {currentHome.priceRange}
          </p>
          <p className="text-base opacity-90 mb-4">
            {currentHome.description}
          </p>
          <div className="flex items-center gap-6 text-sm font-medium">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {currentHome.beds} beds
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
              {currentHome.baths} baths
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              ~{currentHome.sqft.toLocaleString()} sqft
            </span>
          </div>
          <p className="text-xs opacity-60 mt-4">{currentHome.credit}</p>
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
              <p className="text-white text-xs font-semibold">{home.priceRange}</p>
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
