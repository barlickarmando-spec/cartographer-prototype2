'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { calculateAutoApproach, CalculationResult } from '@/lib/calculation-engine';
import { normalizeOnboardingAnswers } from '@/lib/onboarding/normalize';
import { getOnboardingAnswers } from '@/lib/storage';
import { ALL_STATES } from '@/lib/location-filters';
import { CITY_COORDINATES } from '@/lib/us-city-coordinates';
import { calculateLocationWealth, LocationWealth } from '@/lib/wealth-calculations';
import type { OnboardingAnswers, UserProfile } from '@/lib/onboarding/types';

const BATCH_SIZE_STATES = 5;
const BATCH_SIZE_CITIES = 10;

export interface WealthData {
  stateData: Map<string, LocationWealth>;
  cityData: Map<string, LocationWealth>;
  currentResult: CalculationResult | null;
  profile: UserProfile | null;
  isLoading: boolean;
  progress: number;
  error: string | null;
  recompute: (sellYear: number) => void;
}

export function useWealthCalculations(initialSellYear: number = 30): WealthData {
  const [stateData, setStateData] = useState<Map<string, LocationWealth>>(new Map());
  const [cityData, setCityData] = useState<Map<string, LocationWealth>>(new Map());
  const [currentResult, setCurrentResult] = useState<CalculationResult | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const sellYearRef = useRef(initialSellYear);

  const computeAll = useCallback(async (sellYear: number) => {
    cancelledRef.current = false;
    setIsLoading(true);
    setProgress(0);
    sellYearRef.current = sellYear;

    const answers = getOnboardingAnswers<OnboardingAnswers>();
    if (!answers) {
      setError('No onboarding data found');
      setIsLoading(false);
      return;
    }

    const userProfile = normalizeOnboardingAnswers(answers);
    setProfile(userProfile);

    // Load current result
    try {
      const storedResults = localStorage.getItem('calculation-results');
      if (storedResults) {
        const results: CalculationResult[] = JSON.parse(storedResults);
        const sorted = [...results].sort((a, b) => (b.numericScore ?? 0) - (a.numericScore ?? 0));
        if (sorted.length > 0) setCurrentResult(sorted[0]);
      }
    } catch { /* no cached results */ }

    const totalWork = ALL_STATES.length + Object.keys(CITY_COORDINATES).length;
    let completed = 0;
    const newStateData = new Map<string, LocationWealth>();

    // Compute states
    for (let i = 0; i < ALL_STATES.length; i += BATCH_SIZE_STATES) {
      if (cancelledRef.current) return;
      const batch = ALL_STATES.slice(i, i + BATCH_SIZE_STATES);
      await new Promise(resolve => setTimeout(resolve, 0));

      for (const stateName of batch) {
        try {
          const result = calculateAutoApproach(userProfile, stateName, 30);
          if (result) {
            const maxPrice = result.houseProjections.maxAffordable?.maxSustainableHousePrice ?? 0;
            const annualSavings = result.yearByYear.length > 0
              ? result.yearByYear[0].savingsContribution
              : 0;
            const wealth = calculateLocationWealth(
              stateName,
              maxPrice,
              result.yearsToMortgage,
              result.isViable,
              annualSavings,
              sellYear,
            );
            newStateData.set(stateName, wealth);
          }
        } catch { /* skip */ }
        completed++;
      }

      setStateData(new Map(newStateData));
      setProgress(Math.round((completed / totalWork) * 100));
    }

    // Compute cities
    const cityNames = Object.keys(CITY_COORDINATES);
    const newCityData = new Map<string, LocationWealth>();

    for (let i = 0; i < cityNames.length; i += BATCH_SIZE_CITIES) {
      if (cancelledRef.current) return;
      const batch = cityNames.slice(i, i + BATCH_SIZE_CITIES);
      await new Promise(resolve => setTimeout(resolve, 0));

      for (const cityName of batch) {
        try {
          const result = calculateAutoApproach(userProfile, cityName, 30);
          if (result) {
            const maxPrice = result.houseProjections.maxAffordable?.maxSustainableHousePrice ?? 0;
            const annualSavings = result.yearByYear.length > 0
              ? result.yearByYear[0].savingsContribution
              : 0;
            const wealth = calculateLocationWealth(
              cityName,
              maxPrice,
              result.yearsToMortgage,
              result.isViable,
              annualSavings,
              sellYear,
            );
            newCityData.set(cityName, wealth);
          }
        } catch { /* skip */ }
        completed++;
      }

      setCityData(new Map(newCityData));
      setProgress(Math.round((completed / totalWork) * 100));
    }

    setIsLoading(false);
    setProgress(100);
  }, []);

  const recompute = useCallback((sellYear: number) => {
    cancelledRef.current = true;
    // Small delay to let previous computation cancel
    setTimeout(() => computeAll(sellYear), 10);
  }, [computeAll]);

  useEffect(() => {
    computeAll(initialSellYear);
    return () => { cancelledRef.current = true; };
  }, [computeAll, initialSellYear]);

  return { stateData, cityData, currentResult, profile, isLoading, progress, error, recompute };
}
