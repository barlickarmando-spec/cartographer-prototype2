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

type SortMode = 'default' | 'saved' | 'most-viable' | 'most-affordable' | 'most-recommended' | 'greatest-value' | 'quality-of-life' | 'fastest-home-ownership' | 'highest-projected-home-value' | 'fastest-debt-free' | 'most-viable-raising-kids';
// ===== CONSTANTS =====

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'saved', label: 'Saved' },
  { value: 'most-viable', label: 'Most Viable' },
  { value: 'most-affordable', label: 'Most Affordable' },
  { value: 'most-recommended', label: 'Most Recommended' },
  { value: 'greatest-value', label: 'Greatest Value (QoL / Affordability)' },
  { value: 'quality-of-life', label: 'Quality of Life' },
  { value: 'fastest-home-ownership', label: 'Fastest Time to Home Ownership' },
  { value: 'highest-projected-home-value', label: 'Highest Projected Home Value' },
  { value: 'fastest-debt-free', label: 'Fastest Time to Debt Free' },
  { value: 'most-viable-raising-kids', label: 'Most Viable for Raising Kids' },
];

// ===== LOCATION FILTER DATA =====

const REGIONS: Record<string, string[]> = {
  'South': ['Florida', 'Georgia', 'Alabama', 'North Carolina', 'South Carolina', 'Tennessee', 'Kentucky', 'Louisiana', 'Arkansas', 'Mississippi', 'Oklahoma', 'Texas'],
  'Southwest': ['California', 'Nevada', 'Utah', 'Colorado', 'New Mexico', 'Arizona', 'Wyoming'],
  'Pacific Northwest': ['Washington', 'Oregon', 'Idaho', 'Montana'],
  'West Coast': ['Oregon', 'California', 'Washington'],
  'North East': ['Maine', 'New Hampshire', 'Massachusetts', 'Vermont', 'New York', 'Rhode Island', 'Connecticut', 'New Jersey', 'Pennsylvania', 'Delaware'],
  'Mid Atlantic': ['Maryland', 'Virginia', 'Delaware', 'District of Columbia', 'West Virginia', 'New York', 'New Jersey', 'Pennsylvania'],
  'Middle America': ['Oklahoma', 'Kansas', 'Nebraska', 'North Dakota', 'South Dakota', 'Wyoming', 'Arkansas', 'Missouri', 'Iowa'],
  'Midwest': ['Ohio', 'Illinois', 'Iowa', 'Indiana', 'Michigan', 'Minnesota', 'Wisconsin', 'Missouri', 'North Dakota', 'South Dakota'],
  'East Coast': ['Maine', 'New Hampshire', 'Massachusetts', 'Rhode Island', 'Connecticut', 'New York', 'New Jersey', 'Delaware', 'Maryland', 'Virginia', 'North Carolina', 'South Carolina', 'Georgia', 'Florida'],
  'Continental United States': [], // special: all except Alaska & Hawaii
  'Non-Continental United States': ['Alaska', 'Hawaii'],
};

const WEATHER_CATEGORIES: Record<string, { states: string[]; cities: string[] }> = {
  'Extreme Heat (No Snow)': { states: ['Florida', 'Hawaii'], cities: [] },
  'Strong Heat': { states: ['Arizona', 'Nevada', 'New Mexico'], cities: ['Anaheim', 'Los Angeles', 'San Diego', 'El Paso'] },
  'Relative Heat': { states: ['Texas', 'Georgia', 'Alabama', 'Mississippi', 'Louisiana', 'South Carolina', 'Arkansas', 'Oklahoma', 'District of Columbia'], cities: ['Fresno'] },
  'Average': { states: ['Missouri', 'Kentucky', 'Kansas', 'Tennessee', 'North Carolina', 'Maryland', 'Virginia', 'Delaware', 'New Jersey', 'Pennsylvania', 'Ohio'], cities: ['San Jose', 'San Francisco'] },
  'Cold': { states: ['Colorado', 'Utah', 'Idaho', 'Oregon', 'Washington', 'Illinois', 'Indiana', 'New York', 'Connecticut', 'Rhode Island', 'Massachusetts', 'West Virginia'], cities: [] },
  'Extreme Cold': { states: ['Alaska', 'Minnesota', 'Wisconsin', 'Michigan', 'North Dakota', 'South Dakota', 'Montana', 'Wyoming', 'Vermont', 'New Hampshire', 'Maine'], cities: [] },
};

