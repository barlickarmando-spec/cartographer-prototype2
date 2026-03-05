// components/SimpleHomeCarousel.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';

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
  return `$${Math.round(price / 1000)}K`;
}

function formatPriceFull(price: number): string {
  return `$${price.toLocaleString()}`;
}

/**
 * Build a Realtor.com search URL with exact location + price range filters.
 * Realtor.com URL format: /realestateandhomes-search/{City_ST}/price-{min}-{max}
 */
function buildRealtorSearchUrl(location: string, minPrice: number, maxPrice: number, options?: {
  beds?: number;
  type?: 'single-family' | 'condo' | 'apartment';
}): string {
  // Parse "City, ST" or just state name
  let slug = '';
  const trimmed = location.trim();

  if (trimmed.includes(',')) {
    // "Boise, ID" -> "Boise_ID"
    const parts = trimmed.split(',').map(p => p.trim());
    const city = parts[0].replace(/\s+/g, '-');
    const state = parts[1]?.toUpperCase() || '';
    slug = `${city}_${state}`;
  } else if (/^[A-Z]{2}$/i.test(trimmed)) {
    // "ID" -> state code
    slug = trimmed.toUpperCase();
  } else {
    // Full state name like "Idaho" -> replace spaces with -
    slug = trimmed.replace(/\s+/g, '-');
  }

  let url = `https://www.realtor.com/realestateandhomes-search/${slug}/price-${minPrice}-${maxPrice}`;

  if (options?.beds) {
    url += `/beds-${options.beds}`;
  }
  if (options?.type === 'single-family') {
    url += '/type-single-family-home';
  } else if (options?.type === 'condo') {
    url += '/type-condo-townhome';
  }

  return url;
}

const MAX_HOMES = 8;
const HOMES_PER_PAGE = 2;

const CARD_GRADIENTS = [
  'from-[#EFF6FF] to-[#DBEAFE]',
  'from-[#F0FDF4] to-[#DCFCE7]',
  'from-[#FEF3C7] to-[#FDE68A]',
  'from-[#FCE7F3] to-[#FBCFE8]',
  'from-[#EDE9FE] to-[#DDD6FE]',
  'from-[#E0F2FE] to-[#BAE6FD]',
  'from-[#FFF7ED] to-[#FFEDD5]',
  'from-[#F0FDFA] to-[#CCFBF1]',
  'from-[#FEF2F2] to-[#FECACA]',
  'from-[#ECFDF5] to-[#A7F3D0]',
  'from-[#EFF6FF] to-[#BFDBFE]',
  'from-[#FDF4FF] to-[#E9D5FF]',
];

