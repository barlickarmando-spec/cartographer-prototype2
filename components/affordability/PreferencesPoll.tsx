'use client';

import { useState, useCallback } from 'react';
import { getOnboardingAnswers, setOnboardingAnswers } from '@/lib/storage';
import type {
  OnboardingAnswers,
  LocationPriority,
  LocationTypePreference,
} from '@/lib/onboarding/types';
import { REGIONS, WEATHER_CATEGORIES } from '@/lib/location-filters';

interface PreferencesPollProps {
  onPreferencesChanged?: () => void;
}

const PRIORITIES: { value: LocationPriority; label: string; desc: string }[] = [
  {
    value: 'affordability',
    label: 'Affordability First',
    desc: 'Show me where I get the most for my money',
  },
  {
    value: 'climate',
    label: 'Climate First',
    desc: 'Weather and lifestyle are my top priority',
  },
  {
    value: 'location',
    label: 'Location First',
    desc: 'I want to be near specific places or regions',
  },
  {
    value: 'combination',
    label: 'Balanced',
    desc: 'Consider all factors equally',
  },
];

const TYPE_OPTIONS: { value: LocationTypePreference; label: string }[] = [
  { value: 'cities', label: 'Cities' },
  { value: 'towns', label: 'Smaller towns' },
  { value: 'both', label: 'Both' },
];

const REGION_LIST = Object.keys(REGIONS);
const CLIMATE_LIST = Object.keys(WEATHER_CATEGORIES);

export default function PreferencesPoll({
  onPreferencesChanged,
}: PreferencesPollProps) {
  const [answers] = useState(() =>
    getOnboardingAnswers<OnboardingAnswers>(
      (d): d is OnboardingAnswers => d != null && typeof d === 'object'
    )
  );

  const [priority, setPriority] = useState<LocationPriority>(
    answers?.locationPriority ?? 'combination'
  );
  const [locationType, setLocationType] = useState<LocationTypePreference>(
    answers?.locationTypePreference ?? 'both'
  );
  const [selectedRegions, setSelectedRegions] = useState<string[]>(
    answers?.locationRegions ?? []
  );
  const [selectedClimates, setSelectedClimates] = useState<string[]>(
    answers?.locationClimate ?? []
  );
  const [saved, setSaved] = useState(false);

  const toggleRegion = useCallback((region: string) => {
    setSelectedRegions((prev) =>
      prev.includes(region)
        ? prev.filter((r) => r !== region)
        : [...prev, region]
    );
    setSaved(false);
  }, []);

  const toggleClimate = useCallback((climate: string) => {
    setSelectedClimates((prev) =>
      prev.includes(climate)
        ? prev.filter((c) => c !== climate)
        : [...prev, climate]
    );
    setSaved(false);
  }, []);

  const handleSave = useCallback(() => {
    if (!answers) return;
    const updated: OnboardingAnswers = {
      ...answers,
      locationPriority: priority,
      locationTypePreference: locationType,
      locationRegions: selectedRegions,
      locationClimate: selectedClimates,
    };
    setOnboardingAnswers(updated);
    setSaved(true);
    onPreferencesChanged?.();
  }, [
    answers,
    priority,
    locationType,
    selectedRegions,
    selectedClimates,
    onPreferencesChanged,
  ]);

  if (!answers) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Location Preferences
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Tell us what matters most so we can highlight the best locations for
          you.
        </p>

        <div className="space-y-6">
          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              What matters most?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    setPriority(p.value);
                    setSaved(false);
                  }}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    priority === p.value
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <span className="text-sm font-medium text-gray-800 block">
                    {p.label}
                  </span>
                  <span className="text-[11px] text-gray-500">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Location type */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              City or town?
            </label>
            <div className="flex gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setLocationType(opt.value);
                    setSaved(false);
                  }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    locationType === opt.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Regions */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Preferred Regions
            </label>
            <div className="flex flex-wrap gap-1.5">
              {REGION_LIST.map((region) => (
                <button
                  key={region}
                  onClick={() => toggleRegion(region)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedRegions.includes(region)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {region}
                </button>
              ))}
            </div>
            {selectedRegions.length === 0 && (
              <p className="text-[10px] text-gray-400 mt-1">
                None selected = all regions considered
              </p>
            )}
          </div>

          {/* Climate */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Preferred Climate
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CLIMATE_LIST.map((climate) => (
                <button
                  key={climate}
                  onClick={() => toggleClimate(climate)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedClimates.includes(climate)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {climate}
                </button>
              ))}
            </div>
            {selectedClimates.length === 0 && (
              <p className="text-[10px] text-gray-400 mt-1">
                None selected = all climates considered
              </p>
            )}
          </div>

          <button
            onClick={handleSave}
            className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${
              saved
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {saved ? 'Preferences Saved' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
