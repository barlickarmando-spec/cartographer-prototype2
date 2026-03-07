'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAffordabilityCalculations } from '@/hooks/useAffordabilityCalculations';
import AffordabilityProfile from '@/components/affordability/AffordabilityProfile';
import USHeatMap from '@/components/affordability/USHeatMap';
import StrategySimulator from '@/components/affordability/StrategySimulator';
import SalaryGoalCalculator from '@/components/affordability/SalaryGoalCalculator';
import PreferencesPoll from '@/components/affordability/PreferencesPoll';
import { getSavedLocations, setSavedLocations } from '@/lib/storage';

type MapMode = 'value' | 'sqft';

export default function HomeAffordabilityPage() {
  const router = useRouter();
  const [mapMode, setMapMode] = useState<MapMode>('sqft');
  const {
    stateData,
    cityData,
    currentResult,
    profile,
    isLoading,
    progress,
    error,
  } = useAffordabilityCalculations();

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

  const defaultLocation = currentResult?.location ?? 'Utah';

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
        result={currentResult}
        profile={profile}
        isLoading={isLoading && progress < 10}
      />

      {/* Section 2: National Heat Map */}
      <div className="bg-white rounded-2xl border border-carto-blue-pale/30 overflow-hidden">
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#4A90D9]">
              Your Housing Affordability Map
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
          <p className="text-sm text-gray-500 mb-2">
            {mapMode === 'sqft'
              ? 'See how much home you can afford in each location — square footage, price per sqft, and estimated time to ownership. Click any area to view details.'
              : 'Colors show your maximum sustainable home price in each state. Click any state or city to view your full profile there.'}
          </p>
        </div>

        <div className="px-6 pb-6">
          <USHeatMap
            stateData={stateData}
            cityData={cityData}
            mode={mapMode}
            isLoading={isLoading}
            progress={progress}
            onLocationClick={handleLocationClick}
          />
        </div>
      </div>

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
