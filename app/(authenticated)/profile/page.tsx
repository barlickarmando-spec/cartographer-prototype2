'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CalculationResult, HouseProjection, calculateAutoApproach } from '@/lib/calculation-engine';
import SimpleHomeCarousel from '@/components/SimpleHomeCarousel';
import { formatCurrency, pluralize } from '@/lib/utils';
import { normalizeOnboardingAnswers } from '@/lib/onboarding/normalize';
import { getOnboardingAnswers } from '@/lib/storage';
import { searchLocations, getAllLocationOptions } from '@/lib/locations';
import type { OnboardingAnswers } from '@/lib/onboarding/types';

export default function ProfilePage() {
  const router = useRouter();
  const [allResults, setAllResults] = useState<CalculationResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [show3YearHomes, setShow3YearHomes] = useState(false);
  const [show5YearHomes, setShow5YearHomes] = useState(false);
  const [show10YearHomes, setShow10YearHomes] = useState(false);
  const [show15YearHomes, setShow15YearHomes] = useState(false);
  const [showMaxHomes, setShowMaxHomes] = useState(false);
  const [showYearByYear, setShowYearByYear] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  const loadResults = useCallback((stored: string | null, storedAnswers: string | null) => {
    if (!stored) {
      router.push('/onboarding');
      return;
    }

    try {
      const results: CalculationResult[] = JSON.parse(stored);

      if (results.length === 0) {
        router.push('/onboarding');
        return;
      }

      const sortedResults = [...results].sort((a, b) => {
        const scoreMap: Record<string, number> = {
          'very-viable-stable': 6,
          'viable': 5,
          'viable-higher-allocation': 4,
          'viable-extreme-care': 3,
          'viable-when-renting': 2,
          'no-viable-path': 1,
        };
        const tierDiff = (scoreMap[b.viabilityClassification] || 0) - (scoreMap[a.viabilityClassification] || 0);
        if (tierDiff !== 0) return tierDiff;
        return (b.numericScore ?? 0) - (a.numericScore ?? 0);
      });

      setAllResults(sortedResults);

      // Default to the most viable location (sortedResults[0])
      let resultToShow = sortedResults[0];

      if (storedAnswers) {
        try {
          const answers = JSON.parse(storedAnswers);
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
      setRecalculating(false);
    }
  }, [router]);

  const handleRecalculate = useCallback(() => {
    const storedAnswers = getOnboardingAnswers<OnboardingAnswers>((d): d is OnboardingAnswers => d != null && typeof d === 'object');
    if (!storedAnswers) {
      router.push('/onboarding');
      return;
    }

    setRecalculating(true);

    // Use setTimeout to let the UI update before heavy computation
    setTimeout(() => {
      try {
        const profile = normalizeOnboardingAnswers(storedAnswers);
        const locations = profile.selectedLocations.length > 0
          ? profile.selectedLocations
          : getAllLocationOptions().filter(o => o.type === 'state').map(o => o.label);

        const results = locations.map(loc => {
          try {
            return calculateAutoApproach(profile, loc, 30);
          } catch (error) {
            console.error(`Error calculating for ${loc}:`, error);
            return null;
          }
        }).filter((r): r is CalculationResult => r !== null);

        if (results.length > 0) {
          localStorage.setItem('calculation-results', JSON.stringify(results));
        }

        loadResults(
          localStorage.getItem('calculation-results'),
          localStorage.getItem('onboarding-answers')
        );
      } catch (error) {
        console.error('Recalculation error:', error);
        setRecalculating(false);
      }
    }, 50);
  }, [router, loadResults]);

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

  const result = selectedResult;
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

  const getHouseClassificationLabel = (classification: string) => {
    const labels: Record<string, { label: string; color: string; bgColor: string }> = {
      'very-viable-stable-large-house': { label: 'Very Viable and Stable: Large House', color: '#065F46', bgColor: '#A7F3D0' },
      'viable-large-house': { label: 'Viable: Large House', color: '#10B981', bgColor: '#D1FAE5' },
      'viable-median-house': { label: 'Viable: Median House', color: '#5BA4E5', bgColor: '#EFF6FF' },
      'very-viable-stable-median-house': { label: 'Very Viable and Stable: Median House', color: '#10B981', bgColor: '#D1FAE5' },
      'somewhat-viable-small-house': { label: 'Somewhat Viable: Small House', color: '#0891B2', bgColor: '#CFFAFE' },
    };
    return labels[classification] || labels['viable-median-house'];
  };

  const viabilityInfo = getViabilityLabel(result.viabilityClassification);

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
                        style={{ backgroundColor: getViabilityLabel(r.viabilityClassification).bgColor, color: getViabilityLabel(r.viabilityClassification).color }}
                      >
                        {getViabilityLabel(r.viabilityClassification).label}
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
                              style={{ backgroundColor: getViabilityLabel(alreadyCalc.viabilityClassification).bgColor, color: getViabilityLabel(alreadyCalc.viabilityClassification).color }}
                            >
                              {getViabilityLabel(alreadyCalc.viabilityClassification).label}
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

      {/* Recalculate Button */}
      <div className="flex justify-end">
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="flex items-center gap-2 px-4 py-2 bg-[#5BA4E5] text-white rounded-lg hover:bg-[#4A93D4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {recalculating ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Recalculating...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Recalculate
            </>
          )}
        </button>
      </div>

      {/* ===== BANNER/HEADER ===== */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
        
        {/* TOP SECTION - Key Metrics */}
        <div className="bg-gradient-to-br from-[#5BA4E5] to-[#4A93D4] p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">{result.location}</h1>
          <p className="text-white/80 mb-6">Your Financial Roadmap</p>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Time to Home Ownership */}
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-white/70 text-sm mb-1">Time to Homeownership</p>
              <p className="text-2xl font-bold">
                {result.yearsToMortgage > 0 ? pluralize(result.yearsToMortgage, 'year') : 'N/A'}
              </p>
              {result.ageMortgageAcquired > 0 && (
                <p className="text-white/60 text-xs mt-1">At age {result.ageMortgageAcquired}</p>
              )}
            </div>

            {/* Viability Classification (3 layers) */}
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-white/70 text-sm mb-1">Status</p>
              <p className="text-lg font-bold">{viabilityInfo.label}</p>
              <p className="text-white/80 text-sm font-semibold">{(result.numericScore ?? 0).toFixed(1)}/10</p>
              {result.houseClassification && (
                <p className="text-white/60 text-xs mt-1">{getHouseClassificationLabel(result.houseClassification).label}</p>
              )}
            </div>

            {/* Estimated Home Value */}
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-white/70 text-sm mb-1">Median Home Value</p>
              <p className="text-2xl font-bold">
                {formatCurrency(locationData.housing.medianHomeValue)}
              </p>
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

        {/* FAMILY PLANNING SECTION - Vertical Timeline */}
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
                            Positive disposable income for 3 years after birth
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

        {/* BOTTOM SECTION - House Projections */}
        <div className="px-8 py-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#2C3E50] mb-2">Your Homeownership Timeline</h2>
            <p className="text-[#6B7280] text-sm">See what homes you can afford at different stages of your journey</p>
          </div>
          
          <div className="space-y-4">
            {/* 3 Year Projection */}
            {result.houseProjections.threeYears && (
              <HouseProjectionCard
                title={`${pluralize(3, 'Year')} Projection`}
                projection={result.houseProjections.threeYears}
                location={result.location}
                showHomes={show3YearHomes}
                onToggle={() => setShow3YearHomes(!show3YearHomes)}
              />
            )}

            {/* 5 Year Projection */}
            {result.houseProjections.fiveYears && (
              <HouseProjectionCard
                title={`${pluralize(5, 'Year')} Projection`}
                projection={result.houseProjections.fiveYears}
                location={result.location}
                showHomes={show5YearHomes}
                onToggle={() => setShow5YearHomes(!show5YearHomes)}
              />
            )}

            {/* 10 Year Projection */}
            {result.houseProjections.tenYears && (
              <HouseProjectionCard
                title={`${pluralize(10, 'Year')} Projection`}
                projection={result.houseProjections.tenYears}
                location={result.location}
                showHomes={show10YearHomes}
                onToggle={() => setShow10YearHomes(!show10YearHomes)}
              />
            )}

            {/* 15 Year Projection */}
            {result.houseProjections.fifteenYears && (
              <HouseProjectionCard
                title={`${pluralize(15, 'Year')} Projection`}
                projection={result.houseProjections.fifteenYears}
                location={result.location}
                showHomes={show15YearHomes}
                onToggle={() => setShow15YearHomes(!show15YearHomes)}
              />
            )}

            {/* Max Affordable (Sustainability Ceiling) */}
            {result.houseProjections.maxAffordable && (
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
            )}
          </div>

          {/* Show Your Work - Year-by-Year Breakdown */}
          {result.yearByYear.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowYearByYear(!showYearByYear)}
                className="w-full flex items-center justify-between px-6 py-4 bg-[#F8FAFB] border border-[#E5E7EB] rounded-xl hover:bg-[#EFF6FF] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#5BA4E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="font-semibold text-[#2C3E50]">Show Your Work - Year-by-Year Breakdown</span>
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
                      This table shows the complete year-by-year simulation. &quot;No-Mtg Savings&quot; is used for house projections (what you&apos;d have if you kept saving without buying).
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
                          <th className="px-3 py-2 text-right font-semibold text-[#2C3E50]">EDI (70%)</th>
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
            <p className="text-xs text-[#9CA3AF] mt-1">~$250/sqft</p>
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
