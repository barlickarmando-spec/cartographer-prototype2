'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAffordabilityCalculations } from '@/hooks/useAffordabilityCalculations';
import ProjectionCards from '@/components/affordability/ProjectionCards';
import USHeatMap from '@/components/affordability/USHeatMap';
import { getSavedLocations, setSavedLocations } from '@/lib/storage';

type MapMode = 'value' | 'sqft';

export default function HomeAffordabilityPage() {
  const router = useRouter();
  const [mapMode, setMapMode] = useState<MapMode>('sqft');
  const { stateData, cityData, currentResult, isLoading, progress, error } = useAffordabilityCalculations();

  const handleLocationClick = useCallback(
    (locationName: string) => {
      // Add to saved locations if not already there
      const saved = getSavedLocations();
      if (!saved.includes(locationName)) {
        setSavedLocations([...saved, locationName]);
      }

      // Store as the active location for profile page
      try {
        localStorage.setItem('active-profile-location', locationName);
      } catch { /* ignore */ }

      router.push('/profile');
    },
    [router]
  );

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Home Affordability</h1>
          <p className="text-gray-600">Complete onboarding to see your affordability analysis.</p>
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

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Home Affordability</h1>
        <p className="text-gray-600">
          See your projected home value across the United States — both raw purchasing power and relative to local markets
        </p>
      </div>

      {/* Core Projection Summary Cards */}
      <ProjectionCards result={currentResult} isLoading={isLoading && progress < 10} />

      {/* Heat Map Section */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Map mode toggle */}
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">National Affordability Map</h2>
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

        {/* Map */}
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

      {/* Tips Section */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Understanding the Maps</h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-gray-700">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span><strong>Home Size map</strong> converts your purchasing power into actual square footage using local price-per-sqft data, plus estimated time to ownership — revealing where your money buys the most space</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-700">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span><strong>Home Value map</strong> shows the maximum home price you could sustain in each location based on your income, savings trajectory, and debt</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-700">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Gray states indicate homeownership isn&apos;t currently viable there. Consider adjusting your strategy to unlock more options</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
