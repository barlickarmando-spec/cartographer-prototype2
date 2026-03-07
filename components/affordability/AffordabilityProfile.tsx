'use client';

import { useState } from 'react';
import { CalculationResult } from '@/lib/calculation-engine';
import { formatCurrency } from '@/lib/utils';
import { createRatingColorScale } from '@/lib/color-scale';
import { getPricePerSqft } from '@/lib/home-value-lookup';
import LocationPicker from '@/components/shared/LocationPicker';
import type { UserProfile } from '@/lib/onboarding/types';

const ratingScale = createRatingColorScale();

interface AffordabilityProfileProps {
  result: CalculationResult | null;
  profile: UserProfile | null;
  isLoading: boolean;
  onLocationChange?: (location: string) => void;
}

const VIABILITY_LABELS: Record<string, { label: string; color: string }> = {
  'very-viable-stable': { label: 'Very Viable', color: 'text-green-700 bg-green-50 border-green-200' },
  viable: { label: 'Viable', color: 'text-green-600 bg-green-50 border-green-200' },
  'viable-higher-allocation': { label: 'Viable (Higher Effort)', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  'viable-extreme-care': { label: 'Viable (Extreme Care)', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  'viable-when-renting': { label: 'Better Renting', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  'no-viable-path': { label: 'Not Viable', color: 'text-red-700 bg-red-50 border-red-200' },
};

export default function AffordabilityProfile({
  result,
  profile,
  isLoading,
  onLocationChange,
}: AffordabilityProfileProps) {
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const maxAffordable = result?.houseProjections.maxAffordable;
  const maxPrice = maxAffordable?.maxSustainableHousePrice ?? 0;
  const monthlyPayment = maxAffordable
    ? Math.round(maxAffordable.sustainableAnnualPayment / 12)
    : 0;
  const location = result?.location ?? '';
  const pricePerSqft = location ? getPricePerSqft(location) : 0;
  const score = result?.numericScore ?? 0;
  const scoreColor = ratingScale(score);
  const viability = result?.viabilityClassification ?? 'no-viable-path';
  const viabilityInfo = VIABILITY_LABELS[viability] ?? VIABILITY_LABELS['no-viable-path'];


  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-gray-100 rounded-xl" />
            <div className="h-24 bg-gray-100 rounded-xl" />
            <div className="h-24 bg-gray-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!result || !profile) return null;

  return (
    <div className="bg-white rounded-2xl border border-carto-blue-pale/30 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[#4A90D9] shrink-0">
              Your Affordability Profile
            </h2>
            <span className="text-[#6B7280] text-lg shrink-0">—</span>
            {showLocationPicker && onLocationChange ? (
              <LocationPicker
                value={location}
                onChange={(loc) => {
                  onLocationChange(loc);
                  setShowLocationPicker(false);
                }}
                className="w-72"
              />
            ) : (
              <button
                onClick={() => setShowLocationPicker(true)}
                className="flex items-center gap-1.5 text-[#2C3E50] font-semibold text-lg hover:text-[#4A90D9] transition-colors"
              >
                {location || 'Select Location'}
                <svg className="w-4 h-4 text-[#4A90D9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${viabilityInfo.color}`}
            >
              {viabilityInfo.label}
            </span>
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{ backgroundColor: scoreColor + '20' }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: scoreColor }}
              />
              <span
                className="text-sm font-bold"
                style={{ color: scoreColor }}
              >
                {score.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Hero metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <MetricCard
            label="Max Home Value"
            value={maxPrice > 0 ? formatCurrency(maxPrice) : 'N/A'}
            sub={location}
          />
          <MetricCard
            label="Monthly Payment"
            value={monthlyPayment > 0 ? `$${monthlyPayment.toLocaleString()}` : 'N/A'}
            sub="Sustainable mortgage"
          />
          <MetricCard
            label="Home Size"
            value={
              result.projectedSqFt > 0
                ? `${result.projectedSqFt.toLocaleString()} sqft`
                : 'N/A'
            }
            sub={pricePerSqft > 0 ? `$${pricePerSqft}/sqft locally` : ''}
          />
          <MetricCard
            label="Time to Own"
            value={
              result.yearsToMortgage > 0
                ? `${result.yearsToMortgage} years`
                : 'N/A'
            }
            sub={
              result.yearsToMortgage > 0
                ? `Age ${result.ageMortgageAcquired}`
                : ''
            }
          />
        </div>

        {/* Assumptions */}
        {result.assumptions.length > 0 && (
          <details className="mt-4">
            <summary className="text-xs font-medium text-gray-400 cursor-pointer hover:text-gray-600">
              View assumptions ({result.assumptions.length})
            </summary>
            <ul className="mt-2 space-y-0.5 text-xs text-gray-500 pl-4 list-disc">
              {result.assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div
      className="rounded-xl p-6 text-white bg-[#4A90D9]"
    >
      <p className="text-sm font-medium opacity-90 mb-2">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-sm opacity-80 mt-2">{sub}</p>}
    </div>
  );
}
