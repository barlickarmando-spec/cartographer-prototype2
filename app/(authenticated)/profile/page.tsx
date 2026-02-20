'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CalculationResult, HouseProjection, calculateAutoApproach } from '@/lib/calculation-engine';
import SimpleHomeCarousel from '@/components/SimpleHomeCarousel';
import { formatCurrency, pluralize } from '@/lib/utils';
import { normalizeOnboardingAnswers } from '@/lib/onboarding/normalize';
import { getOnboardingAnswers } from '@/lib/storage';
import type { OnboardingAnswers } from '@/lib/onboarding/types';

export default function ProfilePage() {
  const router = useRouter();
  const [allResults, setAllResults] = useState<CalculationResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [show3YearHomes, setShow3YearHomes] = useState(false);
  const [show5YearHomes, setShow5YearHomes] = useState(false);
  const [show10YearHomes, setShow10YearHomes] = useState(false);
  const [show15YearHomes, setShow15YearHomes] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const loadResults = useCallback((stored: string | null, storedAnswers: string | null) => {
    if (!stored) {
      router.push('/onboarding');
      return;
    }

    try {
      const results: CalculationResult[] = JSON.parse(stored);

      if (results.length === 0) {
        router.push('/onboarding');
        return;
      }

      const sortedResults = [...results].sort((a, b) => {
        const scoreMap: Record<string, number> = {
          'very-viable-stable': 6,
          'viable': 5,
          'viable-higher-allocation': 4,
          'viable-extreme-care': 3,
          'viable-when-renting': 2,
          'no-viable-path': 1,
        };
        return (scoreMap[b.viabilityClassification] || 0) - (scoreMap[a.viabilityClassification] || 0);
      });

      setAllResults(sortedResults);

      let resultToShow = sortedResults[0];

      if (storedAnswers) {
        try {
          const answers = JSON.parse(storedAnswers);
          if (answers.locationSituation === 'know-exactly' && answers.exactLocation) {
            const exactMatch = sortedResults.find(r => r.location === answers.exactLocation);
            if (exactMatch) resultToShow = exactMatch;
          } else if (answers.locationSituation === 'currently-live-may-move' && answers.currentLocation) {
            const currentMatch = sortedResults.find(r => r.location === answers.currentLocation);
            if (currentMatch) resultToShow = currentMatch;
          }
        } catch (e) {
          console.error('Error parsing onboarding answers:', e);
        }
      }

      setSelectedResult(resultToShow);
    } catch (error) {
      console.error('Error loading results:', error);
      router.push('/onboarding');
    } finally {
      setLoading(false);
      setRecalculating(false);
    }
  }, [router]);

  const handleRecalculate = useCallback(() => {
    const storedAnswers = getOnboardingAnswers<OnboardingAnswers>((d): d is OnboardingAnswers => d != null && typeof d === 'object');
    if (!storedAnswers) {
      router.push('/onboarding');
      return;
    }

    setRecalculating(true);

    // Use setTimeout to let the UI update before heavy computation
    setTimeout(() => {
      try {
        const profile = normalizeOnboardingAnswers(storedAnswers);
        const locations = profile.selectedLocations.length > 0
          ? profile.selectedLocations
          : ['Utah'];

        const results = locations.map(loc => {
          try {
            return calculateAutoApproach(profile, loc, 30);
          } catch (error) {
            console.error(`Error calculating for ${loc}:`, error);
            return null;
          }
        }).filter((r): r is CalculationResult => r !== null);

        if (results.length > 0) {
          localStorage.setItem('calculation-results', JSON.stringify(results));
        }

        loadResults(
          localStorage.getItem('calculation-results'),
          localStorage.getItem('onboarding-answers')
        );
      } catch (error) {
        console.error('Recalculation error:', error);
        setRecalculating(false);
      }
    }, 50);
  }, [router, loadResults]);

  useEffect(() => {
    loadResults(
      localStorage.getItem('calculation-results'),
      localStorage.getItem('onboarding-answers')
    );
  }, [loadResults]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5BA4E5] mx-auto mb-4"></div>
          <p className="text-[#6B7280]">Loading your financial roadmap...</p>
        </div>
      </div>
    );
  }

  if (!selectedResult || !selectedResult.calculationSuccessful) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-[#6B7280] mb-4">Unable to load results</p>
          <button 
            onClick={() => router.push('/onboarding')}
            className="text-[#5BA4E5] hover:text-[#4A93D4] font-medium"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  const result = selectedResult;
  const locationData = result.locationData;
  const isViable = result.viabilityClassification !== 'no-viable-path';
  
  // Get viability label
  const getViabilityLabel = (classification: string) => {
    const labels: Record<string, { label: string; color: string; bgColor: string }> = {
      'very-viable-stable': { label: 'Very Viable & Stable', color: '#10B981', bgColor: '#D1FAE5' },
      'viable': { label: 'Viable', color: '#5BA4E5', bgColor: '#EFF6FF' },
      'viable-higher-allocation': { label: 'Viable (Higher Allocation)', color: '#F59E0B', bgColor: '#FEF3C7' },
      'viable-extreme-care': { label: 'Viable (Extreme Care)', color: '#EF4444', bgColor: '#FEE2E2' },
      'viable-when-renting': { label: 'Viable When Renting', color: '#8B5CF6', bgColor: '#EDE9FE' },
      'no-viable-path': { label: 'Not Viable', color: '#DC2626', bgColor: '#FEE2E2' },
    };
    return labels[classification] || labels['no-viable-path'];
  };

  const viabilityInfo = getViabilityLabel(result.viabilityClassification);

  return (
    <div className="space-y-6">
      {/* Location Selector (if multiple results) */}
      {allResults.length > 1 && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <label className="block text-sm font-medium text-[#2C3E50] mb-2">
            Viewing results for:
          </label>
          <select
            value={result.location}
            onChange={(e) => {
              const newResult = allResults.find(r => r.location === e.target.value);
              if (newResult) {
                setSelectedResult(newResult);
              }
            }}
            className="w-full md:w-auto px-4 py-2 rounded-lg border border-[#E5E7EB] focus:border-[#5BA4E5] focus:ring-2 focus:ring-[#5BA4E5] focus:ring-opacity-20 outline-none"
          >
            {allResults.map((r) => (
              <option key={r.location} value={r.location}>
                {r.location} - {getViabilityLabel(r.viabilityClassification).label}
              </option>
            ))}
          </select>
          <p className="text-xs text-[#9CA3AF] mt-2">
            Showing {allResults.findIndex(r => r.location === result.location) + 1} of {allResults.length} locations
          </p>
        </div>
      )}

      {/* Recalculate Button */}
      <div className="flex justify-end">
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="flex items-center gap-2 px-4 py-2 bg-[#5BA4E5] text-white rounded-lg hover:bg-[#4A93D4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {recalculating ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Recalculating...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Recalculate
            </>
          )}
        </button>
      </div>

      {/* ===== BANNER/HEADER ===== */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
        
        {/* TOP SECTION - Key Metrics */}
        <div className="bg-gradient-to-br from-[#5BA4E5] to-[#4A93D4] p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">{result.location}</h1>
          <p className="text-white/80 mb-6">Your Financial Roadmap</p>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Time to Home Ownership */}
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-white/70 text-sm mb-1">Time to Homeownership</p>
              <p className="text-2xl font-bold">
                {result.yearsToMortgage > 0 ? `${result.yearsToMortgage} years` : 'N/A'}
              </p>
              {result.ageMortgageAcquired > 0 && (
                <p className="text-white/60 text-xs mt-1">At age {result.ageMortgageAcquired}</p>
              )}
            </div>

            {/* Viability Classification */}
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-white/70 text-sm mb-1">Status</p>
              <p className="text-lg font-bold">{viabilityInfo.label}</p>
            </div>

            {/* Estimated Home Value */}
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-white/70 text-sm mb-1">Median Home Value</p>
              <p className="text-2xl font-bold">
                {formatCurrency(locationData.housing.medianHomeValue)}
              </p>
            </div>

            {/* Time to Debt Free */}
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-white/70 text-sm mb-1">Time to Debt-Free</p>
              <p className="text-2xl font-bold">
                {result.yearsToDebtFree > 0 ? `${result.yearsToDebtFree} years` : 'No debt'}
              </p>
              {result.ageDebtFree > 0 && (
                <p className="text-white/60 text-xs mt-1">At age {result.ageDebtFree}</p>
              )}
            </div>

            {/* Minimum % Saved */}
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-white/70 text-sm mb-1">Minimum Allocation</p>
              <p className="text-2xl font-bold">{result.minimumAllocationRequired}%</p>
              <p className="text-white/60 text-xs mt-1">of disposable income</p>
            </div>
          </div>
        </div>

        {/* DROPDOWN - Important Notes or Tips */}
        <div className="border-t border-[#E5E7EB]">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="w-full px-8 py-4 flex items-center justify-between hover:bg-[#F8FAFB] transition-colors"
          >
            <span className="font-semibold text-[#2C3E50]">
              {isViable ? 'Important Notes & Recommendations' : 'Tips to Make This Location Affordable'}
            </span>
            <svg 
              className={`w-5 h-5 text-[#6B7280] transition-transform ${showNotes ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showNotes && (
            <div className="px-8 pb-6 space-y-4">
              {/* Recommendations */}
              <div>
                <h3 className="font-semibold text-[#2C3E50] mb-3">
                  {isViable ? 'Recommendations' : 'How to Make It Work'}
                </h3>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="text-[#5BA4E5] mt-1">•</span>
                      <span className="text-[#6B7280] text-sm flex-1">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">Warnings</h3>
                  <ul className="space-y-1">
                    {result.warnings.map((warn, i) => (
                      <li key={i} className="text-sm text-yellow-700">{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Downloadable PDF */}
              <button className="w-full bg-[#5BA4E5] text-white py-3 rounded-lg hover:bg-[#4A93D4] transition-colors font-medium flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Financial Strategy (PDF)
              </button>
            </div>
          )}
        </div>

        {/* MIDDLE SECTION - Cost of Living Details */}
        <div className="px-8 py-6 bg-[#F8FAFB]">
          <h2 className="text-xl font-bold text-[#2C3E50] mb-6">Cost of Living Breakdown</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Typical Salary - Use ACTUAL household income */}
              <div className="bg-white rounded-lg p-4 border border-[#E5E7EB]">
                <p className="text-sm text-[#6B7280] mb-1">
                  Total Household Income
                </p>
                <p className="text-2xl font-bold text-[#2C3E50]">
                  ${result.yearByYear[0]?.totalIncome.toLocaleString()}/year
                </p>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  {result.yearByYear[0]?.householdType.includes('2e') 
                    ? `2 earners: $${result.yearByYear[0]?.userIncome.toLocaleString()} + $${result.yearByYear[0]?.partnerIncome.toLocaleString()}`
                    : `1 earner: $${result.yearByYear[0]?.userIncome.toLocaleString()}`
                  }
                </p>
              </div>

              {/* Cost of Living - Use ACTUAL household COL */}
              <div className="bg-white rounded-lg p-4 border border-[#E5E7EB]">
                <p className="text-sm text-[#6B7280] mb-1">
                  Cost of Living (Excluding Housing)
                </p>
                <p className="text-2xl font-bold text-[#2C3E50]">
                  ${result.yearByYear[0]?.adjustedCOL.toLocaleString()}/year
                </p>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  ${(result.yearByYear[0]?.adjustedCOL / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/month
                  {' '}({result.yearByYear[0]?.householdType.includes('family') ? 'with kids' : 
                      result.yearByYear[0]?.householdType.includes('couple') ? 'couple' : 'single'})
                </p>
              </div>

              {/* Housing Cost - Use ACTUAL housing from simulation */}
              <div className="bg-white rounded-lg p-4 border border-[#E5E7EB]">
                <p className="text-sm text-[#6B7280] mb-1">
                  {result.yearByYear[0]?.hasMortgage ? 'Mortgage Payment' : 'Rent Cost'}
                </p>
                <p className="text-2xl font-bold text-[#2C3E50]">
                  ${result.yearByYear[0]?.housingCost.toLocaleString()}/year
                </p>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  ${(result.yearByYear[0]?.housingCost / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/month
                  {result.yearByYear[0]?.hasMortgage && ' (30-year mortgage)'}
                </p>
              </div>

              {/* Total Cost of Living */}
              <div className="bg-white rounded-lg p-4 border border-[#E5E7EB]">
                <p className="text-sm text-[#6B7280] mb-1">
                  Total Cost of Living
                </p>
                <p className="text-2xl font-bold text-[#2C3E50]">
                  ${result.yearByYear[0]?.totalCOL.toLocaleString()}/year
                </p>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  ${(result.yearByYear[0]?.totalCOL / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/month (housing + living expenses)
                </p>
              </div>
            </div>

            {/* Right Column - Rent Reference Costs */}
            <div>
              <div className="bg-white rounded-lg p-6 border border-[#E5E7EB]">
                <h3 className="font-semibold text-[#2C3E50] mb-2">Typical Rent Costs in {result.location}</h3>
                <p className="text-xs text-[#9CA3AF] mb-4">For reference (your actual cost is shown on left)</p>
                
                <div className="space-y-4">
                  {/* 1 Bedroom */}
                  <div className="flex justify-between items-center pb-3 border-b border-[#E5E7EB]">
                    <div>
                      <p className="font-medium text-[#2C3E50]">1 Bedroom</p>
                      <p className="text-xs text-[#9CA3AF]">~{locationData.rent.oneBedroomSqFt.toLocaleString()} sq ft</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#5BA4E5]">
                        ${locationData.rent.oneBedroomAnnual.toLocaleString()}/year
                      </p>
                      <p className="text-xs text-[#9CA3AF]">
                        ${Math.round(locationData.rent.oneBedroomAnnual / 12).toLocaleString()}/month
                      </p>
                    </div>
                  </div>

                  {/* 2 Bedroom */}
                  <div className="flex justify-between items-center pb-3 border-b border-[#E5E7EB]">
                    <div>
                      <p className="font-medium text-[#2C3E50]">2 Bedroom</p>
                      <p className="text-xs text-[#9CA3AF]">~{locationData.rent.twoBedroomSqFt.toLocaleString()} sq ft</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#5BA4E5]">
                        ${locationData.rent.twoBedroomAnnual.toLocaleString()}/year
                      </p>
                      <p className="text-xs text-[#9CA3AF]">
                        ${Math.round(locationData.rent.twoBedroomAnnual / 12).toLocaleString()}/month
                      </p>
                    </div>
                  </div>

                  {/* 3 Bedroom */}
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-[#2C3E50]">3 Bedroom</p>
                      <p className="text-xs text-[#9CA3AF]">~{locationData.rent.threeBedroomSqFt.toLocaleString()} sq ft</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#5BA4E5]">
                        ${locationData.rent.threeBedroomAnnual.toLocaleString()}/year
                      </p>
                      <p className="text-xs text-[#9CA3AF]">
                        ${Math.round(locationData.rent.threeBedroomAnnual / 12).toLocaleString()}/month
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAMILY PLANNING SECTION - Simplified */}
        {result.kidViability && (
          <div className="px-8 py-6 bg-white border-t border-[#E5E7EB]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Minimum Viable Age for Kids</h3>
                <p className="text-sm text-gray-600">When you can afford each child while staying on track</p>
              </div>
            </div>

            {result.kidViability.firstKid.isViable ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1st Kid */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200">
                  <p className="text-sm font-medium text-purple-700 mb-2">1st Child</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-5xl font-bold text-purple-900">
                      {result.kidViability.firstKid.minimumAge}
                    </p>
                    <p className="text-lg text-purple-700">years old</p>
                  </div>
                  <p className="text-sm text-purple-600 mt-2">
                    In {pluralize(result.kidViability.firstKid.minimumAge! - result.yearByYear[0]?.age, 'year')}
                  </p>
                </div>

                {/* 2nd Kid */}
                <div className={`bg-gradient-to-br rounded-xl p-6 border-2 ${
                  result.kidViability.secondKid.isViable 
                    ? 'from-blue-50 to-blue-100 border-blue-200' 
                    : 'from-gray-50 to-gray-100 border-gray-200'
                }`}>
                  <p className={`text-sm font-medium mb-2 ${
                    result.kidViability.secondKid.isViable ? 'text-blue-700' : 'text-gray-500'
                  }`}>2nd Child</p>
                  {result.kidViability.secondKid.isViable ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <p className="text-5xl font-bold text-blue-900">
                          {result.kidViability.secondKid.minimumAge}
                        </p>
                        <p className="text-lg text-blue-700">years old</p>
                      </div>
                      <p className="text-sm text-blue-600 mt-2">
                        In {pluralize(result.kidViability.secondKid.minimumAge! - result.yearByYear[0]?.age, 'year')}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">Not viable</p>
                  )}
                </div>

                {/* 3rd Kid */}
                <div className={`bg-gradient-to-br rounded-xl p-6 border-2 ${
                  result.kidViability.thirdKid.isViable 
                    ? 'from-indigo-50 to-indigo-100 border-indigo-200' 
                    : 'from-gray-50 to-gray-100 border-gray-200'
                }`}>
                  <p className={`text-sm font-medium mb-2 ${
                    result.kidViability.thirdKid.isViable ? 'text-indigo-700' : 'text-gray-500'
                  }`}>3rd Child</p>
                  {result.kidViability.thirdKid.isViable ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <p className="text-5xl font-bold text-indigo-900">
                          {result.kidViability.thirdKid.minimumAge}
                        </p>
                        <p className="text-lg text-indigo-700">years old</p>
                      </div>
                      <p className="text-sm text-indigo-600 mt-2">
                        In {pluralize(result.kidViability.thirdKid.minimumAge! - result.yearByYear[0]?.age, 'year')}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">Not viable</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 rounded-lg p-6 border-2 border-yellow-200">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Family Planning Not Currently Viable</h4>
                    <p className="text-sm text-gray-700">
                      {result.kidViability.firstKid.reason || 
                        `Based on current projections, having children in ${result.location} would make homeownership significantly more difficult.`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BOTTOM SECTION - House Projections */}
        <div className="px-8 py-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#2C3E50] mb-2">Your Homeownership Timeline</h2>
            <p className="text-[#6B7280] text-sm">See what homes you can afford at different stages of your journey</p>
          </div>
          
          <div className="space-y-4">
            {/* 3 Year Projection */}
            {result.houseProjections.threeYears && (
              <HouseProjectionCard
                title={`${pluralize(3, 'Year')} Projection`}
                projection={result.houseProjections.threeYears}
                location={result.location}
                showHomes={show3YearHomes}
                onToggle={() => setShow3YearHomes(!show3YearHomes)}
              />
            )}

            {/* 5 Year Projection */}
            {result.houseProjections.fiveYears && (
              <HouseProjectionCard
                title={`${pluralize(5, 'Year')} Projection`}
                projection={result.houseProjections.fiveYears}
                location={result.location}
                showHomes={show5YearHomes}
                onToggle={() => setShow5YearHomes(!show5YearHomes)}
              />
            )}

            {/* 10 Year Projection */}
            {result.houseProjections.tenYears && (
              <HouseProjectionCard
                title={`${pluralize(10, 'Year')} Projection`}
                projection={result.houseProjections.tenYears}
                location={result.location}
                showHomes={show10YearHomes}
                onToggle={() => setShow10YearHomes(!show10YearHomes)}
              />
            )}

            {/* 15 Year Projection */}
            {result.houseProjections.fifteenYears && (
              <HouseProjectionCard
                title={`${pluralize(15, 'Year')} Projection`}
                projection={result.houseProjections.fifteenYears}
                location={result.location}
                showHomes={show15YearHomes}
                onToggle={() => setShow15YearHomes(!show15YearHomes)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== HOUSE PROJECTION CARD COMPONENT =====

interface HouseProjectionCardProps {
  title: string;
  projection: HouseProjection;
  location: string;
  showHomes: boolean;
  onToggle: () => void;
}

function HouseProjectionCard({ title, projection, location, showHomes, onToggle }: HouseProjectionCardProps) {
  const estimatedSqFt = Math.round((projection.maxSustainableHousePrice / 250)); // Rough estimate $250/sqft
  
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
      {/* Main Info */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-[#2C3E50] mb-1">{title}</h3>
            <p className="text-sm text-[#9CA3AF]">Age {projection.age}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[#6B7280] mb-1">Total Savings</p>
            <p className="text-xl font-bold text-[#5BA4E5]">
              {formatCurrency(projection.totalSavings)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Projected Price */}
          <div className="bg-[#EFF6FF] rounded-lg p-4">
            <p className="text-xs text-[#6B7280] mb-1">Max Sustainable Price</p>
            <p className="text-2xl font-bold text-[#2C3E50]">
              {formatCurrency(projection.maxSustainableHousePrice)}
            </p>
            {projection.sustainabilityLimited && (
              <p className="text-xs text-[#EF4444] mt-1">Limited by income</p>
            )}
          </div>

          {/* Estimated Size */}
          <div className="bg-[#F8FAFB] rounded-lg p-4">
            <p className="text-xs text-[#6B7280] mb-1">Estimated Size</p>
            <p className="text-2xl font-bold text-[#2C3E50]">
              {estimatedSqFt.toLocaleString()} sqft
            </p>
            <p className="text-xs text-[#9CA3AF] mt-1">~$250/sqft</p>
          </div>
        </div>

        {/* Additional Details */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-[#9CA3AF] text-xs">Down Payment</p>
            <p className="font-semibold text-[#2C3E50]">
              {formatCurrency(projection.sustainableDownPayment)}
            </p>
          </div>
          <div>
            <p className="text-[#9CA3AF] text-xs">Annual Payment</p>
            <p className="font-semibold text-[#2C3E50]">
              {formatCurrency(projection.sustainableAnnualPayment)}/yr
            </p>
          </div>
          <div>
            <p className="text-[#9CA3AF] text-xs">Post-Mortgage DI</p>
            <p className={`font-semibold ${projection.postMortgageDisposableIncome >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
              {formatCurrency(projection.postMortgageDisposableIncome)}/yr
            </p>
          </div>
        </div>

        {/* Affordability Status */}
        {!projection.canAfford && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              You&apos;ll need to save longer to afford the down payment
            </p>
          </div>
        )}
      </div>

      {/* See Potential Homes Button */}
      <div className="border-t border-[#E5E7EB]">
        <button
          onClick={onToggle}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#F8FAFB] transition-colors"
        >
          <span className="font-medium text-[#5BA4E5]">See Potential Homes</span>
          <svg 
            className={`w-5 h-5 text-[#5BA4E5] transition-transform ${showHomes ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showHomes && (
          <div className="px-6 pb-6">
            <SimpleHomeCarousel
              location={location}
              targetPrice={projection.maxSustainableHousePrice}
              priceRange={50000}
            />
          </div>
        )}
      </div>
    </div>
  );
}
