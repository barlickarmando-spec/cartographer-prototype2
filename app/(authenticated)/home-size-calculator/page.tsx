'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CalculationResult, calculateAutoApproach } from '@/lib/calculation-engine';
import { formatCurrency } from '@/lib/utils';
import { normalizeOnboardingAnswers } from '@/lib/onboarding/normalize';
import { getOnboardingAnswers, getSavedLocations } from '@/lib/storage';
import { estimateHomeSizeSqft, getPricePerSqft } from '@/lib/home-value-lookup';
import { getAllLocationOptions } from '@/lib/locations';
import { getStateFlagPath, getStateNameFromLocation } from '@/lib/state-flags';
import { ALL_STATES } from '@/lib/location-filters';
import type { OnboardingAnswers, UserProfile } from '@/lib/onboarding/types';
import { getAdjustedCOLKey } from '@/lib/onboarding/types';
import SimpleHomeCarousel from '@/components/SimpleHomeCarousel';

// ===== TYPES =====

type SearchMode = 'time' | 'size';
type QualityFilter = 'nice' | 'average' | 'any';
type HomePreference = 'house' | 'apartment' | 'any';

interface SizeResult {
  quality: 'nice' | 'average' | 'any';
  qualityLabel: string;
  years: number;
  months: number;
  homeValue: number;
  homeSizeSqft: number;
  location: string;
}

interface TimeResult {
  quality: QualityFilter;
  qualityLabel: string;
  homeValue: number;
  homeSizeSqft: number;
  location: string;
  years: number;
}

interface RecommendedLocation {
  location: string;
  homeValue: number;
  homeSizeSqft: number;
  valueDiff: number;
  sizeDiff: number;
  result: CalculationResult;
}

// ===== HELPERS =====

function formatSqft(sqft: number): string {
  return `~${sqft.toLocaleString()} sqft`;
}

// Quality multipliers: "nice" areas cost more per sqft, "any" areas cost less
function getQualityMultiplier(quality: QualityFilter): number {
  switch (quality) {
    case 'nice': return 1.3;
    case 'average': return 1.0;
    case 'any': return 0.75;
  }
}

function getQualityLabel(quality: QualityFilter): string {
  switch (quality) {
    case 'nice': return 'Nice Area (Conservative)';
    case 'average': return 'Average Area (Middling)';
    case 'any': return 'Any Area (Aggressive)';
  }
}

