"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import type { OnboardingAnswers } from "@/lib/onboarding/types";
import { normalizeOnboardingAnswers } from "@/lib/onboarding/normalize";
import { getOnboardingAnswers, setOnboardingAnswers, setUserProfile, setSavedLocations } from "@/lib/storage";
import { getAllLocationOptions } from "@/lib/locations";

export default function OnboardingPage() {
  const router = useRouter();
  const [initialAnswers, setInitialAnswers] = useState<OnboardingAnswers | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = getOnboardingAnswers<OnboardingAnswers>((d): d is OnboardingAnswers => d != null && typeof d === "object");
    setInitialAnswers(stored ?? null);
    
    // Clear any old calculation results when returning to onboarding
    // This ensures fresh calculation when user changes inputs
    if (typeof window !== 'undefined') {
      localStorage.removeItem('calculation-results');
    }
    
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
      
      const { calculateAutoApproach } = require('@/lib/calculation-engine');

      // Determine which locations to calculate
      let locations: string[];
      const isNoIdea = profile.selectedLocations.length === 0;

      if (isNoIdea) {
        // "No idea" - calculate ALL states to find the best fits
        locations = getAllLocationOptions()
          .filter(o => o.type === 'state')
          .map(o => o.label);
        // No saved locations for "no idea" users
        setSavedLocations([]);
      } else {
        locations = profile.selectedLocations;
        // Auto-save explicitly selected locations as favorites
        setSavedLocations([...locations]);
      }

      const results = locations.map(loc => {
        try {
          const result = calculateAutoApproach(profile, loc, 30);
          return result;
        } catch (error) {
          console.error(`Error calculating for ${loc}:`, error);
          return null;
        }
      }).filter(r => r !== null);

      // Always save results (even if empty) so other pages don't redirect back
      localStorage.setItem('calculation-results', JSON.stringify(results));

      // Navigate to profile
      router.push('/profile');
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
            <Link href="/" className="flex items-center shrink-0">
              <Image
                src="/Icons/Icons Transparent/Logo_transparent.png"
                alt="Cartographer"
                width={200}
                height={50}
                className="h-10 w-auto"
              />
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
