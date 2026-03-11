'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAffordabilityCalculations } from '@/hooks/useAffordabilityCalculations';
import { calculateAutoApproach, CalculationResult } from '@/lib/calculation-engine';
import { normalizeOnboardingAnswers } from '@/lib/onboarding/normalize';
import { getOnboardingAnswers, getSavedLocations, setSavedLocations } from '@/lib/storage';
import AffordabilityProfile from '@/components/affordability/AffordabilityProfile';
import USHeatMap from '@/components/affordability/USHeatMap';
import StrategySimulator from '@/components/affordability/StrategySimulator';
import SalaryGoalCalculator from '@/components/affordability/SalaryGoalCalculator';
import PreferencesPoll from '@/components/affordability/PreferencesPoll';
import { formatCurrency } from '@/lib/utils';
import type { OnboardingAnswers } from '@/lib/onboarding/types';

type MapMode = 'value' | 'sqft';

export default function HomeAffordabilityPage() {
  const router = useRouter();
  const [mapMode, setMapMode] = useState<MapMode>('sqft');
  const [affordZoomedState, setAffordZoomedState] = useState<string | null>(null);
  const {
    stateData,
    cityData,
    currentResult,
    profile,
    isLoading,
    progress,
    error,
  } = useAffordabilityCalculations();

  const [profileResult, setProfileResult] = useState<CalculationResult | null>(null);

  const handleLocationClick = useCallback(
    (locationName: string) => {
      const saved = getSavedLocations();
      if (!saved.includes(locationName)) {
        setSavedLocations([...saved, locationName]);
      }
      try {
        localStorage.setItem('active-profile-location', locationName);
      } catch {
        /* ignore */
      }
      router.push('/profile');
    },
    [router]
  );

  const handleProfileLocationChange = useCallback(
    (locationName: string) => {
      try {
        const answers = getOnboardingAnswers<OnboardingAnswers>(
          (d): d is OnboardingAnswers => d != null && typeof d === 'object'
        );
        if (answers) {
          const prof = normalizeOnboardingAnswers(answers);
          const result = calculateAutoApproach(prof, locationName, 30);
          if (result) setProfileResult(result);
        }
      } catch { /* ignore */ }
    },
    []
  );

  const activeResult = profileResult ?? currentResult;

  const timelineItems = useMemo(() => {
    if (!activeResult) return [];
    const items: { label: string; value: string; sub?: string }[] = [];
    if (activeResult.yearsToDebtFree > 0) {
      items.push({ label: 'Debt Free', value: `${activeResult.yearsToDebtFree} yrs`, sub: `Age ${activeResult.ageDebtFree}` });
    }
    items.push({
      label: 'Homeownership',
      value: activeResult.yearsToMortgage > 0 ? `${activeResult.yearsToMortgage} yrs` : 'N/A',
      sub: activeResult.yearsToMortgage > 0 ? `Age ${activeResult.ageMortgageAcquired}` : undefined,
    });
    return items;
  }, [activeResult]);

  const projections = useMemo(() => {
    if (!activeResult) return [];
    const p = activeResult.houseProjections;
    return [
      { label: '3 yrs', value: p.threeYears?.maxSustainableHousePrice ?? null },
      { label: '5 yrs', value: p.fiveYears?.maxSustainableHousePrice ?? null },
      { label: '10 yrs', value: p.tenYears?.maxSustainableHousePrice ?? null },
      { label: '15 yrs', value: p.fifteenYears?.maxSustainableHousePrice ?? null },
    ].filter((i) => i.value !== null && i.value > 0);
  }, [activeResult]);

  const kidViability = activeResult?.kidViability;

  if (error) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-[#4A90D9]">
            Home Affordability
          </h1>
        </div>
        <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
          <p className="text-yellow-800">
            Please complete the{' '}
            <button
              onClick={() => router.push('/onboarding')}
              className="underline font-semibold hover:text-yellow-900"
            >
              onboarding process
            </button>{' '}
            to generate your affordability map.
          </p>
        </div>
      </div>
    );
  }

  const defaultLocation = activeResult?.location ?? 'Utah';

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-[#4A90D9]">
          Home Affordability
        </h1>
      </div>

      {/* Section 1: Your Affordability Profile */}
      <AffordabilityProfile
        result={profileResult ?? currentResult}
        profile={profile}
        isLoading={isLoading && progress < 10}
        onLocationChange={handleProfileLocationChange}
      />

      {/* Section 2: National Heat Map */}
      <div className="bg-white rounded-2xl border border-carto-blue-pale/30 overflow-hidden">
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#4A90D9]">
              Your Housing Affordability Map{affordZoomedState ? ` — ${affordZoomedState}` : ''}
            </h2>
            <div className="flex bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setMapMode('sqft')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  mapMode === 'sqft'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Home Size (sqft)
              </button>
              <button
                onClick={() => setMapMode('value')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  mapMode === 'value'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Home Value
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <USHeatMap
            stateData={stateData}
            cityData={cityData}
            mode={mapMode}
            isLoading={isLoading}
            progress={progress}
            onLocationClick={handleLocationClick}
            onZoomedStateChange={setAffordZoomedState}
          />
        </div>
      </div>

      {/* Timeline, Value Over Time, Kid Affordability */}
      {activeResult && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Timeline */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <h3 className="text-sm font-semibold text-[#4A90D9] mb-3">Timeline</h3>
            <div className="space-y-2.5">
              {timelineItems.map((item) => (
                <div key={item.label} className="flex justify-between items-baseline">
                  <span className="text-sm text-[#6B7280]">{item.label}</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-[#2C3E50]">{item.value}</span>
                    {item.sub && <span className="text-[10px] text-[#9CA3AF] ml-1">{item.sub}</span>}
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-[#6B7280]">Min. Allocation</span>
                <span className="text-sm font-semibold text-[#2C3E50]">{activeResult.minimumAllocationRequired}%</span>
              </div>
            </div>
          </div>

          {/* Value Over Time */}
          {projections.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
              <h3 className="text-sm font-semibold text-[#4A90D9] mb-3">Value Over Time</h3>
              <div className="space-y-2.5">
                {projections.map((p) => (
                  <div key={p.label} className="flex justify-between items-center">
                    <span className="text-sm text-[#6B7280]">{p.label}</span>
                    <span className="text-sm font-semibold text-[#2C3E50]">{formatCurrency(p.value!)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kid Affordability */}
          {kidViability && profile?.kidsPlan !== 'no' && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
              <h3 className="text-sm font-semibold text-[#4A90D9] mb-3">Kid Affordability</h3>
              <div className="space-y-2.5">
                {[
                  { label: '1st Child', data: kidViability.firstKid },
                  { label: '2nd Child', data: kidViability.secondKid },
                  { label: '3rd Child', data: kidViability.thirdKid },
                ].map(({ label, data }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-[#6B7280]">{label}</span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${data.isViable ? 'bg-green-500' : 'bg-red-400'}`} />
                      <span className="text-xs text-[#2C3E50]">
                        {data.isViable ? (data.minimumAge ? `Viable at ${data.minimumAge}` : 'Viable') : data.reason ?? 'Not viable'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section 3: Strategy Simulator */}
      <StrategySimulator defaultLocation={defaultLocation} />

      {/* Section 4: Salary Goal Calculator */}
      <SalaryGoalCalculator />

      {/* Section 5: Location Preferences */}
      <PreferencesPoll />

      {/* Section 6: Tips */}
      <div className="bg-carto-sky rounded-xl p-6 border border-carto-blue-pale/40">
        <h3 className="text-lg font-bold text-carto-slate mb-3">
          Understanding Your Analysis
        </h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-gray-700">
            <svg
              className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              <strong>Home Size map</strong> converts your purchasing power into
              actual square footage using local price-per-sqft data, plus
              estimated time to ownership
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-700">
            <svg
              className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              <strong>Strategy Simulator</strong> lets you test what-if
              scenarios — adjust allocation, salary, or kids plan without
              changing your real profile
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-700">
            <svg
              className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              <strong>Salary Calculator</strong> shows you exactly what income
              you&apos;d need for a specific home size, kids, and location
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-700">
            <svg
              className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              Gray areas on the map indicate homeownership isn&apos;t currently
              viable there — use the simulator to explore what changes would
              help
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
