'use client';

import { useState, useCallback, useMemo } from 'react';
import { calculateAutoApproach } from '@/lib/calculation-engine';
import { normalizeOnboardingAnswers } from '@/lib/onboarding/normalize';
import { getOnboardingAnswers } from '@/lib/storage';
import { formatCurrency } from '@/lib/utils';
import { getPricePerSqft } from '@/lib/home-value-lookup';
import type { OnboardingAnswers } from '@/lib/onboarding/types';

interface GoalResult {
  salary: number;
  maxHomeValue: number;
  sqft: number;
  yearsToOwn: number;
  score: number;
  isViable: boolean;
}

export default function SalaryGoalCalculator() {
  const answers = useMemo(
    () =>
      getOnboardingAnswers<OnboardingAnswers>(
        (d): d is OnboardingAnswers => d != null && typeof d === 'object'
      ),
    []
  );

  const [targetSqft, setTargetSqft] = useState(2200);
  const [targetKids, setTargetKids] = useState(answers?.declaredKidCount ?? 0);
  const [targetLocation, setTargetLocation] = useState('Utah');
  const [results, setResults] = useState<GoalResult[]>([]);
  const [isComputing, setIsComputing] = useState(false);

  const computeGoals = useCallback(() => {
    if (!answers) return;
    setIsComputing(true);

    setTimeout(() => {
      const ppsqft = getPricePerSqft(targetLocation);
      const targetPrice = ppsqft > 0 ? targetSqft * ppsqft : targetSqft * 150;

      // Try a range of salaries to find what makes it viable
      const baseSalary = answers.userSalary ?? 50000;
      const salarySteps = [
        baseSalary,
        baseSalary * 1.15,
        baseSalary * 1.3,
        baseSalary * 1.5,
        baseSalary * 1.75,
        baseSalary * 2.0,
        baseSalary * 2.5,
      ].map(Math.round);

      const newResults: GoalResult[] = [];

      for (const salary of salarySteps) {
        const modified = { ...answers };
        modified.userSalary = salary;
        modified.declaredKidCount = targetKids;
        if (targetKids > 0) {
          modified.kidsPlan = 'yes';
          modified.kidsKnowledge = 'know-count';
          const baseAge = modified.currentAge ?? 25;
          modified.firstKidAge = baseAge + 3;
          modified.secondKidAge = targetKids >= 2 ? baseAge + 5 : undefined;
          modified.thirdKidAge = targetKids >= 3 ? baseAge + 7 : undefined;
        } else {
          modified.kidsPlan = 'no';
        }

        const profile = normalizeOnboardingAnswers(
          modified as OnboardingAnswers
        );
        const result = calculateAutoApproach(profile, targetLocation, 30);

        if (result) {
          const maxPrice =
            result.houseProjections.maxAffordable
              ?.maxSustainableHousePrice ?? 0;
          const sqft =
            ppsqft > 0 ? Math.round(maxPrice / ppsqft) : result.projectedSqFt;

          newResults.push({
            salary,
            maxHomeValue: maxPrice,
            sqft,
            yearsToOwn: result.yearsToMortgage,
            score: result.numericScore,
            isViable: result.isViable,
          });
        }
      }

      setResults(newResults);
      setIsComputing(false);
    }, 50);
  }, [answers, targetSqft, targetKids, targetLocation]);

  if (!answers) return null;

  // Find the minimum salary that meets the target
  const viableForTarget = results.find(
    (r) => r.isViable && r.sqft >= targetSqft
  );

  return (
    <div className="bg-white rounded-2xl border border-carto-blue-pale/30 overflow-hidden">
      <div className="p-6">
        <h2 className="text-xl font-bold text-carto-slate mb-1">
          Salary Goal Calculator
        </h2>
        <p className="text-sm text-carto-steel mb-6">
          Find out what salary you&apos;d need to afford a specific home size,
          number of kids, and location.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Target home size */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Target Home Size
            </label>
            <div className="flex gap-1.5">
              {[1200, 1600, 2200, 3000].map((sqft) => (
                <button
                  key={sqft}
                  onClick={() => setTargetSqft(sqft)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    targetSqft === sqft
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {sqft.toLocaleString()}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Square feet</p>
          </div>

          {/* Kids */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Number of Kids
            </label>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setTargetKids(n)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    targetKids === n
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Location
            </label>
            <input
              type="text"
              value={targetLocation}
              onChange={(e) => setTargetLocation(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="e.g. Utah, Austin"
            />
          </div>
        </div>

        <button
          onClick={computeGoals}
          disabled={isComputing}
          className="px-6 py-2.5 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600 disabled:opacity-50 transition-colors mb-6"
        >
          {isComputing ? 'Computing...' : 'Calculate'}
        </button>

        {/* Results table */}
        {results.length > 0 && (
          <div>
            {viableForTarget && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  You&apos;d need a salary of{' '}
                  <strong>
                    {formatCurrency(viableForTarget.salary)}
                  </strong>{' '}
                  to afford a {targetSqft.toLocaleString()} sqft home in{' '}
                  {targetLocation} with {targetKids} kid
                  {targetKids !== 1 ? 's' : ''}.
                </p>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-xs font-semibold text-gray-500">
                      Salary
                    </th>
                    <th className="text-left py-2 text-xs font-semibold text-gray-500">
                      Max Home
                    </th>
                    <th className="text-left py-2 text-xs font-semibold text-gray-500">
                      Size
                    </th>
                    <th className="text-left py-2 text-xs font-semibold text-gray-500">
                      Time
                    </th>
                    <th className="text-left py-2 text-xs font-semibold text-gray-500">
                      Rating
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => {
                    const meetsTarget = r.isViable && r.sqft >= targetSqft;
                    return (
                      <tr
                        key={r.salary}
                        className={`border-b border-gray-50 ${
                          meetsTarget ? 'bg-green-50/50' : ''
                        }`}
                      >
                        <td className="py-2 font-medium text-gray-900">
                          {formatCurrency(r.salary)}
                        </td>
                        <td className="py-2 text-gray-700">
                          {formatCurrency(r.maxHomeValue)}
                        </td>
                        <td className="py-2 text-gray-700">
                          {r.sqft.toLocaleString()} sqft
                        </td>
                        <td className="py-2 text-gray-700">
                          {r.yearsToOwn > 0 ? `${r.yearsToOwn} yrs` : 'N/A'}
                        </td>
                        <td className="py-2">
                          <span
                            className={`text-xs font-semibold ${
                              r.isViable
                                ? 'text-green-700'
                                : 'text-red-500'
                            }`}
                          >
                            {r.score.toFixed(1)}/10
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