function getQualityColor(quality: QualityFilter): { text: string; bg: string; border: string } {
  switch (quality) {
    case 'nice': return { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' };
    case 'average': return { text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' };
    case 'any': return { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' };
  }
}

function isCity(locationName: string): boolean {
  return locationName.includes(', ');
}

// ===== MAIN COMPONENT =====

export default function HomeSizeCalculatorPage() {
  const router = useRouter();

  // Core data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [savedLocations, setSavedLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Search mode
  const [searchMode, setSearchMode] = useState<SearchMode>('time');

  // Location
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [defaultLocation, setDefaultLocation] = useState<string>('');
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  // Quality dropdown
  const [qualityDropdownOpen, setQualityDropdownOpen] = useState(false);
  const [qualitySearch, setQualitySearch] = useState('');
  const qualityDropdownRef = useRef<HTMLDivElement>(null);

  // Search by Time inputs
  const [timeValue, setTimeValue] = useState('');
  const [timeUnit, setTimeUnit] = useState<'years' | 'months'>('years');

  // Search by Size inputs
  const [sizeValue, setSizeValue] = useState('');

  // Filters
  const [qualityFilters, setQualityFilters] = useState<QualityFilter[]>(['nice', 'average', 'any']);
  const [homePreference, setHomePreference] = useState<HomePreference>('any');

  // Results
  const [calculated, setCalculated] = useState(false);
  const [timeResults, setTimeResults] = useState<TimeResult[]>([]);
  const [sizeResults, setSizeResults] = useState<SizeResult[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedLocation[]>([]);
  const [calcLoading, setCalcLoading] = useState(false);
  const [pendingRecalc, setPendingRecalc] = useState(false);

  // ===== LOAD DATA =====
  useEffect(() => {
    const answers = getOnboardingAnswers<OnboardingAnswers>(
      (d): d is OnboardingAnswers => d != null && typeof d === 'object'
    );
    if (!answers) {
      router.push('/onboarding');
      return;
    }

    const normalized = normalizeOnboardingAnswers(answers);
    setProfile(normalized);

    const saved = getSavedLocations();
    setSavedLocations(saved);

    // Default location: use last-viewed from profile, or first saved, or onboarding location
    let defaultLoc = '';
    const lastViewed = typeof window !== 'undefined' ? localStorage.getItem('lastViewedLocation') : null;
    if (lastViewed && (saved.includes(lastViewed) || answers.currentLocation === lastViewed || answers.exactLocation === lastViewed)) {
      defaultLoc = lastViewed;
    } else if (saved.length > 0) {
      defaultLoc = saved[0];
    } else if (answers.currentLocation) {
      defaultLoc = answers.currentLocation;
    } else if (answers.exactLocation) {
      defaultLoc = answers.exactLocation;
    }
    if (defaultLoc) {
      setSelectedLocation(defaultLoc);
      setDefaultLocation(defaultLoc);
    }

    setLoading(false);
  }, [router]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target as Node)) {
        setLocationDropdownOpen(false);
      }
      if (qualityDropdownRef.current && !qualityDropdownRef.current.contains(e.target as Node)) {
        setQualityDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ===== LOCATION OPTIONS =====
  const allLocationOptions = getAllLocationOptions();

  const filteredLocationOptions = locationSearch.trim()
    ? allLocationOptions.filter(opt =>
        opt.label.toLowerCase().includes(locationSearch.toLowerCase())
      ).sort((a, b) => {
        // Saved locations first
        const aIsSaved = savedLocations.includes(a.label) ? 0 : 1;
        const bIsSaved = savedLocations.includes(b.label) ? 0 : 1;
        return aIsSaved - bIsSaved;
      }).slice(0, 20)
    : [];

  const statesWithCities: Record<string, string[]> = {};
  allLocationOptions.forEach(opt => {
    if (opt.type === 'city') {
      const parts = opt.label.split(', ');
      const stateAbbrev = parts[parts.length - 1];
      const stateName = ALL_STATES.find(s => {
        const code = s.substring(0, 2).toUpperCase();
        return stateAbbrev === code;
      });
      const key = stateName || stateAbbrev;
      if (!statesWithCities[key]) statesWithCities[key] = [];
      statesWithCities[key].push(opt.label);
    }
  });

  // ===== CALCULATE =====
  const handleCalculate = useCallback(() => {
    if (!profile || !selectedLocation) return;
    setCalcLoading(true);
    setCalculated(false);

    setTimeout(() => {
      try {
        const result = calculateAutoApproach(profile, selectedLocation, 30);
        if (!result) {
          setCalcLoading(false);
          return;
        }

        if (searchMode === 'time') {
          // Search by time: how big of a house can you get in X time
          const years = timeUnit === 'years' ? parseFloat(timeValue) : parseFloat(timeValue) / 12;
          if (isNaN(years) || years <= 0) {
            setCalcLoading(false);
            return;
          }

          const proj = result.houseProjections;
          // Find the closest projection or interpolate
          let baseHomeValue = 0;
          if (years <= 3 && proj.threeYears?.canAfford) {
            baseHomeValue = proj.threeYears.maxSustainableHousePrice * (years / 3);
          } else if (years <= 5 && proj.fiveYears?.canAfford) {
            baseHomeValue = proj.fiveYears.maxSustainableHousePrice * (years / 5);
          } else if (years <= 10 && proj.tenYears?.canAfford) {
            baseHomeValue = proj.tenYears.maxSustainableHousePrice * (years / 10);
          } else if (years <= 15 && proj.fifteenYears?.canAfford) {
            baseHomeValue = proj.fifteenYears.maxSustainableHousePrice * (years / 15);
          } else if (proj.maxAffordable?.canAfford) {
            const maxYears = proj.maxAffordable.year;
            baseHomeValue = proj.maxAffordable.maxSustainableHousePrice * Math.min(1, years / maxYears);
          }

          // More accurate: recalculate using simulation year
          const simulation = result.yearByYear;
          const targetYear = Math.min(Math.ceil(years), simulation.length);
          const snapshot = simulation[targetYear - 1] || simulation[simulation.length - 1];
          if (snapshot) {
            const savings = snapshot.savingsNoMortgage;
            const roughHomeValue = savings / 0.15;
            if (roughHomeValue > baseHomeValue) baseHomeValue = roughHomeValue;
          }

          // Use the actual projection if available
          if (proj.maxAffordable?.canAfford && years >= proj.maxAffordable.year) {
            baseHomeValue = proj.maxAffordable.maxSustainableHousePrice;
          }

          // Generate per-quality results
          const qualities: QualityFilter[] = qualityFilters.length > 0 ? qualityFilters : ['nice', 'average', 'any'];
          const timeResultsList: TimeResult[] = qualities.map(quality => {
            const multiplier = getQualityMultiplier(quality);
            // In a nicer area, the same money buys less sqft (higher price/sqft)
            // homeValue stays the same, but sqft changes based on quality
            const adjustedSqft = estimateHomeSizeSqft(baseHomeValue / multiplier, selectedLocation);
            return {
              quality,
              qualityLabel: getQualityLabel(quality),
              homeValue: baseHomeValue,
              homeSizeSqft: adjustedSqft,
              location: selectedLocation,
              years: Math.round(years * 10) / 10,
            };
          });

          setTimeResults(timeResultsList);
          setSizeResults([]);
        } else {
          // Search by size: how long to get a house of X sqft
          const targetSqft = parseFloat(sizeValue);
          if (isNaN(targetSqft) || targetSqft <= 0) {
            setCalcLoading(false);
            return;
          }

          const pricePerSqft = getPricePerSqft(selectedLocation);
          const qualities: QualityFilter[] = qualityFilters.length > 0 ? qualityFilters : ['nice', 'average', 'any'];

          const results: SizeResult[] = [];

          for (const quality of qualities) {
            const multiplier = getQualityMultiplier(quality);
            const targetPrice = targetSqft * pricePerSqft * multiplier;

            // Find the year where savings reach enough for this price
            let foundYear = -1;
            for (const snap of result.yearByYear) {
              const savings = snap.savingsNoMortgage;
              const downPayment = targetPrice * 0.107; // typical down payment
              const annualMortgage = (targetPrice - downPayment) * 0.08; // rough annual cost
              const annualDI = snap.disposableIncome * (profile.disposableIncomeAllocation / 100);

              if (savings >= downPayment && annualDI >= annualMortgage * 0.8) {
                foundYear = snap.year;
                break;
              }
            }

            if (foundYear === -1) {
              // Cannot afford within simulation window
              const maxSnap = result.yearByYear[result.yearByYear.length - 1];
              foundYear = maxSnap ? maxSnap.year + 5 : 35; // Estimate beyond window
            }

            const totalMonths = foundYear * 12;

            results.push({
              quality,
              qualityLabel: getQualityLabel(quality),
              years: foundYear,
              months: totalMonths,
              homeValue: targetSqft * pricePerSqft * multiplier,
              homeSizeSqft: targetSqft,
              location: selectedLocation,
            });
          }

          setSizeResults(results);
          setTimeResults([]);
        }

        // Generate recommendations: "If You Want A Larger House"
        generateRecommendations(result);

        setCalculated(true);
      } catch (error) {
        console.error('Calculation error:', error);
      }
      setCalcLoading(false);
    }, 50);
  }, [profile, selectedLocation, searchMode, timeValue, timeUnit, sizeValue, qualityFilters, homePreference]);

  // Auto-recalculate when location changes from recommendation click
  useEffect(() => {
    if (pendingRecalc) {
      setPendingRecalc(false);
      handleCalculate();
    }
  }, [pendingRecalc, handleCalculate]);

  // Generate location recommendations
  const generateRecommendations = useCallback((currentResult: CalculationResult) => {
    if (!profile) return;

    const currentMaxValue = currentResult.houseProjections.maxAffordable?.maxSustainableHousePrice || 0;
    const currentSqft = currentMaxValue > 0 ? estimateHomeSizeSqft(currentMaxValue, selectedLocation) : 0;

    const isSelectedCity = isCity(selectedLocation);
    const allOptions = getAllLocationOptions();

    // Filter: if state selected, show both cities & states. If city selected, only cities
    const candidates = allOptions.filter(opt => {
      if (opt.label === selectedLocation) return false;
      if (isSelectedCity && opt.type === 'state') return false;
      return true;
    });

    // Sample and calculate
    const step = Math.max(1, Math.floor(candidates.length / 15));
    const sampled = candidates.filter((_, i) => i % step === 0).slice(0, 15);

    const recs: RecommendedLocation[] = [];
    for (const loc of sampled) {
      try {
        const locResult = calculateAutoApproach(profile, loc.label, 30);
        if (!locResult || locResult.viabilityClassification === 'no-viable-path') continue;

        const locMaxValue = locResult.houseProjections.maxAffordable?.maxSustainableHousePrice || 0;
        if (locMaxValue <= 0) continue;

        const locSqft = estimateHomeSizeSqft(locMaxValue, loc.label);

        recs.push({
          location: loc.label,
          homeValue: locMaxValue,
          homeSizeSqft: locSqft,
          valueDiff: locMaxValue - currentMaxValue,
          sizeDiff: locSqft - currentSqft,
          result: locResult,
        });
      } catch { /* skip */ }
    }

    // Sort: prioritize viability and higher home value
    recs.sort((a, b) => {
      // Prefer locations with higher home value
      if (a.valueDiff > 0 && b.valueDiff <= 0) return -1;
      if (b.valueDiff > 0 && a.valueDiff <= 0) return 1;
      return b.sizeDiff - a.sizeDiff;
    });

    setRecommendations(recs.slice(0, 6));
  }, [profile, selectedLocation]);

  // Toggle quality filter
  const toggleQuality = (q: QualityFilter) => {
    setQualityFilters(prev => {
      if (prev.includes(q)) {
        const next = prev.filter(x => x !== q);
        return next.length === 0 ? [q] : next; // keep at least one
      }
      return [...prev, q];
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5BA4E5]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Home Size Calculator</h1>
        <p className="text-gray-600">Calculate how big of a house you can afford or how long it takes to reach your target</p>
      </div>

      {/* ===== SEARCH BAR SECTION ===== */}
      <div className="bg-[#E8F5E9] rounded-2xl p-6 border border-[#C8E6C9] shadow-sm">
        {/* Search mode toggle */}
        <div className="flex bg-white rounded-xl p-1 mb-5 max-w-lg mx-auto shadow-sm">
          <button
            onClick={() => { setSearchMode('time'); setCalculated(false); }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
              searchMode === 'time'
                ? 'bg-[#4CAF50] text-white shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Search by Time
          </button>
          <button
            onClick={() => { setSearchMode('size'); setCalculated(false); }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
              searchMode === 'size'
                ? 'bg-[#4CAF50] text-white shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Search by Size
          </button>
        </div>

        {/* Search inputs row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Left: Search input */}
          <div>
            {searchMode === 'time' ? (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  How long are you saving?
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={timeValue}
                    onChange={e => setTimeValue(e.target.value)}
                    placeholder={timeUnit === 'years' ? 'e.g., 5' : 'e.g., 60'}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent bg-white"
                    min="1"
                  />
                  <div className="flex bg-white rounded-xl border border-gray-300 overflow-hidden">
                    <button
                      onClick={() => setTimeUnit('years')}
                      className={`px-3 py-2 text-sm font-medium transition-colors ${
                        timeUnit === 'years' ? 'bg-[#4CAF50] text-white' : 'text-gray-600'
                      }`}
                    >
                      Years
                    </button>
                    <button
                      onClick={() => setTimeUnit('months')}
                      className={`px-3 py-2 text-sm font-medium transition-colors ${
                        timeUnit === 'months' ? 'bg-[#4CAF50] text-white' : 'text-gray-600'
                      }`}
                    >
                      Months
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Target home size (sqft)
                </label>
                <input
                  type="number"
                  value={sizeValue}
                  onChange={e => setSizeValue(e.target.value)}
                  placeholder="e.g., 2000"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent bg-white"
                  min="100"
                />
              </div>
            )}
          </div>

          {/* Right: Location selector */}
          <div ref={locationDropdownRef} className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Location</label>
            <button
              onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-left bg-white flex items-center justify-between hover:border-[#4CAF50] transition-colors"
            >
              <span className={`flex items-center gap-2 ${selectedLocation ? 'text-gray-900' : 'text-gray-400'}`}>
                {selectedLocation || 'Select a location...'}
                {selectedLocation && selectedLocation === defaultLocation && (
                  <span className="text-[10px] font-semibold text-[#4CAF50] bg-[#E8F5E9] border border-[#C8E6C9] px-1.5 py-0.5 rounded-full">Default</span>
                )}
              </span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${locationDropdownOpen ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {locationDropdownOpen && (
              <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-80 overflow-y-auto">
                {/* Search input */}
                <div className="sticky top-0 bg-white p-2 border-b border-gray-100">
                  <input
                    type="text"
                    value={locationSearch}
                    onChange={e => setLocationSearch(e.target.value)}
                    placeholder="Search locations..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                    autoFocus
                  />
                </div>

                {/* Search results */}
                {locationSearch.trim() && filteredLocationOptions.length > 0 && (
                  <div className="p-1">
                    {filteredLocationOptions.map(opt => (
                      <button key={opt.id} onClick={() => { setSelectedLocation(opt.label); setLocationDropdownOpen(false); setLocationSearch(''); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-[#E8F5E9] rounded-lg transition-colors flex items-center gap-2">
                        <span>{opt.label}</span>
                        {savedLocations.includes(opt.label) && (
                          <span className="text-[10px] font-semibold text-[#4CAF50] bg-[#E8F5E9] border border-[#C8E6C9] px-1.5 py-0.5 rounded-full">Saved</span>
                        )}
                        <span className="ml-auto text-xs text-gray-400">({opt.type})</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Nationwide option */}
                {!locationSearch.trim() && (
                  <>
                    <div className="p-1">
                      <button onClick={() => { setSelectedLocation('United States'); setLocationDropdownOpen(false); }}
                        className="w-full text-left px-3 py-2.5 text-sm font-semibold hover:bg-[#E8F5E9] rounded-lg transition-colors text-[#4CAF50]">
                        Find the largest house anywhere in the US
                      </button>
                    </div>
                    <div className="border-t border-gray-100" />

                    {/* My Locations */}
                    {savedLocations.length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">My Locations</div>
                        <div className="p-1">
                          {savedLocations.map(loc => (
                            <button key={loc} onClick={() => { setSelectedLocation(loc); setLocationDropdownOpen(false); }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-[#E8F5E9] rounded-lg transition-colors flex items-center gap-2 ${
                                selectedLocation === loc ? 'bg-[#E8F5E9] font-semibold' : ''
                              }`}>
                              <span>{loc}</span>
                              {loc === defaultLocation && (
                                <span className="text-[10px] font-semibold text-[#4CAF50] bg-[#E8F5E9] border border-[#C8E6C9] px-1.5 py-0.5 rounded-full">Default</span>
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-gray-100" />
                      </>
                    )}

                    {/* Additional Locations - States */}
                    <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Additional Locations</div>
                    <div className="p-1 max-h-48 overflow-y-auto">
                      {ALL_STATES.map(state => (
                        <button key={state} onClick={() => { setSelectedLocation(state); setLocationDropdownOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-[#E8F5E9] rounded-lg transition-colors flex items-center justify-between ${
                            selectedLocation === state ? 'bg-[#E8F5E9] font-semibold' : ''
                          }`}>
                          <span>{state}</span>
                          <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filters row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Quality Filter - Searchable Multi-select Dropdown */}
          <div ref={qualityDropdownRef}>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quality</label>

            {/* Selected tags */}
            {qualityFilters.length > 0 && qualityFilters.length < 3 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {qualityFilters.map(q => {
                  const label = q === 'nice' ? 'Nice Area' : q === 'average' ? 'Average Area' : 'Any Area';
                  return (
                    <span key={q} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EFF6FF] text-gray-800 rounded-full text-xs border border-[#5BA4E5]">
                      {label}
                      <button onClick={() => toggleQuality(q)} className="text-[#5BA4E5] hover:text-[#4A93D4] font-bold ml-0.5">×</button>
                    </span>
                  );
                })}
                <button onClick={() => setQualityFilters(['nice', 'average', 'any'])} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">
                  Select all
                </button>
              </div>
            )}

            {/* Search input */}
            <div className="relative">
              <input
                type="text"
                value={qualitySearch}
                onChange={e => setQualitySearch(e.target.value)}
                onFocus={() => setQualityDropdownOpen(true)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm bg-white focus:border-[#4CAF50] focus:ring-2 focus:ring-[#4CAF50] focus:ring-opacity-20 outline-none transition-all"
                placeholder="Search quality..."
              />
              <button
                onMouseDown={e => { e.preventDefault(); setQualityDropdownOpen(!qualityDropdownOpen); }}
                className="absolute right-3 top-3.5 text-gray-400"
              >
                {qualityDropdownOpen ? '\u25B2' : '\u25BC'}
              </button>
            </div>

            {/* Dropdown list */}
            {qualityDropdownOpen && (
              <div className="mt-1 border border-gray-200 rounded-xl bg-white shadow-lg overflow-hidden">
                {/* Show All option */}
                {(!qualitySearch.trim() || 'show all'.includes(qualitySearch.toLowerCase())) && (
                  <label className={`flex items-center px-4 py-2.5 cursor-pointer transition-all text-sm hover:bg-gray-50 border-b border-gray-100 ${
                    qualityFilters.length === 3 ? 'bg-[#EFF6FF]' : ''
                  }`}>
                    <input
                      type="checkbox"
                      checked={qualityFilters.length === 3}
                      onChange={() => setQualityFilters(qualityFilters.length === 3 ? [] : ['nice', 'average', 'any'])}
                      className="w-3.5 h-3.5 text-[#5BA4E5] border-gray-300 rounded focus:ring-[#5BA4E5] mr-3"
                    />
                    Show All
                  </label>
                )}
                {([
                  { key: 'nice' as QualityFilter, label: 'Nice Area' },
                  { key: 'average' as QualityFilter, label: 'Average Area' },
                  { key: 'any' as QualityFilter, label: 'Any Area' },
                ]).filter(opt =>
                  !qualitySearch.trim() || opt.label.toLowerCase().includes(qualitySearch.toLowerCase())
                ).map(opt => {
                  const isSelected = qualityFilters.includes(opt.key);
                  return (
                    <label
                      key={opt.key}
                      className={`flex items-center px-4 py-2.5 cursor-pointer transition-all text-sm hover:bg-gray-50 ${
                        isSelected ? 'bg-[#EFF6FF]' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleQuality(opt.key)}
                        className="w-3.5 h-3.5 text-[#5BA4E5] border-gray-300 rounded focus:ring-[#5BA4E5] mr-3"
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Home Preference */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Home Preference</label>
            <div className="flex gap-2">
              {(['house', 'apartment', 'any'] as HomePreference[]).map(p => (
                <button key={p} onClick={() => setHomePreference(p)}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                    homePreference === p
                      ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7] shadow-sm'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-[#4CAF50] hover:text-gray-900'
                  }`}>
                  {p === 'house' ? 'House' : p === 'apartment' ? 'Apartment' : 'Any'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calculate button */}
        <button
          onClick={handleCalculate}
          disabled={calcLoading || !selectedLocation || (searchMode === 'time' ? !timeValue : !sizeValue)}
          className="w-full md:w-auto px-8 py-3 bg-[#4CAF50] text-white rounded-xl font-semibold text-sm hover:bg-[#43A047] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {calcLoading ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Calculating...
            </span>
          ) : calculated ? 'Recalculate' : 'Calculate'}
        </button>
      </div>

      {/* ===== RESULTS SECTION ===== */}
      {calculated && (
        <div className="space-y-6">
          {/* Search by Time results */}
          {searchMode === 'time' && timeResults.length > 0 && (
            <div className="space-y-6">
              {timeResults.map((tr) => {
                const colors = getQualityColor(tr.quality);
                return (
                  <div key={tr.quality} className="space-y-4">
                    <div className={`${colors.bg} border ${colors.border} rounded-2xl overflow-hidden`}>
                      <div className="px-6 py-4 border-b border-gray-100/50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>
                            {tr.qualityLabel}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Saving for {tr.years} year{tr.years !== 1 ? 's' : ''} in {tr.location}
                        </p>
                      </div>
                      <div className="px-6 py-5 bg-white/60">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Saving Time</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {tr.years} yr{tr.years !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Home Value</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(tr.homeValue)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Home Size</p>
                            <p className="text-2xl font-bold text-gray-900">{formatSqft(tr.homeSizeSqft)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <SimpleHomeCarousel
                      location={tr.location}
                      targetPrice={tr.homeValue}
                      priceRange={50000}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Search by Size results */}
          {searchMode === 'size' && sizeResults.length > 0 && (
            <div className="space-y-6">
              {sizeResults.map((sr) => {
                const colors = getQualityColor(sr.quality);
                return (
                  <div key={sr.quality} className="space-y-4">
                    <div className={`${colors.bg} border ${colors.border} rounded-2xl overflow-hidden`}>
                      <div className="px-6 py-4 border-b border-gray-100/50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>
                            {sr.qualityLabel}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Time to a {sr.homeSizeSqft.toLocaleString()} sqft home in {sr.location}
                        </p>
                      </div>
                      <div className="px-6 py-5 bg-white/60">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Estimated Time</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {sr.years} yr{sr.years !== 1 ? 's' : ''}
                            </p>
                            <p className="text-[10px] text-gray-400">{sr.months} months</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Home Value</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(sr.homeValue)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Home Size</p>
                            <p className="text-2xl font-bold text-gray-900">{formatSqft(sr.homeSizeSqft)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <SimpleHomeCarousel
                      location={sr.location}
                      targetPrice={sr.homeValue}
                      priceRange={50000}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* ===== IF YOU WANT A LARGER HOUSE ===== */}
          {recommendations.length > 0 && (
            <div className="mt-8">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-gray-900">If You Want A Larger House</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Based on your profile and filters, here are locations where you could get a bigger home for your money
                </p>
              </div>

              <div className="flex flex-col gap-4">
                {recommendations.map((rec) => {
                  const stateName = getStateNameFromLocation(rec.location);
                  const flagPath = stateName ? getStateFlagPath(stateName) : null;

                  return (
                    <button
                      key={rec.location}
                      onClick={() => {
                        setSelectedLocation(rec.location);
                        setCalculated(false);
                        setPendingRecalc(true);
                      }}
                      className="text-left bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200 group cursor-pointer"
                      style={{ borderLeftWidth: '4px', borderLeftColor: '#5BA4E5' }}
                    >
                      <div className="px-5 py-4 flex items-center justify-between gap-4">
                        {/* Left side: flag + location info */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {flagPath && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={flagPath}
                              alt={`${stateName} flag`}
                              className="shrink-0 w-10 h-7 object-cover rounded border border-gray-200 mt-0.5"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          )}
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-gray-900 truncate group-hover:text-[#5BA4E5] transition-colors">
                              {rec.location}
                            </h3>
                            {/* Comparison metrics */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1">
                              <span className={`text-xs font-semibold flex items-center gap-1 ${rec.valueDiff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  {rec.valueDiff >= 0
                                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                                  }
                                </svg>
                                {rec.valueDiff >= 0 ? '+' : ''}{formatCurrency(rec.valueDiff)} home value
                              </span>
                              <span className={`text-xs font-semibold flex items-center gap-1 ${rec.sizeDiff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  {rec.sizeDiff >= 0
                                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                                  }
                                </svg>
                                {rec.sizeDiff >= 0 ? '+' : ''}{rec.sizeDiff.toLocaleString()} sqft
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right side: projected home size + value caption */}
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-500">Projected Size</p>
                          <p className="text-2xl font-bold text-gray-900">{formatSqft(rec.homeSizeSqft)}</p>
                          <p className="text-xs text-gray-400">{formatCurrency(rec.homeValue)}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state when not calculated */}
      {!calculated && !calcLoading && (
        <div className="text-center py-12 text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <p className="text-lg font-medium text-gray-500 mb-1">
            {searchMode === 'time'
              ? 'Enter how long you plan to save and select a location'
              : 'Enter your target home size and select a location'}
          </p>
          <p className="text-sm text-gray-400">Click Calculate to see your results</p>
        </div>
      )}
    </div>
  );
}

// Result card component similar to max home value card on profile page
function ResultCard({
  title,
  homeValue,
  homeSizeSqft,
  location,
  accentColor,
}: {
  title: string;
  homeValue: number;
  homeSizeSqft: number;
  location: string;
  accentColor: string;
}) {
  const stateName = getStateNameFromLocation(location);
  const flagPath = stateName ? getStateFlagPath(stateName) : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-gray-50" style={{ borderLeftWidth: '4px', borderLeftColor: accentColor }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{location}</p>
          </div>
          {flagPath && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={flagPath} alt={`${stateName} flag`}
              className="shrink-0 w-12 h-8 object-cover rounded border border-gray-200"
              onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          )}
        </div>
      </div>
      <div className="px-6 py-5">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-gray-500 mb-1">Max Home Value</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(homeValue)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Estimated Home Size</p>
            <p className="text-3xl font-bold" style={{ color: accentColor }}>{formatSqft(homeSizeSqft)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
