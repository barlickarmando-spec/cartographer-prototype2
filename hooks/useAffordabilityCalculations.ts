'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { calculateAutoApproach, CalculationResult } from '@/lib/calculation-engine';
import { estimateHomeSizeSqft, getPricePerSqft } from '@/lib/home-value-lookup';
import { normalizeOnboardingAnswers } from '@/lib/onboarding/normalize';
import { getOnboardingAnswers } from '@/lib/storage';
import { ALL_STATES } from '@/lib/location-filters';
import { CITY_COORDINATES } from '@/lib/us-city-coordinates';
import type { OnboardingAnswers } from '@/lib/onboarding/types';
import type { UserProfile } from '@/lib/onboarding/types';

export interface LocationCalculation {
  name: string;
  maxHomeValue: number;
  sqft: number;
  yearsToOwn: number;
  monthlyPayment: number;
  isViable: boolean;
  pricePerSqft: number;
  numericScore: number;
}

export interface AffordabilityData {
  stateData: Map<string, LocationCalculation>;
  cityData: Map<string, LocationCalculation>;
  currentResult: CalculationResult | null;
  profile: UserProfile | null;
  isLoading: boolean;
  progress: number;
  error: string | null;
}

const BATCH_SIZE_STATES = 5;
const BATCH_SIZE_CITIES = 10;
const SESSION_CACHE_KEY = 'affordability-map-cache';

function extractLocationCalc(name: string, result: CalculationResult): LocationCalculation {
  const maxAffordable = result.houseProjections.maxAffordable;
  const maxHomeValue = maxAffordable?.maxSustainableHousePrice ?? 0;
  return {
    name,
    maxHomeValue,
    sqft: estimateHomeSizeSqft(maxHomeValue, name),
    yearsToOwn: result.yearsToMortgage > 0 ? result.yearsToMortgage : -1,
    monthlyPayment: maxAffordable ? Math.round(maxAffordable.sustainableAnnualPayment / 12) : 0,
    isViable: result.isViable,
    pricePerSqft: getPricePerSqft(name),
    numericScore: result.numericScore ?? 0,
  };
}

function hashProfile(profile: UserProfile): string {
  const key = JSON.stringify({
    occ: profile.userOccupation,
    age: profile.currentAge,
    savings: profile.currentSavings,
    kids: profile.plannedKidAges,
    earners: profile.numEarners,
    allocation: profile.disposableIncomeAllocation,
  });
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  return `aff-${hash}`;
}

export function useAffordabilityCalculations(): AffordabilityData {
  const [stateData, setStateData] = useState<Map<string, LocationCalculation>>(new Map());
  const [cityData, setCityData] = useState<Map<string, LocationCalculation>>(new Map());
  const [currentResult, setCurrentResult] = useState<CalculationResult | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const computeAll = useCallback(async () => {
    const answers = getOnboardingAnswers<OnboardingAnswers>();
    if (!answers) {
      setError('No onboarding data found');
      setIsLoading(false);
      return;
    }

    const userProfile = normalizeOnboardingAnswers(answers);
    setProfile(userProfile);

    // Check sessionStorage cache
    const cacheKey = hashProfile(userProfile);
    try {
      const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.key === cacheKey) {
          const cachedStates = new Map<string, LocationCalculation>(Object.entries(parsed.states));
          const cachedCities = new Map<string, LocationCalculation>(Object.entries(parsed.cities));
          setStateData(cachedStates);
          setCityData(cachedCities);
          setProgress(100);
          setIsLoading(false);

          // Load current result from localStorage
          const storedResults = localStorage.getItem('calculation-results');
          if (storedResults) {
            const results: CalculationResult[] = JSON.parse(storedResults);
            if (results.length > 0) setCurrentResult(results[0]);
          }
          return;
        }
      }
    } catch { /* cache miss, compute fresh */ }

    // Load existing calculation results for the current location
    try {
      const storedResults = localStorage.getItem('calculation-results');
      if (storedResults) {
        const results: CalculationResult[] = JSON.parse(storedResults);
        const sorted = [...results].sort((a, b) => (b.numericScore ?? 0) - (a.numericScore ?? 0));
        if (sorted.length > 0) setCurrentResult(sorted[0]);
      }
    } catch { /* no cached results */ }

    // Compute states in batches
    const totalWork = ALL_STATES.length + Object.keys(CITY_COORDINATES).length;
    let completed = 0;
    const newStateData = new Map<string, LocationCalculation>();

    for (let i = 0; i < ALL_STATES.length; i += BATCH_SIZE_STATES) {
      if (cancelledRef.current) return;
      const batch = ALL_STATES.slice(i, i + BATCH_SIZE_STATES);

      // Yield to main thread
      await new Promise(resolve => setTimeout(resolve, 0));

      for (const stateName of batch) {
        try {
          const result = calculateAutoApproach(userProfile, stateName, 30);
          if (result) {
            newStateData.set(stateName, extractLocationCalc(stateName, result));
          }
        } catch {
          // Skip failed state
        }
        completed++;
      }

      setStateData(new Map(newStateData));
      setProgress(Math.round((completed / totalWork) * 100));
    }

    // Compute cities in batches
    const cityNames = Object.keys(CITY_COORDINATES);
    const newCityData = new Map<string, LocationCalculation>();

    for (let i = 0; i < cityNames.length; i += BATCH_SIZE_CITIES) {
      if (cancelledRef.current) return;
      const batch = cityNames.slice(i, i + BATCH_SIZE_CITIES);

      await new Promise(resolve => setTimeout(resolve, 0));

      for (const cityName of batch) {
        try {
          const result = calculateAutoApproach(userProfile, cityName, 30);
          if (result) {
            newCityData.set(cityName, extractLocationCalc(cityName, result));
          }
        } catch {
          // Skip failed city
        }
        completed++;
      }

      setCityData(new Map(newCityData));
      setProgress(Math.round((completed / totalWork) * 100));
    }

    // Cache results in sessionStorage
    try {
      const cacheData = {
        key: cacheKey,
        states: Object.fromEntries(newStateData),
        cities: Object.fromEntries(newCityData),
      };
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cacheData));
    } catch { /* sessionStorage full, skip caching */ }

    setIsLoading(false);
    setProgress(100);
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    computeAll();
    return () => { cancelledRef.current = true; };
  }, [computeAll]);

  return { stateData, cityData, currentResult, profile, isLoading, progress, error };
}
