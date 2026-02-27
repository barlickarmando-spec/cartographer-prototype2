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
import { estimateHomeSizeSqft } from '@/lib/home-value-lookup';
import { getStateFlagPath, getStateNameFromLocation } from '@/lib/state-flags';

// ===== TYPES =====

type SortMode = 'default' | 'saved' | 'most-viable' | 'most-affordable' | 'most-recommended' | 'greatest-value' | 'quality-of-life' | 'fastest-home-ownership' | 'largest-home-size' | 'fastest-debt-free' | 'most-viable-raising-kids';
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
  { value: 'largest-home-size', label: 'Largest Home Size' },
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

// Full state name → abbreviation mapping (used for matching cities to states)
const STATE_TO_ABBREV: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'District of Columbia': 'DC',
  'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL',
  'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA',
  'Maine': 'ME', 'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN',
  'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK', 'Oregon': 'OR',
  'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD',
  'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA',
  'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
};

// Reverse mapping: abbreviation → full state name (e.g., "FL" → "Florida")
const ABBREV_TO_STATE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_TO_ABBREV).map(([full, abbr]) => [abbr, full])
);

type FilterItem = { value: string; label: string };

const SHOW_OPTIONS: FilterItem[] = [
  { value: 'all', label: 'All Locations' },
  { value: 'saved', label: 'Your Locations' },
  { value: 'other', label: 'Other Locations' },
];

const REGION_OPTIONS: FilterItem[] = [
  { value: 'all', label: 'All Regions' },
  ...Object.keys(REGIONS).map(r => ({ value: `region:${r}`, label: r })),
];

const WEATHER_OPTIONS: FilterItem[] = [
  { value: 'all', label: 'All Weather' },
  ...Object.keys(WEATHER_CATEGORIES).map(w => ({ value: `weather:${w}`, label: w })),
];

const TYPE_OPTIONS: FilterItem[] = [
  { value: 'all', label: 'All (States & Cities)' },
  { value: 'states', label: 'States Only' },
  { value: 'cities', label: 'Cities Only' },
];

// ===== HELPERS =====

// Viability label derived from house size classification (the only displayed badge)
function getViabilityLabel(result: CalculationResult): { label: string; viabilityStatus: string; houseSize: string; color: string; bgColor: string; barColor: string } {
  const classification = result.houseClassification || 'viable-medium-house';
  const labels: Record<string, { label: string; viabilityStatus: string; houseSize: string; color: string; bgColor: string; barColor: string }> = {
    'very-viable-stable-large-house': { label: 'Very Viable and Stable: Large House', viabilityStatus: 'Very Viable and Stable', houseSize: 'Large House', color: '#065F46', bgColor: '#A7F3D0', barColor: '#059669' },
    'viable-large-house': { label: 'Viable: Large House', viabilityStatus: 'Viable', houseSize: 'Large House', color: '#059669', bgColor: '#D1FAE5', barColor: '#10B981' },
    'very-viable-stable-medium-house': { label: 'Very Viable and Stable: Medium House', viabilityStatus: 'Very Viable and Stable', houseSize: 'Medium House', color: '#059669', bgColor: '#D1FAE5', barColor: '#10B981' },
    'viable-medium-house': { label: 'Viable: Medium House', viabilityStatus: 'Viable', houseSize: 'Medium House', color: '#2563EB', bgColor: '#DBEAFE', barColor: '#3B82F6' },
    'somewhat-viable-small-house': { label: 'Somewhat Viable: Small House', viabilityStatus: 'Somewhat Viable', houseSize: 'Small House', color: '#0891B2', bgColor: '#CFFAFE', barColor: '#06B6D4' },
  };

  // For non-viable / renting-only, override with structural labels
  if (result.viabilityClassification === 'no-viable-path') {
    return { label: 'Not Viable', viabilityStatus: 'Not Viable', houseSize: '', color: '#DC2626', bgColor: '#FEE2E2', barColor: '#EF4444' };
  }
  if (result.viabilityClassification === 'viable-when-renting') {
    return { label: 'Viable When Renting', viabilityStatus: 'Viable When Renting', houseSize: '', color: '#7C3AED', bgColor: '#EDE9FE', barColor: '#8B5CF6' };
  }
  if (result.viabilityClassification === 'viable-extreme-care') {
    const base = labels[classification];
    return { label: base?.label || 'Viable (Extreme Care)', viabilityStatus: 'Viable (Extreme Care)', houseSize: base?.houseSize || '', color: '#D97706', bgColor: '#FEF3C7', barColor: '#F59E0B' };
  }
  if (result.viabilityClassification === 'viable-higher-allocation') {
    const base = labels[classification];
    return { label: base?.label || 'Viable (Higher Allocation)', viabilityStatus: 'Viable (Higher Allocation)', houseSize: base?.houseSize || '', color: '#D97706', bgColor: '#FEF3C7', barColor: '#F59E0B' };
  }

  return labels[classification] || labels['viable-medium-house'];
}

// Convert 0-10 score to 0-5 star rating
function getStarRating(score: number): number {
  return Math.round((score / 10) * 5 * 2) / 2; // half-star increments
}

