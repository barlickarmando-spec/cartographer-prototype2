"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";
import LocationOverviewCard from "@/components/LocationOverviewCard";
import Badge from "@/components/Badge";
import { findLocationById, getLocationsByIds } from "@/lib/data";
import { calculateAffordability } from "@/lib/affordability";
import type { UserInputs, SimulationResult } from "@/lib/types";
import type { Location } from "@/lib/data";

export default function ResultsPage() {
  const router = useRouter();
  const [inputs, setInputs] = useState<UserInputs | null>(null);
  const [results, setResults] = useState<Array<{ location: Location; result: SimulationResult }>>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    type?: "state" | "city";
    viabilityTier?: string;
    timeline?: string;
    confidence?: string;
  }>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const savedInputs = localStorage.getItem("cartographer-last-inputs");
    if (!savedInputs) {
      router.push("/onboarding");
      return;
    }

    const parsedInputs = JSON.parse(savedInputs) as UserInputs;
    setInputs(parsedInputs);

    // Calculate results for all selected locations
    const locations = getLocationsByIds(parsedInputs.selectedLocations || []);
    const calculatedResults = locations.map((location) => ({
      location,
      result: calculateAffordability(parsedInputs, location),
    }));

    setResults(calculatedResults);
    setLoading(false);

    // Save results
    localStorage.setItem("cartographer-last-results", JSON.stringify(calculatedResults));
  }, [router]);

  const filteredResults = useMemo(() => {
    let filtered = results;

    if (filter.type) {
      filtered = filtered.filter((r) => r.location.type === filter.type);
    }

    if (filter.viabilityTier) {
      filtered = filtered.filter((r) => r.result.viabilityTier === filter.viabilityTier);
    }

    if (filter.confidence) {
      const minConfidence = parseInt(filter.confidence);
      filtered = filtered.filter((r) => r.result.confidenceScore >= minConfidence);
    }

    return filtered;
  }, [results, filter]);

  const sortedResults = useMemo(() => {
    return [...filteredResults].sort((a, b) => {
      // Sort by viability tier first, then by recommended score
      const tierOrder = { "Excellent": 4, "Good": 3, "Borderline": 2, "Low": 1, "Not Viable": 0 };
      const tierDiff = (tierOrder[b.result.viabilityTier] || 0) - (tierOrder[a.result.viabilityTier] || 0);
      if (tierDiff !== 0) return tierDiff;
      return (b.result.recommendedScore || 0) - (a.result.recommendedScore || 0);
    });
  }, [filteredResults]);

  const top3MostViable = useMemo(() => {
    return sortedResults
      .filter((r) => r.result.isViable)
      .slice(0, 3);
  }, [sortedResults]);

  const top3LeastViable = useMemo(() => {
    return [...sortedResults]
      .reverse()
      .slice(0, 3);
  }, [sortedResults]);

  const top3Recommended = useMemo(() => {
    return [...sortedResults]
      .sort((a, b) => (b.result.recommendedScore || 0) - (a.result.recommendedScore || 0))
      .slice(0, 3);
  }, [sortedResults]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopNav />
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="text-center">Loading results...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Location Analysis Results</h1>
          <p className="mt-2 text-slate-600">
            {sortedResults.length} location{sortedResults.length !== 1 ? "s" : ""} analyzed
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={filter.type || ""}
                onChange={(e) => setFilter({ ...filter, type: e.target.value as any || undefined })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">All</option>
                <option value="state">States</option>
                <option value="city">Cities</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Viability</label>
              <select
                value={filter.viabilityTier || ""}
                onChange={(e) => setFilter({ ...filter, viabilityTier: e.target.value || undefined })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">All</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Borderline">Borderline</option>
                <option value="Low">Low</option>
                <option value="Not Viable">Not Viable</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Confidence</label>
              <select
                value={filter.confidence || ""}
                onChange={(e) => setFilter({ ...filter, confidence: e.target.value || undefined })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">All</option>
                <option value="85">85+</option>
                <option value="70">70+</option>
                <option value="55">55+</option>
                <option value="40">40+</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilter({})}
                className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Top 3 Sections */}
        {top3MostViable.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Top 3 Most Viable</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {top3MostViable.map(({ location, result }) => (
                <LocationOverviewCard
                  key={location.id}
                  location={location}
                  result={result}
                  onViewDetails={() => router.push(`/results/${location.id}`)}
                  onSave={() => {
                    // Save to saved locations
                    const saved = JSON.parse(localStorage.getItem("cartographer-saved-locations") || "[]");
                    if (!saved.find((l: string) => l === location.id)) {
                      saved.push(location.id);
                      localStorage.setItem("cartographer-saved-locations", JSON.stringify(saved));
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Results */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">All Locations</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedResults.map(({ location, result }) => (
              <LocationOverviewCard
                key={location.id}
                location={location}
                result={result}
                onViewDetails={() => router.push(`/results/${location.id}`)}
                onSave={() => {
                  const saved = JSON.parse(localStorage.getItem("cartographer-saved-locations") || "[]");
                  if (!saved.find((l: string) => l === location.id)) {
                    saved.push(location.id);
                    localStorage.setItem("cartographer-saved-locations", JSON.stringify(saved));
                  }
                }}
              />
            ))}
          </div>
        </div>

        {sortedResults.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-600">No locations match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
