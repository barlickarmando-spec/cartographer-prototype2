"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";
import Card from "@/components/Card";
import { getLocationsByIds, findLocationById } from "@/lib/data";
import type { SavedScenario } from "@/lib/types";
import type { Location } from "@/lib/data";

export default function DashboardPage() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [savedLocations, setSavedLocations] = useState<Location[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedScenarios = JSON.parse(localStorage.getItem("cartographer-scenarios") || "[]");
    setScenarios(savedScenarios);

    const savedLocationIds = JSON.parse(localStorage.getItem("cartographer-saved-locations") || "[]");
    const locations = getLocationsByIds(savedLocationIds);
    setSavedLocations(locations);
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="mt-2 text-slate-600">Your saved scenarios and locations</p>
          </div>
          <button
            onClick={() => router.push("/onboarding")}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Run New Scenario
          </button>
        </div>

        {/* Saved Scenarios */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Saved Scenarios</h2>
          {scenarios.length === 0 ? (
            <Card>
              <p className="text-slate-600">No saved scenarios yet.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {scenarios.map((scenario) => (
                <Card key={scenario.id}>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">
                      Scenario {scenario.id.slice(-6)}
                    </h3>
                    <span className="text-xs text-slate-500">{formatDate(scenario.timestamp)}</span>
                  </div>
                  <p className="mb-2 text-sm text-slate-600">
                    {scenario.locationIds.length} location{scenario.locationIds.length !== 1 ? "s" : ""}
                  </p>
                  <button
                    onClick={() => {
                      localStorage.setItem("cartographer-last-inputs", JSON.stringify(scenario.inputs));
                      router.push("/results");
                    }}
                    className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    View Results
                  </button>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* My Locations */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-slate-900">My Locations</h2>
          {savedLocations.length === 0 ? (
            <Card>
              <p className="text-slate-600">No saved locations yet.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {savedLocations.map((location) => (
                <Card key={location.id}>
                  <h3 className="mb-1 font-semibold text-slate-900">{location.name}</h3>
                  {location.stateName && (
                    <p className="mb-3 text-sm text-slate-600">{location.stateName}</p>
                  )}
                  <button
                    onClick={() => router.push(`/results/${encodeURIComponent(location.id)}`)}
                    className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View Details
                  </button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
