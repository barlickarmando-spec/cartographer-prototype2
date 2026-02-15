// components/ZillowHomesEmbed.tsx
'use client';

interface ZillowHomesEmbedProps {
  location: string;
  targetPrice: number;
  priceRange?: number; // Default ±$50k
}

export default function ZillowHomesEmbed({ 
  location, 
  targetPrice,
  priceRange = 50000 
}: ZillowHomesEmbedProps) {
  const minPrice = Math.round(targetPrice - priceRange);
  const maxPrice = Math.round(targetPrice + priceRange);
  
  // Format location for Zillow URL
  const formatLocation = (loc: string): string => {
    return loc.toLowerCase()
      .replace(/,?\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  };
  
  const formattedLocation = formatLocation(location);
  
  // Build Zillow search URL
  const zillowSearchUrl = `https://www.zillow.com/homes/${formattedLocation}_rb/?searchQueryState=%7B%22pagination%22%3A%7B%7D%2C%22isMapVisible%22%3Afalse%2C%22filterState%22%3A%7B%22price%22%3A%7B%22min%22%3A${minPrice}%2C%22max%22%3A${maxPrice}%7D%2C%22beds%22%3A%7B%22min%22%3A2%7D%7D%2C%22isListVisible%22%3Atrue%7D`;
  
  // Generate example home cards (what users will see at these prices)
  const generateExampleHomes = () => {
    const avgPrice = (minPrice + maxPrice) / 2;
    
    return [
      {
        id: 1,
        priceLabel: `~$${(minPrice / 1000).toFixed(0)}K`,
        price: minPrice,
        beds: 3,
        baths: 2,
        sqft: Math.round((minPrice / 250) - 200),
        description: `Entry-level homes in ${location}`,
      },
      {
        id: 2,
        priceLabel: `~$${((minPrice + avgPrice) / 2 / 1000).toFixed(0)}K`,
        price: (minPrice + avgPrice) / 2,
        beds: 3,
        baths: 2.5,
        sqft: Math.round(((minPrice + avgPrice) / 2 / 250)),
        description: `Mid-range homes in ${location}`,
      },
      {
        id: 3,
        priceLabel: `~$${(avgPrice / 1000).toFixed(0)}K`,
        price: avgPrice,
        beds: 4,
        baths: 2.5,
        sqft: Math.round((avgPrice / 250)),
        description: `Target price homes in ${location}`,
      },
      {
        id: 4,
        priceLabel: `~$${(((avgPrice + maxPrice) / 2) / 1000).toFixed(0)}K`,
        price: (avgPrice + maxPrice) / 2,
        beds: 4,
        baths: 3,
        sqft: Math.round(((avgPrice + maxPrice) / 2 / 250)),
        description: `Upper-range homes in ${location}`,
      },
      {
        id: 5,
        priceLabel: `~$${(maxPrice / 1000).toFixed(0)}K`,
        price: maxPrice,
        beds: 5,
        baths: 3,
        sqft: Math.round((maxPrice / 250) + 200),
        description: `Premium homes in ${location}`,
      },
      {
        id: 6,
        priceLabel: 'View All',
        price: avgPrice,
        beds: 0,
        baths: 0,
        sqft: 0,
        description: `See all homes in your range`,
        isViewAll: true,
      },
    ];
  };

  const exampleHomes = generateExampleHomes();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-[#6B7280] mb-1">
          Homes for sale in <strong>{location}</strong>
        </p>
        <p className="text-xs text-[#9CA3AF]">
          ${(minPrice / 1000).toFixed(0)}K - ${(maxPrice / 1000).toFixed(0)}K
          {' • '}Click any card to see real listings on Zillow
        </p>
      </div>

      {/* Home Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exampleHomes.map((home) => (
          <HomeCard
            key={home.id}
            home={home}
            location={location}
            zillowUrl={zillowSearchUrl}
            isViewAll={home.isViewAll}
          />
        ))}
      </div>

      {/* Main CTA */}
      <div className="flex flex-col items-center gap-4 p-6 bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] rounded-xl border border-[#5BA4E5]">
        <div className="text-center">
          <h3 className="text-lg font-bold text-[#2C3E50] mb-2">
            Ready to explore homes in {location}?
          </h3>
          <p className="text-sm text-[#6B7280]">
            View all available listings in your price range on Zillow
          </p>
        </div>
        <a
          href={zillowSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-4 bg-[#5BA4E5] text-white rounded-lg hover:bg-[#4A93D4] transition-all transform hover:scale-105 font-semibold text-lg shadow-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Browse All Homes on Zillow
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}

// Individual Home Card Component
interface HomeCardProps {
  home: {
    id: number;
    priceLabel: string;
    price: number;
    beds: number;
    baths: number;
    sqft: number;
    description: string;
    isViewAll?: boolean;
  };
  location: string;
  zillowUrl: string;
  isViewAll?: boolean;
}

function HomeCard({ home, location, zillowUrl, isViewAll }: HomeCardProps) {
  // Build specific price range URL for this card (±10% of price)
  const cardMinPrice = Math.round(home.price * 0.9);
  const cardMaxPrice = Math.round(home.price * 1.1);
  
  const formattedLocation = location.toLowerCase()
    .replace(/,?\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  
  const cardUrl = isViewAll 
    ? zillowUrl 
    : `https://www.zillow.com/homes/${formattedLocation}_rb/?searchQueryState=%7B%22pagination%22%3A%7B%7D%2C%22isMapVisible%22%3Afalse%2C%22filterState%22%3A%7B%22price%22%3A%7B%22min%22%3A${cardMinPrice}%2C%22max%22%3A${cardMaxPrice}%7D%2C%22beds%22%3A%7B%22min%22%3A${home.beds}%7D%7D%2C%22isListVisible%22%3Atrue%7D`;

  if (isViewAll) {
    return (
      <a
        href={cardUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group block bg-gradient-to-br from-[#5BA4E5] to-[#4A93D4] rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105"
      >
        <div className="p-6 text-white text-center h-full flex flex-col items-center justify-center min-h-[240px]">
          <svg className="w-16 h-16 mb-4 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-2xl font-bold mb-2">View All Homes</p>
          <p className="text-white/80 text-sm">{home.description}</p>
          <div className="mt-4 flex items-center gap-2 text-white/90">
            <span className="text-sm font-medium">Browse on Zillow</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </a>
    );
  }

  // Get gradient colors based on price tier
  const getGradientColors = (id: number) => {
    const gradients = [
      { from: 'from-blue-100', via: 'via-blue-50', to: 'to-indigo-100', accent: 'bg-blue-200', accent2: 'bg-indigo-200' },
      { from: 'from-green-100', via: 'via-emerald-50', to: 'to-teal-100', accent: 'bg-green-200', accent2: 'bg-teal-200' },
      { from: 'from-purple-100', via: 'via-purple-50', to: 'to-pink-100', accent: 'bg-purple-200', accent2: 'bg-pink-200' },
      { from: 'from-orange-100', via: 'via-amber-50', to: 'to-yellow-100', accent: 'bg-orange-200', accent2: 'bg-yellow-200' },
      { from: 'from-rose-100', via: 'via-rose-50', to: 'to-pink-100', accent: 'bg-rose-200', accent2: 'bg-pink-200' },
    ];
    return gradients[(id - 1) % gradients.length];
  };

  const gradient = getGradientColors(home.id);

  // Get house style variation
  const getHouseStyle = (id: number) => {
    const styles = [
      { doorColor: 'bg-blue-400', windowColor: 'bg-blue-200', roofColor: 'border-b-gray-600' },
      { doorColor: 'bg-green-400', windowColor: 'bg-green-200', roofColor: 'border-b-gray-700' },
      { doorColor: 'bg-purple-400', windowColor: 'bg-purple-200', roofColor: 'border-b-gray-600' },
      { doorColor: 'bg-orange-400', windowColor: 'bg-orange-200', roofColor: 'border-b-gray-700' },
      { doorColor: 'bg-rose-400', windowColor: 'bg-rose-200', roofColor: 'border-b-gray-600' },
    ];
    return styles[(id - 1) % styles.length];
  };

  const houseStyle = getHouseStyle(home.id);

  return (
    <a
      href={cardUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-white rounded-xl border border-[#E5E7EB] overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105"
    >
      {/* Home Image Placeholder */}
      <div className="relative h-48 overflow-hidden">
        {/* Beautiful gradient background with house illustration */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient.from} ${gradient.via} ${gradient.to}`}>
          {/* Decorative elements */}
          <div className={`absolute top-0 right-0 w-32 h-32 ${gradient.accent} rounded-full blur-3xl opacity-30`} />
          <div className={`absolute bottom-0 left-0 w-40 h-40 ${gradient.accent2} rounded-full blur-3xl opacity-30`} />
        </div>
        
        {/* House illustration */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* House base */}
            <div className="w-24 h-16 bg-white rounded-lg shadow-xl border-2 border-gray-200">
              {/* Door */}
              <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-10 ${houseStyle.doorColor} rounded-t-lg`} />
              {/* Windows */}
              <div className={`absolute top-3 left-3 w-5 h-5 ${houseStyle.windowColor} rounded`} />
              <div className={`absolute top-3 right-3 w-5 h-5 ${houseStyle.windowColor} rounded`} />
            </div>
            {/* Roof */}
            <div className={`absolute -top-6 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[50px] border-r-[50px] border-b-[30px] border-l-transparent border-r-transparent ${houseStyle.roofColor}`} />
            {/* Chimney */}
            <div className="absolute -top-8 right-4 w-4 h-8 bg-gray-500 rounded-t" />
          </div>
        </div>
        
        {/* Photo overlay effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
        
        {/* Price badge */}
        <div className="absolute top-3 left-3 bg-[#5BA4E5] text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg z-10">
          {home.priceLabel}
        </div>

        {/* "Click to view photos" badge */}
        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-[#5BA4E5] px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          View Photos
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-[#5BA4E5] opacity-0 group-hover:opacity-20 transition-opacity" />
      </div>

      {/* Home Details */}
      <div className="p-4">
        {/* Beds/Baths/SqFt */}
        <div className="flex items-center gap-4 text-sm text-[#6B7280] mb-3">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="font-medium">{home.beds} bd</span>
          </div>
          <span>•</span>
          <span className="font-medium">{home.baths} ba</span>
          <span>•</span>
          <span className="font-medium">{home.sqft.toLocaleString()} sqft</span>
        </div>

        {/* Description */}
        <p className="text-sm text-[#6B7280] mb-3">
          {home.description}
        </p>

        {/* View on Zillow CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB]">
          <span className="text-xs text-[#9CA3AF]">Click to view listings</span>
          <div className="flex items-center gap-1 text-[#5BA4E5] group-hover:gap-2 transition-all">
            <span className="text-sm font-medium">Zillow</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </a>
  );
}
