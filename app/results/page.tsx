"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CalculationResult } from "@/lib/calculation-engine";
import { getViabilityDetails } from "@/lib/calculation-utils";

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<CalculationResult[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load results from localStorage
    const stored = localStorage.getItem('calculation-results');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setResults(parsed);
      } catch (error) {
        console.error('Failed to parse results:', error);
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-600">Loading results...</p>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <nav className="border-b border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="text-cyan-600 font-semibold hover:text-cyan-700">
                ← Home
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto px-4 py-16">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">No Results Available</h1>
          <p className="text-slate-600 mb-6">
            It looks like you haven't completed the onboarding survey yet.
          </p>
          <Link
            href="/onboarding"
            className="inline-block bg-cyan-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-cyan-600 transition-colors"
          >
            Start Survey
          </Link>
        </main>
      </div>
    );
  }

  const bestResult = results.reduce((best, current) => 
    current.yearsToMortgage > 0 && (best.yearsToMortgage < 0 || current.yearsToMortgage < best.yearsToMortgage) 
      ? current 
      : best
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <nav className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-cyan-600 font-semibold hover:text-cyan-700">
              ← Home
            </Link>
            <Link href="/onboarding" className="text-slate-600 hover:text-slate-900">
              Retake Survey
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Your Financial Plan Results</h1>
          <p className="text-slate-600">
            Based on your answers, here's your personalized financial roadmap for {results.length} location{results.length > 1 ? 's' : ''}.
          </p>
        </div>

        {/* Best Result Highlight */}
        {bestResult.isViable && (
          <div className="mb-8 p-6 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl">
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              Best Option: {bestResult.location}
            </h2>
            <p className="text-slate-700">
              You can achieve homeownership in approximately <strong>{bestResult.yearsToMortgage} years</strong> in {bestResult.location}.
            </p>
          </div>
        )}

        {/* Results Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {results.map((result, index) => {
            const viabilityInfo = getViabilityDetails(result.viabilityClassification);
            const colorClasses: Record<string, string> = {
              green: 'bg-green-50 border-green-200 text-green-800',
              blue: 'bg-blue-50 border-blue-200 text-blue-800',
              yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
              orange: 'bg-orange-50 border-orange-200 text-orange-800',
              purple: 'bg-purple-50 border-purple-200 text-purple-800',
              red: 'bg-red-50 border-red-200 text-red-800',
              gray: 'bg-gray-50 border-gray-200 text-gray-800',
            };

            return (
              <div key={index} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                {/* Location Header */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-slate-800 mb-1">
                    {result.locationData.displayName}
                  </h3>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${colorClasses[viabilityInfo.color]}`}>
                    {viabilityInfo.label}
                  </span>
                </div>

                {/* Key Metrics */}
                <div className="space-y-3 mb-4">
                  {result.yearsToMortgage > 0 ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Years to Homeownership</span>
                        <span className="font-bold text-slate-800">{result.yearsToMortgage} years</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Age at Purchase</span>
                        <span className="font-bold text-slate-800">{result.ageMortgageAcquired} years old</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-2">
                      <span className="text-red-600 font-medium">Homeownership not viable within 30 years</span>
                    </div>
                  )}
                  
                  {result.yearsToDebtFree > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Years to Debt-Free</span>
                      <span className="font-bold text-slate-800">{result.yearsToDebtFree} years</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Min. Allocation Needed</span>
                    <span className="font-bold text-slate-800">{result.minimumAllocationRequired}%</span>
                  </div>
                </div>

                {/* Recommendations */}
                {result.recommendations && result.recommendations.length > 0 && (
                  <div className="border-t border-slate-200 pt-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Recommendations</h4>
                    <ul className="space-y-1 text-sm text-slate-600">
                      {result.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* House Projections Summary */}
                {result.houseProjections && (
                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">House Price Projections</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {result.houseProjections.fiveYears && result.houseProjections.fiveYears.totalSavings > 0 && (
                        <div>
                          <span className="text-slate-600">5 Years:</span>
                          <span className="font-medium text-slate-800 ml-1">
                            ${Math.round(result.houseProjections.fiveYears.maxSustainableHousePrice).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {result.houseProjections.tenYears && result.houseProjections.tenYears.totalSavings > 0 && (
                        <div>
                          <span className="text-slate-600">10 Years:</span>
                          <span className="font-medium text-slate-800 ml-1">
                            ${Math.round(result.houseProjections.tenYears.maxSustainableHousePrice).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {result.houseProjections.fifteenYears && result.houseProjections.fifteenYears.totalSavings > 0 && (
                        <div>
                          <span className="text-slate-600">15 Years:</span>
                          <span className="font-medium text-slate-800 ml-1">
                            ${Math.round(result.houseProjections.fifteenYears.maxSustainableHousePrice).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {result.houseProjections.max && result.houseProjections.max.totalSavings > 0 && (
                        <div>
                          <span className="text-slate-600">Max:</span>
                          <span className="font-medium text-slate-800 ml-1">
                            ${Math.round(result.houseProjections.max.maxSustainableHousePrice).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* House Size Projections - Detailed View */}
        {bestResult.houseProjections && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">
              House Size Projections - {bestResult.location}
            </h2>
            <p className="text-slate-600 mb-6">
              Based on savings accumulation and income sustainability
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { key: 'fiveYears', label: '5 Years' },
                { key: 'tenYears', label: '10 Years' },
                { key: 'fifteenYears', label: '15 Years' },
                { key: 'max', label: 'Max (30 Years)' },
              ].map(({ key, label }) => {
                const proj = bestResult.houseProjections[key as keyof typeof bestResult.houseProjections];
                
                if (!proj || proj.totalSavings === 0) {
                  return (
                    <div key={key} className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                      <h3 className="font-bold text-slate-800 mb-2">{label}</h3>
                      <p className="text-sm text-slate-500">
                        Not reached in simulation
                      </p>
                    </div>
                  );
                }
                
                const maxPrice = proj.maxSustainableHousePrice;
                const isLimited = proj.sustainabilityLimited;
                
                return (
                  <div key={key} className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
                    <h3 className="font-bold text-slate-800 mb-2">{label}</h3>
                    
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-slate-500">Max Sustainable Price</p>
                        <p className="text-lg font-bold text-cyan-600">
                          ${Math.round(maxPrice).toLocaleString()}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-slate-500">Savings</p>
                        <p className="text-sm font-semibold text-slate-700">
                          ${Math.round(proj.totalSavings).toLocaleString()}
                        </p>
                      </div>
                      
                      {isLimited && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <p className="text-xs text-amber-600">
                            Limited by income sustainability
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Savings could buy ${Math.round(proj.maxPossibleHousePrice).toLocaleString()}
                          </p>
                        </div>
                      )}
                      
                      {!proj.canAfford && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <p className="text-xs text-red-600">
                            Need more savings for down payment
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {(bestResult.houseProjections.fiveYears?.sustainabilityLimited || 
              bestResult.houseProjections.tenYears?.sustainabilityLimited) && (
              <div className="mt-4 bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Sustainability Note:</strong> Your savings could buy a larger home, 
                  but we're showing the maximum price your income can sustain long-term. 
                  Buying beyond this could strain your budget.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-12 flex gap-4 justify-center">
          <Link
            href="/onboarding"
            className="px-6 py-3 bg-white border-2 border-cyan-500 text-cyan-600 rounded-lg font-semibold hover:bg-cyan-50 transition-colors"
          >
            Adjust Inputs
          </Link>
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-slate-500 text-white rounded-lg font-semibold hover:bg-slate-600 transition-colors"
          >
            Print Results
          </button>
        </div>
      </main>
    </div>
  );
}
