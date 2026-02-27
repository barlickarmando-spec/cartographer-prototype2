"use client";

import { useState } from "react";
import Link from "next/link";
import { calculateAutoApproach, CalculationResult } from "@/lib/calculation-engine";
import { HouseholdTypeEnum } from "@/lib/onboarding/types";
import type { UserProfile } from "@/lib/onboarding/types";

/**
 * Fixed test profile: Florida scenario from the analysis
 * - Couple, 2 earners, $222,900 combined income
 * - Age 25, kid planned at 32
 * - $80K student debt @ 5%, $6,550 CC debt, $0 savings
 * - 70% DI allocation
 */
function buildTestProfile(): UserProfile {
  return {
    currentAge: 25,
    isFinanciallyIndependent: true,
    householdType: HouseholdTypeEnum.TwoEarners,
    relationshipStatus: "linked",
    numEarners: 2,
    numKids: 0,
    kidsPlan: "yes",
    kidsKnowledge: "know-count",
    declaredKidCount: 1,
    plannedKidAges: [32],
    hardRules: ["none"],
    userOccupation: "management",
    userSalary: 111450, // Half of $222,900
    usePartnerIncomeDoubling: true,
    studentLoanDebt: 80000,
    studentLoanRate: 0.05,
    creditCardDebt: 6550,
    creditCardAPR: 0.216,
    creditCardRefreshMonths: 36,
    carDebt: 0,
    carDebtRate: 0,
    otherDebt: 0,
    otherDebtRate: 0,
    conditionalDebts: [],
    annualExpenses: [],
    currentSavings: 0,
    disposableIncomeAllocation: 70,
    locationSituation: "know-exactly",
    selectedLocations: ["Florida"],
    currentLocation: "Florida",
    locationRegions: [],
    locationClimate: [],
    locationPriority: "combination",
  };
}

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}

