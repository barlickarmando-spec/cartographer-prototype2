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

const VIABILITY_NUMERIC: Record<string, number> = {
  'very-viable-stable': 9.5,
  'viable': 8.0,
  'viable-higher-allocation': 6.5,
  'viable-extreme-care': 5.0,
  'viable-when-renting': 4.0,
  'no-viable-path': 2.0,
};

function getViabilityLabel(classification: string): { label: string; color: string; bgColor: string; barColor: string } {
  const labels: Record<string, { label: string; color: string; bgColor: string; barColor: string }> = {
    'very-viable-stable': { label: 'Very Viable & Stable', color: '#059669', bgColor: '#D1FAE5', barColor: '#10B981' },
    'viable': { label: 'Viable', color: '#2563EB', bgColor: '#DBEAFE', barColor: '#3B82F6' },
    'viable-higher-allocation': { label: 'Viable (Higher Allocation)', color: '#D97706', bgColor: '#FEF3C7', barColor: '#F59E0B' },
    'viable-extreme-care': { label: 'Viable (Extreme Care)', color: '#DC2626', bgColor: '#FEE2E2', barColor: '#EF4444' },
    'viable-when-renting': { label: 'Viable When Renting', color: '#7C3AED', bgColor: '#EDE9FE', barColor: '#8B5CF6' },
    'no-viable-path': { label: 'Not Viable', color: '#DC2626', bgColor: '#FEE2E2', barColor: '#EF4444' },
  };
  return labels[classification] || labels['no-viable-path'];
}

