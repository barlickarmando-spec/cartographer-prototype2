"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import type { OnboardingAnswers } from "@/lib/onboarding/types";
import { normalizeOnboardingAnswers } from "@/lib/onboarding/normalize";
import { getOnboardingAnswers, setOnboardingAnswers, setUserProfile } from "@/lib/storage";

export default function OnboardingPage() {
  const router = useRouter();
  const [initialAnswers, setInitialAnswers] = useState<OnboardingAnswers | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = getOnboardingAnswers<OnboardingAnswers>((d): d is OnboardingAnswers => d != null && typeof d === "object");
    setInitialAnswers(stored ?? null);
    setMounted(true);
  }, []);

  const handleProgress = useCallback((answers: OnboardingAnswers) => {
    setOnboardingAnswers(answers);
  }, []);

  const handleComplete = useCallback(
    (answers: OnboardingAnswers) => {
      const profile = normalizeOnboardingAnswers(answers);
      setOnboardingAnswers(answers);
      setUserProfile(profile);
      router.push("/stress-test");
    },
    [router]
  );

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
            <span className="text-slate-600 text-sm">Onboarding</span>
          </div>
        </div>
      </nav>
      <main className="py-12 px-4 sm:px-6 lg:px-8">
        <OnboardingWizard
          initialAnswers={initialAnswers ?? undefined}
          onComplete={handleComplete}
          onProgress={handleProgress}
        />
      </main>
    </div>
  );
}
