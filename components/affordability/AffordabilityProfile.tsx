'use client';

import { CalculationResult } from '@/lib/calculation-engine';
import { formatCurrency } from '@/lib/utils';
import { createRatingColorScale } from '@/lib/color-scale';
import { getPricePerSqft } from '@/lib/home-value-lookup';
import type { UserProfile } from '@/lib/onboarding/types';

const ratingScale = createRatingColorScale();

interface AffordabilityProfileProps {
  result: CalculationResult | null;
  profile: UserProfile | null;
  isLoading: boolean;
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
}: AffordabilityProfileProps) {
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
          <div>
            <h2 className="text-xl font-bold text-carto-slate">
              Your Affordability Profile
            </h2>
            <p className="text-sm text-carto-steel">
              Based on your income, savings, debts, and life plans
            </p>
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
            accent="#4A90D9"
          />
          <MetricCard
            label="Monthly Payment"
            value={monthlyPayment > 0 ? `$${monthlyPayment.toLocaleString()}` : 'N/A'}
            sub="Sustainable mortgage"
            accent="#4DB6AC"
          />
          <MetricCard
            label="Home Size"
            value={
              result.projectedSqFt > 0
                ? `${result.projectedSqFt.toLocaleString()} sqft`
                : 'N/A'
            }
            sub={pricePerSqft > 0 ? `$${pricePerSqft}/sqft locally` : ''}
            accent="#7E57C2"
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
            accent="#E76F51"
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
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-xl p-4 text-white"
      style={{ backgroundColor: accent }}
    >
      <p className="text-xs font-medium opacity-90 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-80 mt-1">{sub}</p>}
    </div>
  );
}
