"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getOnboardingAnswers, getUserProfile, clearOnboardingStorage } from "@/lib/storage";
import type { OnboardingAnswers } from "@/lib/onboarding/types";

// Stress-test page reads raw localStorage data whose shape may differ from
// the canonical UserProfile type. We validate at runtime instead.
// eslint-disable-next-line no-unused-vars
type StressTestProfile = any;

function isValidProfile(d: unknown): d is StressTestProfile {
  if (d == null || typeof d !== "object") return false;
  const o = d as Record<string, unknown>;
  const career = o.career as Record<string, unknown> | undefined;
  const locations = o.locations as { consideredLocations?: unknown[] } | undefined;
  return (
    typeof o.raw === "object" &&
    typeof o.isStudent === "boolean" &&
    typeof o.isFinanciallyIndependent === "boolean" &&
    locations != null &&
    typeof locations === "object" &&
    Array.isArray(locations.consideredLocations) &&
    career != null &&
    typeof career === "object" &&
    typeof career.primaryOccupation === "string" &&
    (career.partnerOccupation === null || typeof career.partnerOccupation === "string")
  );
}

function isValidAnswers(d: unknown): d is OnboardingAnswers {
  if (d == null || typeof d !== "object") return false;
  return true;
}

function formatSalary(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

type SalaryRow = { location: string; primarySalary: number | null; partnerSalary: number | null };

export default function StressTestPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<any>(null);
  const [profile, setProfile] = useState<StressTestProfile | null>(null);
  const [salaryData, setSalaryData] = useState<SalaryRow[] | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const rawAnswers = getOnboardingAnswers(isValidAnswers);
    const rawProfile = getUserProfile(isValidProfile);
    if (!rawProfile) {
      router.replace("/onboarding");
      return;
    }
    setAnswers(rawAnswers ?? null);
    setProfile(rawProfile);
    setMounted(true);
  }, [router]);

  useEffect(() => {
    const considered = profile?.locations?.consideredLocations ?? [];
    if (!profile || considered.length === 0) {
      setSalaryData(null);
      return;
    }
    const locationLabels = considered.map((loc: any) => (loc && typeof loc === "object" && "label" in loc ? String((loc as { label: string }).label) : ""));
    let cancelled = false;
    fetch("/api/salary/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locations: locationLabels.filter(Boolean),
        primaryOccupation: profile.career.primaryOccupation,
        partnerOccupation: profile.career.partnerOccupation,
      }),
    })
      .then((r) => r.json())
      .then((data: { byLocation?: SalaryRow[] }) => {
        if (!cancelled && Array.isArray(data.byLocation)) setSalaryData(data.byLocation);
      })
      .catch(() => {
        if (!cancelled) setSalaryData([]);
      });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const handleReset = () => {
    clearOnboardingStorage();
    router.replace("/onboarding");
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <nav className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-cyan-600 font-semibold hover:text-cyan-700">
              ← Home
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-slate-600 text-sm">Stress Test</span>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 font-medium hover:bg-red-100"
              >
                Reset onboarding
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Stress Test</h1>
          <p className="text-slate-600 mb-6">
            Raw answers, normalized profile, derived flags, and sanity checklist. Use this to verify logic before building the rest of the app.
          </p>
        </div>

        {/* A) Raw answers */}
        <section className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <h2 className="text-lg font-semibold text-slate-800 bg-slate-50 border-b border-slate-200 px-6 py-4">
            A) Raw onboarding answers
          </h2>
          <pre className="p-6 text-sm text-slate-700 overflow-auto max-h-96 font-mono bg-white">
            {answers != null ? JSON.stringify(answers, null, 2) : "No onboarding answers in storage."}
          </pre>
        </section>

        {/* B) Normalized userProfile */}
        <section className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <h2 className="text-lg font-semibold text-slate-800 bg-slate-50 border-b border-slate-200 px-6 py-4">
            B) Normalized user profile
          </h2>
          <pre className="p-6 text-sm text-slate-700 overflow-auto max-h-96 font-mono bg-white">
            {profile != null ? JSON.stringify(profile, null, 2) : "No user profile in storage."}
          </pre>
        </section>

        {/* C) Derived flags */}
        <section className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <h2 className="text-lg font-semibold text-slate-800 bg-slate-50 border-b border-slate-200 px-6 py-4">
            C) Derived flags (computed during normalization)
          </h2>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profile ? (
              <>
                <div className="rounded-lg border border-slate-200 p-4 bg-cyan-50/50 border-cyan-200">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">isStudent</p>
                  <p className="text-slate-800 font-semibold">{String(profile.isStudent)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4 bg-cyan-50/50 border-cyan-200">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">isFinanciallyIndependent</p>
                  <p className="text-slate-800 font-semibold">{String(profile.isFinanciallyIndependent)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4 bg-cyan-50/50 border-cyan-200">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">expectedIndependenceAge</p>
                  <p className="text-slate-800 font-semibold">{profile.expectedIndependenceAge ?? "—"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4 bg-cyan-50/50 border-cyan-200">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">householdType</p>
                  <p className="text-slate-800 font-semibold">{profile.householdType}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4 bg-cyan-50/50 border-cyan-200">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">numEarners</p>
                  <p className="text-slate-800 font-semibold">{profile.numEarners}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4 bg-cyan-50/50 border-cyan-200">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">kidsPlan</p>
                  <p className="text-slate-800 font-semibold">{profile.kidsPlan}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4 bg-cyan-50/50 border-cyan-200">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">locationMode</p>
                  <p className="text-slate-800 font-semibold">{profile.locationMode}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4 bg-cyan-50/50 border-cyan-200 sm:col-span-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">locations</p>
                  <p className="text-slate-800 font-semibold">
                    {profile.locations.consideredLocations.length > 0
                      ? profile.locations.consideredLocations.map((l: any) => l.label).join(", ")
                      : "—"}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-slate-600 col-span-2">No profile; complete onboarding first.</p>
            )}
          </div>
        </section>

        {/* Occupation Salary Preview */}
        <section className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <h2 className="text-lg font-semibold text-slate-800 bg-slate-50 border-b border-slate-200 px-6 py-4">
            Occupation Salary Preview
          </h2>
          <div className="p-6 space-y-6">
            {profile ? (
              <>
                {profile.locations.consideredLocations.length === 0 ? (
                  <p className="text-slate-600">No location selected.</p>
                ) : (
                  <>
                    {/* Primary occupation + default location */}
                    <div className="rounded-lg border border-slate-200 p-4 bg-cyan-50/50 border-cyan-200 space-y-1">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Primary occupation</p>
                      <p className="text-slate-800 font-semibold">{profile.career.primaryOccupation}</p>
                      <p className="text-sm text-slate-600">
                        Location used: <span className="font-medium text-slate-800">{profile.locations.consideredLocations[0]?.label ?? "—"}</span>
                      </p>
                      <p className="text-sm text-slate-700">
                        Salary:{" "}
                        {salaryData === null
                          ? "Loading…"
                          : salaryData?.[0]?.primarySalary != null
                            ? formatSalary(salaryData[0].primarySalary)
                            : "Not found"}
                      </p>
                    </div>

                    {/* Partner occupation (if exists) */}
                    {profile.career.partnerOccupation != null && (
                      <div className="rounded-lg border border-slate-200 p-4 bg-cyan-50/50 border-cyan-200 space-y-1">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Partner occupation</p>
                        <p className="text-slate-800 font-semibold">{profile.career.partnerOccupation}</p>
                        <p className="text-sm text-slate-600">
                          Location used: <span className="font-medium text-slate-800">{profile.locations.consideredLocations[0]?.label ?? "—"}</span>
                        </p>
                        <p className="text-sm text-slate-700">
                          Salary:{" "}
                          {salaryData === null
                            ? "Loading…"
                            : salaryData?.[0]?.partnerSalary != null
                              ? formatSalary(salaryData[0].partnerSalary)
                              : "Not found"}
                        </p>
                      </div>
                    )}

                    {/* Table when multiple locations */}
                    {profile.locations.consideredLocations.length > 1 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse border border-slate-200 rounded-lg overflow-hidden">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="text-left px-4 py-2 font-semibold text-slate-800 border-r border-slate-200">
                                Location
                              </th>
                              <th className="text-left px-4 py-2 font-semibold text-slate-800 border-r border-slate-200">
                                Primary occupation salary
                              </th>
                              {profile.career.partnerOccupation != null && (
                                <th className="text-left px-4 py-2 font-semibold text-slate-800">
                                  Partner occupation salary
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {profile.locations.consideredLocations.map((loc: any, i: number) => {
                              const row = salaryData?.[i];
                              return (
                                <tr
                                  key={loc.id}
                                  className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50 border-t border-slate-100"}
                                >
                                  <td className="px-4 py-2 text-slate-800 border-r border-slate-200">{loc.label}</td>
                                  <td className="px-4 py-2 text-slate-700 border-r border-slate-200">
                                    {salaryData === null ? "…" : row?.primarySalary != null ? formatSalary(row.primarySalary) : "—"}
                                  </td>
                                  {profile.career.partnerOccupation != null && (
                                    <td className="px-4 py-2 text-slate-700">
                                      {salaryData === null ? "…" : row?.partnerSalary != null ? formatSalary(row.partnerSalary) : "—"}
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="text-slate-600">No profile; complete onboarding first.</p>
            )}
          </div>
        </section>

        {/* D) Sanity checklist */}
        <section className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <h2 className="text-lg font-semibold text-slate-800 bg-slate-50 border-b border-slate-200 px-6 py-4">
            D) Sanity checklist (missing / optional fields)
          </h2>
          <div className="p-6">
            <ul className="space-y-2 text-sm">
              {answers && (
                <>
                  <li className={answers.goal ? "text-green-700" : "text-amber-700"}>
                    {answers.goal ? "✓" : "○"} goal
                  </li>
                  <li className={answers.currentStatus ? "text-green-700" : "text-amber-700"}>
                    {answers.currentStatus ? "✓" : "○"} currentStatus
                  </li>
                  <li className={answers.relationshipStatus ? "text-green-700" : "text-amber-700"}>
                    {answers.relationshipStatus ? "✓" : "○"} relationshipStatus
                  </li>
                  <li className={answers.careerOutlook ? "text-green-700" : "text-amber-700"}>
                    {answers.careerOutlook ? "✓" : "○"} careerOutlook
                  </li>
                  <li className={answers.studentLoanBalance != null ? "text-green-700" : "text-amber-700"}>
                    {answers.studentLoanBalance != null ? "✓" : "○"} studentLoanBalance
                  </li>
                  <li className={answers.studentLoanRate != null ? "text-green-700" : "text-amber-700"}>
                    {answers.studentLoanRate != null ? "✓" : "○"} studentLoanRate
                  </li>
                  <li className={answers.allocationPercent != null ? "text-green-700" : "text-amber-700"}>
                    {answers.allocationPercent != null ? "✓" : "○"} allocationPercent
                  </li>
                  <li className={answers.priority ? "text-green-700" : "text-amber-700"}>
                    {answers.priority ? "✓" : "○"} priority
                  </li>
                  <li className={answers.locationSituation ? "text-green-700" : "text-amber-700"}>
                    {answers.locationSituation ? "✓" : "○"} locationSituation
                  </li>
                  <li className={(answers.occupation ?? answers.studentInterests?.length) ? "text-green-700" : "text-slate-500"}>
                    {(answers.occupation ?? answers.studentInterests?.length) ? "✓" : "○"} occupation / studentInterests (optional when not working)
                  </li>
                  <li className={answers.salary != null || answers.useOccupationEstimate ? "text-green-700" : "text-slate-500"}>
                    {answers.salary != null || answers.useOccupationEstimate ? "✓" : "○"} salary / useOccupationEstimate (optional)
                  </li>
                  <li className={answers.savings != null ? "text-green-700" : "text-slate-500"}>
                    {answers.savings != null ? "✓" : "○"} savings (optional)
                  </li>
                  <li className={answers.creditCardDebt != null ? "text-green-700" : "text-slate-500"}>
                    {answers.creditCardDebt != null ? "✓" : "○"} creditCardDebt (optional)
                  </li>
                </>
              )}
              {!answers && <li className="text-slate-500">No answers in storage.</li>}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
