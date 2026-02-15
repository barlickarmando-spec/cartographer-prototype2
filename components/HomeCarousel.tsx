// components/HomeCarousel.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

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

interface HomeCarouselProps {
  location: string;
  targetPrice: number;
  priceRange?: number;
}

export default function HomeCarousel({ 
  location, 
  targetPrice,
  priceRange = 50000 
}: HomeCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [homes, setHomes] = useState<Home[]>([]);
  const [loading, setLoading] = useState(true);
  const [useStockImages, setUseStockImages] = useState(false);

  const minPrice = Math.round(targetPrice - priceRange);
  const maxPrice = Math.round(targetPrice + priceRange);

  const fetchHomes = useCallback(async () => {
    setLoading(true);

    try {
      console.log('Fetching real homes for:', location, minPrice, maxPrice);

      const response = await fetch('/api/homes/search', {
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

      if (data.success && data.homes && data.homes.length > 0) {
        setHomes(data.homes);
        setUseStockImages(false);
        console.log(`Loaded ${data.homes.length} real homes`);
      } else {
        console.log('No real homes found, using stock images');
        setUseStockImages(true);
      }
    } catch (err) {
      console.error('Error fetching homes, falling back to stock images:', err);
      setUseStockImages(true);
    } finally {
      setLoading(false);
    }
  }, [location, minPrice, maxPrice]);

  useEffect(() => {
    fetchHomes();
  }, [fetchHomes]);

  // Format location for Zillow URL
  const formattedLocation = location.toLowerCase()
    .replace(/,?\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  
  // Build Zillow search URL with exact filters
  const zillowUrl = `https://www.zillow.com/homes/${formattedLocation}_rb/?searchQueryState=%7B%22pagination%22%3A%7B%7D%2C%22isMapVisible%22%3Afalse%2C%22filterState%22%3A%7B%22price%22%3A%7B%22min%22%3A${minPrice}%2C%22max%22%3A${maxPrice}%7D%2C%22beds%22%3A%7B%22min%22%3A2%7D%7D%2C%22isListVisible%22%3Atrue%7D`;

  // Stock home images with Unsplash (fallback when API fails)
  const stockHomes = [
    {
      id: 1,
      imageUrl: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop',
      alt: 'Modern single-family home exterior',
      priceRange: `$${(minPrice / 1000).toFixed(0)}K - $${((minPrice + maxPrice) / 2 / 1000).toFixed(0)}K`,
      description: 'Entry-level homes in your range',
      beds: 3,
      baths: 2,
      sqft: Math.round(minPrice / 250),
      photoCredit: 'Photo by Breno Assis on Unsplash'
    },
    {
      id: 2,
      imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
      alt: 'Contemporary house with large windows',
      priceRange: `~$${(targetPrice / 1000).toFixed(0)}K`,
      description: 'Your target price range',
      beds: 4,
      baths: 2.5,
      sqft: Math.round(targetPrice / 250),
      photoCredit: 'Photo by Grovemade on Unsplash',
      isTarget: true
    },
    {
      id: 3,
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
      alt: 'Luxury modern home with landscaping',
      priceRange: `$${((minPrice + maxPrice) / 2 / 1000).toFixed(0)}K - $${(maxPrice / 1000).toFixed(0)}K`,
      description: 'Upper range homes',
      beds: 4,
      baths: 3,
      sqft: Math.round(maxPrice / 250),
      photoCredit: 'Photo by Ralph (Ravi) Kayden on Unsplash'
    },
    {
      id: 4,
      imageUrl: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&h=600&fit=crop',
      alt: 'Spacious family home',
      priceRange: `$${(minPrice / 1000).toFixed(0)}K - $${(maxPrice / 1000).toFixed(0)}K`,
      description: 'Family-friendly options',
      beds: 4,
      baths: 2.5,
      sqft: Math.round(((minPrice + maxPrice) / 2) / 250),
      photoCredit: 'Photo by Francesca Tosolini on Unsplash'
    },
    {
      id: 5,
      imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=600&fit=crop',
      alt: 'Suburban house with garage',
      priceRange: `$${(minPrice / 1000).toFixed(0)}K - $${(maxPrice / 1000).toFixed(0)}K`,
      description: 'Move-in ready homes',
      beds: 3,
      baths: 2,
      sqft: Math.round(minPrice / 250),
      photoCredit: 'Photo by Avi Waxman on Unsplash'
    },
  ];

  const nextSlide = () => {
    const totalHomes = useStockImages ? stockHomes.length : homes.length;
    setCurrentSlide((prev) => (prev + 1) % totalHomes);
  };

  const prevSlide = () => {
    const totalHomes = useStockImages ? stockHomes.length : homes.length;
    setCurrentSlide((prev) => (prev - 1 + totalHomes) % totalHomes);
  };

  // Loading state
  if (loading) {
    return (
      <div className="py-12">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5BA4E5]"></div>
          <p className="text-[#6B7280] text-sm">Finding homes in {location}...</p>
        </div>
      </div>
    );
  }

  // Use stock images if API failed or returned no results
  if (useStockImages) {
    const currentHome = stockHomes[currentSlide];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-[#2C3E50] mb-2">
            Homes in Your Price Range
          </h3>
          <p className="text-sm text-[#6B7280]">
            Explore what ${(minPrice / 1000).toFixed(0)}K - ${(maxPrice / 1000).toFixed(0)}K can get you in {location}
          </p>
        </div>

      {/* Main Carousel */}
      <div className="relative">
        {/* Image Container */}
        <a
          href={zillowUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block relative aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer"
        >
          {/* Image */}
          <div className="relative w-full h-full bg-gray-100">
            <Image
              src={currentHome.imageUrl}
              alt={currentHome.alt}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              priority={currentSlide === 0}
            />
          </div>

          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Target Badge */}
          {currentHome.isTarget && (
            <div className="absolute top-4 right-4 bg-[#5BA4E5] text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg z-10">
              Your Target
            </div>
          )}

          {/* Click to View on Zillow Badge */}
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 shadow-lg z-10 group-hover:bg-[#5BA4E5] group-hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span className="text-sm font-semibold">Click to view on Zillow</span>
          </div>

          {/* Home Details Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white z-10">
            <p className="text-sm opacity-90 mb-1">{currentHome.description}</p>
            <p className="text-3xl font-bold mb-3">{currentHome.priceRange}</p>
            <div className="flex items-center gap-4 text-sm mb-2">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {currentHome.beds} beds
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
                {currentHome.baths} baths
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                ~{currentHome.sqft.toLocaleString()} sqft
              </span>
            </div>
            <p className="text-xs opacity-75">{currentHome.photoCredit}</p>
          </div>

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-[#5BA4E5]/0 group-hover:bg-[#5BA4E5]/10 transition-colors pointer-events-none" />
        </a>

        {/* Navigation Buttons */}
        <button
          onClick={(e) => {
            e.preventDefault();
            prevSlide();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-[#2C3E50] p-3 rounded-full shadow-lg transition-all hover:scale-110 z-20"
          aria-label="Previous home"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={(e) => {
            e.preventDefault();
            nextSlide();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-[#2C3E50] p-3 rounded-full shadow-lg transition-all hover:scale-110 z-20"
          aria-label="Next home"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Slide Indicators */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {homes.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.preventDefault();
                setCurrentSlide(index);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlide 
                  ? 'bg-white w-8' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

        {/* Thumbnail Strip */}
        <div className="grid grid-cols-5 gap-2">
          {stockHomes.map((home, index) => (
            <button
              key={home.id}
              onClick={() => setCurrentSlide(index)}
              className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all ${
                index === currentSlide 
                  ? 'border-[#5BA4E5] scale-105' 
                  : 'border-transparent hover:border-[#5BA4E5]/50'
              }`}
            >
              <Image
                src={home.imageUrl}
                alt={home.alt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 20vw, 10vw"
              />
              <div className={`absolute inset-0 bg-black transition-opacity ${
                index === currentSlide ? 'opacity-0' : 'opacity-40 hover:opacity-20'
              }`} />
            </button>
          ))}
        </div>

        {/* Call to Action */}
        <div className="bg-[#EFF6FF] border border-[#5BA4E5] rounded-xl p-6">
          <div className="flex items-start gap-4">
            <svg className="w-8 h-8 text-[#5BA4E5] flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h4 className="font-semibold text-[#2C3E50] mb-2">
                These are representative images
              </h4>
              <p className="text-sm text-[#6B7280] mb-4">
                The photos above show typical homes in your price range. Click any image or the button below to see actual available listings in {location} on Zillow.
              </p>
              <a
                href={zillowUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#5BA4E5] text-white rounded-lg hover:bg-[#4A93D4] transition-colors font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Browse Real Listings on Zillow
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render real homes
  const currentHome = homes[currentSlide];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#2C3E50] mb-2">
            Real Homes in {location}
          </h3>
          <p className="text-sm text-[#6B7280]">
            ${(minPrice / 1000).toFixed(0)}K - ${(maxPrice / 1000).toFixed(0)}K • {homes.length} listing{homes.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <button
          onClick={fetchHomes}
          className="text-sm text-[#5BA4E5] hover:text-[#4A93D4] font-medium flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Main Carousel - Real Homes */}
      <div className="relative">
        <a
          href={currentHome.listingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block relative aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer"
        >
          {/* Image */}
          <div className="relative w-full h-full bg-gray-100">
            {currentHome.photoUrl ? (
              <Image
                src={currentHome.photoUrl}
                alt={`${currentHome.address}, ${currentHome.city}`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                priority={currentSlide === 0}
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
            )}
          </div>

          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Status Badge */}
          <div className="absolute top-4 left-4 bg-[#5BA4E5] text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg z-10">
            {currentHome.status === 'for_sale' ? 'FOR SALE' : currentHome.status.toUpperCase()}
          </div>

          {/* Click to View Badge */}
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 shadow-lg z-10 group-hover:bg-[#5BA4E5] group-hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span className="text-sm font-semibold">View Details</span>
          </div>

          {/* Home Details Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white z-10">
            <p className="text-sm opacity-90 mb-1">{currentHome.homeType}</p>
            <p className="text-3xl font-bold mb-2">
              ${(currentHome.price / 1000).toFixed(0)}K
            </p>
            <p className="text-lg mb-3">
              {currentHome.address}
            </p>
            <p className="text-sm opacity-90 mb-3">
              {currentHome.city}, {currentHome.state} {currentHome.zipcode}
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {currentHome.bedrooms} beds
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
                {currentHome.bathrooms} baths
              </span>
              {currentHome.sqft > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  {currentHome.sqft.toLocaleString()} sqft
                </span>
              )}
            </div>
          </div>

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-[#5BA4E5]/0 group-hover:bg-[#5BA4E5]/10 transition-colors pointer-events-none" />
        </a>

        {/* Navigation Buttons */}
        {homes.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.preventDefault();
                prevSlide();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-[#2C3E50] p-3 rounded-full shadow-lg transition-all hover:scale-110 z-20"
              aria-label="Previous home"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={(e) => {
                e.preventDefault();
                nextSlide();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-[#2C3E50] p-3 rounded-full shadow-lg transition-all hover:scale-110 z-20"
              aria-label="Next home"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Slide Indicators */}
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {homes.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentSlide(index);
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlide 
                      ? 'bg-white w-8' 
                      : 'bg-white/50 hover:bg-white/75'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail Strip */}
      {homes.length > 1 && (
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {homes.slice(0, 6).map((home, index) => (
            <button
              key={home.id}
              onClick={() => setCurrentSlide(index)}
              className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all ${
                index === currentSlide 
                  ? 'border-[#5BA4E5] scale-105' 
                  : 'border-transparent hover:border-[#5BA4E5]/50'
              }`}
            >
              {home.photoUrl ? (
                <Image
                  src={home.photoUrl}
                  alt={home.address}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 25vw, 15vw"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
              )}
              <div className={`absolute inset-0 bg-black transition-opacity ${
                index === currentSlide ? 'opacity-0' : 'opacity-40 hover:opacity-20'
              }`} />
              <div className="absolute bottom-1 left-1 right-1 text-white text-xs font-semibold truncate px-1">
                ${(home.price / 1000).toFixed(0)}K
              </div>
            </button>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="bg-[#EFF6FF] border border-[#5BA4E5] rounded-xl p-4">
        <p className="text-sm text-[#6B7280] text-center">
          <strong className="text-[#2C3E50]">Showing real listings from Realtor.com</strong> • Click any photo to see full details
        </p>
      </div>
    </div>
  );
}