const ALL_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois',
  'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
  'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
  'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
];

type FilterSection = { header: string; items: { value: string; label: string }[] };

const FILTER_SECTIONS: FilterSection[] = [
  {
    header: 'Show',
    items: [
      { value: 'all', label: 'All Locations' },
      { value: 'saved', label: 'Your Locations' },
      { value: 'other', label: 'Other Locations' },
    ],
  },
  {
    header: 'Type',
    items: [
      { value: 'type:states', label: 'States' },
      { value: 'type:cities', label: 'Cities' },
    ],
  },
  {
    header: 'Regions',
    items: Object.keys(REGIONS).map(r => ({ value: `region:${r}`, label: r })),
  },
  {
    header: 'Weather',
    items: Object.keys(WEATHER_CATEGORIES).map(w => ({ value: `weather:${w}`, label: w })),
  },
  {
    header: 'States',
    items: ALL_STATES.map(s => ({ value: `state:${s}`, label: s })),
  },
];

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

// ===== LOCATION FILTER HELPERS =====

function getLocationState(locationName: string): string {
  // Cities have format "City, State" — extract the state
  const commaIdx = locationName.lastIndexOf(', ');
  if (commaIdx >= 0) return locationName.substring(commaIdx + 2);
  // States/territories are the name itself
  return locationName;
}

function isCity(locationName: string): boolean {
  return locationName.includes(', ');
}

function matchesLocationFilter(locationName: string, filter: string): boolean {
  if (filter === 'all' || filter === 'saved' || filter === 'other') return true;

  if (filter === 'type:states') {
    return !isCity(locationName) || locationName === 'District of Columbia';
  }
  if (filter === 'type:cities') {
    return isCity(locationName) || locationName === 'District of Columbia';
  }

  if (filter.startsWith('region:')) {
    const regionName = filter.substring(7);
    if (regionName === 'Continental United States') {
      const state = getLocationState(locationName);
      return state !== 'Alaska' && state !== 'Hawaii';
    }
    const regionStates = REGIONS[regionName];
    if (!regionStates) return false;
    const state = getLocationState(locationName);
    return regionStates.includes(state);
  }

  if (filter.startsWith('weather:')) {
    const weatherName = filter.substring(8);
    const category = WEATHER_CATEGORIES[weatherName];
    if (!category) return false;
    const state = getLocationState(locationName);
    if (category.states.includes(state)) return true;
    if (isCity(locationName)) {
      const cityName = locationName.split(', ')[0];
      if (category.cities.includes(cityName)) return true;
    }
    return false;
  }

  if (filter.startsWith('state:')) {
    const stateName = filter.substring(6);
    const state = getLocationState(locationName);
    return state === stateName || locationName === stateName;
  }

  return true;
}

function getFilterLabel(filter: string): string {
  for (const section of FILTER_SECTIONS) {
    const item = section.items.find(i => i.value === filter);
    if (item) return item.label;
  }
  return 'All Locations';
}

function isGeographicFilter(filter: string): boolean {
  return filter.startsWith('type:') || filter.startsWith('region:') || filter.startsWith('weather:') || filter.startsWith('state:');
}

function sortByViability(a: CalculationResult, b: CalculationResult): number {
  const scoreDiff = (VIABILITY_SCORE[b.viabilityClassification] || 0) - (VIABILITY_SCORE[a.viabilityClassification] || 0);
  if (scoreDiff !== 0) return scoreDiff;
  const aYears = a.yearsToMortgage > 0 ? a.yearsToMortgage : 999;
  const bYears = b.yearsToMortgage > 0 ? b.yearsToMortgage : 999;
  return aYears - bYears;
}