// Render 5-star display from a 0-5 value
function StarRating({ rating }: { rating: number }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      // Full star
      stars.push(
        <svg key={i} className="w-4 h-4 text-[#FACC15]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    } else if (rating >= i - 0.5) {
      // Half star
      stars.push(
        <svg key={i} className="w-4 h-4" viewBox="0 0 24 24">
          <defs>
            <linearGradient id={`half-${i}`}>
              <stop offset="50%" stopColor="#FACC15" />
              <stop offset="50%" stopColor="#4B5563" />
            </linearGradient>
          </defs>
          <path fill={`url(#half-${i})`} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    } else {
      // Empty star
      stars.push(
        <svg key={i} className="w-4 h-4 text-[#4B5563]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    }
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
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

  if (filter === 'type:all') return true;
  if (filter === 'type:states') {
    return !isCity(locationName) || locationName === 'District of Columbia';
  }
  if (filter === 'type:cities') {
    return isCity(locationName) || locationName === 'District of Columbia';
  }

  if (filter.startsWith('region:')) {
    const regionName = filter.substring(7);
    const locState = getLocationState(locationName);
    // Resolve abbreviation to full name for cities (e.g., "FL" → "Florida")
    const fullStateName = ABBREV_TO_STATE[locState] || locState;
    if (regionName === 'Continental United States') {
      return fullStateName !== 'Alaska' && fullStateName !== 'Hawaii';
    }
    const regionStates = REGIONS[regionName];
    if (!regionStates) return false;
    return regionStates.includes(fullStateName);
  }

  if (filter.startsWith('weather:')) {
    const weatherName = filter.substring(8);
    const category = WEATHER_CATEGORIES[weatherName];
    if (!category) return false;
    const locState = getLocationState(locationName);
    const fullStateName = ABBREV_TO_STATE[locState] || locState;
    // Match if the location's state is in the weather category
    if (category.states.includes(fullStateName)) return true;
    // Also match explicitly listed cities
    if (isCity(locationName)) {
      const cityName = locationName.split(', ')[0];
      if (category.cities.includes(cityName)) return true;
    }
    return false;
  }

  if (filter.startsWith('state:')) {
    const stateName = filter.substring(6);
    if (locationName === stateName) return true; // exact match for the state itself
    const locationState = getLocationState(locationName);
    // Match full name OR abbreviation (cities use abbreviations like "FL")
    const abbrev = STATE_TO_ABBREV[stateName];
    return locationState === stateName || (!!abbrev && locationState === abbrev);
  }

  if (filter.startsWith('city:')) {
    const cityLabel = filter.substring(5);
    return locationName === cityLabel;
  }

  return true;
}

function getGeoFilterLabel(filter: string): string {
  if (filter === 'all') return 'All';
  if (filter.startsWith('region:')) {
    const name = filter.substring(7);
    return name;
  }
  if (filter.startsWith('weather:')) return filter.substring(8);
  if (filter.startsWith('state:')) return filter.substring(6);
  if (filter.startsWith('city:')) return filter.substring(5);
  return 'All';
}

function hasActiveGeoFilter(geoFilters: string[]): boolean {
  return geoFilters.length > 0;
}

function hasAnyGeoFilter(typeFilter: string, geoFilters: string[]): boolean {
  return typeFilter !== 'all' || geoFilters.length > 0;
}

function matchesAnyGeoFilter(locationName: string, geoFilters: string[]): boolean {
  if (geoFilters.length === 0) return true;
  return geoFilters.some(f => matchesLocationFilter(locationName, f));
}

function toggleGeoFilter(current: string[], value: string): string[] {
  if (current.includes(value)) {
    return current.filter(v => v !== value);
  }
  return [...current, value];
}

function sortByViability(a: CalculationResult, b: CalculationResult): number {
  // Primary: numeric score (analog — 8.7 beats 8.6)
  const numDiff = (b.numericScore ?? 0) - (a.numericScore ?? 0);
  if (Math.abs(numDiff) > 0.001) return numDiff;
  // Tiebreaker: years to mortgage
  const aYears = a.yearsToMortgage > 0 ? a.yearsToMortgage : 999;
  const bYears = b.yearsToMortgage > 0 ? b.yearsToMortgage : 999;
  return aYears - bYears;
}

function applySortMode(results: CalculationResult[], mode: SortMode, colKey: string): CalculationResult[] {
  // Helper: wrap any comparator so non-viable locations always sink to the bottom
  const viableFirst = (cmp: (a: CalculationResult, b: CalculationResult) => number) =>
    (a: CalculationResult, b: CalculationResult): number => {
      const aViable = a.viabilityClassification !== 'no-viable-path' ? 0 : 1;
      const bViable = b.viabilityClassification !== 'no-viable-path' ? 0 : 1;
      if (aViable !== bViable) return aViable - bViable;
      return cmp(a, b);
    };

  switch (mode) {
    case 'most-viable':
    case 'most-recommended':
      return [...results].sort(viableFirst(sortByViability));
    case 'most-affordable':
      return [...results].sort(viableFirst((a, b) => {
        const aCOL = (a.locationData.adjustedCOL as Record<string, number>)[colKey] || 0;
        const bCOL = (b.locationData.adjustedCOL as Record<string, number>)[colKey] || 0;
        return aCOL - bCOL;
      }));
    case 'greatest-value':
      return [...results].sort(viableFirst((a, b) => {
        const aQoL = a.yearByYear[0]?.disposableIncome ?? 0;
        const bQoL = b.yearByYear[0]?.disposableIncome ?? 0;
        const aCOL = (a.locationData.adjustedCOL as Record<string, number>)[colKey] || 1;
        const bCOL = (b.locationData.adjustedCOL as Record<string, number>)[colKey] || 1;
        return (bQoL / bCOL) - (aQoL / aCOL);
      }));
    case 'quality-of-life':
      return [...results].sort(viableFirst((a, b) => {
        return (b.yearByYear[0]?.disposableIncome ?? 0) - (a.yearByYear[0]?.disposableIncome ?? 0);
      }));
    case 'fastest-home-ownership':
      return [...results].sort(viableFirst((a, b) => {
        const aYears = a.yearsToMortgage > 0 ? a.yearsToMortgage : 999;
        const bYears = b.yearsToMortgage > 0 ? b.yearsToMortgage : 999;
        return aYears - bYears;
      }));
    case 'largest-home-size': {
      const getMaxSqft = (r: CalculationResult) => {
        if (r.projectedSqFt > 0) return r.projectedSqFt;
        const proj = r.houseProjections.maxAffordable || r.houseProjections.fifteenYears || r.houseProjections.tenYears || r.houseProjections.fiveYears || r.houseProjections.threeYears;
        return proj?.canAfford ? estimateHomeSizeSqft(proj.maxSustainableHousePrice, r.location) : 0;
      };
      return [...results].sort(viableFirst((a, b) => getMaxSqft(b) - getMaxSqft(a)));
    }
    case 'fastest-debt-free':
      return [...results].sort(viableFirst((a, b) => {
        const aYears = a.yearsToDebtFree > 0 ? a.yearsToDebtFree : 999;
        const bYears = b.yearsToDebtFree > 0 ? b.yearsToDebtFree : 999;
        return aYears - bYears;
      }));
    case 'most-viable-raising-kids':
      return [...results].sort(viableFirst((a, b) => {
        const aScore = (a.numericScore ?? 0) * 2
          + (a.yearByYear[0]?.disposableIncome ?? 0) / 10000
          + (a.yearsToMortgage > 0 ? (30 - a.yearsToMortgage) / 30 : 0);
        const bScore = (b.numericScore ?? 0) * 2
          + (b.yearByYear[0]?.disposableIncome ?? 0) / 10000
          + (b.yearsToMortgage > 0 ? (30 - b.yearsToMortgage) / 30 : 0);
        return bScore - aScore;
      }));
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
  const viability = getViabilityLabel(result);
  const salary = getSalary(result.location, occupation);
  const col = (result.locationData.adjustedCOL as Record<string, number>)[colKey] || 0;
  const qualityOfLife = result.yearByYear[0]?.disposableIncome ?? 0;
  const qol = getQualityOfLifeLabel(qualityOfLife);
  const fastestToHome = result.yearsToMortgage > 0 ? `${result.yearsToMortgage} yr${result.yearsToMortgage !== 1 ? 's' : ''}` : 'N/A';
  const debtFree = result.yearsToDebtFree > 0 ? `${result.yearsToDebtFree} yr${result.yearsToDebtFree !== 1 ? 's' : ''}` : 'Debt-free';
  const starRating = getStarRating(result.numericScore ?? 0);

  // Projected home value: use maxAffordable first, then fall back to longest available projection
  const maxProj = result.houseProjections.maxAffordable
    || result.houseProjections.fifteenYears
    || result.houseProjections.tenYears
    || result.houseProjections.fiveYears
    || result.houseProjections.threeYears;
  const projectedHomeValue = maxProj?.canAfford ? maxProj.maxSustainableHousePrice : null;
  const projectedHomeSizeSqft = projectedHomeValue ? estimateHomeSizeSqft(projectedHomeValue, result.location) : null;


  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col shadow-sm">
      {/* ===== TOP SECTION ===== */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              {/* Row 1: Location name + Viability status badge */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h3 className="text-lg font-bold text-gray-900 truncate">{result.location}</h3>
                {isCurrent && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF6FF] text-[#5BA4E5] uppercase tracking-wider shrink-0">
                    Current
                  </span>
                )}
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shrink-0"
                  style={{ backgroundColor: viability.bgColor, color: viability.color }}
                >
                  {viability.viabilityStatus}
                </span>
              </div>
              {/* Row 2: Star rating + House size classification */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <StarRating rating={starRating} />
                  <span className="text-xs font-medium text-gray-400">{starRating.toFixed(1)}</span>
                </div>
                {viability.houseSize && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="text-xs font-semibold" style={{ color: viability.color }}>{viability.houseSize}</span>
                  </>
                )}
              </div>
            </div>

            {/* State Flag */}
            {(() => {
              const stateName = getStateNameFromLocation(result.location);
              if (!stateName) return null;
              return (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={getStateFlagPath(stateName)}
                  alt={`${stateName} flag`}
                  className="shrink-0 w-14 h-9 object-cover rounded border border-gray-200 mt-1"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              );
            })()}
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
          {/* Estimated Salary — $ icon (green box) */}
          <div className="bg-[#F0FDF4] rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-[#DCFCE7] flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-[#16A34A]">$</span>
              </div>
              <span className="text-xs font-medium text-gray-500">Est. Salary</span>
            </div>
            {result.yearByYear[0]?.partnerIncome > 0 ? (
              <div className="flex items-baseline gap-1.5 pl-9 flex-wrap">
                <span className="text-[11px] font-semibold text-gray-500">{formatCurrency(result.yearByYear[0].userIncome)}</span>
                <span className="text-[10px] text-gray-300">|</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(result.yearByYear[0].totalIncome)}/yr</span>
              </div>
            ) : (
              <p className="text-sm font-bold text-gray-900 pl-9">{formatCurrency(salary)}/yr</p>
            )}
          </div>

          {/* Cost of Living — trend line icon (green) */}
          <div className="bg-[#F0FDF4] rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-[#DCFCE7] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#16A34A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-500">Cost of Living</span>
            </div>
            <p className="text-sm font-bold text-gray-900 pl-9">{formatCurrency(col + (result.yearByYear[0]?.housingCost || 0))}/yr</p>
          </div>

          {/* Quality of Life — heart/smile icon (Figma: warm brown/olive) */}
          <div className="bg-[#FEF9F0] rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-[#FDF0D5] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#B45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
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

          {/* Fastest to Home — house icon (Figma: orange/brown) */}
          <div className="bg-[#FFF7ED] rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-[#FFEDD5] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#C2410C]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
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
                <span className="text-sm font-medium text-gray-600">Projected Home Value</span>
                <p className="text-[10px] text-gray-400 leading-tight">When saved as long as possible</p>
              </div>
            </div>
            <span className="text-sm font-bold text-[#16A34A]">{projectedHomeValue ? formatCurrency(projectedHomeValue) : 'N/A'}</span>
          </div>

          {/* Projected Home Size */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#F5F3FF] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#8B5CF6]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Projected Home Size</span>
                <p className="text-[10px] text-gray-400 leading-tight">Estimated from projected value</p>
              </div>
            </div>
            <span className="text-sm font-bold text-[#8B5CF6]">{projectedHomeSizeSqft ? `~${projectedHomeSizeSqft.toLocaleString()} sqft` : 'N/A'}</span>
          </div>
        </div>

        {/* View Detailed Analysis Button */}
        <div className="px-6 pb-5 pt-2 bg-[#FAFBFC]">
          <Link
            href="/profile"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7C3AED] text-white rounded-xl hover:bg-[#6D28D9] transition-colors text-sm font-semibold"
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
  const [showFilter, setShowFilter] = useState('all');       // 'all' | 'saved' | 'other'
  const [typeFilter, setTypeFilter] = useState('all');       // 'all' | 'states' | 'cities'
  const [geoFilters, setGeoFilters] = useState<string[]>([]);  // multi-select: ['region:X', 'weather:Y', ...] or [] for all
  const [browseAll, setBrowseAll] = useState(false);
  const [showStatesInDropdown, setShowStatesInDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDropdown, setSearchDropdown] = useState<{ label: string; rawName: string }[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [activeSearchLocation, setActiveSearchLocation] = useState<string | null>(null);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [showDropdownOpen, setShowDropdownOpen] = useState(false);
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [selectedStateInDropdown, setSelectedStateInDropdown] = useState<string | null>(null);
  const [activeFiltersDropdownOpen, setActiveFiltersDropdownOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const showDropdownRef = useRef<HTMLDivElement>(null);
  const stateDropdownRef = useRef<HTMLDivElement>(null);
  const activeFiltersRef = useRef<HTMLDivElement>(null);
  const searchCacheRef = useRef<Map<string, CalculationResult>>(new Map());

  // ===== LOAD DATA =====
  useEffect(() => {
    const stored = localStorage.getItem('calculation-results');
    if (!stored) {
      router.push('/onboarding');
      return;
    }

    try {
      let results: CalculationResult[] = JSON.parse(stored);

      // Detect stale cached results (missing numericScore from 3-layer system)
      // and recalculate them with fresh engine — runs once then re-caches
      const isStale = results.length > 0 && results[0].numericScore === undefined;

      const answers = getOnboardingAnswers<OnboardingAnswers>(
        (d): d is OnboardingAnswers => d != null && typeof d === 'object'
      );

      if (isStale && answers) {
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
      }

      setUserResults(results);

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
      } else {
        // Build minimal profile from defaults so filters/sorts can work
        const fallback = normalizeOnboardingAnswers({} as OnboardingAnswers);
        setProfile(fallback);
        setColKey(getAdjustedCOLKey(fallback.householdType));
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
  // When the user has very few results (e.g. "know-exactly" with 1 location),
  // generate more suggestions so the page isn't sparse.
  useEffect(() => {
    if (!profile) return;

    setSuggestionsLoading(true);

    setTimeout(() => {
      try {
        const existingLocations = new Set(userResults.map(r => r.location));
        const allOptions = getAllLocationOptions()
          .filter(o => o.type === 'state' && !existingLocations.has(o.label));

        // When user has few results, sample more candidates for richer suggestions
        const sampleSize = userResults.length <= 3 ? 20 : 8;
        const showCount = userResults.length <= 3 ? 6 : 3;

        const step = Math.max(1, Math.floor(allOptions.length / sampleSize));
        const candidates = allOptions.filter((_, i) => i % step === 0).slice(0, sampleSize);

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
        setSuggestedResults(suggestions.slice(0, showCount));
      } catch (error) {
        console.error('Error generating suggestions:', error);
      }
      setSuggestionsLoading(false);
    }, 50);
  }, [profile, userResults]);

  // ===== CALCULATE ALL LOCATIONS (for full-dataset sorting or browse) =====
  useEffect(() => {
    // Calculate when an active sort is selected, browse mode is on, geographic filter is active, or a search location is focused
    const needsFullCalc = browseAll || (sortMode !== 'default' && sortMode !== 'saved') || hasAnyGeoFilter(typeFilter, geoFilters) || !!activeSearchLocation;
    if (!needsFullCalc || !profile) return;
    if (allCalculatedResults.length > 0) return;

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
  }, [sortMode, showFilter, typeFilter, geoFilters, browseAll, activeSearchLocation, allCalculatedResults.length, profile]);

  // Reset pagination when sort or filter changes
  useEffect(() => {
    setVisibleOtherCount(6);
    setVisibleDefaultCount(6);
  }, [sortMode, showFilter, typeFilter, geoFilters, browseAll]);

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
        setSelectedStateInDropdown(null);
      }
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(e.target as Node)) {
        setStateDropdownOpen(false);
      }
      if (activeFiltersRef.current && !activeFiltersRef.current.contains(e.target as Node)) {
        setActiveFiltersDropdownOpen(false);
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
    // Clear active search filter when user starts a new search
    setActiveSearchLocation(null);
    const matches = searchLocations(query, 8);
    setSearchDropdown(matches.map(m => ({ label: m.label, rawName: m.rawName })));
    setShowSearchDropdown(matches.length > 0);
  }, []);

  const handleSelectSearchResult = useCallback((locationLabel: string) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    setActiveSearchLocation(locationLabel);

    // Check if already calculated somewhere
    const alreadyExists = userResults.find(r => r.location === locationLabel)
      || suggestedResults.find(r => r.location === locationLabel)
      || searchResultsList.find(r => r.location === locationLabel)
      || allCalculatedResults.find(r => r.location === locationLabel);
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
  }, [profile, userResults, suggestedResults, searchResultsList, allCalculatedResults]);

  const clearSearchFilter = useCallback(() => {
    setActiveSearchLocation(null);
  }, []);

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

  // ===== STATE → CITIES MAPPING (for state dropdown) =====
  // Build a mapping of full state name → list of city labels (e.g., "Miami, FL")
  const stateCitiesMap = (() => {
    const map: Record<string, string[]> = {};
    const allOptions = getAllLocationOptions();
    for (const opt of allOptions) {
      if (opt.type === 'city' && opt.state) {
        // opt.state is abbreviation (e.g., "FL"), find matching full name
        const fullName = Object.entries(STATE_TO_ABBREV).find(([, abbr]) => abbr === opt.state)?.[0];
        if (fullName) {
          if (!map[fullName]) map[fullName] = [];
          map[fullName].push(opt.label);
        }
      }
    }
    return map;
  })();

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
  const hasGeoOrTypeFilter = hasAnyGeoFilter(typeFilter, geoFilters);

  // For active sorts, browse mode, or geographic/type filters: use the full dataset
  const baseResults = (isActiveSortMode || browseAll || hasGeoOrTypeFilter) ? fullDataset : userDeduped;

  // Step 1: Apply all independent filters
  let visibleResults: CalculationResult[] = baseResults;

  // Apply show filter (saved/other/all)
  if (showFilter === 'saved') {
    visibleResults = visibleResults.filter(r => savedLocationNames.includes(r.location));
  } else if (showFilter === 'other') {
    visibleResults = visibleResults.filter(r => !savedLocationNames.includes(r.location));
  }

  // Apply type filter (states/cities/all)
  if (typeFilter === 'states') {
    visibleResults = visibleResults.filter(r => matchesLocationFilter(r.location, 'type:states'));
  } else if (typeFilter === 'cities') {
    visibleResults = visibleResults.filter(r => matchesLocationFilter(r.location, 'type:cities'));
  }

  // Apply geographic filters (region/weather/state/city — OR logic across selections)
  if (hasActiveGeoFilter(geoFilters)) {
    visibleResults = visibleResults.filter(r => matchesAnyGeoFilter(r.location, geoFilters));
  }

  // Step 2: Apply sort mode (non-viable always sink to the bottom)
  const pushNonViableToBottom = (arr: CalculationResult[]) => {
    const viable = arr.filter(r => r.viabilityClassification !== 'no-viable-path');
    const nonViable = arr.filter(r => r.viabilityClassification === 'no-viable-path');
    return [...viable, ...nonViable];
  };

  let finalResults: CalculationResult[];
  if (sortMode === 'saved') {
    finalResults = pushNonViableToBottom(visibleResults.filter(r => savedLocationNames.includes(r.location)));
  } else if (sortMode === 'default') {
    finalResults = pushNonViableToBottom(visibleResults);
  } else {
    finalResults = applySortMode(visibleResults, sortMode, colKey);
  }

  // For default + all filters (non-browse): pin current location first
  const allFiltersDefault = showFilter === 'all' && typeFilter === 'all' && geoFilters.length === 0;
  if (sortMode === 'default' && allFiltersDefault && !browseAll) {
    const currentIdx = finalResults.findIndex(r => r.location === currentLocation);
    if (currentIdx > 0) {
      const [current] = finalResults.splice(currentIdx, 1);
      finalResults.unshift(current);
    }
  }

  // Browse mode: exclude saved locations so you discover new ones
  if (browseAll && allFiltersDefault) {
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
  const isAllActive = sortMode === 'default' && allFiltersDefault && !browseAll;
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
                  sortMode === 'saved' || showFilter === 'saved'
                    ? 'No saved locations yet. Click the heart on any location to save it.'
                    : showFilter === 'other'
                    ? 'No other locations to show.'
                    : hasGeoOrTypeFilter
                    ? `No locations found for the current filters.`
                    : 'No locations to show.'
                )
              : visibleItems.map(renderCard)}
          </div>
        )}
        {hasMore && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => setVisibleOtherCount(prev => prev + 6)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-[#EDE9FE] hover:text-[#7C3AED] hover:border-[#7C3AED]/30 transition-all"
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
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-[#EDE9FE] hover:text-[#7C3AED] hover:border-[#7C3AED]/30 transition-all"
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

  // Search result focused view: shows the selected location + similar locations
  const renderSearchView = () => {
    if (!activeSearchLocation) return null;

    // Find the result for the actively searched location from all available data
    const searchedResult = fullDataset.find(r => r.location === activeSearchLocation)
      || searchResultsList.find(r => r.location === activeSearchLocation);

    if (!searchedResult) return null;

    // Determine the state of the searched location for finding similar ones
    const searchedState = getLocationState(activeSearchLocation);
    const searchedFullState = ABBREV_TO_STATE[searchedState] || searchedState;

    // Find the region(s) this location belongs to
    const locationRegions = Object.entries(REGIONS).filter(([, states]) =>
      states.includes(searchedFullState)
    ).map(([name]) => name);

    // Find similar locations: same state first, then same region(s)
    const sameStateResults = fullDataset.filter(r =>
      r.location !== activeSearchLocation && (() => {
        const rState = getLocationState(r.location);
        const rFullState = ABBREV_TO_STATE[rState] || rState;
        return rFullState === searchedFullState || rState === searchedFullState;
      })()
    );

    const sameRegionResults = fullDataset.filter(r =>
      r.location !== activeSearchLocation
      && !sameStateResults.find(s => s.location === r.location)
      && (() => {
        const rState = getLocationState(r.location);
        const rFullState = ABBREV_TO_STATE[rState] || rState;
        return locationRegions.some(region => (REGIONS[region] || []).includes(rFullState));
      })()
    );

    const similarResults = [...sameStateResults, ...sameRegionResults].slice(0, 6);

    return (
      <div className="space-y-10">
        {/* Active Search Result */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
              <svg className="w-4 h-4 text-[#5BA4E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-800">Search Result</h2>
            <button
              onClick={clearSearchFilter}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear search
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderCard(searchedResult)}
          </div>
        </section>

        {/* Similar Locations */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#F5F3FF] flex items-center justify-center">
              <svg className="w-4 h-4 text-[#7C3AED]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-800">Similar Locations</h2>
            {similarResults.length > 0 && (
              <span className="text-xs text-gray-400 ml-1">({similarResults.length})</span>
            )}
          </div>
          {allCalcLoading ? (
            <div className="flex items-center gap-3 py-12 justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#7C3AED]"></div>
              <span className="text-gray-500 text-sm">Finding similar locations...</span>
            </div>
          ) : similarResults.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {similarResults.map(renderCard)}
            </div>
          ) : (
            <div className="text-center py-8 bg-[#F8FAFB] rounded-xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-sm">No similar locations found.</p>
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
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-[#EDE9FE] hover:text-[#7C3AED] hover:border-[#7C3AED]/30 transition-all"
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">My Locations</h1>
        <p className="text-gray-500">Find the best cities for your career, lifestyle, and financial goals</p>
      </div>

      {/* Filter Bar + Search */}
      <div className="bg-[#F5F3FF] rounded-2xl border border-[#DDD6FE] p-4">
        <div className="flex flex-col gap-4">
          {/* Top Row: Quick Buttons + Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* My Locations Button */}
            <button
              onClick={() => { setSortMode('default'); setShowFilter('all'); setTypeFilter('all'); setGeoFilters([]); setBrowseAll(false); }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isAllActive
                  ? 'bg-[#7C3AED] text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-[#EDE9FE] hover:text-[#7C3AED] border border-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              My Locations
            </button>

            {/* Browse All Button */}
            <button
              onClick={() => { setSortMode('default'); setShowFilter('all'); setTypeFilter('all'); setGeoFilters([]); setBrowseAll(true); }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isBrowseActive
                  ? 'bg-[#7C3AED] text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-[#EDE9FE] hover:text-[#7C3AED] border border-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
              Browse
            </button>

            {/* Saved Button */}
            <button
              onClick={() => { setSortMode('saved'); setShowFilter('all'); setBrowseAll(false); }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isSavedActive
                  ? 'bg-[#7C3AED] text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-[#EDE9FE] hover:text-[#7C3AED] border border-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              Saved{savedLocationNames.length > 0 ? ` (${savedLocationNames.length})` : ''}
            </button>

            {/* Most Recommended Button */}
            <button
              onClick={() => { setSortMode('most-recommended'); setShowFilter('all'); setBrowseAll(false); }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isRecommendedActive
                  ? 'bg-[#7C3AED] text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-[#EDE9FE] hover:text-[#7C3AED] border border-gray-200'
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
                onClick={() => { setSortDropdownOpen(!sortDropdownOpen); setShowDropdownOpen(false); setStateDropdownOpen(false); }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  sortMode !== 'default'
                    ? 'bg-[#EDE9FE] text-[#7C3AED] border-[#7C3AED]/30'
                    : 'bg-white text-gray-600 hover:bg-[#EDE9FE] hover:text-[#7C3AED] border-gray-200'
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
                        if (option.value === 'default') { setShowFilter('all'); setTypeFilter('all'); setGeoFilters([]); }
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                        sortMode === option.value
                          ? 'bg-[#EDE9FE] text-[#7C3AED] font-medium'
                          : 'text-gray-700 hover:bg-[#F5F3FF]'
                      }`}
                    >
                      {option.label}
                      {sortMode === option.value && (
                        <svg className="w-4 h-4 text-[#7C3AED] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter Dropdown (Show + States + Regions + Weather — multi-select) */}
            <div ref={showDropdownRef} className="relative">
              <button
                onClick={() => { setShowDropdownOpen(!showDropdownOpen); setSortDropdownOpen(false); setStateDropdownOpen(false); if (showDropdownOpen) { setSelectedStateInDropdown(null); } }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  showFilter !== 'all' || hasActiveGeoFilter(geoFilters)
                    ? 'bg-[#EDE9FE] text-[#7C3AED] border-[#7C3AED]/30'
                    : 'bg-white text-gray-600 hover:bg-[#EDE9FE] hover:text-[#7C3AED] border-gray-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                </svg>
                <span className="hidden sm:inline">Filter</span>
                {(showFilter !== 'all' || hasActiveGeoFilter(geoFilters)) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]"></span>
                )}
                {geoFilters.length > 0 && (
                  <span className="text-xs bg-[#7C3AED] text-white rounded-full w-5 h-5 flex items-center justify-center font-bold">{geoFilters.length}</span>
                )}
                <svg className={`w-3.5 h-3.5 transition-transform ${showDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {showDropdownOpen && (
                <div className="absolute z-20 right-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg max-h-[480px] overflow-y-auto">
                  {selectedStateInDropdown ? (
                    <>
                      {/* Back button */}
                      <button
                        onClick={() => setSelectedStateInDropdown(null)}
                        className="sticky top-0 w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors z-10"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                        {selectedStateInDropdown}
                      </button>

                      {/* All in [State] — toggle multi-select */}
                      {(() => {
                        const stateFilterVal = `state:${selectedStateInDropdown}`;
                        const isActive = geoFilters.includes(stateFilterVal);
                        return (
                          <button
                            onClick={() => {
                              setGeoFilters(toggleGeoFilter(geoFilters, stateFilterVal));
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between font-medium ${
                              isActive ? 'bg-[#EFF6FF] text-[#5BA4E5]' : 'text-gray-900 hover:bg-[#F8FAFB]'
                            }`}
                          >
                            <span className="flex items-center gap-2.5">
                              <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                isActive ? 'bg-[#7C3AED] border-[#7C3AED]' : 'border-gray-300'
                              }`}>
                                {isActive && (
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                )}
                              </span>
                              All in {selectedStateInDropdown}
                            </span>
                          </button>
                        );
                      })()}

                      {/* Cities list */}
                      {(stateCitiesMap[selectedStateInDropdown] || []).length > 0 ? (
                        <>
                          <div className="px-4 py-1.5 bg-gray-50 border-y border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            Cities in {selectedStateInDropdown}
                          </div>
                          {(stateCitiesMap[selectedStateInDropdown] || []).map(cityLabel => {
                            const cityFilterVal = `city:${cityLabel}`;
                            const isActive = geoFilters.includes(cityFilterVal);
                            return (
                              <button
                                key={cityLabel}
                                onClick={() => {
                                  setGeoFilters(toggleGeoFilter(geoFilters, cityFilterVal));
                                }}
                                className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                                  isActive ? 'bg-[#EFF6FF] text-[#5BA4E5] font-medium' : 'text-gray-700 hover:bg-[#F8FAFB]'
                                }`}
                              >
                                <span className="flex items-center gap-2.5">
                                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                    isActive ? 'bg-[#7C3AED] border-[#7C3AED]' : 'border-gray-300'
                                  }`}>
                                    {isActive && (
                                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                      </svg>
                                    )}
                                  </span>
                                  {cityLabel}
                                </span>
                              </button>
                            );
                          })}
                        </>
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-400 italic">No city data available for this state</div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Show section (single-select) */}
                      <div className="sticky top-0 z-10 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Show</div>
                      {SHOW_OPTIONS.map(item => (
                        <button
                          key={item.value}
                          onClick={() => { setShowFilter(item.value); setShowDropdownOpen(false); setBrowseAll(false); }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                            showFilter === item.value ? 'bg-[#EFF6FF] text-[#5BA4E5] font-medium' : 'text-gray-700 hover:bg-[#F8FAFB]'
                          }`}
                        >
                          {item.label}
                          {showFilter === item.value && (
                            <svg className="w-4 h-4 text-[#7C3AED] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </button>
                      ))}

                      {/* States section (multi-select) */}
                      <div className="sticky top-0 z-10 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                        <span>States</span>
                        {geoFilters.some(f => f.startsWith('state:') || f.startsWith('city:')) && (
                          <button
                            onClick={() => setGeoFilters(geoFilters.filter(f => !f.startsWith('state:') && !f.startsWith('city:')))}
                            className="text-[10px] text-[#5BA4E5] hover:text-[#4A8FCC] font-semibold"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      {!showStatesInDropdown ? (
                        <button
                          onClick={() => setShowStatesInDropdown(true)}
                          className="w-full text-left px-4 py-2.5 text-sm text-[#5BA4E5] hover:bg-[#F8FAFB] transition-colors flex items-center justify-between font-medium"
                        >
                          Browse all states
                          {geoFilters.some(f => f.startsWith('state:') || f.startsWith('city:')) && (
                            <span className="text-xs bg-[#7C3AED] text-white rounded-full w-5 h-5 flex items-center justify-center font-bold mr-1">
                              {geoFilters.filter(f => f.startsWith('state:') || f.startsWith('city:')).length}
                            </span>
                          )}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setShowStatesInDropdown(false)}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-500 hover:bg-[#F8FAFB] transition-colors flex items-center justify-between font-medium"
                          >
                            Hide states
                            <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                          </button>
                          {ALL_STATES.map(stateName => {
                            const stateFilterVal = `state:${stateName}`;
                            const cityCount = (stateCitiesMap[stateName] || []).length;
                            const isActive = geoFilters.includes(stateFilterVal);
                            return (
                              <div
                                key={stateName}
                                className={`flex items-center text-sm transition-colors ${
                                  isActive ? 'bg-[#EFF6FF] text-[#5BA4E5] font-medium' : 'text-gray-700 hover:bg-[#F8FAFB]'
                                }`}
                              >
                                {/* State name — toggles the state filter */}
                                <button
                                  onClick={() => {
                                    setGeoFilters(toggleGeoFilter(geoFilters, stateFilterVal));
                                    setBrowseAll(false);
                                  }}
                                  className="flex-1 text-left px-4 py-2 flex items-center gap-2.5"
                                >
                                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                    isActive ? 'bg-[#7C3AED] border-[#7C3AED]' : 'border-gray-300'
                                  }`}>
                                    {isActive && (
                                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                      </svg>
                                    )}
                                  </span>
                                  {stateName}
                                </button>
                                {/* Cities arrow — drills into city sub-view */}
                                {cityCount > 0 && (
                                  <button
                                    onClick={() => setSelectedStateInDropdown(stateName)}
                                    className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-[#7C3AED] pr-4 py-2 transition-colors"
                                  >
                                    {cityCount} {cityCount === 1 ? 'city' : 'cities'}
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </>
                      )}

                      {/* Regions section (multi-select) */}
                      <div className="sticky top-0 z-10 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Regions</span>
                        {geoFilters.some(f => f.startsWith('region:')) && (
                          <button
                            onClick={() => setGeoFilters(geoFilters.filter(f => !f.startsWith('region:')))}
                            className="text-[10px] text-[#5BA4E5] hover:text-[#4A8FCC] font-semibold"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      {REGION_OPTIONS.filter(item => item.value !== 'all').map(item => {
                        const isActive = geoFilters.includes(item.value);
                        return (
                          <button
                            key={item.value}
                            onClick={() => {
                              const toggled = toggleGeoFilter(geoFilters, item.value);
                              setGeoFilters(toggled);
                              setBrowseAll(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                              isActive ? 'bg-[#EFF6FF] text-[#5BA4E5] font-medium' : 'text-gray-700 hover:bg-[#F8FAFB]'
                            }`}
                          >
                            <span className="flex items-center gap-2.5">
                              <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                isActive ? 'bg-[#7C3AED] border-[#7C3AED]' : 'border-gray-300'
                              }`}>
                                {isActive && (
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                )}
                              </span>
                              {item.label}
                            </span>
                          </button>
                        );
                      })}

                      {/* Weather section (multi-select) */}
                      <div className="sticky top-0 z-10 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Weather</span>
                        {geoFilters.some(f => f.startsWith('weather:')) && (
                          <button
                            onClick={() => setGeoFilters(geoFilters.filter(f => !f.startsWith('weather:')))}
                            className="text-[10px] text-[#5BA4E5] hover:text-[#4A8FCC] font-semibold"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      {WEATHER_OPTIONS.filter(item => item.value !== 'all').map(item => {
                        const isActive = geoFilters.includes(item.value);
                        return (
                          <button
                            key={item.value}
                            onClick={() => {
                              const toggled = toggleGeoFilter(geoFilters, item.value);
                              setGeoFilters(toggled);
                              setBrowseAll(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                              isActive ? 'bg-[#EFF6FF] text-[#5BA4E5] font-medium' : 'text-gray-700 hover:bg-[#F8FAFB]'
                            }`}
                          >
                            <span className="flex items-center gap-2.5">
                              <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                isActive ? 'bg-[#7C3AED] border-[#7C3AED]' : 'border-gray-300'
                              }`}>
                                {isActive && (
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                )}
                              </span>
                              {item.label}
                            </span>
                          </button>
                        );
                      })}

                      {/* Clear All button */}
                      {geoFilters.length > 0 && (
                        <div className="sticky bottom-0 border-t border-gray-100 bg-white px-4 py-2.5">
                          <button
                            onClick={() => { setGeoFilters([]); setShowDropdownOpen(false); }}
                            className="w-full text-center text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
                          >
                            Clear All Filters ({geoFilters.length})
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Location Type Dropdown (Cities / States / All) */}
            <div ref={stateDropdownRef} className="relative">
              <button
                onClick={() => { setStateDropdownOpen(!stateDropdownOpen); setSortDropdownOpen(false); setShowDropdownOpen(false); }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  typeFilter !== 'all'
                    ? 'bg-[#EDE9FE] text-[#7C3AED] border-[#7C3AED]/30'
                    : 'bg-white text-gray-600 hover:bg-[#EDE9FE] hover:text-[#7C3AED] border-gray-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {typeFilter === 'all' ? 'All' : typeFilter === 'states' ? 'States' : 'Cities'}
                <svg className={`w-3.5 h-3.5 transition-transform ${stateDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {stateDropdownOpen && (
                <div className="absolute z-20 right-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {TYPE_OPTIONS.map(item => (
                    <button
                      key={item.value}
                      onClick={() => { setTypeFilter(item.value); setStateDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                        typeFilter === item.value ? 'bg-[#EDE9FE] text-[#7C3AED] font-medium' : 'text-gray-700 hover:bg-[#F5F3FF]'
                      }`}
                    >
                      {item.label}
                      {typeFilter === item.value && (
                        <svg className="w-4 h-4 text-[#7C3AED] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Active Filters Dropdown — appears when any geo filters are active */}
            {geoFilters.length > 0 && (
              <div ref={activeFiltersRef} className="relative">
                <button
                  onClick={() => { setActiveFiltersDropdownOpen(!activeFiltersDropdownOpen); setSortDropdownOpen(false); setShowDropdownOpen(false); setStateDropdownOpen(false); }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border bg-[#EDE9FE] text-[#7C3AED] border-[#7C3AED]/30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                  </svg>
                  Active Filters
                  <span className="text-xs bg-[#7C3AED] text-white rounded-full w-5 h-5 flex items-center justify-center font-bold">{geoFilters.length}</span>
                  <svg className={`w-3.5 h-3.5 transition-transform ${activeFiltersDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {activeFiltersDropdownOpen && (
                  <div className="absolute z-20 right-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg max-h-[400px] overflow-y-auto">
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Active Filters</div>
                    {geoFilters.map(filter => (
                      <div
                        key={filter}
                        className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-[#F8FAFB] transition-colors"
                      >
                        <span>{getGeoFilterLabel(filter)}</span>
                        <button
                          onClick={() => setGeoFilters(geoFilters.filter(f => f !== filter))}
                          className="text-gray-400 hover:text-red-500 p-0.5 transition-colors"
                          title={`Remove ${getGeoFilterLabel(filter)}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <div className="sticky bottom-0 border-t border-gray-100 bg-white px-4 py-2.5">
                      <button
                        onClick={() => { setGeoFilters([]); setActiveFiltersDropdownOpen(false); }}
                        className="w-full text-center text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
                      >
                        Clear All ({geoFilters.length})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
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
                className="w-full pl-11 pr-4 py-2.5 bg-[#F8FAFB] border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] focus:bg-white outline-none transition-all"
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
      {activeSearchLocation
        ? renderSearchView()
        : sortMode === 'default' && allFiltersDefault && !browseAll
          ? renderSections()
          : renderFlatGrid()}
    </div>
  );
}
