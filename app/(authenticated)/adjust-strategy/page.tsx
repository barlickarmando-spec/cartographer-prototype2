"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Step2HouseholdType,
  Step3AgeOccupation,
  Step4FinancialPortfolio,
  Step5Allocation,
} from "@/components/onboarding/OnboardingWizard";
import type { OnboardingAnswers } from "@/lib/onboarding/types";
import { normalizeOnboardingAnswers } from "@/lib/onboarding/normalize";
import {
  getOnboardingAnswers,
  setOnboardingAnswers,
  setUserProfile,
  getSavedLocations,
  setSavedLocations,
} from "@/lib/storage";
import { getAllLocationOptions } from "@/lib/locations";

const STEPS = [
  { key: 2, label: "Household Planning" },
  { key: 3, label: "Job & Occupation" },
  { key: 4, label: "Financial Portfolio" },
  { key: 5, label: "Allocation" },
] as const;

export default function AdjustStrategyPage() {
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Partial<OnboardingAnswers> | null>(null);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = getOnboardingAnswers<OnboardingAnswers>(
      (d): d is OnboardingAnswers => d != null && typeof d === "object"
    );
    if (!stored) {
      router.push("/onboarding");
      return;
    }
    setAnswers(stored);
    setMounted(true);
  }, [router]);

  const updateAnswer = useCallback(
    <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => {
      setAnswers((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    []
  );

  const handleSave = useCallback(() => {
    if (!answers) return;
    setSaving(true);

    // Small delay so the spinner renders before heavy computation
    setTimeout(() => {
      try {
        const fullAnswers = answers as OnboardingAnswers;
        const profile = normalizeOnboardingAnswers(fullAnswers);

        // Persist updated answers + profile
        setOnboardingAnswers(fullAnswers);
        setUserProfile(profile);

        // Recalculate all locations (saved + selected)
        const { calculateAutoApproach } = require("@/lib/calculation-engine");

        const savedLocations = getSavedLocations();
        const selectedLocations = profile.selectedLocations;

        // Combine saved + selected, deduped
        const allLocations = Array.from(
          new Set([...selectedLocations, ...savedLocations])
        );

        let locations: string[];
        if (allLocations.length > 0) {
          locations = allLocations;
        } else {
          // "no idea" users — recalculate all states
          locations = getAllLocationOptions()
            .filter((o) => o.type === "state")
            .map((o) => o.label);
        }

        const results = locations
          .map((loc) => {
            try {
              return calculateAutoApproach(profile, loc, 30);
            } catch (error) {
              console.error(`Error calculating for ${loc}:`, error);
              return null;
            }
          })
          .filter((r: unknown) => r !== null);

        localStorage.setItem("calculation-results", JSON.stringify(results));
        router.push("/profile");
      } catch (error) {
        console.error("Adjust strategy save error:", error);
        setSaving(false);
      }
    }, 50);
  }, [answers, router]);

  if (!mounted || !answers) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  const step = STEPS[currentIdx];
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === STEPS.length - 1;
  const progressPercent = Math.round(((currentIdx + 1) / STEPS.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Nav */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/profile" className="flex items-center shrink-0">
              <Image
                src="/Icons/Icons Transparent/Logo_transparent.png"
                alt="Cartographer"
                width={200}
                height={50}
                className="h-10 w-auto"
              />
            </Link>
            <span className="text-slate-600 text-sm">Adjust Strategy</span>
          </div>
        </div>
      </nav>

      {/* Progress Bar */}
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-4xl mx-auto px-8 py-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-[#6B7280]">
              {step.label} &mdash; Step {currentIdx + 1} of {STEPS.length}
            </span>
            <span className="text-sm text-[#9CA3AF]">{progressPercent}% Complete</span>
          </div>
          <div className="w-full bg-[#E5E7EB] rounded-full h-2">
            <div
              className="bg-[#5BA4E5] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-8 py-16">
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] px-16 py-12">
          {step.key === 2 && (
            <Step2HouseholdType answers={answers} updateAnswer={updateAnswer} />
          )}
          {step.key === 3 && (
            <Step3AgeOccupation answers={answers} updateAnswer={updateAnswer} />
          )}
          {step.key === 4 && (
            <Step4FinancialPortfolio answers={answers} updateAnswer={updateAnswer} />
          )}
          {step.key === 5 && (
            <Step5Allocation answers={answers} updateAnswer={updateAnswer} />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          {isFirst ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 px-4 py-2 text-[#6B7280] hover:text-[#2C3E50] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Cancel
            </Link>
          ) : (
            <button
              onClick={() => setCurrentIdx((i) => i - 1)}
              className="flex items-center gap-2 px-4 py-2 text-[#6B7280] hover:text-[#2C3E50] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}

          {/* Progress Dots */}
          <div className="flex gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIdx
                    ? "bg-[#5BA4E5] w-8"
                    : i < currentIdx
                    ? "bg-[#5BA4E5]"
                    : "bg-[#E5E7EB]"
                }`}
              />
            ))}
          </div>

          {isLast ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#5BA4E5] text-white rounded-lg hover:bg-[#4A93D4] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm font-medium"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Recalculating...
                </>
              ) : (
                <>
                  Save & Recalculate
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setCurrentIdx((i) => i + 1)}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#5BA4E5] text-white rounded-lg hover:bg-[#4A93D4] transition-all shadow-sm font-medium"
            >
              Next
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
