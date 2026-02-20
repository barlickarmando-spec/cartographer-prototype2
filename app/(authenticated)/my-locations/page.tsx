'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalculationResult, calculateAutoApproach } from '@/lib/calculation-engine';
import { formatCurrency } from '@/lib/utils';
import { normalizeOnboardingAnswers } from '@/lib/onboarding/normalize';
import { getOnboardingAnswers, getSavedLocations, setSavedLocations } from '@/lib/storage';
import { getSalary } from '@/lib/data-extraction';
import { getAdjustedCOLKey } from '@/lib/onboarding/types';
import type { OnboardingAnswers, UserProfile } from '@/lib/onboarding/types';
import { searchLocations, getAllLocationOptions } from '@/lib/locations';

// ===== TYPES =====

type FilterMode = 'all' | 'saved' | 'most-recommended' | 'most-affordable';

// ===== HELPERS =====

const VIABILITY_SCORE: Record<string, number> = {
  'very-viable-stable': 6,
  'viable': 5,
  'viable-higher-allocation': 4,
  'viable-extreme-care': 3,
  'viable-when-renting': 2,
  'no-viable-path': 1,
};

function getViabilityLabel(classification: string): { label: string; color: string; bgColor: string } {
  const labels: Record<string, { label: string; color: string; bgColor: string }> = {
    'very-viable-stable': { label: 'Very Viable & Stable', color: '#10B981', bgColor: '#D1FAE5' },
    'viable': { label: 'Viable', color: '#5BA4E5', bgColor: '#EFF6FF' },
    'viable-higher-allocation': { label: 'Viable (Higher Allocation)', color: '#F59E0B', bgColor: '#FEF3C7' },
    'viable-extreme-care': { label: 'Viable (Extreme Care)', color: '#EF4444', bgColor: '#FEE2E2' },
    'viable-when-renting': { label: 'Viable When Renting', color: '#8B5CF6', bgColor: '#EDE9FE' },
    'no-viable-path': { label: 'Not Viable', color: '#DC2626', bgColor: '#FEE2E2' },
  };
  return labels[classification] || labels['no-viable-path'];
}

function sortByViability(a: CalculationResult, b: CalculationResult): number {
  const scoreDiff = (VIABILITY_SCORE[b.viabilityClassification] || 0) - (VIABILITY_SCORE[a.viabilityClassification] || 0);
  if (scoreDiff !== 0) return scoreDiff;
  const aYears = a.yearsToMortgage > 0 ? a.yearsToMortgage : 999;
  const bYears = b.yearsToMortgage > 0 ? b.yearsToMortgage : 999;
  return aYears - bYears;
}

// ===== LOCATION CARD COMPONENT =====

