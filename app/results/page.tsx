'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CalculationResult, HouseProjection } from '@/lib/calculation-engine';
import { getLocationData } from '@/lib/data-extraction';

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [show5YearHomes, setShow5YearHomes] = useState(false);
  const [show10YearHomes, setShow10YearHomes] = useState(false);
  const [show15YearHomes, setShow15YearHomes] = useState(false);

  useEffect(() => {
    // Load results from localStorage
    const stored = localStorage.getItem('calculation-results');
    
    if (!stored) {
      router.push('/onboarding');
      return;
    }
    
    try {
      const results: CalculationResult[] = JSON.parse(stored);
      
      // For single location or "know exactly" scenario, use first result
      if (results.length > 0) {
        setResult(results[0]);
      } else {
        router.push('/onboarding');
      }
    } catch (error) {
      console.error('Error loading results:', error);
      router.push('/onboarding');
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5BA4E5] mx-auto mb-4"></div>
          <p className="text-[#6B7280]">Loading your financial roadmap...</p>
        </div>
      </div>
    );
  }

  if (!result || !result.calculationSuccessful) {
    return (
      <div className="min-h-screen bg-[#F8FAFB] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#6B7280] mb-4">Unable to load results</p>
          <Link href="/onboarding" className="text-[#5BA4E5] hover:text-[#4A93D4] font-medium">
            Start Over
          </Link>
        </div>
      </div>
    );
  }

  const locationData = result.locationData;
  const isViable = result.viabilityClassification !== 'no-viable-path';
  
  // Get viability label
  const getViabilityLabel = (classification: string) => {
    const labels: Record<string, { label: string; color: string; bgColor: string }> = {
      'very-viable-stable': { label: 'Very Viable & Stable', color: '#10B981', bgColor: '#D1FAE5' },
      'viable': { label: 'Viable', color: '#5BA4E5', bgColor: '#EFF6FF' },
      'viable-higher-allocation': { label: 'Viable (Higher Allocation)', color: '#F59E0B', bgColor: '#FEF3C7' },
      'viable-extreme-care': { label: 'Viable (Extreme Care)', color: '#EF4444', bgColor: '#FEE2E2' },
      'viable-when-renting': { label: 'Viable When Renting', color: '#8B5CF6', bgColor: '#EDE9FE' },
      'no-viable-path': { label: 'Not Viable', color: '#DC2626', bgColor: '#FEE2E2' },
    };
    return labels[classification] || labels['no-viable-path'];
  };

  const viabilityInfo = getViabilityLabel(result.viabilityClassification);

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      {/* Navigation */}
      <nav className="border-b border-[#E5E7EB] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <Image
                src="/Icons/Icons Transparent/Logo_transparent.png"
                alt="Cartographer"
                width={200}
                height={50}
                className="h-10 w-auto"
              />
            </Link>
            <Link 
              href="/onboarding" 
              className="text-[#6B7280] hover:text-[#2C3E50] font-medium transition-colors"
            >
              Edit Profile
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* ===== BANNER/HEADER ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden mb-8">
          
          {/* TOP SECTION - Key Metrics */}
          <div className="bg-gradient-to-br from-[#5BA4E5] to-[#4A93D4] p-8 text-white">
            <h1 className="text-3xl font-bold mb-2">{result.location}</h1>
            <p className="text-white/80 mb-6">Your Financial Roadmap</p>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* Time to Home Ownership */}
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-white/70 text-sm mb-1">Time to Homeownership</p>
                <p className="text-2xl font-bold">
                  {result.yearsToMortgage > 0 ? `${result.yearsToMortgage} years` : 'N/A'}
                </p>
                {result.ageMortgageAcquired > 0 && (
                  <p className="text-white/60 text-xs mt-1">At age {result.ageMortgageAcquired}</p>
                )}
              </div>

              {/* Viability Classification */}
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-white/70 text-sm mb-1">Status</p>
                <p className="text-lg font-bold">{viabilityInfo.label}</p>
              </div>

              {/* Estimated Home Value */}
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-white/70 text-sm mb-1">Median Home Value</p>
                <p className="text-2xl font-bold">
                  ${(locationData.housing.medianHomeValue / 1000).toFixed(0)}K
                </p>
              </div>

              {/* Time to Debt Free */}
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-white/70 text-sm mb-1">Time to Debt-Free</p>
                <p className="text-2xl font-bold">
                  {result.yearsToDebtFree > 0 ? `${result.yearsToDebtFree} years` : 'No debt'}
                </p>
                {result.ageDebtFree > 0 && (
                  <p className="text-white/60 text-xs mt-1">At age {result.ageDebtFree}</p>
                )}
              </div>

              {/* Minimum % Saved */}
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-white/70 text-sm mb-1">Minimum Allocation</p>
                <p className="text-2xl font-bold">{result.minimumAllocationRequired}%</p>
                <p className="text-white/60 text-xs mt-1">of disposable income</p>
              </div>
            </div>
          </div>

          {/* DROPDOWN - Important Notes or Tips */}
          <div className="border-t border-[#E5E7EB]">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="w-full px-8 py-4 flex items-center justify-between hover:bg-[#F8FAFB] transition-colors"
            >
              <span className="font-semibold text-[#2C3E50]">
                {isViable ? 'Important Notes & Recommendations' : 'Tips to Make This Location Affordable'}
              </span>
              <svg 
                className={`w-5 h-5 text-[#6B7280] transition-transform ${showNotes ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showNotes && (
              <div className="px-8 pb-6 space-y-4">
                {/* Recommendations */}
                <div>
                  <h3 className="font-semibold text-[#2C3E50] mb-3">
                    {isViable ? 'Recommendations' : 'How to Make It Work'}
                  </h3>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="text-[#5BA4E5] mt-1">•</span>
                        <span className="text-[#6B7280] text-sm flex-1">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Warnings */}
                {result.warnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-800 mb-2">Warnings</h3>
                    <ul className="space-y-1">
                      {result.warnings.map((warn, i) => (
                        <li key={i} className="text-sm text-yellow-700">{warn}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Downloadable PDF */}
                <button className="w-full bg-[#5BA4E5] text-white py-3 rounded-lg hover:bg-[#4A93D4] transition-colors font-medium flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Financial Strategy (PDF)
                </button>
              </div>
            )}
          </div>

          {/* MIDDLE SECTION - Cost of Living Details */}
          <div className="px-8 py-6 bg-[#F8FAFB]">
            <h2 className="text-xl font-bold text-[#2C3E50] mb-6">Cost of Living Breakdown</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Typical Salary */}
                <div className="bg-white rounded-lg p-4 border border-[#E5E7EB]">
                  <p className="text-sm text-[#6B7280] mb-1">Typical Salary (Your Occupation)</p>
                  <p className="text-2xl font-bold text-[#2C3E50]">
                    ${result.yearByYear[0]?.userIncome.toLocaleString()}/year
                  </p>
                  <p className="text-xs text-[#9CA3AF] mt-1">
                    Based on {result.yearByYear[0]?.householdType.includes('2e') ? '2 earners' : '1 earner'}
                  </p>
                </div>

                {/* Cost of Living (No Kids) */}
                <div className="bg-white rounded-lg p-4 border border-[#E5E7EB]">
                  <p className="text-sm text-[#6B7280] mb-1">Cost of Living (No Kids)</p>
                  <p className="text-2xl font-bold text-[#2C3E50]">
                    ${(locationData.adjustedCOL.onePerson / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
                  </p>
                  <p className="text-xs text-[#9CA3AF] mt-1">
                    ${locationData.adjustedCOL.onePerson.toLocaleString()}/year (excluding housing)
                  </p>
                </div>

                {/* Cost of Living (With Kids) */}
                <div className="bg-white rounded-lg p-4 border border-[#E5E7EB]">
                  <p className="text-sm text-[#6B7280] mb-1">Cost of Living (With Kids)</p>
                  <p className="text-2xl font-bold text-[#2C3E50]">
                    ${(locationData.adjustedCOL.familyFourOneWorker / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
                  </p>
                  <p className="text-xs text-[#9CA3AF] mt-1">
                    ${locationData.adjustedCOL.familyFourOneWorker.toLocaleString()}/year (excluding housing)
                  </p>
                </div>
              </div>

              {/* Right Column - Rent Costs */}
              <div>
                <div className="bg-white rounded-lg p-6 border border-[#E5E7EB]">
                  <h3 className="font-semibold text-[#2C3E50] mb-4">Typical Rent Costs</h3>
                  
                  <div className="space-y-4">
                    {/* 1 Bedroom */}
                    <div className="flex justify-between items-center pb-3 border-b border-[#E5E7EB]">
                      <div>
                        <p className="font-medium text-[#2C3E50]">1 Bedroom</p>
                        <p className="text-xs text-[#9CA3AF]">~{locationData.rent.oneBedroomSqFt.toLocaleString()} sq ft</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-[#5BA4E5]">
                          ${Math.round(locationData.rent.oneBedroomAnnual / 12).toLocaleString()}/mo
                        </p>
                        <p className="text-xs text-[#9CA3AF]">
                          ${locationData.rent.oneBedroomAnnual.toLocaleString()}/year
                        </p>
                      </div>
                    </div>

                    {/* 2 Bedroom */}
                    <div className="flex justify-between items-center pb-3 border-b border-[#E5E7EB]">
                      <div>
                        <p className="font-medium text-[#2C3E50]">2 Bedroom</p>
                        <p className="text-xs text-[#9CA3AF]">~{locationData.rent.twoBedroomSqFt.toLocaleString()} sq ft</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-[#5BA4E5]">
                          ${Math.round(locationData.rent.twoBedroomAnnual / 12).toLocaleString()}/mo
                        </p>
                        <p className="text-xs text-[#9CA3AF]">
                          ${locationData.rent.twoBedroomAnnual.toLocaleString()}/year
                        </p>
                      </div>
                    </div>

                    {/* 3 Bedroom */}
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-[#2C3E50]">3 Bedroom</p>
                        <p className="text-xs text-[#9CA3AF]">~{locationData.rent.threeBedroomSqFt.toLocaleString()} sq ft</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-[#5BA4E5]">
                          ${Math.round(locationData.rent.threeBedroomAnnual / 12).toLocaleString()}/mo
                        </p>
                        <p className="text-xs text-[#9CA3AF]">
                          ${locationData.rent.threeBedroomAnnual.toLocaleString()}/year
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION - House Projections */}
          <div className="px-8 py-6">
            <h2 className="text-xl font-bold text-[#2C3E50] mb-6">Home Affordability Over Time</h2>
            
            <div className="space-y-4">
              {/* 5 Year Projection */}
              {result.houseProjections.fiveYears && (
                <HouseProjectionCard
                  title="5 Year Projection"
                  projection={result.houseProjections.fiveYears}
                  location={result.location}
                  showHomes={show5YearHomes}
                  onToggle={() => setShow5YearHomes(!show5YearHomes)}
                />
              )}

              {/* 10 Year Projection */}
              {result.houseProjections.tenYears && (
                <HouseProjectionCard
                  title="10 Year Projection"
                  projection={result.houseProjections.tenYears}
                  location={result.location}
                  showHomes={show10YearHomes}
                  onToggle={() => setShow10YearHomes(!show10YearHomes)}
                />
              )}

              {/* 15 Year Projection */}
              {result.houseProjections.fifteenYears && (
                <HouseProjectionCard
                  title="15 Year Projection"
                  projection={result.houseProjections.fifteenYears}
                  location={result.location}
                  showHomes={show15YearHomes}
                  onToggle={() => setShow15YearHomes(!show15YearHomes)}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ===== HOUSE PROJECTION CARD COMPONENT =====

interface HouseProjectionCardProps {
  title: string;
  projection: HouseProjection;
  location: string;
  showHomes: boolean;
  onToggle: () => void;
}

function HouseProjectionCard({ title, projection, location, showHomes, onToggle }: HouseProjectionCardProps) {
  const estimatedSqFt = Math.round((projection.maxSustainableHousePrice / 250)); // Rough estimate $250/sqft
  
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
      {/* Main Info */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-[#2C3E50] mb-1">{title}</h3>
            <p className="text-sm text-[#9CA3AF]">Age {projection.age}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[#6B7280] mb-1">Total Savings</p>
            <p className="text-xl font-bold text-[#5BA4E5]">
              ${(projection.totalSavings / 1000).toFixed(0)}K
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Projected Price */}
          <div className="bg-[#EFF6FF] rounded-lg p-4">
            <p className="text-xs text-[#6B7280] mb-1">Max Sustainable Price</p>
            <p className="text-2xl font-bold text-[#2C3E50]">
              ${(projection.maxSustainableHousePrice / 1000).toFixed(0)}K
            </p>
            {projection.sustainabilityLimited && (
              <p className="text-xs text-[#EF4444] mt-1">Limited by income</p>
            )}
          </div>

          {/* Estimated Size */}
          <div className="bg-[#F8FAFB] rounded-lg p-4">
            <p className="text-xs text-[#6B7280] mb-1">Estimated Size</p>
            <p className="text-2xl font-bold text-[#2C3E50]">
              {estimatedSqFt.toLocaleString()} sqft
            </p>
            <p className="text-xs text-[#9CA3AF] mt-1">~$250/sqft</p>
          </div>
        </div>

        {/* Additional Details */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-[#9CA3AF] text-xs">Down Payment</p>
            <p className="font-semibold text-[#2C3E50]">
              ${(projection.sustainableDownPayment / 1000).toFixed(0)}K
            </p>
          </div>
          <div>
            <p className="text-[#9CA3AF] text-xs">Annual Payment</p>
            <p className="font-semibold text-[#2C3E50]">
              ${(projection.sustainableAnnualPayment / 1000).toFixed(0)}K/yr
            </p>
          </div>
          <div>
            <p className="text-[#9CA3AF] text-xs">Post-Mortgage DI</p>
            <p className={`font-semibold ${projection.postMortgageDisposableIncome >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
              ${(projection.postMortgageDisposableIncome / 1000).toFixed(0)}K/yr
            </p>
          </div>
        </div>

        {/* Affordability Status */}
        {!projection.canAfford && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              You'll need to save longer to afford the down payment
            </p>
          </div>
        )}
      </div>

      {/* See Potential Homes Button */}
      <div className="border-t border-[#E5E7EB]">
        <button
          onClick={onToggle}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#F8FAFB] transition-colors"
        >
          <span className="font-medium text-[#5BA4E5]">See Potential Homes</span>
          <svg 
            className={`w-5 h-5 text-[#5BA4E5] transition-transform ${showHomes ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showHomes && (
          <div className="px-6 pb-6">
            <HomeCarousel 
              priceRange={{
                min: projection.maxSustainableHousePrice * 0.9,
                max: projection.maxSustainableHousePrice * 1.1,
              }}
              location={location}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ===== HOME CAROUSEL COMPONENT =====

interface HomeCarouselProps {
  priceRange: { min: number; max: number };
  location: string;
}

function HomeCarousel({ priceRange, location }: HomeCarouselProps) {
  // Placeholder for Zillow integration
  // In production, this would fetch from Zillow API or similar
  
  const sampleHomes = [
    {
      image: '/placeholder-home-1.jpg',
      price: Math.round(priceRange.min),
      beds: 3,
      baths: 2,
      sqft: 1500,
      address: '123 Main St',
    },
    {
      image: '/placeholder-home-2.jpg',
      price: Math.round((priceRange.min + priceRange.max) / 2),
      beds: 4,
      baths: 2.5,
      sqft: 1800,
      address: '456 Oak Ave',
    },
    {
      image: '/placeholder-home-3.jpg',
      price: Math.round(priceRange.max),
      beds: 4,
      baths: 3,
      sqft: 2100,
      address: '789 Elm Dr',
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#6B7280]">
        Homes in {location} priced ${(priceRange.min / 1000).toFixed(0)}K - ${(priceRange.max / 1000).toFixed(0)}K
      </p>
      
      {/* Image Carousel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sampleHomes.map((home, i) => (
          <div key={i} className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden hover:shadow-md transition-shadow">
            {/* Placeholder Image */}
            <div className="bg-gradient-to-br from-[#E5E7EB] to-[#D1D5DB] h-40 flex items-center justify-center">
              <p className="text-[#6B7280] text-sm">Home Image</p>
            </div>
            
            {/* Home Details */}
            <div className="p-4">
              <p className="text-xl font-bold text-[#2C3E50] mb-2">
                ${(home.price / 1000).toFixed(0)}K
              </p>
              <div className="flex items-center gap-4 text-sm text-[#6B7280] mb-2">
                <span>{home.beds} bd</span>
                <span>•</span>
                <span>{home.baths} ba</span>
                <span>•</span>
                <span>{home.sqft.toLocaleString()} sqft</span>
              </div>
              <p className="text-sm text-[#9CA3AF]">{home.address}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#EFF6FF] border border-[#5BA4E5] rounded-lg p-4">
        <p className="text-sm text-[#2C3E50]">
          <strong>Note:</strong> These are sample homes. For actual listings, visit Zillow, Redfin, or Realtor.com
        </p>
      </div>
    </div>
  );
}
