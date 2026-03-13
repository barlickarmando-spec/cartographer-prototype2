'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { LocationImage } from '@/lib/location-images';

interface LocationHeroCarouselProps {
  images: LocationImage[];
  locationName: string;
}

export default function LocationHeroCarousel({ images: localImages, locationName }: LocationHeroCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [hiResImages, setHiResImages] = useState<LocationImage[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [failedSrcs, setFailedSrcs] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch high-res images from Google API
  useEffect(() => {
    let cancelled = false;
    async function fetchHiRes() {
      try {
        const res = await fetch(`/api/location-images?location=${encodeURIComponent(locationName)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.success && data.images && data.images.length > 0) {
          setHiResImages(data.images);
          setCurrent(0);
        }
      } catch {
        // Keep using local images
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchHiRes();
    return () => { cancelled = true; };
  }, [locationName]);

  // Use hi-res images if available, otherwise local
  const images = hiResImages && hiResImages.length > 0 ? hiResImages : localImages;
  const count = images.length;

  const goTo = useCallback((idx: number) => {
    setCurrent(((idx % count) + count) % count);
  }, [count]);

  const next = useCallback(() => goTo(current + 1), [goTo, current]);
  const prev = useCallback(() => goTo(current - 1), [goTo, current]);

  // Auto-advance every 5s unless hovered
  useEffect(() => {
    if (isHovered || count <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % count);
    }, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isHovered, count]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next]);

  const handleImageError = useCallback((src: string) => {
    setFailedSrcs(prev => new Set(prev).add(src));
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden rounded-t-2xl bg-gray-100"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image slides */}
      <div className="relative h-64 sm:h-72 md:h-80">
        {images.map((img, i) => (
          <div
            key={`${img.src}-${i}`}
            className="absolute inset-0 transition-opacity duration-700 ease-in-out"
            style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
          >
            {!failedSrcs.has(img.src) ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover"
                decoding="async"
                fetchPriority={i === 0 ? 'high' : undefined}
                loading={i === 0 ? 'eager' : 'lazy'}
                referrerPolicy="no-referrer"
                onError={() => handleImageError(img.src)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#4A90D9]/20 to-[#3A7BC0]/30 flex items-center justify-center">
                <span className="text-gray-400 text-sm">Image unavailable</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Loading shimmer while fetching Google images */}
      {isLoading && !hiResImages && (
        <div className="absolute inset-0 z-[2] bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
      )}

      {/* Arrow buttons */}
      {count > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-[4] w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all"
            style={{ opacity: isHovered ? 1 : 0 }}
            aria-label="Previous image"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-[4] w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all"
            style={{ opacity: isHovered ? 1 : 0 }}
            aria-label="Next image"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </>
      )}

      {/* Dot indicators */}
      {count > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[4] flex items-center gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-6 h-2 bg-white'
                  : 'w-2 h-2 bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to image ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Image counter */}
      {count > 1 && (
        <div className="absolute top-4 right-4 z-[4] px-2.5 py-1 rounded-full bg-black/50 text-white text-xs font-medium">
          {current + 1} / {count}
        </div>
      )}
    </div>
  );
}