function LocationCard({
  result,
  isCurrent,
  isSaved,
  onToggleSave,
  occupation,
  colKey,
}: {
  result: CalculationResult;
  isCurrent: boolean;
  isSaved: boolean;
  onToggleSave: () => void;
  occupation: string;
  colKey: string;
}) {
  const viability = getViabilityLabel(result.viabilityClassification);
  const salary = getSalary(result.location, occupation);
  const col = (result.locationData.adjustedCOL as Record<string, number>)[colKey] || 0;
  const qualityOfLife = result.yearByYear[0]?.disposableIncome ?? 0;
  const fastestToHome = result.yearsToMortgage > 0 ? `${result.yearsToMortgage} years` : 'N/A';
  const debtFree = result.yearsToDebtFree > 0 ? `${result.yearsToDebtFree} years` : 'Debt-free';

  const proj3 = result.houseProjections.threeYears;
  const proj5 = result.houseProjections.fiveYears;
  const proj10 = result.houseProjections.tenYears;

  return (
    <div className={`bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-all ${
      isCurrent ? 'border-[#5BA4E5] ring-2 ring-[#5BA4E5]/20' : 'border-gray-200'
    }`}>
      <div className="p-5">
        {/* Header: Name + Heart */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-gray-900 truncate">{result.location}</h3>
              {isCurrent && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#EFF6FF] text-[#5BA4E5] border border-[#5BA4E5]/20">
                  Current
                </span>
              )}
            </div>
          </div>
          <button
            onClick={(e) => { e.preventDefault(); onToggleSave(); }}
            className="ml-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
            title={isSaved ? 'Remove from saved' : 'Save location'}
          >
            {isSaved ? (
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-400 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            )}
          </button>
        </div>

        {/* Viability Badge */}
        <div className="mb-4">
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: viability.bgColor, color: viability.color }}
          >
            {viability.label}
          </span>
        </div>

        {/* Key Metrics */}
        <div className="space-y-2.5 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Estimated Salary</span>
            <span className="font-semibold text-gray-900">{formatCurrency(salary)}/yr</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Cost of Living</span>
            <span className="font-semibold text-gray-900">{formatCurrency(col)}/yr</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Quality of Life</span>
            <span className={`font-semibold ${qualityOfLife >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {qualityOfLife >= 0 ? '+' : '-'}{formatCurrency(Math.abs(qualityOfLife))}/yr
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Fastest to Home</span>
            <span className="font-semibold text-gray-900">{fastestToHome}</span>
          </div>
        </div>

        {/* Bottom Section: Debt Free + Home Projections */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Time to Debt Free</span>
            <span className="font-semibold text-gray-900">{debtFree}</span>
          </div>

          {(proj3?.canAfford || proj5 || proj10) && (
            <div className="pt-1 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-1.5">Realistic Home Value</p>
              <div className="space-y-1">
                {proj3?.canAfford && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">3 Years</span>
                    <span className="font-semibold text-gray-700">{formatCurrency(proj3.maxSustainableHousePrice)}</span>
                  </div>
                )}
                {proj5 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">5 Years</span>
                    <span className="font-semibold text-gray-700">{formatCurrency(proj5.maxSustainableHousePrice)}</span>
                  </div>
                )}
                {proj10 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">10 Years</span>
                    <span className="font-semibold text-gray-700">{formatCurrency(proj10.maxSustainableHousePrice)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* View Overview link (current location only) */}
        {isCurrent && (
          <Link
            href="/profile"
            className="mt-3 flex items-center justify-center gap-1.5 w-full px-4 py-2 bg-[#5BA4E5] text-white rounded-lg hover:bg-[#4A93D4] transition-colors text-sm font-medium"
          >
            View Full Overview
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
}

// ===== MAIN PAGE COMPONENT =====

export default function MyLocationsPage() {
  const router = useRouter();

  // Core data
  const [userResults, setUserResults] = useState<CalculationResult[]>([]);
  const [suggestedResults, setSuggestedResults] = useState<CalculationResult[]>([]);
  const [searchResultsList, setSearchResultsList] = useState<CalculationResult[]>([]);
  const [savedLocationNames, setSavedLocationNames] = useState<string[]>([]);
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [occupation, setOccupation] = useState('');
  const [colKey, setColKey] = useState('onePerson');
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDropdown, setSearchDropdown] = useState<{ label: string; rawName: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const searchCacheRef = useRef<Map<string, CalculationResult>>(new Map());

  // ===== LOAD DATA =====
  useEffect(() => {
    const stored = localStorage.getItem('calculation-results');
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

      setUserResults(results);

      const answers = getOnboardingAnswers<OnboardingAnswers>(
        (d): d is OnboardingAnswers => d != null && typeof d === 'object'
      );

      if (answers) {
        setOccupation(answers.userOccupation || '');

        if (answers.locationSituation === 'currently-live-may-move' && answers.currentLocation) {
          setCurrentLocation(answers.currentLocation);
        } else if (answers.locationSituation === 'know-exactly' && answers.exactLocation) {
          setCurrentLocation(answers.exactLocation);
        }

        const normalized = normalizeOnboardingAnswers(answers);
        setProfile(normalized);
        setColKey(getAdjustedCOLKey(normalized.householdType));
      }

      setSavedLocationNames(getSavedLocations());
    } catch (error) {
      console.error('Error loading results:', error);
      router.push('/onboarding');
      return;
    }

    setLoading(false);
  }, [router]);

  // ===== GENERATE SUGGESTIONS =====
  useEffect(() => {
    if (!profile || userResults.length === 0) return;

    setSuggestionsLoading(true);

    setTimeout(() => {
      try {
        const existingLocations = new Set(userResults.map(r => r.location));
        const allOptions = getAllLocationOptions()
          .filter(o => o.type === 'state' && !existingLocations.has(o.label));

        // Pick ~8 spread across the list for diversity, then take top 3 by viability
        const step = Math.max(1, Math.floor(allOptions.length / 8));
        const candidates = allOptions.filter((_, i) => i % step === 0).slice(0, 8);

        const suggestions: CalculationResult[] = [];
        for (const loc of candidates) {
          try {
            const result = calculateAutoApproach(profile, loc.label, 30);
            if (result) {
              suggestions.push(result);
              searchCacheRef.current.set(loc.label, result);
            }
          } catch {
            // skip failed
          }
        }

        suggestions.sort(sortByViability);
        setSuggestedResults(suggestions.slice(0, 3));
      } catch (error) {
        console.error('Error generating suggestions:', error);
      }
      setSuggestionsLoading(false);
    }, 50);
  }, [profile, userResults]);

  // ===== CLOSE DROPDOWN ON OUTSIDE CLICK =====
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ===== SEARCH HANDLER =====
  const handleSearchInput = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchDropdown([]);
      setShowDropdown(false);
      return;
    }
    const matches = searchLocations(query, 8);
    setSearchDropdown(matches.map(m => ({ label: m.label, rawName: m.rawName })));
    setShowDropdown(matches.length > 0);
  }, []);

  const handleSelectSearchResult = useCallback((locationLabel: string) => {
    setShowDropdown(false);
    setSearchQuery(locationLabel);

    // Already calculated?
    const alreadyExists = userResults.find(r => r.location === locationLabel)
      || suggestedResults.find(r => r.location === locationLabel)
      || searchResultsList.find(r => r.location === locationLabel);
    if (alreadyExists) return;

    // Check cache
    const cached = searchCacheRef.current.get(locationLabel);
    if (cached) {
      setSearchResultsList(prev => [cached, ...prev.filter(r => r.location !== locationLabel)]);
      return;
    }

    if (!profile) return;
    setSearchLoading(true);
    setTimeout(() => {
      try {
        const result = calculateAutoApproach(profile, locationLabel, 30);
        if (result) {
          searchCacheRef.current.set(locationLabel, result);
          setSearchResultsList(prev => [result, ...prev.filter(r => r.location !== locationLabel)]);
        }
      } catch (error) {
        console.error('Error calculating search result:', error);
      }
      setSearchLoading(false);
    }, 50);
  }, [profile, userResults, suggestedResults, searchResultsList]);

  // ===== SAVE/UNSAVE TOGGLE =====
  const toggleSave = useCallback((location: string) => {
    setSavedLocationNames(prev => {
      const next = prev.includes(location)
        ? prev.filter(l => l !== location)
        : [...prev, location];
      setSavedLocations(next);
      return next;
    });
  }, []);

  // ===== FILTER + SORT =====
  const allCombinedResults = [...userResults, ...suggestedResults, ...searchResultsList];
  const deduped = allCombinedResults.reduce<CalculationResult[]>((acc, r) => {
    if (!acc.find(existing => existing.location === r.location)) acc.push(r);
    return acc;
  }, []);

  let filteredResults: CalculationResult[];

  switch (filter) {
    case 'saved':
      filteredResults = deduped.filter(r => savedLocationNames.includes(r.location));
      break;
    case 'most-recommended':
      filteredResults = [...deduped].sort(sortByViability);
      break;
    case 'most-affordable':
      filteredResults = [...deduped].sort((a, b) => {
        const aCOL = (a.locationData.adjustedCOL as Record<string, number>)[colKey] || 0;
        const bCOL = (b.locationData.adjustedCOL as Record<string, number>)[colKey] || 0;
        return aCOL - bCOL;
      });
      break;
    default:
      filteredResults = deduped;
  }

  // Pin current location first for 'all' and 'saved'
  if (filter === 'all' || filter === 'saved') {
    const currentIdx = filteredResults.findIndex(r => r.location === currentLocation);
    if (currentIdx > 0) {
      const [current] = filteredResults.splice(currentIdx, 1);
      filteredResults.unshift(current);
    }
  }

  // Section splits
  const userLocationNames = new Set(userResults.map(r => r.location));
  const suggestedLocationNames = new Set(suggestedResults.map(r => r.location));

  // ===== RENDER =====

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5BA4E5] mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your locations...</p>
        </div>
      </div>
    );
  }

  const filterButtons: { mode: FilterMode; label: string }[] = [
    { mode: 'all', label: 'All' },
    { mode: 'saved', label: 'Saved' },
    { mode: 'most-recommended', label: 'Most Recommended' },
    { mode: 'most-affordable', label: 'Most Affordable' },
  ];

  const renderCard = (result: CalculationResult) => (
    <LocationCard
      key={result.location}
      result={result}
      isCurrent={result.location === currentLocation}
      isSaved={savedLocationNames.includes(result.location)}
      onToggleSave={() => toggleSave(result.location)}
      occupation={occupation}
      colKey={colKey}
    />
  );

  // Flat grid for filtered views
  const renderFlatGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {filteredResults.length === 0 ? (
        <div className="col-span-full text-center py-12">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <p className="text-gray-500">
            {filter === 'saved' ? 'No saved locations yet. Click the heart on any location to save it.' : 'No locations to show.'}
          </p>
        </div>
      ) : (
        filteredResults.map(renderCard)
      )}
    </div>
  );

  // Sectioned view for 'all' mode
  const renderSections = () => {
    const currentResult = userResults.find(r => r.location === currentLocation);
    const otherUserResults = userResults.filter(r => r.location !== currentLocation);
    const uniqueSearchResults = searchResultsList.filter(
      r => !userLocationNames.has(r.location) && !suggestedLocationNames.has(r.location)
    );

    return (
      <div className="space-y-8">
        {/* Current Location */}
        {currentResult && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Your Current Location</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {renderCard(currentResult)}
            </div>
          </div>
        )}

        {/* Your Locations */}
        {otherUserResults.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Your Locations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {otherUserResults.map(renderCard)}
            </div>
          </div>
        )}

        {/* Search Results */}
        {uniqueSearchResults.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Search Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {uniqueSearchResults.map(renderCard)}
            </div>
          </div>
        )}

        {/* Suggested For You */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Suggested For You</h2>
          {suggestionsLoading ? (
            <div className="flex items-center gap-3 py-8 justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5BA4E5]"></div>
              <span className="text-gray-500 text-sm">Calculating suggestions...</span>
            </div>
          ) : suggestedResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {suggestedResults.map(renderCard)}
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-4">No additional suggestions available.</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">My Locations</h1>
        <p className="text-gray-500">Your personalized location comparisons</p>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {filterButtons.map(btn => (
          <button
            key={btn.mode}
            onClick={() => setFilter(btn.mode)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === btn.mode
                ? 'bg-[#5BA4E5] text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {btn.mode === 'saved' && savedLocationNames.length > 0 && (
              <span className="mr-1">({savedLocationNames.length})</span>
            )}
            {btn.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div ref={searchRef} className="relative">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={() => { if (searchDropdown.length > 0) setShowDropdown(true); }}
            placeholder="Search any location..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#5BA4E5] focus:border-[#5BA4E5] outline-none"
          />
          {searchLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#5BA4E5]"></div>
            </div>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && searchDropdown.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {searchDropdown.map(item => (
              <button
                key={item.label}
                onClick={() => handleSelectSearchResult(item.label)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span className="text-gray-700">{item.label}</span>
                {userLocationNames.has(item.label) && (
                  <span className="ml-auto text-xs text-[#5BA4E5] font-medium">Already added</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {filter === 'all' ? renderSections() : renderFlatGrid()}
    </div>
  );
}
