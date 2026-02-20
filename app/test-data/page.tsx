"use client";

import { useState } from "react";
import Link from "next/link";
import { getLocationData, getAllStates, getSalary } from "@/lib/data-extraction";

export default function TestDataPage() {
  const [state, setState] = useState("Utah");
  const [data, setData] = useState<ReturnType<typeof getLocationData>>(null);

  const handleLoad = () => {
    const locationData = getLocationData(state);
    setData(locationData);
  };

  const states = getAllStates();

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-14">
            <Link href="/" className="text-cyan-600 font-semibold hover:text-cyan-700">
              ← Home
            </Link>
            <Link href="/onboarding" className="text-slate-600 hover:text-slate-900">
              Onboarding
            </Link>
          </div>
        </div>
      </nav>
      <main className="p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Test Data Extraction</h1>
      <p className="text-slate-600 mb-6">
        Select a state and click Load Data to verify extraction from State_City_Data_Final.json.
      </p>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="border border-slate-300 rounded-lg px-4 py-2 text-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
        >
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleLoad}
          className="bg-cyan-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-cyan-600"
        >
          Load Data
        </button>
      </div>

      {data && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-800">{data.displayName} Data</h2>

          <section>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Salary (sample)</h3>
            <p className="text-slate-600">
              Computer and Mathematics: {getSalary(state, "Computer and Mathematics")?.toLocaleString() ?? "—"}
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Housing</h3>
            <pre className="bg-slate-100 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(data.housing, null, 2)}
            </pre>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Rent (stub)</h3>
            <pre className="bg-slate-100 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(data.rent, null, 2)}
            </pre>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Full location data (JSON)</h3>
            <pre className="bg-slate-100 p-4 rounded-lg overflow-auto text-sm max-h-96">
              {JSON.stringify(data, null, 2)}
            </pre>
          </section>
        </div>
      )}
      </main>
    </div>
  );
}
