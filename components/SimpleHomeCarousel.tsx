// components/SimpleHomeCarousel.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';

interface SimpleHomeCarouselProps {
  location: string;
  targetPrice: number;
  priceRange?: number;
}

interface SlideImage {
  url: string;
  title: string;
  contextLink: string;
}

// Fallback stock photos if Google API is not configured or fails
const fallbackPhotos = [
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=900&fit=crop&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=900&fit=crop&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=900&fit=crop&q=80',
  'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=1200&h=900&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&h=900&fit=crop&q=80',
];

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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [images, setImages] = useState<SlideImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  const minPrice = Math.round(targetPrice - priceRange);
  const maxPrice = Math.round(targetPrice + priceRange);
  const priceLabel = formatPrice(targetPrice);
  const googleSearchUrl = buildGoogleImageSearchUrl(location, priceLabel);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        location,
        price: String(Math.round(targetPrice)),
      });
      const res = await fetch(`/api/home-images?${params}`);
      const data = await res.json();

      if (data.success && data.images && data.images.length > 0) {
        setImages(data.images);
        setUsingFallback(false);
      } else {
        // API not configured or no results — use fallback
        setImages(fallbackPhotos.map((url, i) => ({
          url,
          title: `Home in ${location}`,
          contextLink: '',
        })));
        setUsingFallback(true);
      }
    } catch {
      setImages(fallbackPhotos.map((url) => ({
        url,
        title: `Home in ${location}`,
        contextLink: '',
      })));
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, [location, targetPrice]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % images.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + images.length) % images.length);

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5BA4E5]" />
        <p className="text-[#6B7280] text-sm">Finding homes in {location}...</p>
      </div>
    );
  }

  if (images.length === 0) return null;

  const current = images[currentSlide];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-[#2C3E50] mb-2">
          {usingFallback
            ? `Homes in Your Price Range`
            : `${location} Homes ~ ${formatPrice(targetPrice)}`}
        </h3>
        <p className="text-sm text-[#6B7280]">
          {formatPrice(minPrice)} - {formatPrice(maxPrice)} price range
        </p>
      </div>

      {/* Main Carousel Image */}
      <a
        href={current.contextLink || googleSearchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer shadow-xl"
      >
        <div className="relative w-full h-full bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={current.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        </div>

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/5" />

        {/* Badge */}
        <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-sm px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg z-10 group-hover:bg-[#5BA4E5] group-hover:text-white transition-all duration-300 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          {usingFallback ? 'Search Images' : 'View Source'}
        </div>

        {/* Price badge */}
        <div className="absolute top-6 right-6 bg-gradient-to-r from-[#5BA4E5] to-[#4A93D4] text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-2xl z-10">
          ~ {formatPrice(targetPrice)}
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white z-10">
          <p className="text-lg font-semibold mb-1 line-clamp-2">{current.title}</p>
          <p className="text-sm opacity-80">{location}</p>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-[#5BA4E5]/0 group-hover:bg-[#5BA4E5]/15 transition-colors duration-300" />
      </a>

      {/* Navigation buttons */}
      {images.length > 1 && (
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
            {images.map((_, index) => (
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
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-3">
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`relative aspect-[4/3] rounded-lg overflow-hidden border-3 transition-all ${
                index === currentSlide
                  ? 'border-[#5BA4E5] ring-2 ring-[#5BA4E5] ring-offset-2 scale-105'
                  : 'border-gray-200 hover:border-[#5BA4E5]/50'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.title}
                className="w-full h-full object-cover"
              />
              <div className={`absolute inset-0 transition-opacity ${
                index === currentSlide ? 'bg-black/0' : 'bg-black/40 hover:bg-black/20'
              }`} />
            </button>
          ))}
        </div>
      )}

      {/* CTA Section */}
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