function applySortMode(results: CalculationResult[], mode: SortMode, colKey: string): CalculationResult[] {
  switch (mode) {
    case 'most-viable':
    case 'most-recommended':
      return [...results].sort(sortByViability);
    case 'most-affordable':
      return [...results].sort((a, b) => {
        const aCOL = (a.locationData.adjustedCOL as Record<string, number>)[colKey] || 0;
        const bCOL = (b.locationData.adjustedCOL as Record<string, number>)[colKey] || 0;
        return aCOL - bCOL;
      });
    case 'greatest-value':
      return [...results].sort((a, b) => {
        const aQoL = a.yearByYear[0]?.disposableIncome ?? 0;
        const bQoL = b.yearByYear[0]?.disposableIncome ?? 0;
        const aCOL = (a.locationData.adjustedCOL as Record<string, number>)[colKey] || 1;
        const bCOL = (b.locationData.adjustedCOL as Record<string, number>)[colKey] || 1;
        return (bQoL / bCOL) - (aQoL / aCOL);
      });
    case 'quality-of-life':
      return [...results].sort((a, b) => {
        return (b.yearByYear[0]?.disposableIncome ?? 0) - (a.yearByYear[0]?.disposableIncome ?? 0);
      });
    case 'fastest-home-ownership':
      return [...results].sort((a, b) => {
        const aYears = a.yearsToMortgage > 0 ? a.yearsToMortgage : 999;
        const bYears = b.yearsToMortgage > 0 ? b.yearsToMortgage : 999;
        return aYears - bYears;
      });
    case 'highest-projected-home-value': {
      const getMaxHome = (r: CalculationResult) => {
        const proj = r.houseProjections.maxAffordable || r.houseProjections.fifteenYears || r.houseProjections.tenYears || r.houseProjections.fiveYears || r.houseProjections.threeYears;
        return proj?.canAfford ? proj.maxSustainableHousePrice : 0;
      };
      return [...results].sort((a, b) => getMaxHome(b) - getMaxHome(a));
    }
    case 'fastest-debt-free':
      return [...results].sort((a, b) => {
        const aYears = a.yearsToDebtFree > 0 ? a.yearsToDebtFree : 999;
        const bYears = b.yearsToDebtFree > 0 ? b.yearsToDebtFree : 999;
        return aYears - bYears;
      });
    case 'most-viable-raising-kids':
      return [...results].sort((a, b) => {
        const aScore = (VIABILITY_SCORE[a.viabilityClassification] || 0) * 2
          + (a.yearByYear[0]?.disposableIncome ?? 0) / 10000
          + (a.yearsToMortgage > 0 ? (30 - a.yearsToMortgage) / 30 : 0);
        const bScore = (VIABILITY_SCORE[b.viabilityClassification] || 0) * 2
          + (b.yearByYear[0]?.disposableIncome ?? 0) / 10000
          + (b.yearsToMortgage > 0 ? (30 - b.yearsToMortgage) / 30 : 0);
        return bScore - aScore;
      });
    default:
      return results;
  }
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
  const qol = getQualityOfLifeLabel(qualityOfLife);
  const fastestToHome = result.yearsToMortgage > 0 ? `${result.yearsToMortgage} yr${result.yearsToMortgage !== 1 ? 's' : ''}` : 'N/A';
  const debtFree = result.yearsToDebtFree > 0 ? `${result.yearsToDebtFree} yr${result.yearsToDebtFree !== 1 ? 's' : ''}` : 'Debt-free';

  // Max home value: use maxAffordable first, then fall back to longest available projection
  const maxProj = result.houseProjections.maxAffordable
    || result.houseProjections.fifteenYears
    || result.houseProjections.tenYears
    || result.houseProjections.fiveYears
    || result.houseProjections.threeYears;
  const maxHomeValue = maxProj?.canAfford ? maxProj.maxSustainableHousePrice : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col shadow-sm">
      {/* ===== TOP SECTION ===== */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-gray-900 truncate">{result.location}</h3>
              {isCurrent && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF6FF] text-[#5BA4E5] uppercase tracking-wider shrink-0">
                  Current
                </span>
              )}
            </div>
            {/* Viability Badge */}
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: viability.bgColor, color: viability.color }}
            >
              {viability.label}
            </span>
          </div>

          {/* Wishlist Heart */}
          <button
            onClick={(e) => { e.preventDefault(); onToggleSave(); }}
            className="ml-3 shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ backgroundColor: isSaved ? '#FEE2E2' : '#F3F4F6' }}
            title={isSaved ? 'Remove from saved' : 'Save location'}
          >
            {isSaved ? (
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ===== MIDDLE SECTION: 2x2 Stats Grid ===== */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Estimated Salary */}
          <div className="bg-[#F0FDF4] rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-[#DCFCE7] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#16A34A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-500">Est. Salary</span>
            </div>
            <p className="text-sm font-bold text-gray-900 pl-9">{formatCurrency(salary)}/yr</p>
          </div>

          {/* Cost of Living */}
          <div className="bg-[#FFFBEB] rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-[#FEF3C7] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#D97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-500">Cost of Living</span>
            </div>
            <p className="text-sm font-bold text-gray-900 pl-9">{formatCurrency(col)}/yr</p>
          </div>

          {/* Quality of Life */}
          <div className="bg-[#EFF6FF] rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-[#DBEAFE] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-500">Quality of Life</span>
            </div>
            <p className="pl-9">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ backgroundColor: qol.bgColor, color: qol.color }}
              >
                {qol.label}
              </span>
            </p>
          </div>

          {/* Fastest to Home */}
          <div className="bg-[#F5F3FF] rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-[#EDE9FE] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#7C3AED]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-500">Fastest to Home</span>
            </div>
            <p className="text-sm font-bold text-gray-900 pl-9">{fastestToHome}</p>
          </div>
        </div>
      </div>

      {/* ===== BOTTOM SECTION ===== */}
      <div className="mt-auto border-t border-gray-100">
        <div className="px-6 py-4 bg-[#FAFBFC] space-y-3">
          {/* Time to Debt Free */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#5BA4E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-600">Time to Debt Free</span>
            </div>
            <span className="text-sm font-bold text-[#5BA4E5]">{debtFree}</span>
          </div>

          {/* Projected Home Value */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#16A34A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Max Home Value</span>
                <p className="text-[10px] text-gray-400 leading-tight">When saved as long as possible</p>
              </div>
            </div>
            <span className="text-sm font-bold text-[#16A34A]">{maxHomeValue ? formatCurrency(maxHomeValue) : 'N/A'}</span>
          </div>
        </div>

        {/* View Detailed Analysis Button */}
        <div className="px-6 pb-5 pt-2 bg-[#FAFBFC]">
          <Link
            href="/profile"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5BA4E5] text-white rounded-xl hover:bg-[#4A93D4] transition-colors text-sm font-semibold"
          >
            View Detailed Analysis
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
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

  // All-locations calculation (for full-dataset sorting)
  const [allCalculatedResults, setAllCalculatedResults] = useState<CalculationResult[]>([]);
  const [allCalcLoading, setAllCalcLoading] = useState(false);
  const [visibleOtherCount, setVisibleOtherCount] = useState(6);
  const [visibleDefaultCount, setVisibleDefaultCount] = useState(6);

  // UI state
  const [loading, setLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [showMode, setShowMode] = useState('all');
  const [browseAll, setBrowseAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDropdown, setSearchDropdown] = useState<{ label: string; rawName: string }[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [showDropdownOpen, setShowDropdownOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const showDropdownRef = useRef<HTMLDivElement>(null);
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

  // ===== CALCULATE ALL LOCATIONS (for full-dataset sorting or browse) =====
  useEffect(() => {
    // Calculate when an active sort is selected, browse mode is on, or geographic filter is active
    const needsFullCalc = browseAll || (sortMode !== 'default' && sortMode !== 'saved') || isGeographicFilter(showMode);
    if (!needsFullCalc || allCalculatedResults.length > 0 || !profile) return;

    setAllCalcLoading(true);

    // Use setTimeout to avoid blocking the UI thread
    setTimeout(() => {
      try {
        const allOptions = getAllLocationOptions();
        const results: CalculationResult[] = [];

        for (const loc of allOptions) {
          // Skip if already cached
          const cached = searchCacheRef.current.get(loc.label);
          if (cached) {
            results.push(cached);
            continue;
          }

          try {
            const result = calculateAutoApproach(profile, loc.label, 30);
            if (result) {
              results.push(result);
              searchCacheRef.current.set(loc.label, result);
            }
          } catch {
            // skip failed calculations
          }
        }

        setAllCalculatedResults(results);
      } catch (error) {
        console.error('Error calculating all locations:', error);
      }
      setAllCalcLoading(false);
    }, 50);
  }, [sortMode, showMode, browseAll, allCalculatedResults.length, profile]);

  // Reset pagination when sort or show mode changes
  useEffect(() => {
    setVisibleOtherCount(6);
    setVisibleDefaultCount(6);
  }, [sortMode, showMode, browseAll]);

  // ===== CLOSE DROPDOWNS ON OUTSIDE CLICK =====
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setSortDropdownOpen(false);
      }
      if (showDropdownRef.current && !showDropdownRef.current.contains(e.target as Node)) {
        setShowDropdownOpen(false);
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
      setShowSearchDropdown(false);
      return;
    }
    const matches = searchLocations(query, 8);
    setSearchDropdown(matches.map(m => ({ label: m.label, rawName: m.rawName })));
    setShowSearchDropdown(matches.length > 0);
  }, []);

  const handleSelectSearchResult = useCallback((locationLabel: string) => {
    setShowSearchDropdown(false);
    setSearchQuery('');

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
    try {
      const result = calculateAutoApproach(profile, locationLabel, 30);
      if (result) {
        searchCacheRef.current.set(locationLabel, result);
        setSearchResultsList(prev => [result, ...prev.filter(r => r.location !== locationLabel)]);
      }
    } catch (error) {
      console.error('Error calculating search result:', error);
    }
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

  // Combine user-selected locations (onboarding + suggestions + search)
  const userCombinedResults = [...userResults, ...suggestedResults, ...searchResultsList];
  const userDeduped = userCombinedResults.reduce<CalculationResult[]>((acc, r) => {
    if (!acc.find(existing => existing.location === r.location)) acc.push(r);
    return acc;
  }, []);

  // Full dataset: merge allCalculatedResults with user results (allCalc takes priority for coverage)
  const fullDataset = allCalculatedResults.length > 0
    ? allCalculatedResults.reduce<CalculationResult[]>((acc, r) => {
        if (!acc.find(existing => existing.location === r.location)) acc.push(r);
        return acc;
      }, [...userDeduped])
    : userDeduped;

  // Determine active sort mode
  const isActiveSortMode = sortMode !== 'default' && sortMode !== 'saved';
  const hasGeoFilter = isGeographicFilter(showMode);

  // For active sorts, browse mode, or geographic filters: use the full dataset
  const baseResults = (isActiveSortMode || browseAll || hasGeoFilter) ? fullDataset : userDeduped;

  // Step 1: Apply show/location filter
  let visibleResults: CalculationResult[];
  if (showMode === 'saved') {
    visibleResults = baseResults.filter(r => savedLocationNames.includes(r.location));
  } else if (showMode === 'other') {
    visibleResults = baseResults.filter(r => !savedLocationNames.includes(r.location));
  } else if (hasGeoFilter) {
    visibleResults = baseResults.filter(r => matchesLocationFilter(r.location, showMode));
  } else {
    visibleResults = baseResults;
  }

  // Step 2: Apply sort mode
  let finalResults: CalculationResult[];
  if (sortMode === 'saved') {
    finalResults = visibleResults.filter(r => savedLocationNames.includes(r.location));
  } else if (sortMode === 'default') {
    finalResults = visibleResults;
  } else {
    finalResults = applySortMode(visibleResults, sortMode, colKey);
  }

  // For default + all (non-browse): pin current location first
  if (sortMode === 'default' && showMode === 'all' && !browseAll) {
    const currentIdx = finalResults.findIndex(r => r.location === currentLocation);
    if (currentIdx > 0) {
      const [current] = finalResults.splice(currentIdx, 1);
      finalResults.unshift(current);
    }
  }

  // Browse mode: exclude saved locations so you discover new ones
  if (browseAll && showMode === 'all') {
    finalResults = finalResults.filter(r => !savedLocationNames.includes(r.location));
  }

  // Always show flat list when 'all' is selected (no saved/other grouping)
  const shouldShowGrouped = false;

  // Grouped section splits: saved = hearted locations, other = everything else from full dataset
  const savedSorted = finalResults.filter(r => savedLocationNames.includes(r.location));
  const otherSorted = finalResults.filter(r => !savedLocationNames.includes(r.location));

  // Section splits for default view
  const userLocationNames = new Set(userResults.map(r => r.location));
  const suggestedLocationNames = new Set(suggestedResults.map(r => r.location));

  // Button active states
  const isAllActive = sortMode === 'default' && showMode === 'all' && !browseAll;
  const isBrowseActive = browseAll && sortMode === 'default';
  const isSavedActive = sortMode === 'saved';
  const isRecommendedActive = sortMode === 'most-recommended';

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

  const renderEmptyState = (message: string) => (
    <div className="col-span-full text-center py-16">
      <div className="w-16 h-16 rounded-full bg-[#EFF6FF] flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-[#5BA4E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      </div>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );

  // Flat grid for filtered/sorted views (with pagination for large datasets)
  const renderFlatGrid = () => {
    const visibleItems = finalResults.length > 6 ? finalResults.slice(0, visibleOtherCount) : finalResults;
    const hasMore = visibleOtherCount < finalResults.length;

    return (
      <div>
        {allCalcLoading ? (
          <div className="flex items-center gap-3 py-16 justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#5BA4E5]"></div>
            <span className="text-gray-500 text-sm">Calculating all locations...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {visibleItems.length === 0
              ? renderEmptyState(
                  sortMode === 'saved' || showMode === 'saved'
                    ? 'No saved locations yet. Click the heart on any location to save it.'
                    : showMode === 'other'
                    ? 'No other locations to show.'
                    : isGeographicFilter(showMode)
                    ? `No locations found for "${getFilterLabel(showMode)}".`
                    : 'No locations to show.'
                )
              : visibleItems.map(renderCard)}
          </div>
        )}
        {hasMore && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => setVisibleOtherCount(prev => prev + 6)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-[#EFF6FF] hover:text-[#5BA4E5] hover:border-[#5BA4E5]/30 transition-all"
            >
              See More
              <span className="text-xs text-gray-400">({finalResults.length - visibleOtherCount} remaining)</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>
        )}
      </div>
    );
  };

  // Grouped view: saved section + other section (used when a sort is active)
  const renderGroupedGrid = () => {
    const visibleOther = otherSorted.slice(0, visibleOtherCount);
    const hasMoreOther = visibleOtherCount < otherSorted.length;

    return (
      <div className="space-y-10">
        {/* Your Saved Locations */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#FEE2E2] flex items-center justify-center">
              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-800">Your Saved Locations</h2>
            <span className="text-xs text-gray-400 ml-1">({savedSorted.length})</span>
          </div>
          {savedSorted.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {savedSorted.map(renderCard)}
            </div>
          ) : (
            <div className="text-center py-8 bg-[#F8FAFB] rounded-xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-sm">No saved locations yet. Click the heart on any location to save it.</p>
            </div>
          )}
        </section>

        {/* Other Locations */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
              <svg className="w-4 h-4 text-[#5BA4E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-800">Other Locations</h2>
            <span className="text-xs text-gray-400 ml-1">({otherSorted.length})</span>
          </div>
          {allCalcLoading ? (
            <div className="flex items-center gap-3 py-12 justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5BA4E5]"></div>
              <span className="text-gray-500 text-sm">Calculating all locations...</span>
            </div>
          ) : visibleOther.length > 0 ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {visibleOther.map(renderCard)}
              </div>
              {hasMoreOther && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => setVisibleOtherCount(prev => prev + 6)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-[#EFF6FF] hover:text-[#5BA4E5] hover:border-[#5BA4E5]/30 transition-all"
                  >
                    See More
                    <span className="text-xs text-gray-400">({otherSorted.length - visibleOtherCount} remaining)</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 bg-[#F8FAFB] rounded-xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-sm">No other locations to show.</p>
            </div>
          )}
        </section>
      </div>
    );
  };

  // Sectioned view for 'all' mode
  const renderSections = () => {
    const currentResult = userResults.find(r => r.location === currentLocation);
    const otherUserResults = userResults.filter(r => r.location !== currentLocation);
    const uniqueSearchResults = searchResultsList.filter(
      r => !userLocationNames.has(r.location) && !suggestedLocationNames.has(r.location)
    );

    // Combine all non-search, non-current results for paginated display
    const allSectionResults = [...otherUserResults, ...suggestedResults].reduce<CalculationResult[]>((acc, r) => {
      if (!acc.find(existing => existing.location === r.location) && r.location !== currentLocation) {
        acc.push(r);
      }
      return acc;
    }, []);
    const visibleSectionResults = allSectionResults.slice(0, visibleDefaultCount);
    const hasMoreDefault = visibleDefaultCount < allSectionResults.length;

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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderCard(currentResult)}
            </div>
          </section>
        )}

        {/* Your Locations (paginated) */}
        {allSectionResults.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                <svg className="w-4 h-4 text-[#5BA4E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-800">Your Locations</h2>
              <span className="text-xs text-gray-400 ml-1">({allSectionResults.length})</span>
            </div>
            {suggestionsLoading ? (
              <div className="flex items-center gap-3 py-12 justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5BA4E5]"></div>
                <span className="text-gray-500 text-sm">Finding the best locations for you...</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {visibleSectionResults.map(renderCard)}
                </div>
                {hasMoreDefault && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() => setVisibleDefaultCount(prev => prev + 6)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-[#EFF6FF] hover:text-[#5BA4E5] hover:border-[#5BA4E5]/30 transition-all"
                    >
                      See More
                      <span className="text-xs text-gray-400">({allSectionResults.length - visibleDefaultCount} remaining)</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>
    );
  };

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortMode)?.label || 'Default';
  const currentShowLabel = getFilterLabel(showMode);

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
          {/* Top Row: Quick Buttons + Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* My Locations Button */}
            <button
              onClick={() => { setSortMode('default'); setShowMode('all'); setBrowseAll(false); }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isAllActive
                  ? 'bg-[#5BA4E5] text-white shadow-sm'
                  : 'bg-[#F8FAFB] text-gray-600 hover:bg-[#EFF6FF] hover:text-[#5BA4E5] border border-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              My Locations
            </button>

            {/* Browse All Button */}
            <button
              onClick={() => { setSortMode('default'); setShowMode('all'); setBrowseAll(true); }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isBrowseActive
                  ? 'bg-[#5BA4E5] text-white shadow-sm'
                  : 'bg-[#F8FAFB] text-gray-600 hover:bg-[#EFF6FF] hover:text-[#5BA4E5] border border-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
              Browse
            </button>

            {/* Saved Button */}
            <button
              onClick={() => { setSortMode('saved'); setShowMode('all'); setBrowseAll(false); }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isSavedActive
                  ? 'bg-[#5BA4E5] text-white shadow-sm'
                  : 'bg-[#F8FAFB] text-gray-600 hover:bg-[#EFF6FF] hover:text-[#5BA4E5] border border-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              Saved{savedLocationNames.length > 0 ? ` (${savedLocationNames.length})` : ''}
            </button>

            {/* Most Recommended Button */}
            <button
              onClick={() => { setSortMode('most-recommended'); setShowMode('all'); setBrowseAll(false); }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isRecommendedActive
                  ? 'bg-[#5BA4E5] text-white shadow-sm'
                  : 'bg-[#F8FAFB] text-gray-600 hover:bg-[#EFF6FF] hover:text-[#5BA4E5] border border-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
              Most Recommended
            </button>

            {/* Divider */}
            <div className="hidden sm:block w-px h-8 bg-gray-200 mx-1"></div>

            {/* Sort By Dropdown */}
            <div ref={sortDropdownRef} className="relative">
              <button
                onClick={() => { setSortDropdownOpen(!sortDropdownOpen); setShowDropdownOpen(false); }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  sortMode !== 'default'
                    ? 'bg-[#EFF6FF] text-[#5BA4E5] border-[#5BA4E5]/30'
                    : 'bg-[#F8FAFB] text-gray-600 hover:bg-[#EFF6FF] hover:text-[#5BA4E5] border-gray-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-3L16.5 18m0 0L12 13.5m4.5 4.5V4.5" />
                </svg>
                <span className="hidden sm:inline">Sort:</span> {currentSortLabel}
                <svg className={`w-3.5 h-3.5 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {sortDropdownOpen && (
                <div className="absolute z-20 right-0 sm:left-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {SORT_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortMode(option.value);
                        setSortDropdownOpen(false);
                        setBrowseAll(false);
                        if (option.value === 'default') setShowMode('all');
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                        sortMode === option.value
                          ? 'bg-[#EFF6FF] text-[#5BA4E5] font-medium'
                          : 'text-gray-700 hover:bg-[#F8FAFB]'
                      }`}
                    >
                      {option.label}
                      {sortMode === option.value && (
                        <svg className="w-4 h-4 text-[#5BA4E5] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter by Location Dropdown */}
            <div ref={showDropdownRef} className="relative">
              <button
                onClick={() => { setShowDropdownOpen(!showDropdownOpen); setSortDropdownOpen(false); }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  showMode !== 'all'
                    ? 'bg-[#EFF6FF] text-[#5BA4E5] border-[#5BA4E5]/30'
                    : 'bg-[#F8FAFB] text-gray-600 hover:bg-[#EFF6FF] hover:text-[#5BA4E5] border-gray-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                </svg>
                <span className="hidden sm:inline">Filter:</span> {currentShowLabel}
                <svg className={`w-3.5 h-3.5 transition-transform ${showDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {showDropdownOpen && (
                <div className="absolute z-20 right-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg max-h-[480px] overflow-y-auto">
                  {FILTER_SECTIONS.map(section => (
                    <div key={section.header}>
                      <div className="sticky top-0 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        {section.header}
                      </div>
                      {section.items.map(item => (
                        <button
                          key={item.value}
                          onClick={() => {
                            setShowMode(item.value);
                            setShowDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                            showMode === item.value
                              ? 'bg-[#EFF6FF] text-[#5BA4E5] font-medium'
                              : 'text-gray-700 hover:bg-[#F8FAFB]'
                          }`}
                        >
                          {item.label}
                          {showMode === item.value && (
                            <svg className="w-4 h-4 text-[#5BA4E5] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                onFocus={() => { if (searchDropdown.length > 0) setShowSearchDropdown(true); }}
                placeholder="Search any location..."
                className="w-full pl-11 pr-4 py-2.5 bg-[#F8FAFB] border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#5BA4E5]/30 focus:border-[#5BA4E5] focus:bg-white outline-none transition-all"
              />
              {searchLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#5BA4E5]"></div>
                </div>
              )}
            </div>

            {/* Search Dropdown */}
            {showSearchDropdown && searchDropdown.length > 0 && (
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
      {sortMode === 'default' && showMode === 'all' && !browseAll
        ? renderSections()
        : renderFlatGrid()}
    </div>
  );
}
