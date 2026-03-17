'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { LocationImage } from '@/lib/location-images';

interface LocationHeroCarouselProps {
  images: LocationImage[];
  locationName: string;
}

// ─── Fullscreen Lightbox ────────────────────────────────────────────
function FullscreenLightbox({
  images,
  startIndex,
  failedSrcs,
  onClose,
  onImageError,
}: {
  images: LocationImage[];
  startIndex: number;
  failedSrcs: Set<string>;
  onClose: () => void;
  onImageError: (src: string) => void;
}) {
  const [current, setCurrent] = useState(startIndex);
  const count = images.length;
  const touchStartX = useRef<number | null>(null);

  const goTo = useCallback((idx: number) => {
    setCurrent(((idx % count) + count) % count);
  }, [count]);
  const next = useCallback(() => goTo(current + 1), [goTo, current]);
  const prev = useCallback(() => goTo(current - 1), [goTo, current]);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Keyboard: arrows to navigate, escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, prev, next]);

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff < 0) next();
      else prev();
    }
    touchStartX.current = null;
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[10001] w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
        aria-label="Close fullscreen"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Image container */}
      <div
        className="relative w-full h-full flex items-center justify-center p-4 sm:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        {images.map((img, i) => (
          <div
            key={`${img.src}-${i}`}
            className="absolute inset-0 flex items-center justify-center p-4 sm:p-10 transition-opacity duration-500 ease-in-out"
            style={{
              opacity: i === current ? 1 : 0,
              pointerEvents: i === current ? 'auto' : 'none',
            }}
          >
            {!failedSrcs.has(img.src) ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={img.src}
                alt={img.alt}
                className="max-w-full max-h-full object-contain rounded-lg select-none"
                draggable={false}
                referrerPolicy="no-referrer"
                onError={() => onImageError(img.src)}
              />
            ) : (
              <div className="w-64 h-48 bg-gray-800 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-sm">Image unavailable</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Arrow buttons */}
      {count > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-[10001] w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
            aria-label="Previous image"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-[10001] w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
            aria-label="Next image"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </>
      )}

      {/* Bottom bar: dots + counter */}
      {count > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[10001] flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); goTo(i); }}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? 'w-7 h-2.5 bg-white'
                    : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
          <span className="text-white/70 text-sm font-medium">
            {current + 1} / {count}
          </span>
        </div>
      )}
    </div>,
    document.body
  );
}

// ─── Hero Carousel ──────────────────────────────────────────────────
export default function LocationHeroCarousel({ images: localImages, locationName }: LocationHeroCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [hiResImages, setHiResImages] = useState<LocationImage[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [failedSrcs, setFailedSrcs] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
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

  // Auto-advance every 5s unless hovered or lightbox is open
  useEffect(() => {
    if (isHovered || count <= 1 || lightboxIndex !== null) return;
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % count);
    }, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isHovered, count, lightboxIndex]);

  // Keyboard navigation (only when lightbox is closed)
  useEffect(() => {
    if (lightboxIndex !== null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next, lightboxIndex]);

  const handleImageError = useCallback((src: string) => {
    setFailedSrcs(prev => new Set(prev).add(src));
  }, []);

  return (
    <>
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
              className="absolute inset-0 transition-opacity duration-700 ease-in-out cursor-pointer"
              style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
              onClick={() => setLightboxIndex(current)}
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

        {/* Expand icon hint */}
        <div
          className="absolute top-4 left-4 z-[4] w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center pointer-events-none transition-opacity"
          style={{ opacity: isHovered ? 1 : 0 }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9m11.25-5.25v4.5m0-4.5h-4.5m4.5 0L15 9m-11.25 11.25v-4.5m0 4.5h4.5m-4.5 0L9 15m11.25 5.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
          </svg>
        </div>

        {/* Arrow buttons */}
        {count > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-[4] w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all"
              style={{ opacity: isHovered ? 1 : 0 }}
              aria-label="Previous image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
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
                onClick={(e) => { e.stopPropagation(); goTo(i); }}
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

      {/* Fullscreen lightbox */}
      {lightboxIndex !== null && (
        <FullscreenLightbox
          images={images}
          startIndex={lightboxIndex}
          failedSrcs={failedSrcs}
          onClose={() => setLightboxIndex(null)}
          onImageError={handleImageError}
        />
      )}
    </>
  );
}