export default function SimpleHomeCarousel({
  location,
  targetPrice,
  priceRange = 50000,
}: SimpleHomeCarouselProps) {
  const [homes, setHomes] = useState<Home[]>([]);
  const [source, setSource] = useState('');
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [modalHome, setModalHome] = useState<Home | null>(null);
  const [modalIndex, setModalIndex] = useState(0);

  const minPrice = Math.max(0, Math.round(targetPrice - priceRange));
  const maxPrice = Math.round(targetPrice + priceRange);
  const priceLabel = formatPrice(targetPrice);

  const displayHomes = homes.slice(0, MAX_HOMES);
  const totalPages = Math.ceil(displayHomes.length / HOMES_PER_PAGE);
  const hasRealListings = displayHomes.length > 0 && source !== 'Sample listings';

  useEffect(() => {
    let cancelled = false;

    async function fetchHomes() {
      setLoading(true);
      setError(false);

      try {
        const res = await fetch('/api/homes/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location, minPrice, maxPrice }),
        });

        if (!res.ok) throw new Error('API error');
        const data = await res.json();

        if (!cancelled) {
          if (data.success && data.homes && data.homes.length > 0) {
            // Prefer homes with photos, but keep all real listings
            const withPhotos = data.homes.filter(
              (h: Home) => h.photoUrl && h.photoUrl.startsWith('http')
            );
            const allHomes = withPhotos.length > 0 ? withPhotos : data.homes;
            setHomes(allHomes.slice(0, MAX_HOMES));
            setSource(data.source || '');
            setTotalAvailable(data.totalAvailable || allHomes.length);
          } else {
            setHomes([]);
            setSource('');
            setTotalAvailable(0);
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

  const goToPage = useCallback((page: number) => {
    if (page >= 0 && page < totalPages) setCurrentPage(page);
  }, [totalPages]);

  const openModal = useCallback((home: Home, idx: number) => {
    setModalHome(home);
    setModalIndex(idx);
  }, []);

  const closeModal = useCallback(() => { setModalHome(null); }, []);

  const navigateModal = useCallback((direction: 'prev' | 'next') => {
    const newIdx = direction === 'prev' ? modalIndex - 1 : modalIndex + 1;
    if (newIdx >= 0 && newIdx < displayHomes.length) {
      setModalIndex(newIdx);
      setModalHome(displayHomes[newIdx]);
    }
  }, [modalIndex, displayHomes]);

  // Loading
  if (loading) {
    return (
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-[#2C3E50] mb-1">{location} Homes ~ {priceLabel}</h3>
          <p className="text-xs text-[#6B7280]">Searching for homes...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden animate-pulse">
              <div className="h-[50vh] sm:h-[60vh] bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE]" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-[#E5E7EB] rounded w-20" />
                <div className="h-3 bg-[#E5E7EB] rounded w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // No real listings available — show the browse-on-Realtor.com interface
  if (!hasRealListings) {
    return <BrowseRealtorInterface location={location} minPrice={minPrice} maxPrice={maxPrice} targetPrice={targetPrice} />;
  }

  // Real listings with photos available — show paginated carousel
  const visibleStart = currentPage * HOMES_PER_PAGE;
  const visibleHomes = displayHomes.slice(visibleStart, visibleStart + HOMES_PER_PAGE);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#2C3E50] mb-0.5">{location} Homes ~ {priceLabel}</h3>
          <p className="text-xs text-[#6B7280]">
            {formatPrice(minPrice)} - {formatPrice(maxPrice)} | {displayHomes.length} listing{displayHomes.length !== 1 ? 's' : ''}
            {totalAvailable > displayHomes.length && (
              <span className="ml-1 text-[#5BA4E5]">({totalAvailable.toLocaleString()}+ on Realtor.com)</span>
            )}
            {source && <span className="ml-1 text-[#9CA3AF]">via {source}</span>}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 0}
            className="p-1.5 rounded-full border border-[#E5E7EB] text-[#5BA4E5] disabled:opacity-30 disabled:cursor-default hover:bg-[#EFF6FF] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages - 1}
            className="p-1.5 rounded-full border border-[#E5E7EB] text-[#5BA4E5] disabled:opacity-30 disabled:cursor-default hover:bg-[#EFF6FF] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Listings grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visibleHomes.map((home, idx) => {
          const globalIdx = visibleStart + idx;
          return (
            <CompactHomeCard key={home.id} home={home} index={globalIdx} onClick={() => openModal(home, globalIdx)} />
          );
        })}
      </div>

      {/* Progress bar */}
      {totalPages > 1 && (
        <div className="pt-1">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-medium text-[#6B7280]">
              {visibleStart + 1}-{Math.min(visibleStart + HOMES_PER_PAGE, displayHomes.length)} of {displayHomes.length}
            </span>
            <span className="text-[10px] text-[#9CA3AF]">Page {currentPage + 1} of {totalPages}</span>
          </div>
          <div className="w-full bg-[#E5E7EB] rounded-full h-1.5">
            <div className="bg-[#5BA4E5] h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }} />
          </div>
          <div className="flex justify-center gap-1.5 mt-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} onClick={() => goToPage(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === currentPage ? 'bg-[#5BA4E5] w-4' : 'bg-[#D1D5DB] hover:bg-[#9CA3AF]'}`} />
            ))}
          </div>
        </div>
      )}

      {/* Browse on Realtor.com link */}
      <a
        href={buildRealtorSearchUrl(location, minPrice, maxPrice)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium text-[#5BA4E5] hover:text-[#4A93D4] hover:bg-[#EFF6FF] rounded-lg transition-colors"
      >
        Browse all listings on Realtor.com
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>

      {/* Full-screen modal */}
      {modalHome && (
        <FullScreenCarouselModal
          homes={displayHomes}
          currentIndex={modalIndex}
          onClose={closeModal}
          onNavigate={navigateModal}
          onSetIndex={(idx) => { setModalIndex(idx); setModalHome(displayHomes[idx]); }}
        />
      )}
    </div>
  );
}

/**
 * When no real listings with photos are available, show a clean interface
 * with direct links to properly-filtered Realtor.com search pages.
 */
function BrowseRealtorInterface({
  location,
  minPrice,
  maxPrice,
  targetPrice,
}: {
  location: string;
  minPrice: number;
  maxPrice: number;
  targetPrice: number;
}) {
  const priceLabel = formatPrice(targetPrice);

  // Build several filtered search links for different home types
  const searchLinks = [
    {
      label: 'All Homes',
      description: `${formatPriceFull(minPrice)} – ${formatPriceFull(maxPrice)}`,
      url: buildRealtorSearchUrl(location, minPrice, maxPrice),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      gradient: 'from-[#EFF6FF] to-[#DBEAFE]',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Single Family',
      description: 'Houses with yards',
      url: buildRealtorSearchUrl(location, minPrice, maxPrice, { type: 'single-family' }),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      ),
      gradient: 'from-[#F0FDF4] to-[#DCFCE7]',
      iconColor: 'text-green-500',
    },
    {
      label: 'Condos & Townhomes',
      description: 'Lower maintenance',
      url: buildRealtorSearchUrl(location, minPrice, maxPrice, { type: 'condo' }),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      gradient: 'from-[#EDE9FE] to-[#DDD6FE]',
      iconColor: 'text-purple-500',
    },
    {
      label: '3+ Bedrooms',
      description: 'Family-sized homes',
      url: buildRealtorSearchUrl(location, minPrice, maxPrice, { beds: 3 }),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      gradient: 'from-[#FEF3C7] to-[#FDE68A]',
      iconColor: 'text-amber-500',
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-[#2C3E50] mb-0.5">{location} Homes ~ {priceLabel}</h3>
        <p className="text-xs text-[#6B7280]">
          Browse real listings on Realtor.com in your price range
        </p>
      </div>

      {/* Search link cards - 2 per row */}
      <div className="grid grid-cols-2 gap-3">
        {searchLinks.map((link, idx) => (
          <a
            key={idx}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white rounded-xl border border-[#E5E7EB] overflow-hidden hover:shadow-lg hover:border-[#5BA4E5] transition-all duration-200"
          >
            <div className={`bg-gradient-to-br ${link.gradient} p-4 flex items-center justify-center h-24`}>
              <div className={`${link.iconColor} group-hover:scale-110 transition-transform duration-200`}>
                {link.icon}
              </div>
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-sm font-semibold text-[#2C3E50]">{link.label}</p>
                <svg className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#5BA4E5] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
              <p className="text-[10px] text-[#6B7280]">{link.description}</p>
            </div>
          </a>
        ))}
      </div>

      {/* Main CTA */}
      <div className="bg-gradient-to-r from-[#EFF6FF] to-[#DBEAFE] border border-[#BFDBFE] rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 bg-[#5BA4E5] text-white p-2.5 rounded-full shadow">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#2C3E50]">See all listings in {location}</p>
            <p className="text-xs text-[#6B7280]">
              {formatPriceFull(minPrice)} – {formatPriceFull(maxPrice)} on Realtor.com
            </p>
          </div>
          <a
            href={buildRealtorSearchUrl(location, minPrice, maxPrice)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 px-4 py-2 bg-[#5BA4E5] text-white rounded-lg hover:bg-[#4A93D4] transition-colors font-semibold text-sm shadow"
          >
            Browse
          </a>
        </div>
      </div>
    </div>
  );
}

function CompactHomeCard({ home, index, onClick }: { home: Home; index: number; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

  return (
    <button onClick={onClick}
      className="text-left bg-white rounded-xl border border-[#E5E7EB] overflow-hidden hover:shadow-lg transition-all duration-200 group cursor-pointer w-full">
      <div className={`relative h-[50vh] sm:h-[60vh] bg-gradient-to-br ${gradient} overflow-hidden`}>
        {home.photoUrl && !imgError ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={home.photoUrl} alt={`Home at ${home.address}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(min-width: 768px) 50vw, 100vw"
            onError={() => setImgError(true)} loading="lazy" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-1">
            <svg className="w-8 h-8 text-[#5BA4E5] opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[10px] text-[#5BA4E5] opacity-60">{home.city}, {home.state}</span>
          </div>
        )}
        <div className="absolute top-2 left-2 bg-[#5BA4E5] text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow">
          {formatPrice(home.price)}
        </div>
        {home.homeType && (
          <div className="absolute top-2 right-2 bg-white/90 text-[#2C3E50] px-1.5 py-0.5 rounded text-[8px] font-medium shadow">
            {home.homeType}
          </div>
        )}
      </div>
      <div className="p-2">
        <div className="flex items-center gap-1.5 text-[9px] text-[#6B7280] mb-0.5">
          <span className="font-medium">{home.bedrooms} bd</span>
          <span>|</span>
          <span className="font-medium">{home.bathrooms} ba</span>
          {home.sqft > 0 && (<><span>|</span><span className="font-medium">{home.sqft.toLocaleString()} sqft</span></>)}
        </div>
        <p className="text-[11px] font-medium text-[#2C3E50] truncate">{home.address}</p>
        <p className="text-[9px] text-[#9CA3AF] truncate">{home.city}, {home.state} {home.zipcode}</p>
      </div>
    </button>
  );
}

function FullScreenCarouselModal({
  homes, currentIndex, onClose, onNavigate, onSetIndex,
}: {
  homes: Home[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onSetIndex: (idx: number) => void;
}) {
  const home = homes[currentIndex];
  const [imgError, setImgError] = useState(false);

  useEffect(() => { setImgError(false); }, [currentIndex]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onNavigate('prev');
      if (e.key === 'ArrowRight') onNavigate('next');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onNavigate]);

  if (!home) return null;

  const gradient = CARD_GRADIENTS[currentIndex % CARD_GRADIENTS.length];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-white shadow-2xl w-screen h-screen overflow-hidden flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <button onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-white/90 hover:bg-white text-gray-700 rounded-full p-1.5 shadow transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Left: Image — takes up most of the screen */}
        <div className={`relative w-full md:w-2/3 h-[50vh] md:h-full bg-gradient-to-br ${gradient}`}>
          {home.photoUrl && !imgError ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={home.photoUrl} alt={`Home at ${home.address}`} className="w-full h-full object-cover"
              onError={() => setImgError(true)} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <svg className="w-16 h-16 text-[#5BA4E5] opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-sm text-[#5BA4E5] opacity-60">{home.city}, {home.state}</span>
            </div>
          )}

          {currentIndex > 0 && (
            <button onClick={() => onNavigate('prev')}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow transition-colors">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {currentIndex < homes.length - 1 && (
            <button onClick={() => onNavigate('next')}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow transition-colors">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs font-medium px-3 py-1 rounded-full">
            {currentIndex + 1} / {homes.length}
          </div>
        </div>

        {/* Right: Details */}
        <div className="w-full md:w-1/3 p-6 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="mb-4">
              <p className="text-3xl font-bold text-[#2C3E50]">{formatPrice(home.price)}</p>
              <p className="text-sm text-[#6B7280] mt-0.5">{home.homeType || 'Home'}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-[#F8FAFB] rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-[#2C3E50]">{home.bedrooms}</p>
                <p className="text-[10px] text-[#6B7280] font-medium">Beds</p>
              </div>
              <div className="bg-[#F8FAFB] rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-[#2C3E50]">{home.bathrooms}</p>
                <p className="text-[10px] text-[#6B7280] font-medium">Baths</p>
              </div>
              <div className="bg-[#F8FAFB] rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-[#2C3E50]">{home.sqft > 0 ? home.sqft.toLocaleString() : 'N/A'}</p>
                <p className="text-[10px] text-[#6B7280] font-medium">Sqft</p>
              </div>
            </div>

            <div className="space-y-2 mb-5">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#5BA4E5] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-[#2C3E50]">{home.address}</p>
                  <p className="text-xs text-[#6B7280]">{home.city}, {home.state} {home.zipcode}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-[#E5E7EB]">
            <a href={home.listingUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-[#5BA4E5] to-[#4A93D4] text-white rounded-xl hover:from-[#4A93D4] hover:to-[#3982C3] transition-all font-semibold text-sm shadow">
              View Full Listing on Realtor.com
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* Thumbnail strip */}
          <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
            {homes.map((h, i) => (
              <button key={h.id} onClick={() => onSetIndex(i)}
                className={`flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                  i === currentIndex ? 'border-[#5BA4E5] shadow' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                {h.photoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={h.photoUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${CARD_GRADIENTS[i % CARD_GRADIENTS.length]}`} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