function getQualityOfLifeLabel(di: number): { label: string; color: string; bgColor: string } {
  if (di >= 30000) return { label: 'Excellent', color: '#059669', bgColor: '#D1FAE5' };
  if (di >= 15000) return { label: 'Very Good', color: '#2563EB', bgColor: '#DBEAFE' };
  if (di >= 5000) return { label: 'Good', color: '#0891B2', bgColor: '#CFFAFE' };
  if (di >= 0) return { label: 'Fair', color: '#D97706', bgColor: '#FEF3C7' };
  return { label: 'Challenging', color: '#DC2626', bgColor: '#FEE2E2' };
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
  const numericScore = VIABILITY_NUMERIC[result.viabilityClassification] || 2.0;
  const barPercent = (numericScore / 10) * 100;
  const salary = getSalary(result.location, occupation);
  const col = (result.locationData.adjustedCOL as Record<string, number>)[colKey] || 0;
  const qualityOfLife = result.yearByYear[0]?.disposableIncome ?? 0;
  const qol = getQualityOfLifeLabel(qualityOfLife);
  const fastestToHome = result.yearsToMortgage > 0 ? `${result.yearsToMortgage} years` : 'N/A';
  const debtFree = result.yearsToDebtFree > 0 ? `${result.yearsToDebtFree} years` : 'Debt-free';

  const proj3 = result.houseProjections.threeYears;
  const proj5 = result.houseProjections.fiveYears;
  const proj10 = result.houseProjections.tenYears;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col">
      {/* Gradient Header */}
      <div className="relative bg-gradient-to-br from-[#5BA4E5] to-[#3B82C4] px-5 pt-5 pb-4">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 400 200" fill="none">
            <circle cx="350" cy="30" r="80" fill="white" opacity="0.3" />
            <circle cx="380" cy="60" r="50" fill="white" opacity="0.2" />
            <circle cx="30" cy="170" r="40" fill="white" opacity="0.15" />
          </svg>
        </div>

        <div className="relative flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-white/80 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              {isCurrent && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/25 text-white uppercase tracking-wider">
                  Current
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-white truncate">{result.location}</h3>
          </div>

          {/* Score Badge */}
          <div className="ml-3 shrink-0 w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-white leading-none">{numericScore.toFixed(1)}</span>
            <span className="text-[9px] text-white/70 font-medium uppercase">Score</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pt-4 pb-2 flex-1 flex flex-col">
        {/* Viability Rating with Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Viability Rating</span>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ backgroundColor: viability.bgColor, color: viability.color }}
            >
              {viability.label}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${barPercent}%`, backgroundColor: viability.barColor }}
            />
          </div>
        </div>

        {/* Metrics */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-[#5BA4E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm text-gray-600">Estimated Salary</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{formatCurrency(salary)}/yr</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FEF3C7] flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-[#D97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
              </div>
              <span className="text-sm text-gray-600">Cost of Living</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{formatCurrency(col)}/yr</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#D1FAE5] flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
              <span className="text-sm text-gray-600">Quality of Life</span>
            </div>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ backgroundColor: qol.bgColor, color: qol.color }}
            >
              {qol.label}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#EDE9FE] flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-[#7C3AED]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
                </svg>
              </div>
              <span className="text-sm text-gray-600">Fastest to Home</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{fastestToHome}</span>
          </div>
        </div>

        {/* Bottom Section: Debt Free + Home Projections */}
        <div className="bg-[#F8FAFB] rounded-xl p-4 space-y-3 mt-auto border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#5BA4E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Debt Freedom</span>
            </div>
            <span className="text-sm font-bold text-[#5BA4E5]">{debtFree}</span>
          </div>

          {(proj3?.canAfford || proj5 || proj10) && (
            <div className="pt-2 border-t border-gray-200/60">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Home Value Projections</p>
              <div className="grid grid-cols-3 gap-2">
                {proj3?.canAfford && (
                  <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
                    <p className="text-[10px] font-medium text-gray-400 uppercase">3 Year</p>
                    <p className="text-xs font-bold text-gray-800 mt-0.5">{formatCurrency(proj3.maxSustainableHousePrice)}</p>
                  </div>
                )}
                {proj5 && (
                  <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
                    <p className="text-[10px] font-medium text-gray-400 uppercase">5 Year</p>
                    <p className="text-xs font-bold text-gray-800 mt-0.5">{formatCurrency(proj5.maxSustainableHousePrice)}</p>
                  </div>
                )}
                {proj10 && (
                  <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
                    <p className="text-[10px] font-medium text-gray-400 uppercase">10 Year</p>
                    <p className="text-xs font-bold text-gray-800 mt-0.5">{formatCurrency(proj10.maxSustainableHousePrice)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-4 pb-1">
          <button
            onClick={(e) => { e.preventDefault(); onToggleSave(); }}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              isSaved
                ? 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100'
                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
            }`}
            title={isSaved ? 'Remove from saved' : 'Save location'}
          >
            {isSaved ? (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            )}
            {isSaved ? 'Saved' : 'Save'}
          </button>

          {isCurrent ? (
            <Link
              href="/profile"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#5BA4E5] text-white rounded-lg hover:bg-[#4A93D4] transition-colors text-xs font-medium"
            >
              View Full Overview
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          ) : (
            <Link
              href="/profile"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#5BA4E5] text-white rounded-lg hover:bg-[#4A93D4] transition-colors text-xs font-medium"
            >
              View Details
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          )}
        </div>
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

    const alreadyExists = userResults.find(r => r.location === locationLabel)
      || suggestedResults.find(r => r.location === locationLabel)
      || searchResultsList.find(r => r.location === locationLabel);
    if (alreadyExists) return;

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

  const filterButtons: { mode: FilterMode; label: string; icon: React.ReactNode }[] = [
    {
      mode: 'all',
      label: 'All Locations',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
    },
    {
      mode: 'saved',
      label: `Saved${savedLocationNames.length > 0 ? ` (${savedLocationNames.length})` : ''}`,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      ),
    },
    {
      mode: 'most-recommended',
      label: 'Most Recommended',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      ),
    },
    {
      mode: 'most-affordable',
      label: 'Most Affordable',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredResults.length === 0 ? (
        <div className="col-span-full text-center py-16">
          <div className="w-16 h-16 rounded-full bg-[#EFF6FF] flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#5BA4E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">
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
      <div className="space-y-10">
        {/* Search Results */}
        {uniqueSearchResults.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                <svg className="w-4 h-4 text-[#5BA4E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-800">Search Results</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {uniqueSearchResults.map(renderCard)}
            </div>
          </section>
        )}

        {/* Current Location */}
        {currentResult && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                <svg className="w-4 h-4 text-[#5BA4E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-800">Your Current Location</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {renderCard(currentResult)}
            </div>
          </section>
        )}

        {/* Your Locations */}
        {otherUserResults.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                <svg className="w-4 h-4 text-[#5BA4E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-800">Your Locations</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherUserResults.map(renderCard)}
            </div>
          </section>
        )}

        {/* Suggested For You */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
              <svg className="w-4 h-4 text-[#5BA4E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-800">Suggested For You</h2>
          </div>
          {suggestionsLoading ? (
            <div className="flex items-center gap-3 py-12 justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5BA4E5]"></div>
              <span className="text-gray-500 text-sm">Finding the best locations for you...</span>
            </div>
          ) : suggestedResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggestedResults.map(renderCard)}
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-4">No additional suggestions available.</p>
          )}
        </section>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">My Locations</h1>
        <p className="text-gray-500">Find the best cities for your career, lifestyle, and financial goals</p>
      </div>

      {/* Filter Bar + Search */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex flex-col gap-4">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {filterButtons.map(btn => (
              <button
                key={btn.mode}
                onClick={() => setFilter(btn.mode)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === btn.mode
                    ? 'bg-[#5BA4E5] text-white shadow-sm'
                    : 'bg-[#F8FAFB] text-gray-600 hover:bg-[#EFF6FF] hover:text-[#5BA4E5] border border-gray-200'
                }`}
              >
                {btn.icon}
                {btn.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div ref={searchRef} className="relative">
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => { if (searchDropdown.length > 0) setShowDropdown(true); }}
                placeholder="Search any location..."
                className="w-full pl-11 pr-4 py-2.5 bg-[#F8FAFB] border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#5BA4E5]/30 focus:border-[#5BA4E5] focus:bg-white outline-none transition-all"
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
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#F8FAFB] transition-colors first:rounded-t-xl last:rounded-b-xl flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-[#5BA4E5] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
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
        </div>
      </div>

      {/* Results */}
      {filter === 'all' ? renderSections() : renderFlatGrid()}
    </div>
  );
}
