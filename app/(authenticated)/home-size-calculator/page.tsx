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
  const [timeResults, setTimeResults] = useState<TimeResult | null>(null);
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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target as Node)) {
        setLocationDropdownOpen(false);
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
          let homeValue = 0;
          if (years <= 3 && proj.threeYears?.canAfford) {
            homeValue = proj.threeYears.maxSustainableHousePrice * (years / 3);
          } else if (years <= 5 && proj.fiveYears?.canAfford) {
            homeValue = proj.fiveYears.maxSustainableHousePrice * (years / 5);
          } else if (years <= 10 && proj.tenYears?.canAfford) {
            homeValue = proj.tenYears.maxSustainableHousePrice * (years / 10);
          } else if (years <= 15 && proj.fifteenYears?.canAfford) {
            homeValue = proj.fifteenYears.maxSustainableHousePrice * (years / 15);
          } else if (proj.maxAffordable?.canAfford) {
            const maxYears = proj.maxAffordable.year;
            homeValue = proj.maxAffordable.maxSustainableHousePrice * Math.min(1, years / maxYears);
          }

          // More accurate: recalculate using simulation year
          const simulation = result.yearByYear;
          const targetYear = Math.min(Math.ceil(years), simulation.length);
          const snapshot = simulation[targetYear - 1] || simulation[simulation.length - 1];
          if (snapshot) {
            const pricePerSqft = getPricePerSqft(selectedLocation);
            const savings = snapshot.savingsNoMortgage;
            // Rough estimate: home price = savings / 0.15 (down payment ~15%)
            const roughHomeValue = savings / 0.15;
            if (roughHomeValue > homeValue) homeValue = roughHomeValue;
          }

          // Use the actual projection if available
          if (proj.maxAffordable?.canAfford && years >= proj.maxAffordable.year) {
            homeValue = proj.maxAffordable.maxSustainableHousePrice;
          }

          const homeSizeSqft = estimateHomeSizeSqft(homeValue, selectedLocation);

          setTimeResults({
            homeValue,
            homeSizeSqft,
            location: selectedLocation,
            years: Math.round(years * 10) / 10,
          });
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
          setTimeResults(null);
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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Home Size Calculator</h1>
        <p className="text-gray-600">Calculate how big of a house you can afford or how long it takes to reach your target</p>
      </div>

      {/* ===== SEARCH BAR SECTION ===== */}
      <div className="bg-[#E8F5E9] rounded-2xl p-6 border border-[#C8E6C9] shadow-sm">
        {/* Search mode toggle */}
        <div className="flex bg-white rounded-xl p-1 mb-5 max-w-md mx-auto shadow-sm">
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
        <div className="flex flex-wrap gap-4 mb-4">
          {/* Quality Filter */}
          {searchMode === 'size' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Quality</label>
              <div className="flex gap-1.5">
                {(['nice', 'average', 'any'] as QualityFilter[]).map(q => (
                  <button key={q} onClick={() => toggleQuality(q)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      qualityFilters.includes(q)
                        ? `${getQualityColor(q).bg} ${getQualityColor(q).text} ${getQualityColor(q).border}`
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}>
                    {q === 'nice' ? 'Nice Area' : q === 'average' ? 'Average' : 'Any Area'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Home Preference */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Home Preference</label>
            <div className="flex gap-1.5">
              {(['house', 'apartment', 'any'] as HomePreference[]).map(p => (
                <button key={p} onClick={() => setHomePreference(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    homePreference === p
                      ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
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
          {/* Search by Time result */}
          {searchMode === 'time' && timeResults && (
            <div className="space-y-4">
              <ResultCard
                title={`Saving for ${timeResults.years} year${timeResults.years !== 1 ? 's' : ''} in ${timeResults.location}`}
                homeValue={timeResults.homeValue}
                homeSizeSqft={timeResults.homeSizeSqft}
                location={timeResults.location}
                accentColor="#5BA4E5"
              />
              <SimpleHomeCarousel
                location={timeResults.location}
                targetPrice={timeResults.homeValue}
                priceRange={50000}
              />
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
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900">If You Want A Larger House</h2>
                <p className="text-sm text-gray-600">
                  {isCity(selectedLocation)
                    ? 'Compare with other cities where you could get more home for your money'
                    : 'Compare with other locations where you could get more home for your money'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      className="text-left bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer"
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-bold text-gray-900 truncate group-hover:text-[#5BA4E5] transition-colors">
                              {rec.location}
                            </h3>
                            {/* Value comparison */}
                            <div className="flex flex-col gap-0.5 mt-1">
                              <span className={`text-xs font-semibold ${rec.valueDiff > 0 ? 'text-green-600' : rec.valueDiff < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                {rec.valueDiff > 0 ? '+' : ''}{formatCurrency(rec.valueDiff)} value
                              </span>
                              <span className={`text-xs font-semibold ${rec.sizeDiff > 0 ? 'text-green-600' : rec.sizeDiff < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                {rec.sizeDiff > 0 ? '+' : ''}{rec.sizeDiff.toLocaleString()} sqft
                              </span>
                            </div>
                          </div>
                          {flagPath && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={flagPath}
                              alt={`${stateName} flag`}
                              className="shrink-0 w-12 h-8 object-cover rounded border border-gray-200"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          )}
                        </div>

                        {/* Home size on right */}
                        <div className="flex items-end justify-between mt-3 pt-3 border-t border-gray-100">
                          <div>
                            <p className="text-xs text-gray-500">Home Value</p>
                            <p className="text-lg font-bold text-gray-900">{formatCurrency(rec.homeValue)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Projected Size</p>
                            <p className="text-lg font-bold text-[#8B5CF6]">{formatSqft(rec.homeSizeSqft)}</p>
                          </div>
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