export default function ProjectionTestPage() {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [running, setRunning] = useState(false);

  const runTest = () => {
    setRunning(true);
    setTimeout(() => {
      const profile = buildTestProfile();
      const calcResult = calculateAutoApproach(profile, "Florida", 30);
      setResult(calcResult);
      setRunning(false);
    }, 50);
  };

  const hp = result?.houseProjections;

  // Expected values from manual hand-trace
  const expected = {
    threeYears: { savings: 246685, savingsMax: 1011137, sustainMax: 1417000 },
    fiveYears: { savings: 482301, savingsMax: 1977271, sustainMax: 1417000 },
    tenYears: { savings: 1084524, savingsMax: 4445278, sustainMax: 1417000 },
    fifteenYears: { savings: 1745690, savingsMax: 7155230, sustainMax: 1417000 },
    maxAffordable: { sustainMax: 1417000 },
  };

  function diff(actual: number, expected: number): { pct: string; ok: boolean } {
    if (expected === 0) return { pct: "N/A", ok: actual === 0 };
    const p = ((actual - expected) / expected) * 100;
    return { pct: (p >= 0 ? "+" : "") + p.toFixed(1) + "%", ok: Math.abs(p) < 5 };
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <nav className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-14">
            <Link href="/" className="text-cyan-600 font-semibold hover:text-cyan-700">
              &larr; Home
            </Link>
            <Link href="/profile" className="text-slate-600 hover:text-slate-900">
              Profile
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Projection Engine Test</h1>
          <p className="text-slate-600 mb-4">
            Runs the calculation engine with fixed inputs and compares actual output against hand-traced expected values.
          </p>

          {/* Test Scenario */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6 text-sm">
            <h3 className="font-semibold text-slate-800 mb-2">Test Scenario: Florida</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-slate-700">
              <div><span className="text-slate-500">Income:</span> $222,900</div>
              <div><span className="text-slate-500">Age:</span> 25</div>
              <div><span className="text-slate-500">Household:</span> Couple, 2 earners</div>
              <div><span className="text-slate-500">Kid at:</span> Age 32</div>
              <div><span className="text-slate-500">Student Debt:</span> $80,000 @ 5%</div>
              <div><span className="text-slate-500">CC Debt:</span> $6,550</div>
              <div><span className="text-slate-500">Savings:</span> $0</div>
              <div><span className="text-slate-500">Allocation:</span> 70%</div>
            </div>
          </div>

          <button
            onClick={runTest}
            disabled={running}
            className="bg-cyan-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? "Running..." : "Run Calculation Engine"}
          </button>
        </div>

        {result && (
          <>
            {/* Key Metrics */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Key Timeline Metrics</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
                  <p className="text-xs text-slate-500 mb-1">Years to Debt-Free</p>
                  <p className="text-2xl font-bold text-slate-800">{result.yearsToDebtFree}</p>
                  <p className="text-xs text-slate-500">Age {result.ageDebtFree}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-slate-500 mb-1">Years to Mortgage</p>
                  <p className="text-2xl font-bold text-slate-800">{result.yearsToMortgage}</p>
                  <p className="text-xs text-slate-500">Age {result.ageMortgageAcquired}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-xs text-slate-500 mb-1">Viability</p>
                  <p className="text-lg font-bold text-slate-800">{result.viabilityClassification}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <p className="text-xs text-slate-500 mb-1">Min Allocation</p>
                  <p className="text-2xl font-bold text-slate-800">{result.minimumAllocationRequired}%</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-xs text-slate-500 mb-1">Simulation Years</p>
                  <p className="text-2xl font-bold text-slate-800">{result.yearByYear.length}</p>
                  <p className="text-xs text-slate-500">{result.simulationStoppedEarly ? "Stopped early" : "Full run"}</p>
                </div>
              </div>
            </div>

            {/* Projection Comparison Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-8 py-4">
                <h2 className="text-xl font-bold text-slate-800">House Projections: Actual vs Expected</h2>
                <p className="text-sm text-slate-600">Green = within 5% of hand-traced value, Red = diverged</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-left font-semibold text-slate-800">Milestone</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-800">Age</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-800">No-Mtg Savings</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-800">Expected</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-800">Diff</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-800">Savings-Based Max</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-800">Sustainable Max</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-800">Expected Sustain</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-800">Diff</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-800">Limited By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      { label: "3 Years", proj: hp?.threeYears, exp: expected.threeYears },
                      { label: "5 Years", proj: hp?.fiveYears, exp: expected.fiveYears },
                      { label: "10 Years", proj: hp?.tenYears, exp: expected.tenYears },
                      { label: "15 Years", proj: hp?.fifteenYears, exp: expected.fifteenYears },
                    ] as const).map((row, i) => {
                      const p = row.proj;
                      if (!p) return (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="px-4 py-3 font-medium">{row.label}</td>
                          <td colSpan={9} className="px-4 py-3 text-red-500">No projection data</td>
                        </tr>
                      );
                      const savDiff = diff(p.totalSavings, row.exp.savings);
                      const susDiff = diff(p.maxSustainableHousePrice, row.exp.sustainMax);
                      return (
                        <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                          <td className="px-4 py-3 font-medium text-slate-800">{row.label}</td>
                          <td className="px-4 py-3">{p.age}</td>
                          <td className="px-4 py-3 text-right font-mono">{fmt(p.totalSavings)}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500">{fmt(row.exp.savings)}</td>
                          <td className={`px-4 py-3 text-right font-mono font-bold ${savDiff.ok ? "text-green-600" : "text-red-600"}`}>
                            {savDiff.pct}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{fmt(p.maxPossibleHousePrice)}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold">{fmt(p.maxSustainableHousePrice)}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500">{fmt(row.exp.sustainMax)}</td>
                          <td className={`px-4 py-3 text-right font-mono font-bold ${susDiff.ok ? "text-green-600" : "text-red-600"}`}>
                            {susDiff.pct}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                              p.sustainabilityLimited ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                            }`}>
                              {p.sustainabilityLimited ? "Income" : "Savings"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Max Affordable Row */}
                    {hp?.maxAffordable ? (
                      <tr className="border-t-2 border-amber-300 bg-amber-50/50">
                        <td className="px-4 py-3 font-bold text-amber-800">
                          Max (Cap)
                        </td>
                        <td className="px-4 py-3">{hp.maxAffordable.age}</td>
                        <td className="px-4 py-3 text-right font-mono">{fmt(hp.maxAffordable.totalSavings)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">-</td>
                        <td className="px-4 py-3 text-right">-</td>
                        <td className="px-4 py-3 text-right font-mono">{fmt(hp.maxAffordable.maxPossibleHousePrice)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-amber-800">
                          {fmt(hp.maxAffordable.maxSustainableHousePrice)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">{fmt(expected.maxAffordable.sustainMax)}</td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${
                          diff(hp.maxAffordable.maxSustainableHousePrice, expected.maxAffordable.sustainMax).ok
                            ? "text-green-600" : "text-red-600"
                        }`}>
                          {diff(hp.maxAffordable.maxSustainableHousePrice, expected.maxAffordable.sustainMax).pct}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-800">
                            Income Ceiling
                          </span>
                        </td>
                      </tr>
                    ) : (
                      <tr className="border-t-2 border-red-300 bg-red-50">
                        <td className="px-4 py-3 font-bold text-red-800">Max (Cap)</td>
                        <td colSpan={9} className="px-4 py-3 text-red-600 font-medium">
                          NOT PRESENT - maxAffordable projection is missing from engine output
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Year-by-Year Raw Data */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-8 py-4">
                <h2 className="text-xl font-bold text-slate-800">Year-by-Year Simulation Data</h2>
                <p className="text-sm text-slate-600">Complete simulation output from the engine</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-3 py-2 text-left">Yr</th>
                      <th className="px-3 py-2 text-left">Age</th>
                      <th className="px-3 py-2 text-left">HH Type</th>
                      <th className="px-3 py-2 text-left">Kids</th>
                      <th className="px-3 py-2 text-right">Income</th>
                      <th className="px-3 py-2 text-right">Adj COL</th>
                      <th className="px-3 py-2 text-right">Housing</th>
                      <th className="px-3 py-2 text-right">DI</th>
                      <th className="px-3 py-2 text-right">EDI</th>
                      <th className="px-3 py-2 text-right">Loan Debt</th>
                      <th className="px-3 py-2 text-right">Loan Pmt</th>
                      <th className="px-3 py-2 text-right">CC Pmt</th>
                      <th className="px-3 py-2 text-right">Savings</th>
                      <th className="px-3 py-2 text-right">NM Savings</th>
                      <th className="px-3 py-2 text-center">Mtg?</th>
                      <th className="px-3 py-2 text-left">Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.yearByYear.map((s, i) => {
                      const events: string[] = [];
                      if (s.mortgageAcquiredThisYear) events.push("MTG");
                      if (s.kidBornThisYear > 0) events.push(`KID#${s.kidBornThisYear}`);
                      if (s.relationshipStartedThisYear) events.push("REL");
                      if (s.loanDebtEnd === 0 && i > 0 && result.yearByYear[i-1].loanDebtEnd > 0) events.push("DEBT-FREE");

                      const isMilestone = [3,5,10,15].includes(s.year);
                      return (
                        <tr
                          key={s.year}
                          className={`border-b border-slate-100 ${isMilestone ? "bg-cyan-50/50 font-bold" : i % 2 === 0 ? "" : "bg-slate-50/30"}`}
                        >
                          <td className="px-3 py-1.5">{s.year}</td>
                          <td className="px-3 py-1.5">{s.age}</td>
                          <td className="px-3 py-1.5 text-[10px]">{s.householdType}</td>
                          <td className="px-3 py-1.5">{s.numKids}</td>
                          <td className="px-3 py-1.5 text-right">{s.totalIncome.toLocaleString()}</td>
                          <td className="px-3 py-1.5 text-right">{s.adjustedCOL.toLocaleString()}</td>
                          <td className="px-3 py-1.5 text-right">{s.housingCost.toLocaleString()}</td>
                          <td className={`px-3 py-1.5 text-right ${s.disposableIncome < 0 ? "text-red-600" : ""}`}>
                            {Math.round(s.disposableIncome).toLocaleString()}
                          </td>
                          <td className="px-3 py-1.5 text-right">{Math.round(s.effectiveDisposableIncome).toLocaleString()}</td>
                          <td className={`px-3 py-1.5 text-right ${s.loanDebtEnd > 0 ? "text-red-500" : "text-green-600"}`}>
                            {Math.round(s.loanDebtEnd).toLocaleString()}
                          </td>
                          <td className="px-3 py-1.5 text-right">{Math.round(s.loanDebtPayment).toLocaleString()}</td>
                          <td className="px-3 py-1.5 text-right">{s.ccDebtPayment > 0 ? Math.round(s.ccDebtPayment).toLocaleString() : ""}</td>
                          <td className="px-3 py-1.5 text-right">{Math.round(s.savingsEnd).toLocaleString()}</td>
                          <td className="px-3 py-1.5 text-right text-cyan-700">{Math.round(s.savingsNoMortgage).toLocaleString()}</td>
                          <td className="px-3 py-1.5 text-center">{s.hasMortgage ? "Y" : ""}</td>
                          <td className="px-3 py-1.5">
                            {events.map(e => (
                              <span key={e} className={`inline-block mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                e === "MTG" ? "bg-green-200 text-green-800" :
                                e.startsWith("KID") ? "bg-purple-200 text-purple-800" :
                                e === "DEBT-FREE" ? "bg-blue-200 text-blue-800" :
                                "bg-gray-200 text-gray-800"
                              }`}>{e}</span>
                            ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Max Affordable Detail Card */}
            {hp?.maxAffordable && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-lg border-2 border-amber-300 p-8">
                <h2 className="text-xl font-bold text-amber-900 mb-1">Max Affordable (NEW - Income Ceiling)</h2>
                <p className="text-sm text-amber-700 mb-4">
                  This is the new projection. It represents the absolute maximum house price your income can sustain,
                  regardless of how long you save.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/70 rounded-lg p-4">
                    <p className="text-xs text-amber-700">Sustainability Cap</p>
                    <p className="text-2xl font-bold text-amber-900">{fmt(hp.maxAffordable.maxSustainableHousePrice)}</p>
                  </div>
                  <div className="bg-white/70 rounded-lg p-4">
                    <p className="text-xs text-amber-700">Reached at Year</p>
                    <p className="text-2xl font-bold text-amber-900">{hp.maxAffordable.year}</p>
                    <p className="text-xs text-amber-600">Age {hp.maxAffordable.age}</p>
                  </div>
                  <div className="bg-white/70 rounded-lg p-4">
                    <p className="text-xs text-amber-700">Down Payment</p>
                    <p className="text-2xl font-bold text-amber-900">{fmt(hp.maxAffordable.sustainableDownPayment)}</p>
                  </div>
                  <div className="bg-white/70 rounded-lg p-4">
                    <p className="text-xs text-amber-700">Annual Payment</p>
                    <p className="text-2xl font-bold text-amber-900">{fmt(hp.maxAffordable.sustainableAnnualPayment)}/yr</p>
                  </div>
                  <div className="bg-white/70 rounded-lg p-4">
                    <p className="text-xs text-amber-700">Post-Mortgage DI</p>
                    <p className={`text-2xl font-bold ${hp.maxAffordable.postMortgageDisposableIncome >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {fmt(hp.maxAffordable.postMortgageDisposableIncome)}/yr
                    </p>
                  </div>
                  <div className="bg-white/70 rounded-lg p-4">
                    <p className="text-xs text-amber-700">Can Afford?</p>
                    <p className={`text-2xl font-bold ${hp.maxAffordable.canAfford ? "text-green-700" : "text-red-700"}`}>
                      {hp.maxAffordable.canAfford ? "Yes" : "Not yet"}
                    </p>
                  </div>
                  <div className="bg-white/70 rounded-lg p-4">
                    <p className="text-xs text-amber-700">Savings at Cap Year</p>
                    <p className="text-2xl font-bold text-amber-900">{fmt(hp.maxAffordable.totalSavings)}</p>
                  </div>
                  <div className="bg-white/70 rounded-lg p-4">
                    <p className="text-xs text-amber-700">Savings-Based Max</p>
                    <p className="text-2xl font-bold text-amber-900">{fmt(hp.maxAffordable.maxPossibleHousePrice)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Raw JSON */}
            <details className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <summary className="px-8 py-4 cursor-pointer font-semibold text-slate-800 bg-slate-50 border-b border-slate-200 hover:bg-slate-100">
                Raw houseProjections JSON
              </summary>
              <pre className="p-6 text-xs font-mono text-slate-700 overflow-auto max-h-96 bg-white">
                {JSON.stringify(hp, null, 2)}
              </pre>
            </details>
          </>
        )}
      </main>
    </div>
  );
}
