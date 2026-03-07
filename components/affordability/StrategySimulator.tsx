'use client';

import { useState, useMemo, useCallback } from 'react';
import { calculateAutoApproach, CalculationResult } from '@/lib/calculation-engine';
import { normalizeOnboardingAnswers } from '@/lib/onboarding/normalize';
import { getOnboardingAnswers } from '@/lib/storage';
import { formatCurrency } from '@/lib/utils';
import { createRatingColorScale } from '@/lib/color-scale';
import LocationPicker from '@/components/shared/LocationPicker';
import type { OnboardingAnswers } from '@/lib/onboarding/types';

const ratingScale = createRatingColorScale();

interface StrategySimulatorProps {
  defaultLocation: string;
  onRecalculateAll?: () => void;
}

interface SimResult {
  location: string;
  result: CalculationResult | null;
}

export default function StrategySimulator({
  defaultLocation,
  onRecalculateAll,
}: StrategySimulatorProps) {
  const answers = useMemo(
    () =>
      getOnboardingAnswers<OnboardingAnswers>(
        (d): d is OnboardingAnswers => d != null && typeof d === 'object'
      ),
    []
  );

  const [allocation, setAllocation] = useState(
    answers?.disposableIncomeAllocation ?? 50
  );
  const [kidsCount, setKidsCount] = useState(answers?.declaredKidCount ?? 0);
  const [salaryBoost, setSalaryBoost] = useState(0); // % increase
  const [extraSavings, setExtraSavings] = useState(0);
  const [location, setLocation] = useState(defaultLocation);
  const [simResults, setSimResults] = useState<SimResult[]>([]);
  const [isComputing, setIsComputing] = useState(false);

  const baseResult = useMemo(() => {
    if (!answers) return null;
    const profile = normalizeOnboardingAnswers(answers);
    return calculateAutoApproach(profile, location, 30);
  }, [answers, location]);

  const runSimulation = useCallback(() => {
    if (!answers) return;
    setIsComputing(true);

    setTimeout(() => {
      const modified = { ...answers };
      modified.disposableIncomeAllocation = allocation;
      modified.declaredKidCount = kidsCount;
      if (modified.kidsPlan === 'no' && kidsCount > 0) modified.kidsPlan = 'yes';
      if (kidsCount === 0 && modified.kidsPlan === 'yes') modified.kidsPlan = 'no';

      // Build kid ages if changed
      if (kidsCount > 0) {
        modified.kidsKnowledge = 'know-count';
        const baseAge = modified.currentAge ?? 25;
        modified.firstKidAge = baseAge + 3;
        modified.secondKidAge = kidsCount >= 2 ? baseAge + 5 : undefined;
        modified.thirdKidAge = kidsCount >= 3 ? baseAge + 7 : undefined;
      }

      // Apply salary boost
      if (salaryBoost > 0 && modified.userSalary) {
        modified.userSalary = Math.round(
          modified.userSalary * (1 + salaryBoost / 100)
        );
      }

      // Apply extra savings
      if (extraSavings > 0) {
        modified.savingsAccountValue =
          (modified.savingsAccountValue || 0) + extraSavings;
      }

      const profile = normalizeOnboardingAnswers(modified as OnboardingAnswers);
      const result = calculateAutoApproach(profile, location, 30);

      setSimResults((prev) => [
        { location, result },
        ...prev.slice(0, 4), // Keep last 5
      ]);
      setIsComputing(false);
    }, 50);
  }, [answers, allocation, kidsCount, salaryBoost, extraSavings, location]);

  if (!answers) return null;

  const latestSim = simResults[0]?.result;
  const compareResult = latestSim || baseResult;

  return (
    <div className="bg-white rounded-2xl border border-carto-blue-pale/30 overflow-hidden">
      <div className="p-6">
        <h2 className="text-xl font-bold text-carto-slate mb-1">
          Strategy Simulator
        </h2>
        <p className="text-sm text-carto-steel mb-6">
          Adjust your strategy to see how it affects your affordability. Changes
          here are simulated — they won&apos;t modify your profile.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-5">
            {/* Location */}
            <LocationPicker
              value={location}
              onChange={setLocation}
              label="Simulate Location"
            />

            {/* Allocation slider */}
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <label className="text-xs font-medium text-gray-600">
                  Savings Allocation
                </label>
                <span className="text-sm font-semibold text-gray-800">
                  {allocation}%
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={allocation}
                onChange={(e) => setAllocation(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>10%</span>
                <span>Conservative</span>
                <span>100%</span>
              </div>
            </div>

            {/* Kids count */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Planned Kids
              </label>
              <div className="flex gap-2">
                {[0, 1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => setKidsCount(n)}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      kidsCount === n
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Salary boost */}
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <label className="text-xs font-medium text-gray-600">
                  Salary Increase
                </label>
                <span className="text-sm font-semibold text-gray-800">
                  +{salaryBoost}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={salaryBoost}
                onChange={(e) => setSalaryBoost(Number(e.target.value))}
                className="w-full accent-green-500"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">
                What if you got a raise or higher-paying job?
              </p>
            </div>

            {/* Extra savings */}
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <label className="text-xs font-medium text-gray-600">
                  Extra Savings
                </label>
                <span className="text-sm font-semibold text-gray-800">
                  +{formatCurrency(extraSavings)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100000}
                step={5000}
                value={extraSavings}
                onChange={(e) => setExtraSavings(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">
                Gift, inheritance, or extra saved up
              </p>
            </div>

            <button
              onClick={runSimulation}
              disabled={isComputing}
              className="w-full py-2.5 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {isComputing ? 'Computing...' : 'Simulate'}
            </button>
          </div>

          {/* Results comparison */}
          <div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <ResultCard
                label="Current"
                result={baseResult}
                variant="muted"
              />
              <ResultCard
                label="Simulated"
                result={latestSim}
                variant="primary"
              />
            </div>

            {/* Delta indicators */}
            {baseResult && latestSim && (
              <div className="space-y-2">
                <DeltaRow
                  label="Rating"
                  base={baseResult.numericScore}
                  sim={latestSim.numericScore}
                  format={(v) => `${v.toFixed(1)}/10`}
                />
                <DeltaRow
                  label="Home Value"
                  base={
                    baseResult.houseProjections.maxAffordable
                      ?.maxSustainableHousePrice ?? 0
                  }
                  sim={
                    latestSim.houseProjections.maxAffordable
                      ?.maxSustainableHousePrice ?? 0
                  }
                  format={formatCurrency}
                />
                <DeltaRow
                  label="Home Size"
                  base={baseResult.projectedSqFt}
                  sim={latestSim.projectedSqFt}
                  format={(v) => `${Math.round(v).toLocaleString()} sqft`}
                />
                <DeltaRow
                  label="Time to Own"
                  base={baseResult.yearsToMortgage}
                  sim={latestSim.yearsToMortgage}
                  format={(v) => (v > 0 ? `${v} yrs` : 'N/A')}
                  invertColor
                />
              </div>
            )}

            {/* Recommendations */}
            {compareResult && compareResult.recommendations.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs font-semibold text-blue-800 mb-1.5">
                  Recommendations
                </p>
                <ul className="space-y-1">
                  {compareResult.recommendations.slice(0, 3).map((r, i) => (
                    <li key={i} className="text-xs text-blue-700">
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {compareResult && compareResult.warnings.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 rounded-lg">
                <p className="text-xs font-semibold text-amber-800 mb-1.5">
                  Warnings
                </p>
                <ul className="space-y-1">
                  {compareResult.warnings.slice(0, 3).map((w, i) => (
                    <li key={i} className="text-xs text-amber-700">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  label,
  result,
  variant,
}: {
  label: string;
  result: CalculationResult | null;
  variant: 'muted' | 'primary';
}) {
  const maxPrice =
    result?.houseProjections.maxAffordable?.maxSustainableHousePrice ?? 0;
  const score = result?.numericScore ?? 0;
  const color = ratingScale(score);
  const bg = variant === 'primary' ? 'bg-gray-50' : 'bg-gray-50/50';

  return (
    <div className={`${bg} rounded-lg p-3 border border-gray-100`}>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
        {label}
      </p>
      {result ? (
        <>
          <p className="text-lg font-bold text-gray-900">
            {formatCurrency(maxPrice)}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-gray-600">
              {score.toFixed(1)}/10
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {result.projectedSqFt.toLocaleString()} sqft &middot;{' '}
            {result.yearsToMortgage > 0
              ? `${result.yearsToMortgage} yrs`
              : 'N/A'}
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-400 mt-2">No data yet</p>
      )}
    </div>
  );
}

function DeltaRow({
  label,
  base,
  sim,
  format,
  invertColor = false,
}: {
  label: string;
  base: number;
  sim: number;
  format: (v: number) => string;
  invertColor?: boolean;
}) {
  const diff = sim - base;
  const pct = base !== 0 ? (diff / Math.abs(base)) * 100 : 0;
  const isPositive = invertColor ? diff < 0 : diff > 0;
  const isNegative = invertColor ? diff > 0 : diff < 0;

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-gray-400">{format(base)}</span>
        <span className="text-gray-300">&rarr;</span>
        <span className="font-semibold text-gray-800">{format(sim)}</span>
        {diff !== 0 && (
          <span
            className={`text-[10px] font-medium px-1 py-0.5 rounded ${
              isPositive
                ? 'bg-green-100 text-green-700'
                : isNegative
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {diff > 0 ? '+' : ''}
            {Math.abs(pct) >= 1 ? `${Math.round(pct)}%` : format(diff)}
          </span>
        )}
      </div>
    </div>
  );
}
