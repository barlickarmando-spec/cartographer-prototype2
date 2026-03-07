'use client';

import { useMemo } from 'react';
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

  const kidViability = result?.kidViability;

  const timelineItems = useMemo(() => {
    if (!result) return [];
    const items: { label: string; value: string; sub?: string }[] = [];

    if (result.yearsToDebtFree > 0) {
      items.push({
        label: 'Debt Free',
        value: `${result.yearsToDebtFree} yrs`,
        sub: `Age ${result.ageDebtFree}`,
      });
    }

    items.push({
      label: 'Homeownership',
      value:
        result.yearsToMortgage > 0
          ? `${result.yearsToMortgage} yrs`
          : 'N/A',
      sub:
        result.yearsToMortgage > 0
          ? `Age ${result.ageMortgageAcquired}`
          : undefined,
    });

    return items;
  }, [result]);

  const projections = useMemo(() => {
    if (!result) return [];
    const p = result.houseProjections;
    const items: { label: string; value: number | null }[] = [
      { label: '3 yrs', value: p.threeYears?.maxSustainableHousePrice ?? null },
      { label: '5 yrs', value: p.fiveYears?.maxSustainableHousePrice ?? null },
      { label: '10 yrs', value: p.tenYears?.maxSustainableHousePrice ?? null },
      { label: '15 yrs', value: p.fifteenYears?.maxSustainableHousePrice ?? null },
    ];
    return items.filter((i) => i.value !== null && i.value > 0);
  }, [result]);

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

        {/* Timeline + Projections + Kids row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Timeline */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Timeline
            </h3>
            <div className="space-y-3">
              {timelineItems.map((item) => (
                <div key={item.label} className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-700">{item.label}</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900">
                      {item.value}
                    </span>
                    {item.sub && (
                      <span className="text-[10px] text-gray-400 ml-1">
                        {item.sub}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-700">Min. Allocation</span>
                <span className="text-sm font-semibold text-gray-900">
                  {result.minimumAllocationRequired}%
                </span>
              </div>
            </div>
          </div>

          {/* Price projections over time */}
          {projections.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Value Over Time
              </h3>
              <div className="space-y-2">
                {projections.map((p) => (
                  <div
                    key={p.label}
                    className="flex justify-between items-center"
                  >
                    <span className="text-sm text-gray-600">{p.label}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(p.value!)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kid viability */}
          {kidViability && profile.kidsPlan !== 'no' && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Kid Affordability
              </h3>
              <div className="space-y-2.5">
                {[
                  { label: '1st Child', data: kidViability.firstKid },
                  { label: '2nd Child', data: kidViability.secondKid },
                  { label: '3rd Child', data: kidViability.thirdKid },
                ].map(({ label, data }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{label}</span>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          data.isViable ? 'bg-green-500' : 'bg-red-400'
                        }`}
                      />
                      <span className="text-xs text-gray-600">
                        {data.isViable
                          ? data.minimumAge
                            ? `Viable at ${data.minimumAge}`
                            : 'Viable'
                          : data.reason ?? 'Not viable'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
