'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CalculationResult, HouseProjection, calculateAutoApproach, calculateProjectionForYear } from '@/lib/calculation-engine';
import SimpleHomeCarousel from '@/components/SimpleHomeCarousel';
import { formatCurrency, pluralize } from '@/lib/utils';
import { normalizeOnboardingAnswers } from '@/lib/onboarding/normalize';
import { getOnboardingAnswers } from '@/lib/storage';
import { searchLocations, getAllLocationOptions } from '@/lib/locations';
import { getPricePerSqft, getTypicalHomeValue } from '@/lib/home-value-lookup';
import type { OnboardingAnswers } from '@/lib/onboarding/types';

export default function ProfilePage() {
  const router = useRouter();
  const [allResults, setAllResults] = useState<CalculationResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [showMaxHomes, setShowMaxHomes] = useState(false);
  const [showFastestHomes, setShowFastestHomes] = useState(false);
  const [showCustomHomes, setShowCustomHomes] = useState(false);
  const [customSearchValue, setCustomSearchValue] = useState('');
  const [customSearchUnit, setCustomSearchUnit] = useState<'years' | 'months'>('years');
  const [customSearchProjection, setCustomSearchProjection] = useState<HouseProjection | null>(null);
  const [customSearchAttempted, setCustomSearchAttempted] = useState(false);
  const [showNecessarySizeWork, setShowNecessarySizeWork] = useState(false);
  const [showMaxValueWork, setShowMaxValueWork] = useState(false);
  const [showYearByYear, setShowYearByYear] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);
  const [onboardingProfile, setOnboardingProfile] = useState<ReturnType<typeof normalizeOnboardingAnswers> | null>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  const loadResults = useCallback((stored: string | null, storedAnswers: string | null) => {
    if (!stored) {
      router.push('/onboarding');
      return;
    }

    try {
      let results: CalculationResult[] = JSON.parse(stored);

      if (results.length === 0) {
        router.push('/onboarding');
        return;
      }

      // Detect stale cached results (missing numericScore from 3-layer system)
      const isStale = results.length > 0 && results[0].numericScore === undefined;
      if (isStale && storedAnswers) {
        try {
          const answers = JSON.parse(storedAnswers);
          const freshProfile = normalizeOnboardingAnswers(answers);
          results = results.map(r => {
            try {
              const fresh = calculateAutoApproach(freshProfile, r.location, 30);
              return fresh || r;
            } catch {
              return r;
            }
          });
          localStorage.setItem('calculation-results', JSON.stringify(results));
        } catch { /* use original results */ }
      }

      // Sort by numeric score (analog — 8.7 beats 8.6)
      const sortedResults = [...results].sort((a, b) => {
        const numDiff = (b.numericScore ?? 0) - (a.numericScore ?? 0);
        if (Math.abs(numDiff) > 0.001) return numDiff;
        const aYears = a.yearsToMortgage > 0 ? a.yearsToMortgage : 999;
        const bYears = b.yearsToMortgage > 0 ? b.yearsToMortgage : 999;
        return aYears - bYears;
      });

      setAllResults(sortedResults);

      // Default to the most viable location (sortedResults[0])
      let resultToShow = sortedResults[0];

      if (storedAnswers) {
        try {
          const answers = JSON.parse(storedAnswers);
          setOnboardingProfile(normalizeOnboardingAnswers(answers));
          // Only override default for users who specified a location preference
          // (not "no-idea" users — they should see the best fit)
          if (answers.locationSituation === 'know-exactly' && answers.exactLocation) {
            const exactMatch = sortedResults.find(r => r.location === answers.exactLocation);
            if (exactMatch) resultToShow = exactMatch;
          } else if (answers.locationSituation === 'currently-live-may-move' && answers.currentLocation) {
            const currentMatch = sortedResults.find(r => r.location === answers.currentLocation);
            if (currentMatch) resultToShow = currentMatch;
          }
          // "no-idea" and "deciding-between" both fall through to sortedResults[0] (best fit)
        } catch (e) {
          console.error('Error parsing onboarding answers:', e);
        }
      }

      setSelectedResult(resultToShow);
    } catch (error) {
      console.error('Error loading results:', error);
      router.push('/onboarding');
    } finally {
      setLoading(false);
    }
  }, [router]);



  useEffect(() => {
    loadResults(
      localStorage.getItem('calculation-results'),
      localStorage.getItem('onboarding-answers')
    );
  }, [loadResults]);

  // Close location dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target as Node)) {
        setShowLocationDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle selecting a new location from search
  const handleSelectLocation = useCallback((locationLabel: string) => {
    setShowLocationDropdown(false);
    setLocationSearch('');

    // Check if already calculated
    const existing = allResults.find(r => r.location === locationLabel);
    if (existing) {
      setSelectedResult(existing);
      return;
    }

    // Calculate on-the-fly
    const storedAnswers = getOnboardingAnswers<OnboardingAnswers>((d): d is OnboardingAnswers => d != null && typeof d === 'object');
    if (!storedAnswers) return;

    setLocationSearchLoading(true);
    setTimeout(() => {
      try {
        const profile = normalizeOnboardingAnswers(storedAnswers);
        const result = calculateAutoApproach(profile, locationLabel, 30);
        if (result) {
          const updated = [...allResults, result];
          setAllResults(updated);
          setSelectedResult(result);
          localStorage.setItem('calculation-results', JSON.stringify(updated));
        }
      } catch (error) {
        console.error('Error calculating new location:', error);
      }
      setLocationSearchLoading(false);
    }, 10);
  }, [allResults]);

  // Get search matches for location dropdown
  const locationSearchMatches = locationSearch.trim().length >= 1
    ? searchLocations(locationSearch, 8)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5BA4E5] mx-auto mb-4"></div>
          <p className="text-[#6B7280]">Loading your financial roadmap...</p>
        </div>
      </div>
    );
  }

  if (!selectedResult || !selectedResult.calculationSuccessful) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-[#6B7280] mb-4">Unable to load results</p>
          <button 
            onClick={() => router.push('/onboarding')}
            className="text-[#5BA4E5] hover:text-[#4A93D4] font-medium"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  const result = {
    ...selectedResult,
    // Safe defaults for new fields (handles cached results from before these were added)
    requiredSqFt: selectedResult.requiredSqFt || 1500,
    largeSqFt: selectedResult.largeSqFt || 2200,
    requiredHousePrice: selectedResult.requiredHousePrice || 0,
    largeHousePrice: selectedResult.largeHousePrice || 0,
    sqFtViable: selectedResult.sqFtViable ?? false,
    houseTag: selectedResult.houseTag || '',
    assumptions: selectedResult.assumptions || [],
    projectedSqFt: selectedResult.projectedSqFt || 0,
    fastestHomeSqFt: selectedResult.fastestHomeSqFt || 1600,
    fastestHomeProjection: selectedResult.fastestHomeProjection || null,
    baselineSqFtLabel: selectedResult.baselineSqFtLabel || '',
  };
  const locationData = result.locationData;
  const isViable = result.viabilityClassification !== 'no-viable-path';
  
  // Get viability label
  const getViabilityLabel = (r: CalculationResult) => {
    const houseClassification = r.houseClassification || 'viable-medium-house';
    const houseLabels: Record<string, { label: string; color: string; bgColor: string }> = {
      'very-viable-stable-large-house': { label: 'Very Viable and Stable: Large House', color: '#065F46', bgColor: '#A7F3D0' },
      'viable-large-house': { label: 'Viable: Large House', color: '#10B981', bgColor: '#D1FAE5' },
      'very-viable-stable-medium-house': { label: 'Very Viable and Stable: Medium House', color: '#10B981', bgColor: '#D1FAE5' },
      'viable-medium-house': { label: 'Viable: Medium House', color: '#5BA4E5', bgColor: '#EFF6FF' },
      'somewhat-viable-small-house': { label: 'Somewhat Viable: Small House', color: '#0891B2', bgColor: '#CFFAFE' },
    };

    if (r.viabilityClassification === 'no-viable-path') {
      return { label: 'Not Viable', color: '#DC2626', bgColor: '#FEE2E2' };
    }
    if (r.viabilityClassification === 'viable-when-renting') {
      return { label: 'Viable When Renting', color: '#8B5CF6', bgColor: '#EDE9FE' };
    }
    if (r.viabilityClassification === 'viable-extreme-care') {
      return { label: houseLabels[houseClassification]?.label || 'Viable (Extreme Care)', color: '#EF4444', bgColor: '#FEE2E2' };
    }
    if (r.viabilityClassification === 'viable-higher-allocation') {
      return { label: houseLabels[houseClassification]?.label || 'Viable (Higher Allocation)', color: '#F59E0B', bgColor: '#FEF3C7' };
    }

    return houseLabels[houseClassification] || houseLabels['viable-medium-house'];
  };

  const viabilityInfo = getViabilityLabel(result);

  // Simplified viability for the top badge (no house size)
  const viabilityBadge = (() => {
    if (result.viabilityClassification === 'no-viable-path')
      return { label: 'Not Viable', color: '#DC2626', bgColor: '#FEE2E2' };
    if (result.viabilityClassification === 'viable-when-renting')
      return { label: 'Viable When Renting', color: '#8B5CF6', bgColor: '#EDE9FE' };
    if (result.viabilityClassification === 'viable-extreme-care')
      return { label: 'Viable (Extreme Care)', color: '#EF4444', bgColor: '#FEE2E2' };
    if (result.viabilityClassification === 'viable-higher-allocation')
      return { label: 'Viable (Higher Allocation)', color: '#F59E0B', bgColor: '#FEF3C7' };
    return { label: 'Viable', color: '#065F46', bgColor: '#A7F3D0' };
  })();

  const starRating = Math.round(((result.numericScore ?? 0) / 10) * 5 * 2) / 2; // 0-5 half-star

  return (
    <div className="space-y-6">
      {/* Location Selector - always shown with searchable dropdown */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
        <label className="block text-sm font-medium text-[#2C3E50] mb-2">
          Viewing results for:
        </label>
        <div ref={locationDropdownRef} className="relative">
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={showLocationDropdown ? locationSearch : result.location}
              onChange={(e) => {
                setLocationSearch(e.target.value);
                setShowLocationDropdown(true);
              }}
              onFocus={() => {
                setLocationSearch('');
                setShowLocationDropdown(true);
              }}
              placeholder="Search any state or city..."
              className="w-full md:w-96 pl-10 pr-4 py-2 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none text-sm"
            />
            {locationSearchLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#5BA4E5]"></div>
              </div>
            )}
          </div>

          {showLocationDropdown && (
            <div className="absolute z-20 w-full md:w-96 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
              {/* Already-calculated locations */}
              {allResults.length > 1 && locationSearch.trim().length === 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide bg-gray-50">
                    Your Locations
                  </div>
                  {allResults.map(r => (
                    <button
                      key={r.location}
                      onClick={() => { setSelectedResult(r); setShowLocationDropdown(false); setLocationSearch(''); }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                        r.location === result.location ? 'bg-[#EFF6FF] text-[#5BA4E5]' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span>{r.location}</span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: getViabilityLabel(r).bgColor, color: getViabilityLabel(r).color }}
                      >
                        {getViabilityLabel(r).label} ({(r.numericScore ?? 0).toFixed(1)})
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Search results */}
              {locationSearch.trim().length >= 1 && (
                <div>
                  {locationSearchMatches.length > 0 ? (
                    locationSearchMatches.map(match => {
                      const alreadyCalc = allResults.find(r => r.location === match.label);
                      return (
                        <button
                          key={match.label}
                          onClick={() => handleSelectLocation(match.label)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4 text-[#5BA4E5] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                          <span className="text-gray-700">{match.label}</span>
                          {alreadyCalc && (
                            <span
                              className="ml-auto text-xs px-1.5 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: getViabilityLabel(alreadyCalc).bgColor, color: getViabilityLabel(alreadyCalc).color }}
                            >
                              {getViabilityLabel(alreadyCalc).label} ({(alreadyCalc.numericScore ?? 0).toFixed(1)})
                            </span>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-400">No matching locations</div>
                  )}
                </div>
              )}

              {/* Prompt when empty */}
              {locationSearch.trim().length === 0 && allResults.length <= 1 && (
                <div className="px-4 py-3 text-sm text-gray-400">Type to search any state or city...</div>
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-[#9CA3AF] mt-2">
          {allResults.length > 1
            ? `${allResults.length} locations calculated — search to add more`
            : 'Search to explore any state or city'}
        </p>
      </div>

      {/* Adjust Strategy Button */}
      <div className="flex justify-end">
        <button
          onClick={() => router.push('/adjust-strategy')}
          className="flex items-center gap-2 px-4 py-2 bg-[#5BA4E5] text-white rounded-lg hover:bg-[#4A93D4] transition-colors text-sm font-medium"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Adjust Strategy
        </button>
      </div>

      {/* ===== BANNER/HEADER ===== */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
        
        {/* TOP SECTION - Key Metrics */}
        <div className="bg-gradient-to-br from-[#5BA4E5] to-[#4A93D4] p-8 text-white">
          <div className="flex items-start justify-between mb-1">
            <h1 className="text-3xl font-bold">{result.location}</h1>
            <span
              className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold shrink-0 ml-3"
              style={{ backgroundColor: viabilityBadge.bgColor, color: viabilityBadge.color }}
            >
              {viabilityBadge.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(i => {
                if (starRating >= i) {
                  return <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
                } else if (starRating >= i - 0.5) {
                  return <svg key={i} className="w-4 h-4" viewBox="0 0 24 24"><defs><linearGradient id={`pstar-${i}`}><stop offset="50%" stopColor="#FACC15" /><stop offset="50%" stopColor="rgba(255,255,255,0.3)" /></linearGradient></defs><path fill={`url(#pstar-${i})`} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
                }
                return <svg key={i} className="w-4 h-4 text-white/30" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
              })}
            </div>
            <span className="text-white/70 text-sm font-semibold">{(result.numericScore ?? 0).toFixed(1)}/10</span>
            <span className="text-white/40 mx-1">|</span>
            <span className="text-white/80 text-sm">Your Financial Roadmap</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Time to Home Ownership - matches max home value timeline */}
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-white/70 text-sm mb-1">Time to Homeownership</p>
              <p className="text-2xl font-bold">
                {result.houseProjections.maxAffordable
                  ? pluralize(result.houseProjections.maxAffordable.year, 'year')
                  : result.yearsToMortgage > 0 ? pluralize(result.yearsToMortgage, 'year') : 'N/A'}
              </p>
              {result.houseProjections.maxAffordable ? (
                <p className="text-white/60 text-xs mt-1">At age {result.houseProjections.maxAffordable.age}</p>
              ) : result.ageMortgageAcquired > 0 ? (
                <p className="text-white/60 text-xs mt-1">At age {result.ageMortgageAcquired}</p>
              ) : null}
            </div>

            {/* Projected Home Value (max affordable) */}
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-white/70 text-sm mb-1">Projected Home Value</p>
              <p className="text-2xl font-bold">
                {result.houseProjections.maxAffordable
                  ? formatCurrency(result.houseProjections.maxAffordable.maxSustainableHousePrice)
                  : 'N/A'}
              </p>
              {result.houseProjections.maxAffordable && (
                <p className="text-white/60 text-xs mt-1">
                  In {pluralize(result.houseProjections.maxAffordable.year, 'year')}{result.houseProjections.maxAffordable.age > 0 ? ` (age ${result.houseProjections.maxAffordable.age})` : ''}
                </p>
              )}
            </div>

            {/* Required Home Value (kids-based sqft) */}
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-white/70 text-sm mb-1">Required Home Value</p>
              <p className="text-2xl font-bold">
                {formatCurrency(result.requiredHousePrice || getTypicalHomeValue(result.location) || locationData.housing.medianHomeValue)}
              </p>
              <p className="text-white/60 text-xs mt-1">{result.baselineSqFtLabel || '2,200 sqft home'}</p>
            </div>

            {/* Time to Debt Free */}
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-white/70 text-sm mb-1">Time to Debt-Free</p>
              <p className="text-2xl font-bold">
                {result.yearsToDebtFree > 0 ? pluralize(result.yearsToDebtFree, 'year') : 'No debt'}
              </p>
              {result.ageDebtFree > 0 && (
                <p className="text-white/60 text-xs mt-1">At age {result.ageDebtFree}</p>
              )}
            </div>

            {/* Minimum % Saved */}
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-white/70 text-sm mb-1">Minimum Allocation</p>
              <p className="text-2xl font-bold">{result.minimumAllocationRequired}%</p>
              <p className="text-white/60 text-xs mt-1">of discretionary income</p>
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

              {/* Your Inputs — formula inputs for testing */}
              {onboardingProfile && (
                <div className="bg-[#F8FAFB] border border-[#E5E7EB] rounded-lg p-4">
                  <h3 className="font-semibold text-[#2C3E50] mb-3">Your Inputs</h3>
                  <ul className="space-y-1.5 text-sm text-[#6B7280]">
                    <li className="flex items-start gap-2">
                      <span className="text-[#5BA4E5] mt-0.5">•</span>
                      <span>Occupation: <strong className="text-[#2C3E50]">{onboardingProfile.userOccupation}</strong></span>
                    </li>
                    {(onboardingProfile.userSalary ?? 0) > 0 && (
                      <li className="flex items-start gap-2">
                        <span className="text-[#5BA4E5] mt-0.5">•</span>
                        <span>Your salary override: <strong className="text-[#2C3E50]">${(onboardingProfile.userSalary ?? 0).toLocaleString()}/yr</strong></span>
                      </li>
                    )}
                    {onboardingProfile.partnerOccupation && (
                      <li className="flex items-start gap-2">
                        <span className="text-[#5BA4E5] mt-0.5">•</span>
                        <span>Partner occupation: <strong className="text-[#2C3E50]">{onboardingProfile.partnerOccupation}</strong></span>
                      </li>
                    )}
                    {onboardingProfile.usePartnerIncomeDoubling && (
                      <li className="flex items-start gap-2">
                        <span className="text-[#5BA4E5] mt-0.5">•</span>
                        <span>Partner income: <strong className="text-[#2C3E50]">Doubling rule applied</strong></span>
                      </li>
                    )}
                    <li className="flex items-start gap-2">
                      <span className="text-[#5BA4E5] mt-0.5">•</span>
                      <span>Age: <strong className="text-[#2C3E50]">{onboardingProfile.currentAge}</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#5BA4E5] mt-0.5">•</span>
                      <span>Down payment: <strong className="text-[#2C3E50]">{((locationData.housing.downPaymentPercent || 0.107) * 100).toFixed(1)}%</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#5BA4E5] mt-0.5">•</span>
                      <span>Discretionary income allocation: <strong className="text-[#2C3E50]">{onboardingProfile.disposableIncomeAllocation}%</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#5BA4E5] mt-0.5">•</span>
                      <span>Current savings: <strong className="text-[#2C3E50]">${onboardingProfile.currentSavings.toLocaleString()}</strong></span>
                    </li>
                    {onboardingProfile.studentLoanDebt > 0 && (
                      <li className="flex items-start gap-2">
                        <span className="text-[#5BA4E5] mt-0.5">•</span>
                        <span>Student loans: <strong className="text-[#2C3E50]">${onboardingProfile.studentLoanDebt.toLocaleString()} @ {onboardingProfile.studentLoanRate}%</strong></span>
                      </li>
                    )}
                    {onboardingProfile.creditCardDebt > 0 && (
                      <li className="flex items-start gap-2">
                        <span className="text-[#5BA4E5] mt-0.5">•</span>
                        <span>Credit card debt: <strong className="text-[#2C3E50]">${onboardingProfile.creditCardDebt.toLocaleString()} @ {onboardingProfile.creditCardAPR}%</strong></span>
                      </li>
                    )}
                    {onboardingProfile.carDebt > 0 && (
                      <li className="flex items-start gap-2">
                        <span className="text-[#5BA4E5] mt-0.5">•</span>
                        <span>Car debt: <strong className="text-[#2C3E50]">${onboardingProfile.carDebt.toLocaleString()} @ {onboardingProfile.carDebtRate}%</strong></span>
                      </li>
                    )}
                    {onboardingProfile.otherDebt > 0 && (
                      <li className="flex items-start gap-2">
                        <span className="text-[#5BA4E5] mt-0.5">•</span>
                        <span>Other debt: <strong className="text-[#2C3E50]">${onboardingProfile.otherDebt.toLocaleString()} @ {onboardingProfile.otherDebtRate}%</strong></span>
                      </li>
                    )}
                    <li className="flex items-start gap-2">
                      <span className="text-[#5BA4E5] mt-0.5">•</span>
                      <span>Planned kids: <strong className="text-[#2C3E50]">{onboardingProfile.numKids}</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#5BA4E5] mt-0.5">•</span>
                      <span>Household: <strong className="text-[#2C3E50]">{onboardingProfile.householdType} ({onboardingProfile.numEarners} earner{onboardingProfile.numEarners !== 1 ? 's' : ''})</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#5BA4E5] mt-0.5">•</span>
                      <span>Required sqft: <strong className="text-[#2C3E50]">{result.requiredSqFt.toLocaleString()}</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#5BA4E5] mt-0.5">•</span>
                      <span>Minimum allocation required: <strong className="text-[#2C3E50]">{result.minimumAllocationRequired}%</strong></span>
                    </li>
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
              {/* Typical Salary - Use ACTUAL household income */}
              <div className="bg-white rounded-lg p-4 border border-[#E5E7EB]">
                <p className="text-sm text-[#6B7280] mb-1">
                  Total Household Income
                </p>
                <p className="text-2xl font-bold text-[#2C3E50]">
                  ${result.yearByYear[0]?.totalIncome.toLocaleString()}/year
                </p>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  {result.yearByYear[0]?.householdType.includes('2e') 
                    ? `2 earners: $${result.yearByYear[0]?.userIncome.toLocaleString()} + $${result.yearByYear[0]?.partnerIncome.toLocaleString()}`
                    : `1 earner: $${result.yearByYear[0]?.userIncome.toLocaleString()}`
                  }
                </p>
              </div>

              {/* Cost of Living - Use ACTUAL household COL */}
              <div className="bg-white rounded-lg p-4 border border-[#E5E7EB]">
                <p className="text-sm text-[#6B7280] mb-1">
                  Cost of Living (Excluding Housing)
                </p>
                <p className="text-2xl font-bold text-[#2C3E50]">
                  ${result.yearByYear[0]?.adjustedCOL.toLocaleString()}/year
                </p>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  ${(result.yearByYear[0]?.adjustedCOL / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/month
                  {' '}({result.yearByYear[0]?.householdType.includes('family') ? 'with kids' : 
                      result.yearByYear[0]?.householdType.includes('couple') ? 'couple' : 'single'})
                </p>
              </div>

              {/* Housing Cost - Use ACTUAL housing from simulation */}
              <div className="bg-white rounded-lg p-4 border border-[#E5E7EB]">
                <p className="text-sm text-[#6B7280] mb-1">
                  {result.yearByYear[0]?.hasMortgage ? 'Mortgage Payment' : 'Rent Cost'}
                </p>
                <p className="text-2xl font-bold text-[#2C3E50]">
                  ${result.yearByYear[0]?.housingCost.toLocaleString()}/year
                </p>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  ${(result.yearByYear[0]?.housingCost / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/month
                  {result.yearByYear[0]?.hasMortgage && ' (30-year mortgage)'}
                </p>
              </div>

              {/* Total Cost of Living */}
              <div className="bg-white rounded-lg p-4 border border-[#E5E7EB]">
                <p className="text-sm text-[#6B7280] mb-1">
                  Total Cost of Living
                </p>
                <p className="text-2xl font-bold text-[#2C3E50]">
                  ${result.yearByYear[0]?.totalCOL.toLocaleString()}/year
                </p>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  ${(result.yearByYear[0]?.totalCOL / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/month (housing + living expenses)
                </p>
              </div>
            </div>

            {/* Right Column - Rent Reference Costs */}
            <div>
              <div className="bg-white rounded-lg p-6 border border-[#E5E7EB]">
                <h3 className="font-semibold text-[#2C3E50] mb-2">Typical Rent Costs in {result.location}</h3>
                <p className="text-xs text-[#9CA3AF] mb-4">For reference (your actual cost is shown on left)</p>
                
                <div className="space-y-4">
                  {/* 1 Bedroom */}
                  <div className="flex justify-between items-center pb-3 border-b border-[#E5E7EB]">
                    <div>
                      <p className="font-medium text-[#2C3E50]">1 Bedroom</p>
                      <p className="text-xs text-[#9CA3AF]">~{locationData.rent.oneBedroomSqFt.toLocaleString()} sq ft</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#5BA4E5]">
                        ${locationData.rent.oneBedroomAnnual.toLocaleString()}/year
                      </p>
                      <p className="text-xs text-[#9CA3AF]">
                        ${Math.round(locationData.rent.oneBedroomAnnual / 12).toLocaleString()}/month
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
                        ${locationData.rent.twoBedroomAnnual.toLocaleString()}/year
                      </p>
                      <p className="text-xs text-[#9CA3AF]">
                        ${Math.round(locationData.rent.twoBedroomAnnual / 12).toLocaleString()}/month
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
                        ${locationData.rent.threeBedroomAnnual.toLocaleString()}/year
                      </p>
                      <p className="text-xs text-[#9CA3AF]">
                        ${Math.round(locationData.rent.threeBedroomAnnual / 12).toLocaleString()}/month
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MAX AFFORDABLE HOME - Standalone section */}
        {result.houseProjections.maxAffordable && (
          <div className="px-8 py-6 bg-white border-t border-[#E5E7EB]">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-[#2C3E50] mb-1">Your Max Affordable Home</h2>
              <p className="text-[#6B7280] text-sm">The most expensive home you can sustainably afford based on your income ceiling</p>
            </div>
            <div className="relative">
              <div className="absolute -top-3 left-4 z-10">
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                  INCOME CEILING
                </span>
              </div>
              <HouseProjectionCard
                title="Max Affordable (Sustainability Cap)"
                projection={result.houseProjections.maxAffordable}
                location={result.location}
                showHomes={showMaxHomes}
                onToggle={() => setShowMaxHomes(!showMaxHomes)}
              />
            </div>
          </div>
        )}

        {/* FAMILY PLANNING SECTION - Vertical Timeline (only when user plans kids) */}
        {result.kidViability && result.kidViability.firstKid.reason !== 'User does not plan to have kids' && (() => {
          const currentAge = result.yearByYear[0]?.age ?? 0;
          const currentYear = new Date().getFullYear();
          const kv = result.kidViability;

          const kids = [
            { key: 'first', label: '1st Child', viability: kv.firstKid, color: 'purple' as const, dotSize: 'w-6 h-6', ageText: 'text-4xl', padding: 'p-5' },
            { key: 'second', label: '2nd Child', viability: kv.secondKid, color: 'blue' as const, dotSize: 'w-5 h-5', ageText: 'text-3xl', padding: 'p-4' },
            { key: 'third', label: '3rd Child', viability: kv.thirdKid, color: 'indigo' as const, dotSize: 'w-4 h-4', ageText: 'text-3xl', padding: 'p-4' },
          ];
          const allAlreadyHave = kids.every(k => k.viability.reason === 'already-have');
          const firstCalculatedKid = kids.find(k => k.viability.reason !== 'already-have');
          const hasAnyViableOrExisting = kids.some(k => k.viability.isViable);

          const colorMap = {
            purple: { dot: 'bg-purple-500', bg: 'from-purple-50 to-white', border: 'border-purple-200', label: 'text-purple-600', age: 'text-purple-900', text: 'text-purple-700', chipBorder: 'border-purple-100' },
            blue: { dot: 'bg-blue-500', bg: 'from-blue-50 to-white', border: 'border-blue-200', label: 'text-blue-600', age: 'text-blue-900', text: 'text-blue-700', chipBorder: 'border-blue-100' },
            indigo: { dot: 'bg-indigo-500', bg: 'from-indigo-50 to-white', border: 'border-indigo-200', label: 'text-indigo-600', age: 'text-indigo-900', text: 'text-indigo-700', chipBorder: 'border-indigo-100' },
          };

          return (
            <div className="px-8 py-6 bg-white border-t border-[#E5E7EB]">
              {/* Section Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Minimum Viable Age for Kids</h3>
                  <p className="text-sm text-gray-600">When you can afford each child while staying on track</p>
                </div>
              </div>

              {allAlreadyHave ? (
                /* All 3 kids already exist */
                <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-green-800">
                      You already have 3+ children &mdash; family costs are factored into your financial projections.
                    </p>
                  </div>
                </div>
              ) : !hasAnyViableOrExisting ? (
                /* None viable at all - enhanced warning */
                <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">Family Planning Not Currently Viable</h4>
                      <p className="text-sm text-gray-700 mb-4">
                        {kv.firstKid.reason ||
                          `Based on current projections, having children in ${result.location} would make homeownership significantly more difficult.`}
                      </p>
                      <div className="bg-white rounded-lg p-3 border border-amber-100">
                        <p className="text-xs font-medium text-gray-600 mb-2">What we checked</p>
                        <ul className="space-y-1 text-xs text-gray-500">
                          <li className="flex items-center gap-2">
                            <span className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0" />
                            Positive discretionary income for 3 years after birth
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0" />
                            Debt not growing during that period
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0" />
                            Savings above $5,000 safety net
                          </li>
                        </ul>
                        <p className="text-xs text-gray-400 mt-2">
                          Tested every year from now through age {currentAge + 25}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Timeline layout - mix of already-have, viable, and not-viable */
                <div className="relative pl-8">
                  {/* Vertical spine */}
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-300 via-blue-300 to-indigo-300" />

                  <div className="space-y-5">
                    {kids.map((kid, idx) => {
                      const v = kid.viability;
                      const prevKid = idx > 0 ? kids[idx - 1] : null;
                      const c = colorMap[kid.color];

                      // Gap indicator: only between two calculated (non-already-have) viable kids
                      const gap = (v.minimumAge && v.reason !== 'already-have' && prevKid?.viability.minimumAge && prevKid.viability.reason !== 'already-have')
                        ? v.minimumAge - prevKid.viability.minimumAge
                        : null;

                      // Already-have state
                      if (v.reason === 'already-have') {
                        return (
                          <div key={kid.key} className="relative">
                            <div className={`absolute -left-8 top-3 ${kid.dotSize} bg-green-500 rounded-full border-4 border-white shadow-sm z-10`} />
                            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-xs font-semibold uppercase tracking-wider text-green-700">{kid.label}</span>
                                <span className="text-xs text-green-600 ml-auto">Already here</span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Not-viable state
                      if (!v.isViable) {
                        return (
                          <div key={kid.key} className="relative">
                            <div className={`absolute -left-8 top-3 ${kid.dotSize} bg-white rounded-full border-2 border-gray-300 z-10`} />
                            <div className="bg-gray-50 rounded-xl p-4 border border-dashed border-gray-300">
                              <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                  <p className="text-sm font-medium text-gray-500 mb-1">{kid.label} &mdash; Not currently viable</p>
                                  <p className="text-xs text-gray-400">
                                    {v.reason || 'Could not find a financially sustainable age within the projection window'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Viable state - full card
                      const kidAge = v.minimumAge!;
                      const yearsFromNow = kidAge - currentAge;
                      const calendarYear = currentYear + yearsFromNow;
                      const isFirstCalculated = !prevKid || prevKid.viability.reason === 'already-have';

                      return (
                        <div key={kid.key} className="relative">
                          <div className={`absolute -left-8 top-4 ${kid.dotSize} ${c.dot} rounded-full border-4 border-white shadow-sm z-10`} />

                          {gap !== null && gap > 0 && (
                            <div className="mb-2 flex items-center gap-2 text-xs text-gray-400">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{pluralize(gap, 'year')} gap from previous child</span>
                            </div>
                          )}

                          <div className={`bg-gradient-to-br ${c.bg} rounded-xl ${kid.padding} border ${c.border} shadow-sm`}>
                            <div className="flex items-center justify-between mb-3">
                              <span className={`text-xs font-semibold uppercase tracking-wider ${c.label}`}>{kid.label}</span>
                              {(idx === 0 || isFirstCalculated) && (
                                <span className={`text-xs font-medium bg-white ${c.label} px-2.5 py-0.5 rounded-full border ${c.chipBorder}`}>
                                  Earliest viable
                                </span>
                              )}
                            </div>

                            <div className="flex items-baseline gap-3 mb-4">
                              <span className={`${kid.ageText} font-bold ${c.age}`}>{kidAge}</span>
                              <span className={`text-sm ${c.text}`}>years old</span>
                              <span className={`text-sm ${c.label} ml-auto`}>
                                {yearsFromNow <= 0 ? 'Now' : `In ${pluralize(yearsFromNow, 'year')}`}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <div className={`flex items-center gap-1.5 bg-white rounded-lg px-3 py-1.5 border ${c.chipBorder} text-xs`}>
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-gray-600">{calendarYear}</span>
                              </div>

                              {result.ageMortgageAcquired > 0 && result.ageMortgageAcquired <= kidAge && (
                                <div className="flex items-center gap-1.5 bg-white rounded-lg px-3 py-1.5 border border-green-100 text-xs">
                                  <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                  </svg>
                                  <span className="text-green-700">Homeowner by then</span>
                                </div>
                              )}
                              {result.ageMortgageAcquired > 0 && result.ageMortgageAcquired > kidAge && (
                                <div className="flex items-center gap-1.5 bg-white rounded-lg px-3 py-1.5 border border-amber-100 text-xs">
                                  <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                  </svg>
                                  <span className="text-amber-700">{pluralize(result.ageMortgageAcquired - kidAge, 'year')} before homeownership</span>
                                </div>
                              )}

                              {result.ageDebtFree > 0 && result.ageDebtFree <= kidAge && (
                                <div className="flex items-center gap-1.5 bg-white rounded-lg px-3 py-1.5 border border-green-100 text-xs">
                                  <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-green-700">Debt-free by then</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* BOTTOM SECTION - Three House Projections */}
        <div className="px-8 py-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#2C3E50] mb-2">Your Homeownership Projections</h2>
            <p className="text-[#6B7280] text-sm">Three ways to look at your path to owning a home</p>
          </div>

          <div className="space-y-4">
            {/* === SLIDER 1: MAX HOME VALUE === */}
            {result.houseProjections.maxAffordable && (
              <HouseProjectionCard
                title="Max Home Value"
                subtitle="The most expensive home you can sustainably afford"
                projection={result.houseProjections.maxAffordable}
                location={result.location}
                showHomes={showMaxHomes}
                onToggle={() => setShowMaxHomes(!showMaxHomes)}
              />
            )}

            {/* === SLIDER 2: FASTEST TO HOMEOWNERSHIP === */}
            {(() => {
              const fastSqFt = result.fastestHomeSqFt || 1600;
              const fastProj = result.fastestHomeProjection || null;
              const reqSqFt = result.requiredSqFt || 1500;
              const kidLabel = reqSqFt <= 1500 ? 'no kids planned'
                : reqSqFt <= 1800 ? 'kids planned'
                : 'multiple kids planned';

              return (
                <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
                  <div className="px-6 py-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-[#2C3E50] text-lg">Fastest to Homeownership</h3>
                        <p className="text-[#6B7280] text-sm">
                          Fastest path to a {fastSqFt.toLocaleString()} sqft home ({kidLabel})
                        </p>
                      </div>
                      {fastProj && (
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                          {pluralize(fastProj.year, 'year')}
                        </span>
                      )}
                    </div>

                    {fastProj ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div className="bg-[#F0F9FF] rounded-lg p-3">
                          <p className="text-[#6B7280] text-xs mb-1">House Price</p>
                          <p className="text-[#2C3E50] font-bold">${fastProj.maxSustainableHousePrice.toLocaleString()}</p>
                        </div>
                        <div className="bg-[#F0F9FF] rounded-lg p-3">
                          <p className="text-[#6B7280] text-xs mb-1">Down Payment</p>
                          <p className="text-[#2C3E50] font-bold">${fastProj.downPaymentRequired.toLocaleString()}</p>
                        </div>
                        <div className="bg-[#F0F9FF] rounded-lg p-3">
                          <p className="text-[#6B7280] text-xs mb-1">Annual Cost</p>
                          <p className="text-[#2C3E50] font-bold">${fastProj.sustainableAnnualPayment.toLocaleString()}/yr</p>
                        </div>
                        <div className="bg-[#F0F9FF] rounded-lg p-3">
                          <p className="text-[#6B7280] text-xs mb-1">Your Age</p>
                          <p className="text-[#2C3E50] font-bold">{fastProj.age}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                        <p className="text-amber-800 text-sm">
                          A {fastSqFt.toLocaleString()} sqft home is not reachable within the simulation period.
                          {result.houseProjections.maxAffordable && (
                            <span> Your max affordable home is ${result.houseProjections.maxAffordable.maxSustainableHousePrice.toLocaleString()}.</span>
                          )}
                        </p>
                      </div>
                    )}

                    {fastProj && (
                      <button
                        onClick={() => setShowFastestHomes(!showFastestHomes)}
                        className="mt-3 text-sm text-[#5BA4E5] hover:text-[#3B82F6] font-medium flex items-center gap-1"
                      >
                        {showFastestHomes ? 'Hide' : 'Browse'} homes
                        <svg className={`w-4 h-4 transition-transform ${showFastestHomes ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* === SLIDER 3: CUSTOM SEARCH === */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
              <div className="px-6 py-5">
                <div className="mb-3">
                  <h3 className="font-bold text-[#2C3E50] text-lg">Search by Time</h3>
                  <p className="text-[#6B7280] text-sm">
                    How big of a house can you get when saving for a certain amount of time?
                  </p>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="number"
                      min="1"
                      max={customSearchUnit === 'years' ? 30 : 360}
                      value={customSearchValue}
                      onChange={(e) => {
                        setCustomSearchValue(e.target.value);
                        setCustomSearchProjection(null);
                        setCustomSearchAttempted(false);
                      }}
                      placeholder={customSearchUnit === 'years' ? 'e.g. 7' : 'e.g. 84'}
                      className="w-24 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5BA4E5] focus:border-transparent"
                    />
                    <div className="flex bg-[#F3F4F6] rounded-lg p-0.5">
                      <button
                        onClick={() => { setCustomSearchUnit('years'); setCustomSearchProjection(null); setCustomSearchAttempted(false); }}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          customSearchUnit === 'years'
                            ? 'bg-white text-[#2C3E50] shadow-sm'
                            : 'text-[#6B7280] hover:text-[#2C3E50]'
                        }`}
                      >
                        Years
                      </button>
                      <button
                        onClick={() => { setCustomSearchUnit('months'); setCustomSearchProjection(null); setCustomSearchAttempted(false); }}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          customSearchUnit === 'months'
                            ? 'bg-white text-[#2C3E50] shadow-sm'
                            : 'text-[#6B7280] hover:text-[#2C3E50]'
                        }`}
                      >
                        Months
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        const val = parseFloat(customSearchValue);
                        if (!val || val <= 0) return;
                        if (!onboardingProfile || result.yearByYear.length === 0) {
                          setCustomSearchAttempted(true);
                          setCustomSearchProjection(null);
                          return;
                        }
                        const yearTarget = customSearchUnit === 'months' ? val / 12 : val;
                        const proj = calculateProjectionForYear(
                          yearTarget,
                          onboardingProfile,
                          result.locationData,
                          result.yearByYear
                        );
                        setCustomSearchAttempted(true);
                        setCustomSearchProjection(proj);
                      }}
                      className="px-4 py-2 bg-[#5BA4E5] text-white rounded-lg text-sm font-medium hover:bg-[#3B82F6] transition-colors"
                    >
                      Search
                    </button>
                  </div>
                </div>

                {customSearchProjection && (() => {
                  const proj = customSearchProjection;
                  const pricePerSqft = result.requiredHousePrice > 0 && result.requiredSqFt > 0
                    ? result.requiredHousePrice / result.requiredSqFt
                    : 0;
                  const affordableSqFt = pricePerSqft > 0
                    ? Math.round(proj.maxSustainableHousePrice / pricePerSqft)
                    : 0;

                  return (
                    <div className="mt-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-[#F0F9FF] rounded-lg p-3">
                          <p className="text-[#6B7280] text-xs mb-1">Max Home Value</p>
                          <p className="text-[#2C3E50] font-bold">${proj.maxSustainableHousePrice.toLocaleString()}</p>
                        </div>
                        {affordableSqFt > 0 && (
                          <div className="bg-[#F0F9FF] rounded-lg p-3">
                            <p className="text-[#6B7280] text-xs mb-1">Approx. Size</p>
                            <p className="text-[#2C3E50] font-bold">{affordableSqFt.toLocaleString()} sqft</p>
                          </div>
                        )}
                        <div className="bg-[#F0F9FF] rounded-lg p-3">
                          <p className="text-[#6B7280] text-xs mb-1">Down Payment</p>
                          <p className="text-[#2C3E50] font-bold">${proj.downPaymentRequired.toLocaleString()}</p>
                        </div>
                        <div className="bg-[#F0F9FF] rounded-lg p-3">
                          <p className="text-[#6B7280] text-xs mb-1">Savings at {customSearchUnit === 'months' ? `${customSearchValue} mo` : `yr ${customSearchValue}`}</p>
                          <p className="text-[#2C3E50] font-bold">${proj.totalSavings.toLocaleString()}</p>
                        </div>
                      </div>
                      {proj.sustainabilityLimited && (
                        <p className="text-amber-700 text-xs mt-2">
                          Limited by your income, not savings. Even with more time saving, the max sustainable house stays around ${proj.maxSustainableHousePrice.toLocaleString()}.
                        </p>
                      )}
                      <button
                        onClick={() => setShowCustomHomes(!showCustomHomes)}
                        className="mt-3 text-sm text-[#5BA4E5] hover:text-[#3B82F6] font-medium flex items-center gap-1"
                      >
                        {showCustomHomes ? 'Hide' : 'Browse'} homes
                        <svg className={`w-4 h-4 transition-transform ${showCustomHomes ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  );
                })()}

                {customSearchValue && !customSearchProjection && !customSearchAttempted && (
                  <p className="text-[#6B7280] text-xs mt-3">
                    Press &quot;Search&quot; to see what you can afford after {customSearchValue} {customSearchUnit}.
                  </p>
                )}
                {customSearchAttempted && !customSearchProjection && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                    <p className="text-amber-800 text-sm">
                      {result.yearByYear.length === 0
                        ? 'No simulation data available. Try recalculating from My Locations.'
                        : `No projection available for ${customSearchValue} ${customSearchUnit}. The simulation only covers ${result.yearByYear.length} years — try a shorter timeframe.`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* === SHOW YOUR WORK === */}
          <div className="mt-8 space-y-4">
            <h2 className="text-xl font-bold text-[#2C3E50] mb-2">Show Your Work</h2>

            {/* Key Assumptions / Bullet Points */}
            <div className="bg-[#F8FAFB] border border-[#E5E7EB] rounded-xl p-5">
              <h3 className="font-semibold text-[#2C3E50] mb-3">How We Calculated This</h3>
              <ul className="space-y-2 text-sm text-[#4B5563]">
                {result.assumptions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#5BA4E5] mt-0.5">&#8226;</span>
                    <span>{a}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2">
                  <span className="text-[#5BA4E5] mt-0.5">&#8226;</span>
                  <span>Savings grow at 3% annually on existing balance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#5BA4E5] mt-0.5">&#8226;</span>
                  <span>Payment priority: Credit card debt &rarr; Student loans &rarr; Savings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#5BA4E5] mt-0.5">&#8226;</span>
                  <span>Mortgage threshold: Down payment ({((result.locationData.housing.downPaymentPercent || 0.107) * 100).toFixed(1)}%) + first year payment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#5BA4E5] mt-0.5">&#8226;</span>
                  <span>Sustainability cap: Max house where annual cost &le; allocated portion of worst-case disposable income</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#5BA4E5] mt-0.5">&#8226;</span>
                  <span>Allocation: {onboardingProfile?.disposableIncomeAllocation ?? 75}% of disposable income directed toward financial goals</span>
                </li>
              </ul>
            </div>

            {/* Table 1: Projected Necessary Size */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
              <button
                onClick={() => setShowNecessarySizeWork(!showNecessarySizeWork)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#F8FAFB] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#5BA4E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="font-semibold text-[#2C3E50]">Projected Necessary Home Size</span>
                </div>
                <svg
                  className={`w-5 h-5 text-[#6B7280] transition-transform ${showNecessarySizeWork ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showNecessarySizeWork && (
                <div className="border-t border-[#E5E7EB]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#F8FAFB] border-b border-[#E5E7EB]">
                          <th className="px-4 py-3 text-left font-semibold text-[#2C3E50]">Metric</th>
                          <th className="px-4 py-3 text-right font-semibold text-[#2C3E50]">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-[#F3F4F6]">
                          <td className="px-4 py-3 text-[#4B5563]">Required Home Size (based on family plan)</td>
                          <td className="px-4 py-3 text-right font-medium text-[#2C3E50]">{result.requiredSqFt.toLocaleString()} sqft</td>
                        </tr>
                        <tr className="border-b border-[#F3F4F6] bg-[#FAFBFC]">
                          <td className="px-4 py-3 text-[#4B5563]">Location Price per Sqft</td>
                          <td className="px-4 py-3 text-right font-medium text-[#2C3E50]">
                            ${result.requiredSqFt > 0 ? Math.round(result.requiredHousePrice / result.requiredSqFt).toLocaleString() : '\u2014'}/sqft
                          </td>
                        </tr>
                        <tr className="border-b border-[#F3F4F6]">
                          <td className="px-4 py-3 text-[#4B5563]">Required Home Price</td>
                          <td className="px-4 py-3 text-right font-medium text-[#2C3E50]">${result.requiredHousePrice.toLocaleString()}</td>
                        </tr>
                        <tr className="border-b border-[#F3F4F6] bg-[#FAFBFC]">
                          <td className="px-4 py-3 text-[#4B5563]">Projected Affordable Size</td>
                          <td className="px-4 py-3 text-right font-medium text-[#2C3E50]">{result.projectedSqFt.toLocaleString()} sqft</td>
                        </tr>
                        <tr className="border-b border-[#F3F4F6]">
                          <td className="px-4 py-3 text-[#4B5563]">Meets Family Need?</td>
                          <td className={`px-4 py-3 text-right font-bold ${result.sqFtViable ? 'text-green-600' : 'text-red-600'}`}>
                            {result.sqFtViable ? 'Yes' : 'No'}
                            {!result.sqFtViable && result.projectedSqFt > 0 && (
                              <span className="text-xs font-normal text-[#6B7280] ml-2">
                                ({(result.requiredSqFt - result.projectedSqFt).toLocaleString()} sqft short)
                              </span>
                            )}
                          </td>
                        </tr>
                        <tr className="bg-[#FAFBFC]">
                          <td className="px-4 py-3 text-[#4B5563]">Fastest Path Target</td>
                          <td className="px-4 py-3 text-right font-medium text-[#2C3E50]">{result.fastestHomeSqFt.toLocaleString()} sqft</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Table 2: Max Home Value Timeline & Savings */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
              <button
                onClick={() => setShowMaxValueWork(!showMaxValueWork)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#F8FAFB] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#5BA4E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold text-[#2C3E50]">Max Home Value Timeline &amp; Savings</span>
                </div>
                <svg
                  className={`w-5 h-5 text-[#6B7280] transition-transform ${showMaxValueWork ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showMaxValueWork && (
                <div className="border-t border-[#E5E7EB]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#F8FAFB] border-b border-[#E5E7EB]">
                          <th className="px-4 py-3 text-left font-semibold text-[#2C3E50]">Metric</th>
                          <th className="px-4 py-3 text-right font-semibold text-[#2C3E50]">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.houseProjections.maxAffordable && (
                          <>
                            <tr className="border-b border-[#F3F4F6]">
                              <td className="px-4 py-3 text-[#4B5563]">Max Sustainable Home Price</td>
                              <td className="px-4 py-3 text-right font-bold text-[#2C3E50]">
                                ${result.houseProjections.maxAffordable.maxSustainableHousePrice.toLocaleString()}
                              </td>
                            </tr>
                            <tr className="border-b border-[#F3F4F6] bg-[#FAFBFC]">
                              <td className="px-4 py-3 text-[#4B5563]">Year Achieved</td>
                              <td className="px-4 py-3 text-right font-medium text-[#2C3E50]">
                                Year {result.houseProjections.maxAffordable.year} (age {result.houseProjections.maxAffordable.age})
                              </td>
                            </tr>
                            <tr className="border-b border-[#F3F4F6]">
                              <td className="px-4 py-3 text-[#4B5563]">Savings at That Point</td>
                              <td className="px-4 py-3 text-right font-medium text-[#2C3E50]">
                                ${result.houseProjections.maxAffordable.totalSavings.toLocaleString()}
                              </td>
                            </tr>
                            <tr className="border-b border-[#F3F4F6] bg-[#FAFBFC]">
                              <td className="px-4 py-3 text-[#4B5563]">Down Payment Required</td>
                              <td className="px-4 py-3 text-right font-medium text-[#2C3E50]">
                                ${result.houseProjections.maxAffordable.downPaymentRequired.toLocaleString()}
                              </td>
                            </tr>
                            <tr className="border-b border-[#F3F4F6]">
                              <td className="px-4 py-3 text-[#4B5563]">Annual Mortgage + Tax + Insurance</td>
                              <td className="px-4 py-3 text-right font-medium text-[#2C3E50]">
                                ${result.houseProjections.maxAffordable.sustainableAnnualPayment.toLocaleString()}/yr
                              </td>
                            </tr>
                            <tr className="border-b border-[#F3F4F6] bg-[#FAFBFC]">
                              <td className="px-4 py-3 text-[#4B5563]">Post-Mortgage Disposable Income</td>
                              <td className={`px-4 py-3 text-right font-medium ${
                                result.houseProjections.maxAffordable.postMortgageDisposableIncome >= 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}>
                                ${result.houseProjections.maxAffordable.postMortgageDisposableIncome.toLocaleString()}/yr
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 text-[#4B5563]">Limited By</td>
                              <td className="px-4 py-3 text-right font-medium text-[#2C3E50]">
                                {result.houseProjections.maxAffordable.sustainabilityLimited
                                  ? 'Income (annual cost cap)'
                                  : 'Savings (need more time)'}
                              </td>
                            </tr>
                          </>
                        )}
                        {!result.houseProjections.maxAffordable && (
                          <tr>
                            <td colSpan={2} className="px-4 py-6 text-center text-[#6B7280]">
                              No affordable home projection available for this location.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Savings milestones at key years */}
                  {result.yearByYear.length > 0 && (
                    <div className="px-6 py-4 bg-[#F8FAFB] border-t border-[#E5E7EB]">
                      <h4 className="font-semibold text-[#2C3E50] text-sm mb-3">Savings Milestones</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[3, 5, 10, 15].map(yr => {
                          const snap = result.yearByYear.find(s => s.year === yr);
                          if (!snap) return null;
                          return (
                            <div key={yr} className="bg-white rounded-lg border border-[#E5E7EB] p-3 text-center">
                              <p className="text-xs text-[#6B7280]">Year {yr} (age {snap.age})</p>
                              <p className="font-bold text-[#2C3E50] text-sm mt-1">${Math.round(snap.savingsNoMortgage).toLocaleString()}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Non-Viable Fallback: Show largest possible home with buffer */}
            {!result.isViable && result.houseProjections.maxAffordable && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <h3 className="font-semibold text-red-800 mb-2">Your Situation Is Currently Not Viable</h3>
                <p className="text-red-700 text-sm mb-4">
                  Your cost of living exceeds your estimated salary in this location, meaning you would be losing money.
                  {onboardingProfile?.kidsPlan === 'unsure' && (
                    <span> This accounts for the possibility of having 1 child.</span>
                  )}
                </p>
                <div className="bg-white rounded-lg border border-red-200 p-4">
                  <h4 className="font-semibold text-[#2C3E50] text-sm mb-2">Largest Possible Home (with buffer)</h4>
                  <p className="text-[#6B7280] text-xs mb-3">
                    If conditions improve, the most you could aim for with a safety buffer:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-[#6B7280]">Max Home Value</p>
                      <p className="font-bold text-[#2C3E50]">
                        ${Math.round(result.houseProjections.maxAffordable.maxSustainableHousePrice * 0.85).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-[#9CA3AF]">85% of max (15% buffer)</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6B7280]">Approx. Size</p>
                      <p className="font-bold text-[#2C3E50]">
                        {result.requiredSqFt > 0
                          ? `${Math.round((result.houseProjections.maxAffordable.maxSustainableHousePrice * 0.85) / (result.requiredHousePrice / result.requiredSqFt)).toLocaleString()} sqft`
                          : '\u2014'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6B7280]">Timeline</p>
                      <p className="font-bold text-[#2C3E50]">{pluralize(result.houseProjections.maxAffordable.year, 'year')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6B7280]">Required Savings</p>
                      <p className="font-bold text-[#2C3E50]">${result.houseProjections.maxAffordable.totalSavings.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Year-by-Year Breakdown */}
            {result.yearByYear.length > 0 && (
              <div>
                <button
                  onClick={() => setShowYearByYear(!showYearByYear)}
                  className="w-full flex items-center justify-between px-6 py-4 bg-white border border-[#E5E7EB] rounded-xl hover:bg-[#F8FAFB] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-[#5BA4E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="font-semibold text-[#2C3E50]">Full Year-by-Year Breakdown</span>
                  </div>
                  <svg
                    className={`w-5 h-5 text-[#6B7280] transition-transform ${showYearByYear ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showYearByYear && (
                  <div className="mt-3 bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
                    <div className="px-6 py-4 bg-[#F8FAFB] border-b border-[#E5E7EB]">
                      <p className="text-sm text-[#6B7280]">
                        Complete year-by-year simulation. &quot;No-Mtg Savings&quot; shows what you&apos;d have if you kept saving without buying.
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-[#F8FAFB] border-b border-[#E5E7EB]">
                            <th className="px-3 py-2 text-left font-semibold text-[#2C3E50] sticky left-0 bg-[#F8FAFB] z-10">Year</th>
                            <th className="px-3 py-2 text-left font-semibold text-[#2C3E50]">Age</th>
                            <th className="px-3 py-2 text-left font-semibold text-[#2C3E50]">Event</th>
                            <th className="px-3 py-2 text-right font-semibold text-[#2C3E50]">Income</th>
                            <th className="px-3 py-2 text-right font-semibold text-[#2C3E50]">Adj COL</th>
                            <th className="px-3 py-2 text-right font-semibold text-[#2C3E50]">Housing</th>
                            <th className="px-3 py-2 text-right font-semibold text-[#2C3E50]">DI</th>
                            <th className="px-3 py-2 text-right font-semibold text-[#2C3E50]">EDI</th>
                            <th className="px-3 py-2 text-right font-semibold text-[#2C3E50]">Loan Debt</th>
                            <th className="px-3 py-2 text-right font-semibold text-[#2C3E50]">CC Paid</th>
                            <th className="px-3 py-2 text-right font-semibold text-[#2C3E50]">Savings</th>
                            <th className="px-3 py-2 text-right font-semibold text-[#2C3E50]">No-Mtg Savings</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.yearByYear.map((snap, i) => {
                            const event = snap.mortgageAcquiredThisYear ? 'Mortgage' :
                              snap.kidBornThisYear > 0 ? `Kid #${snap.kidBornThisYear}` :
                              snap.relationshipStartedThisYear ? 'Relationship' :
                              (snap.loanDebtEnd === 0 && (i > 0 && result.yearByYear[i-1].loanDebtEnd > 0)) ? 'Debt-free' :
                              '';
                            const isHighlight = snap.year === 3 || snap.year === 5 || snap.year === 10 || snap.year === 15;
                            return (
                              <tr
                                key={snap.year}
                                className={`border-b border-[#F3F4F6] ${isHighlight ? 'bg-blue-50/50' : i % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]'} ${event ? 'font-medium' : ''}`}
                              >
                                <td className={`px-3 py-2 sticky left-0 z-10 ${isHighlight ? 'bg-blue-50/50' : i % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]'}`}>
                                  {snap.year}
                                </td>
                                <td className="px-3 py-2">{snap.age}</td>
                                <td className="px-3 py-2">
                                  {event && (
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      event === 'Mortgage' ? 'bg-green-100 text-green-700' :
                                      event.startsWith('Kid') ? 'bg-purple-100 text-purple-700' :
                                      event === 'Debt-free' ? 'bg-blue-100 text-blue-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {event}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">${snap.totalIncome.toLocaleString()}</td>
                                <td className="px-3 py-2 text-right">${snap.adjustedCOL.toLocaleString()}</td>
                                <td className="px-3 py-2 text-right">
                                  <span className={snap.hasMortgage ? 'text-green-600' : ''}>
                                    ${snap.housingCost.toLocaleString()}
                                  </span>
                                </td>
                                <td className={`px-3 py-2 text-right ${snap.disposableIncome < 0 ? 'text-red-600' : ''}`}>
                                  ${snap.disposableIncome.toLocaleString()}
                                </td>
                                <td className="px-3 py-2 text-right">${Math.round(snap.effectiveDisposableIncome).toLocaleString()}</td>
                                <td className={`px-3 py-2 text-right ${snap.loanDebtEnd > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                  ${Math.round(snap.loanDebtEnd).toLocaleString()}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {snap.ccDebtPayment > 0 ? `$${snap.ccDebtPayment.toLocaleString()}` : ''}
                                </td>
                                <td className="px-3 py-2 text-right font-medium">${Math.round(snap.savingsEnd).toLocaleString()}</td>
                                <td className="px-3 py-2 text-right text-[#5BA4E5] font-medium">${Math.round(snap.savingsNoMortgage).toLocaleString()}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Formula explanation */}
                    <div className="px-6 py-4 bg-[#F8FAFB] border-t border-[#E5E7EB] space-y-2">
                      <h4 className="font-semibold text-[#2C3E50] text-sm">How it works:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#6B7280]">
                        <div>
                          <p><strong>DI</strong> = Income - (Adj COL + Housing)</p>
                          <p><strong>EDI</strong> = DI x Allocation %</p>
                          <p><strong>Priority Stack:</strong> CC Debt &rarr; Student Loans &rarr; Savings</p>
                        </div>
                        <div>
                          <p><strong>Savings Growth:</strong> 3% annual on existing balance</p>
                          <p><strong>Mortgage Threshold:</strong> Down Payment + 1st Year Payment</p>
                          <p><strong>Sustainability Cap:</strong> Max house where annual cost &le; allocated worst-case DI</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* FAMILY PLANNING SECTION - "What if" for users who don't plan kids */}
        {result.kidViability && result.kidViability.firstKid.reason === 'User does not plan to have kids' && (() => {
          const currentAge = result.yearByYear[0]?.age ?? 0;
          const kv = result.kidViability;

          return (
            <div className="px-8 py-6 bg-white border-t border-[#E5E7EB]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">What If You Had Kids?</h3>
                  <p className="text-sm text-gray-500">You indicated no plans for children, but here&apos;s what it would look like</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Based on your finances in {result.location}, having a first child would be viable
                      {kv.firstKid.isViable && kv.firstKid.minimumAge
                        ? ` starting at age ${kv.firstKid.minimumAge} (in ${pluralize(Math.max(0, kv.firstKid.minimumAge - currentAge), 'year')}).`
                        : ' — but is not currently feasible within the projection window.'}
                    </p>
                    {kv.firstKid.isViable && (
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span>1st child: age {kv.firstKid.minimumAge}</span>
                        {kv.secondKid.isViable && <span>2nd child: age {kv.secondKid.minimumAge}</span>}
                        {kv.thirdKid.isViable && <span>3rd child: age {kv.thirdKid.minimumAge}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}

// ===== HOUSE PROJECTION CARD COMPONENT =====

interface HouseProjectionCardProps {
  title: string;
  subtitle?: string;
  projection: HouseProjection;
  location: string;
  showHomes: boolean;
  onToggle: () => void;
}

function HouseProjectionCard({ title, subtitle, projection, location, showHomes, onToggle }: HouseProjectionCardProps) {
  const pricePerSqft = getPricePerSqft(location);
  const estimatedSqFt = Math.round(projection.maxSustainableHousePrice / pricePerSqft);
  
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
      {/* Main Info */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-[#2C3E50] mb-1">{title}</h3>
            {subtitle && <p className="text-sm text-[#6B7280] mb-0.5">{subtitle}</p>}
            <p className="text-sm text-[#9CA3AF]">Age {projection.age}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[#6B7280] mb-1">Total Savings</p>
            <p className="text-xl font-bold text-[#5BA4E5]">
              {formatCurrency(projection.totalSavings)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Projected Price */}
          <div className="bg-[#EFF6FF] rounded-lg p-4">
            <p className="text-xs text-[#6B7280] mb-1">Max Sustainable Price</p>
            <p className="text-2xl font-bold text-[#2C3E50]">
              {formatCurrency(projection.maxSustainableHousePrice)}
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
            <p className="text-xs text-[#9CA3AF] mt-1">~${pricePerSqft}/sqft</p>
          </div>
        </div>

        {/* Additional Details */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-[#9CA3AF] text-xs">Down Payment</p>
            <p className="font-semibold text-[#2C3E50]">
              {formatCurrency(projection.sustainableDownPayment)}
            </p>
          </div>
          <div>
            <p className="text-[#9CA3AF] text-xs">Annual Payment</p>
            <p className="font-semibold text-[#2C3E50]">
              {formatCurrency(projection.sustainableAnnualPayment)}/yr
            </p>
          </div>
          <div>
            <p className="text-[#9CA3AF] text-xs">Post-Mortgage DI</p>
            <p className={`font-semibold ${projection.postMortgageDisposableIncome >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
              {formatCurrency(projection.postMortgageDisposableIncome)}/yr
            </p>
          </div>
        </div>

        {/* Affordability Status */}
        {!projection.canAfford && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              You&apos;ll need to save longer to afford the down payment
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
            <SimpleHomeCarousel
              location={location}
              targetPrice={projection.maxSustainableHousePrice}
              priceRange={50000}
            />
          </div>
        )}
      </div>
    </div>
  );
}
