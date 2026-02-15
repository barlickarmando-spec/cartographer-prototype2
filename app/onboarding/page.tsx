"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
      
      // Run calculations for selected locations
      const locations = profile.selectedLocations.length > 0 
        ? profile.selectedLocations 
        : ['Utah']; // Default to Utah if no locations selected
      
      console.log('📍 Running calculations for locations:', locations);
      console.log('👤 User profile:', {
        age: profile.currentAge,
        occupation: profile.userOccupation,
        relationship: profile.relationshipStatus,
        debt: profile.studentLoanDebt,
        allocation: profile.disposableIncomeAllocation,
      });
      
      const results = locations.map(loc => {
        try {
          console.log(`Calculating for ${loc}...`);
          const { calculateAutoApproach } = require('@/lib/calculation-engine');
          const result = calculateAutoApproach(profile, loc, 30);
          console.log(`Calculation complete for ${loc}`);
          return result;
        } catch (error) {
          console.error(`Error calculating for ${loc}:`, error);
          return null;
        }
      }).filter(r => r !== null);
      
      // Save results
      if (results.length > 0) {
        localStorage.setItem('calculation-results', JSON.stringify(results));
        console.log(`💾 Saved ${results.length} calculation result(s)`);
      }
      
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
