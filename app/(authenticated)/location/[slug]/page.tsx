'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { calculateAutoApproach, CalculationResult } from '@/lib/calculation-engine';
import { getLocationData, LocationData, getOccupationList, getSalary } from '@/lib/data-extraction';
import { getTypicalHomeValue, getPricePerSqft, estimateHomeSizeSqft } from '@/lib/home-value-lookup';
import { generateWealthTimeline, calculateLocationWealth, getRppFactor, analyzeSale, WealthProjection } from '@/lib/wealth-calculations';
import { normalizeOnboardingAnswers } from '@/lib/onboarding/normalize';
import { getOnboardingAnswers, getSavedLocations, setSavedLocations } from '@/lib/storage';
import { getStateFlagPath, STATE_CODES, getStateNameFromLocation } from '@/lib/state-flags';
import { formatCurrency, formatYears, cn } from '@/lib/utils';
import type { OnboardingAnswers, UserProfile } from '@/lib/onboarding/types';
import QoLSection from '@/components/QoLSection';
import QoLGradeCard from '@/components/QoLGradeCard';
import { getPersonalizedQoL, getObjectiveQoL } from '@/lib/qol-engine';
import LocationHeroCarousel from '@/components/LocationHeroCarousel';
import { getLocationImages, LocationImage } from '@/lib/location-images';

// ─── Helpers ────────────────────────────────────────────────────────
function fmtNum(n: number): string {
  return Math.round(n).toLocaleString();
}
function fmtDollars(n: number): string {
  return '$' + fmtNum(n);
}
function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

function getViabilityLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 8) return { label: 'Highly Viable', color: 'text-emerald-700', bg: 'bg-emerald-100' };
  if (score >= 6) return { label: 'Viable', color: 'text-green-700', bg: 'bg-green-100' };
  if (score >= 4) return { label: 'Challenging', color: 'text-amber-700', bg: 'bg-amber-100' };
  if (score >= 2) return { label: 'Difficult', color: 'text-orange-700', bg: 'bg-orange-100' };
  return { label: 'Not Viable', color: 'text-red-700', bg: 'bg-red-100' };
}

function getStarRating(score: number): number {
  return Math.round((score / 10) * 5 * 2) / 2;
}

function decodeSlug(slug: string): string {
  return decodeURIComponent(slug).replace(/-/g, ' ');
}

function encodeSlug(name: string): string {
  return encodeURIComponent(name.replace(/ /g, '-'));
}

// ─── Reusable UI components ─────────────────────────────────────────
function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('bg-white rounded-2xl border border-gray-200 overflow-hidden', className)}>
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-carto-slate">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function MetricCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: accent || '#F0F7FF' }}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-carto-slate mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Tabs ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'quality-of-life', label: 'Quality of Life', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  { id: 'housing', label: 'Housing', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { id: 'job-market', label: 'Job Market', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Main Page ──────────────────────────────────────────────────────
export default function LocationPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || '';
  const locationName = decodeSlug(slug);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [calcResult, setCalcResult] = useState<CalculationResult | null>(null);
  const [locData, setLocData] = useState<LocationData | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [compareIndustry, setCompareIndustry] = useState<string>('');
  const [allocationMode, setAllocationMode] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [loading, setLoading] = useState(true);

  // Load profile + run calculation
  useEffect(() => {
    const answers = getOnboardingAnswers<OnboardingAnswers>(
      (d): d is OnboardingAnswers => d != null && typeof d === 'object'
    );
    if (!answers) { setLoading(false); return; }
    const prof = normalizeOnboardingAnswers(answers);
    setProfile(prof);
    setSelectedIndustry(prof.userOccupation || '');
    const ld = getLocationData(locationName);
    setLocData(ld);
    const result = calculateAutoApproach(prof, locationName, 30);
    setCalcResult(result);
    const saved = getSavedLocations();
    setIsSaved(saved.includes(locationName));
    setLoading(false);
  }, [locationName]);

  // Wealth data
  const wealthData = useMemo(() => {
    if (!calcResult) return null;
    return calculateLocationWealth(calcResult, 30);
  }, [calcResult]);

  const wealthTimeline = useMemo(() => {
    if (!calcResult) return [];
    return generateWealthTimeline(calcResult, 50);
  }, [calcResult]);

  const sellAnalyses = useMemo(() => {
    if (!calcResult) return {};
    return {
      y5: analyzeSale(calcResult, 5),
      y10: analyzeSale(calcResult, 10),
      y15: analyzeSale(calcResult, 15),
      y30: analyzeSale(calcResult, 30),
    };
  }, [calcResult]);

  const jobMarketData = useMemo(() => {
    if (!locData) return [];
    const occupations = getOccupationList();
    return occupations.map(occ => ({
      name: occ,
      salary: getSalary(locationName, occ),
    })).sort((a, b) => b.salary - a.salary);
  }, [locData, locationName]);

  const userSalaryForQoL = useMemo(() => {
    if (!profile) return 0;
    return getSalary(locationName, profile.userOccupation, profile.userSalary);
  }, [locationName, profile]);

  const qolResult = useMemo(() => {
    const stateName = getStateNameFromLocation(locationName);
    if (!stateName) return null;
    if (userSalaryForQoL > 0) return getPersonalizedQoL(stateName, userSalaryForQoL);
    return getObjectiveQoL(stateName);
  }, [locationName, userSalaryForQoL]);

  // Suggestions
  const [suggestions, setSuggestions] = useState<{ name: string; score: number; reason: string }[]>([]);
  useEffect(() => {
    if (!profile || !calcResult) return;
    const timer = setTimeout(() => {
      const comparisons: { name: string; score: number; reason: string }[] = [];
      const states = Object.keys(STATE_CODES);
      for (const st of states) {
        if (st === locationName) continue;
        try {
          const r = calculateAutoApproach(profile, st, 30);
          if (r && r.numericScore > 0) {
            let reason = '';
            if (r.numericScore > calcResult.numericScore + 1) reason = 'Higher viability score';
            else if (r.locationData.adjustedCOL.onePerson < (calcResult.locationData?.adjustedCOL.onePerson || Infinity) * 0.9) reason = 'Lower cost of living';
            else continue;
            comparisons.push({ name: st, score: r.numericScore, reason });
          }
        } catch { /* skip */ }
      }
      comparisons.sort((a, b) => b.score - a.score);
      setSuggestions(comparisons.slice(0, 8));
    }, 100);
    return () => clearTimeout(timer);
  }, [profile, calcResult, locationName]);

  const handleSave = useCallback(() => {
    const saved = getSavedLocations();
    if (isSaved) {
      setSavedLocations(saved.filter(s => s !== locationName));
      setIsSaved(false);
    } else {
      setSavedLocations([...saved, locationName]);
      setIsSaved(true);
    }
  }, [isSaved, locationName]);

  // Allocation table
  const allocationMultiplier = allocationMode === 'conservative' ? 0.8 : allocationMode === 'aggressive' ? 1.2 : 1.0;
  const allocationTable = useMemo(() => {
    if (!calcResult) return [];
    return calcResult.yearByYear.slice(0, 15).map(snap => {
      const adi = snap.effectiveDisposableIncome * allocationMultiplier;
      const savings = Math.max(0, adi - snap.loanDebtPayment - snap.ccDebtPayment);
      return {
        year: snap.year,
        age: snap.age,
        income: snap.totalIncome,
        col: snap.totalCOL,
        disposable: snap.disposableIncome,
        allocated: adi,
        debtPayment: snap.loanDebtPayment + snap.ccDebtPayment,
        savings,
        totalSaved: snap.savingsEnd,
      };
    });
  }, [calcResult, allocationMultiplier]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-64 bg-gray-200 rounded-2xl" />
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!locData || !calcResult) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold text-carto-slate mb-4">Location Not Found</h1>
        <p className="text-gray-500 mb-6">Could not find data for &ldquo;{locationName}&rdquo;. Please complete onboarding first or pick a valid location.</p>
        <button onClick={() => router.push('/home-affordability')} className="px-6 py-2 bg-carto-blue text-white rounded-full font-medium">
          Back to Map
        </button>
      </div>
    );
  }

  const score = calcResult.numericScore;
  const viability = getViabilityLabel(score);
  const stars = getStarRating(score);
  const stateCode = STATE_CODES[locationName] || '';
  const flagPath = getStateFlagPath(locationName);

  const colOnePerson = locData.adjustedCOL.onePerson;
  const colWithOneKid = locData.adjustedCOL.singleParentOneKid || locData.adjustedCOL.familyThreeOneWorker;
  const colWithTwoKids = locData.adjustedCOL.singleParentTwoKids || locData.adjustedCOL.familyFourOneWorker;

  const yearByYear = calcResult.yearByYear;
  const firstYear = yearByYear[0];
  const disposableIncome = firstYear?.disposableIncome || 0;
  const minAllocation = calcResult.minimumAllocationRequired;
  const medianRent = locData.rent.twoBedroomAnnual > 0 ? Math.round(locData.rent.twoBedroomAnnual / 12) : 0;
  const kv = calcResult.kidViability;
  const rentAnnual = locData.rent.twoBedroomAnnual;
  const maxAffordable = calcResult.houseProjections.maxAffordable;
  const mortgageAnnual = maxAffordable?.sustainableAnnualPayment || 0;
  const userSalary = profile ? getSalary(locationName, profile.userOccupation, profile.userSalary) : 0;
  const userIndustryRank = jobMarketData.findIndex(j =>
    j.name.toLowerCase().includes((profile?.userOccupation || '').toLowerCase().split(' ')[0])
  ) + 1;

  return (
    <div className="max-w-7xl mx-auto pb-24">
      {/* ═══ HERO / BANNER ═══ */}
      <div className="mb-0">
        {/* Image carousel */}
        {(() => {
          const heroImages = getLocationImages(locationName);
          const placeholders: LocationImage[] = heroImages && heroImages.length > 0
            ? heroImages
            : [{ src: flagPath, alt: locationName }];
          return <LocationHeroCarousel images={placeholders} locationName={locationName} />;
        })()}

        {/* Title card */}
        <div className="bg-white border border-t-0 border-gray-200 px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-carto-slate">
                {locationName}
                {stateCode && <span className="ml-2 text-lg font-medium text-gray-400">{stateCode}</span>}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-500">
                <span className={cn('px-3 py-1 rounded-full text-sm font-semibold', viability.bg, viability.color)}>
                  {viability.label}
                </span>
                <span className="text-gray-400">|</span>
                <span className="font-medium text-carto-slate">{score.toFixed(1)} / 10</span>
                <span className="text-gray-400">|</span>
                <span className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <svg key={i} className={cn('w-4 h-4', i <= stars ? 'text-yellow-400' : i - 0.5 <= stars ? 'text-yellow-400' : 'text-gray-200')} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </span>
                {qolResult && (
                  <>
                    <span className="text-gray-400">|</span>
                    <span>QoL: <strong className="text-carto-slate">{qolResult.personal_label}</strong></span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleSave}
                className={cn(
                  'px-5 py-2.5 rounded-full text-sm font-semibold transition-colors border',
                  isSaved
                    ? 'bg-[#4A90D9] text-white border-[#4A90D9]'
                    : 'bg-white text-[#4A90D9] border-[#4A90D9] hover:bg-[#4A90D9]/5'
                )}
              >
                {isSaved ? 'Saved' : 'Save to My Locations'}
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-full text-sm font-semibold bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>

        {/* ═══ TAB BAR ═══ */}
        <div className="bg-white border border-t-0 border-gray-200 rounded-b-2xl px-2 overflow-x-auto">
          <nav className="flex gap-1 min-w-max" role="tablist">
            {TABS.map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors relative whitespace-nowrap',
                  activeTab === tab.id
                    ? 'text-[#4A90D9]'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                </svg>
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#4A90D9] rounded-full" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      <div className="mt-6 space-y-6">

        {/* ════════════════════════════════════════════════════════════
            OVERVIEW TAB
            ════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <>
            {/* At a Glance */}
            <Section title="At a Glance">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  label="Typical Home Value"
                  value={fmtDollars(locData.housing.medianHomeValue)}
                  sub={`${fmtDollars(getPricePerSqft(locationName))}/sqft`}
                />
                <MetricCard
                  label="Cost of Living"
                  value={fmtDollars(colOnePerson)}
                  sub="Annual, single person"
                />
                <MetricCard
                  label="Your Salary"
                  value={userSalary > 0 ? fmtDollars(userSalary) : 'N/A'}
                  sub={profile?.userOccupation || 'Your industry'}
                  accent="#E8F2FB"
                />
                <MetricCard
                  label="Homeownership"
                  value={calcResult.yearsToMortgage > 0 ? formatYears(calcResult.yearsToMortgage) : 'N/A'}
                  sub={calcResult.yearsToMortgage > 0 ? `Age ${calcResult.ageMortgageAcquired}` : 'May not be viable'}
                />
                <MetricCard
                  label="Median Rent"
                  value={medianRent > 0 ? `${fmtDollars(medianRent)}/mo` : 'N/A'}
                  sub="2-bedroom"
                />
                <MetricCard
                  label="Affordable Home Size"
                  value={calcResult.projectedSqFt > 0 ? `${fmtNum(Math.round(calcResult.projectedSqFt))} sqft` : 'N/A'}
                  sub={calcResult.houseTag}
                />
                <MetricCard
                  label="Min Allocation"
                  value={`${minAllocation.toFixed(0)}%`}
                  sub="Of disposable income"
                  accent={minAllocation > 60 ? '#FFF3E0' : '#E8F5E9'}
                />
                <MetricCard
                  label="Time to Debt-Free"
                  value={calcResult.yearsToDebtFree > 0 ? formatYears(calcResult.yearsToDebtFree) : 'No Debt'}
                  sub={calcResult.yearsToDebtFree > 0 ? `Age ${calcResult.ageDebtFree}` : undefined}
                />
              </div>
            </Section>

            {/* Pros & Cons */}
            <Section title="Pros & Cons">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-50 rounded-xl p-4">
                  <h3 className="font-semibold text-emerald-800 mb-3">Pros</h3>
                  <ul className="space-y-2 text-sm text-emerald-900">
                    {calcResult.isViable && <li className="flex gap-2"><span className="text-emerald-500 mt-0.5">+</span>Viable path to homeownership in {calcResult.yearsToMortgage > 0 ? formatYears(calcResult.yearsToMortgage) : 'this location'}</li>}
                    {colOnePerson < 35000 && <li className="flex gap-2"><span className="text-emerald-500 mt-0.5">+</span>Below-average cost of living ({fmtDollars(colOnePerson)}/yr)</li>}
                    {userSalary > locData.salaries.overallAverage && <li className="flex gap-2"><span className="text-emerald-500 mt-0.5">+</span>Your industry pays above local average</li>}
                    {kv.firstKid.isViable && <li className="flex gap-2"><span className="text-emerald-500 mt-0.5">+</span>Can afford kids (first viable at age {kv.firstKid.minimumAge})</li>}
                    {locData.housing.appreciationRate > 0.04 && <li className="flex gap-2"><span className="text-emerald-500 mt-0.5">+</span>Strong home appreciation ({fmtPct(locData.housing.appreciationRate)}/yr)</li>}
                    {minAllocation <= 40 && <li className="flex gap-2"><span className="text-emerald-500 mt-0.5">+</span>Low minimum allocation needed ({minAllocation.toFixed(0)}%)</li>}
                    {medianRent > 0 && medianRent < 1200 && <li className="flex gap-2"><span className="text-emerald-500 mt-0.5">+</span>Affordable rent while saving ({fmtDollars(medianRent)}/mo)</li>}
                  </ul>
                </div>
                <div className="bg-red-50 rounded-xl p-4">
                  <h3 className="font-semibold text-red-800 mb-3">Cons</h3>
                  <ul className="space-y-2 text-sm text-red-900">
                    {!calcResult.isViable && <li className="flex gap-2"><span className="text-red-500 mt-0.5">-</span>No viable path to homeownership</li>}
                    {colOnePerson > 45000 && <li className="flex gap-2"><span className="text-red-500 mt-0.5">-</span>Above-average cost of living ({fmtDollars(colOnePerson)}/yr)</li>}
                    {minAllocation > 60 && <li className="flex gap-2"><span className="text-red-500 mt-0.5">-</span>Requires aggressive savings ({minAllocation.toFixed(0)}% allocation)</li>}
                    {calcResult.yearsToMortgage > 10 && <li className="flex gap-2"><span className="text-red-500 mt-0.5">-</span>Long time to homeownership ({formatYears(calcResult.yearsToMortgage)})</li>}
                    {!kv.firstKid.isViable && <li className="flex gap-2"><span className="text-red-500 mt-0.5">-</span>Having kids may not be financially viable here</li>}
                    {locData.housing.medianHomeValue > 500000 && <li className="flex gap-2"><span className="text-red-500 mt-0.5">-</span>High home prices ({fmtDollars(locData.housing.medianHomeValue)} median)</li>}
                    {medianRent > 2000 && <li className="flex gap-2"><span className="text-red-500 mt-0.5">-</span>Expensive rent ({fmtDollars(medianRent)}/mo) slows savings</li>}
                  </ul>
                </div>
              </div>
            </Section>

            {/* AI Assessment */}
            <Section title="Assessment">
              <div className="space-y-5">
                <div className={cn('rounded-xl p-5', score >= 6 ? 'bg-emerald-50' : score >= 4 ? 'bg-amber-50' : 'bg-red-50')}>
                  <h3 className={cn('font-bold text-lg', score >= 6 ? 'text-emerald-800' : score >= 4 ? 'text-amber-800' : 'text-red-800')}>
                    {viability.label}
                  </h3>
                  <p className={cn('text-sm mt-2', score >= 6 ? 'text-emerald-700' : score >= 4 ? 'text-amber-700' : 'text-red-700')}>
                    {score >= 8
                      ? `${locationName} is an excellent choice. You can comfortably afford homeownership in ${calcResult.yearsToMortgage > 0 ? formatYears(calcResult.yearsToMortgage) : 'a reasonable timeframe'}, the cost of living is manageable, and there's strong potential for wealth generation.`
                      : score >= 6
                      ? `${locationName} is viable with disciplined saving. You'll need to allocate at least ${minAllocation.toFixed(0)}% of disposable income and stay consistent. ${kv.firstKid.isViable ? 'Kids are financially feasible.' : 'Consider delaying kids until more financially stable.'}`
                      : score >= 4
                      ? `${locationName} is challenging. You'll need aggressive savings (${minAllocation.toFixed(0)}%+ allocation), and homeownership may take ${calcResult.yearsToMortgage > 0 ? formatYears(calcResult.yearsToMortgage) : 'a long time'}. Consider whether a more affordable location might better serve your goals.`
                      : `${locationName} is not recommended based on your current financial profile. The cost of living is too high relative to income in your field. Strongly consider alternative locations where your money goes further.`}
                  </p>
                </div>

                {/* What you can / can't afford */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <h3 className="font-semibold text-emerald-800 mb-2">What You Can Afford</h3>
                    <ul className="space-y-1 text-sm text-emerald-900">
                      {calcResult.isViable && <li>Home up to {maxAffordable ? fmtDollars(maxAffordable.maxSustainableHousePrice) : 'N/A'}</li>}
                      {medianRent > 0 && <li>Rent at {fmtDollars(medianRent)}/mo while saving</li>}
                      {kv.firstKid.isViable && <li>First child at age {kv.firstKid.minimumAge}</li>}
                      {kv.secondKid.isViable && <li>Second child at age {kv.secondKid.minimumAge}</li>}
                    </ul>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4">
                    <h3 className="font-semibold text-red-800 mb-2">What You Can&apos;t Afford</h3>
                    <ul className="space-y-1 text-sm text-red-900">
                      {locData.housing.medianHomeValue > (maxAffordable?.maxSustainableHousePrice || 0) && <li>Median-priced home ({fmtDollars(locData.housing.medianHomeValue)})</li>}
                      {!kv.thirdKid.isViable && <li>Third child in this location</li>}
                      {disposableIncome < 15000 && <li>Private schooling</li>}
                      {minAllocation > 70 && <li>Significant discretionary spending</li>}
                    </ul>
                  </div>
                </div>

                {/* Recommendations */}
                {calcResult.recommendations.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Recommendations</h3>
                    <div className="flex flex-wrap gap-2">
                      {calcResult.recommendations.map((rec, i) => (
                        <span key={i} className="px-3 py-1.5 bg-carto-blue-sky text-carto-slate text-sm rounded-full border border-carto-blue-pale/40">
                          {rec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* Suggestions */}
            <Section title="Alternative Locations">
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  {calcResult.isViable
                    ? `Since ${locationName} is viable, here are similar locations that may offer even better value:`
                    : `Since ${locationName} is not viable, here are better and more optimal locations:`}
                </p>
                {suggestions.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {suggestions.map(s => (
                      <button
                        key={s.name}
                        onClick={() => router.push(`/location/${encodeSlug(s.name)}`)}
                        className={cn(
                          'flex items-center justify-between rounded-xl p-4 text-left transition-colors',
                          calcResult.isViable
                            ? 'bg-gray-50 hover:bg-carto-blue-sky'
                            : 'bg-emerald-50 hover:bg-emerald-100'
                        )}
                      >
                        <div>
                          <p className="font-semibold text-carto-slate">{s.name}</p>
                          <p className="text-xs text-gray-500">{s.reason}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-carto-blue">{s.score.toFixed(1)}</p>
                          <p className="text-xs text-gray-400">score</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="animate-pulse flex gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl flex-1" />)}
                  </div>
                )}
              </div>
            </Section>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════
            QUALITY OF LIFE TAB
            ════════════════════════════════════════════════════════════ */}
        {activeTab === 'quality-of-life' && (
          <>
            {/* Scorecard */}
            <Section title="Rankings Scorecard">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Quality of Life', value: qolResult ? qolResult.personal_qol / 10 : Math.min(10, score + (colOnePerson < 35000 ? 1 : 0)) },
                  { label: 'Healthcare', value: qolResult ? qolResult.personal_categories.healthcare.score / 10 : Math.min(10, 5 + (score > 6 ? 2 : 0)) },
                  { label: 'Safety', value: qolResult ? qolResult.personal_categories.safety.score / 10 : Math.min(10, colOnePerson < 40000 ? 7 : colOnePerson < 50000 ? 5 : 3) },
                  { label: 'Education', value: qolResult ? qolResult.personal_categories.education.score / 10 : Math.min(10, 5 + (locData.salaries.educationTrainingLibrary > 50000 ? 2 : 0)) },
                ].map(item => (
                  <div key={item.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-carto-blue">{item.value.toFixed(1)}</div>
                    <div className="text-xs text-gray-500 mt-1">{item.label}</div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Affordability Questions */}
            <Section title="Lifestyle Affordability">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Can you afford private school?</h4>
                  <p className="text-sm text-gray-600">
                    {disposableIncome > 15000
                      ? `With ${fmtDollars(disposableIncome)} annual disposable income, private school (~$12K/yr) may be feasible with careful budgeting.`
                      : `With ${fmtDollars(disposableIncome)} disposable income, private school would be very difficult. Consider public options.`}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Can you comfortably take a car loan?</h4>
                  <p className="text-sm text-gray-600">
                    {disposableIncome > 8000
                      ? `Yes — a moderate car payment (~$400/mo) would use ~${Math.round(4800 / disposableIncome * 100)}% of your disposable income.`
                      : `A car loan would strain your budget significantly. Consider buying used or saving up.`}
                  </p>
                </div>
                <MetricCard
                  label="Min Viable Age for Kids"
                  value={kv.firstKid.isViable ? `Age ${kv.firstKid.minimumAge}` : 'N/A'}
                  sub={kv.firstKid.reason || (kv.firstKid.isViable ? 'First child' : 'Not viable for kids')}
                  accent={kv.firstKid.isViable ? '#E8F5E9' : '#FFF3E0'}
                />
                <MetricCard
                  label="COL With Kids"
                  value={fmtDollars(colWithOneKid)}
                  sub="Annual, 1 kid"
                  accent="#FFF8E1"
                />
              </div>
            </Section>

            {/* Grade card */}
            <Section title="Quality of Life Grades">
              <QoLGradeCard locationName={locationName} annualIncome={userSalaryForQoL || undefined} />
            </Section>

            {/* In-depth QoL */}
            <Section title="Quality of Life — In-Depth">
              <QoLSection locationName={locationName} annualIncome={userSalaryForQoL || undefined} />
            </Section>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════
            HOUSING TAB
            ════════════════════════════════════════════════════════════ */}
        {activeTab === 'housing' && (
          <>
            {/* Key Housing Metrics */}
            <Section title="Housing Overview">
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard label="Max Affordable Home" value={maxAffordable ? fmtDollars(maxAffordable.maxSustainableHousePrice) : 'N/A'} />
                  <MetricCard label="Projected Home Size" value={calcResult.projectedSqFt > 0 ? `${fmtNum(Math.round(calcResult.projectedSqFt))} sqft` : 'N/A'} sub={calcResult.houseTag} />
                  <MetricCard label="Monthly Payment" value={maxAffordable ? fmtDollars(Math.round(maxAffordable.sustainableAnnualPayment / 12)) : 'N/A'} />
                  <MetricCard label="Down Payment" value={maxAffordable ? fmtDollars(maxAffordable.sustainableDownPayment) : 'N/A'} />
                </div>

                {calcResult.fastestHomeProjection && (
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <h3 className="font-semibold text-emerald-800">Fastest Path to Homeownership</h3>
                    <p className="text-sm text-emerald-700 mt-1">
                      A {fmtNum(calcResult.fastestHomeSqFt)} sqft home in <span className="font-bold">{formatYears(calcResult.fastestHomeProjection.year)}</span> (age {calcResult.fastestHomeProjection.age}) for {fmtDollars(calcResult.fastestHomeProjection.maxSustainableHousePrice)}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">What You Can Afford Over Time</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { label: 'House in 3 Years', proj: calcResult.houseProjections.threeYears },
                      { label: 'House in 5 Years', proj: calcResult.houseProjections.fiveYears },
                      { label: 'House in 10 Years', proj: calcResult.houseProjections.tenYears },
                    ].map(item => (
                      <div key={item.label} className="bg-gray-50 rounded-xl p-4">
                        <h4 className="font-medium text-gray-700 text-sm">{item.label}</h4>
                        {item.proj ? (
                          <>
                            <p className="text-xl font-bold text-carto-slate mt-1">{fmtDollars(item.proj.maxSustainableHousePrice)}</p>
                            <p className="text-xs text-gray-500">{fmtNum(estimateHomeSizeSqft(item.proj.maxSustainableHousePrice, locationName))} sqft</p>
                            <p className="text-xs text-gray-500">Down: {fmtDollars(item.proj.sustainableDownPayment)}</p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-400 mt-2">Not yet affordable</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {calcResult.warnings.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <h3 className="font-semibold text-amber-800 mb-2">Warnings</h3>
                    <ul className="space-y-1 text-sm text-amber-900">
                      {calcResult.warnings.map((w, i) => <li key={i}>- {w}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </Section>

            {/* Buying vs Renting */}
            <Section title="Buying vs Renting">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/50">
                    <h3 className="font-semibold text-emerald-800 mb-3">Buying</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>Annual Mortgage</span><span className="font-medium">{mortgageAnnual > 0 ? fmtDollars(mortgageAnnual) : 'N/A'}</span></div>
                      <div className="flex justify-between"><span>Monthly Payment</span><span className="font-medium">{mortgageAnnual > 0 ? fmtDollars(Math.round(mortgageAnnual / 12)) : 'N/A'}</span></div>
                      <div className="flex justify-between"><span>Down Payment</span><span className="font-medium">{maxAffordable ? fmtDollars(maxAffordable.sustainableDownPayment) : 'N/A'}</span></div>
                      <div className="flex justify-between"><span>Equity at Year 10</span><span className="font-medium text-emerald-700">{sellAnalyses.y10 ? fmtDollars(sellAnalyses.y10.equity) : 'N/A'}</span></div>
                      <div className="flex justify-between"><span>Equity at Year 30</span><span className="font-medium text-emerald-700">{sellAnalyses.y30 ? fmtDollars(sellAnalyses.y30.equity) : 'N/A'}</span></div>
                      {wealthData && <div className="flex justify-between border-t pt-2 mt-2"><span className="font-semibold">Total Wealth (30yr)</span><span className="font-bold text-emerald-700">{fmtDollars(wealthData.wealthAt30)}</span></div>}
                    </div>
                  </div>
                  <div className="border border-orange-200 rounded-xl p-4 bg-orange-50/50">
                    <h3 className="font-semibold text-orange-800 mb-3">Renting</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>Annual Rent (2BR)</span><span className="font-medium">{fmtDollars(rentAnnual)}</span></div>
                      <div className="flex justify-between"><span>Monthly Rent</span><span className="font-medium">{fmtDollars(medianRent)}</span></div>
                      <div className="flex justify-between"><span>No Down Payment</span><span className="font-medium">{fmtDollars(0)}</span></div>
                      <div className="flex justify-between"><span>Equity Built</span><span className="font-medium text-orange-700">{fmtDollars(0)}</span></div>
                      <div className="flex justify-between"><span>30yr Rent Cost</span><span className="font-medium text-orange-700">{fmtDollars(rentAnnual * 30)}</span></div>
                      <div className="flex justify-between border-t pt-2 mt-2"><span className="font-semibold">Wealth (Rent Savings)</span><span className="font-bold text-orange-700">
                        {mortgageAnnual > rentAnnual ? fmtDollars((mortgageAnnual - rentAnnual) * 30 * 0.5) : fmtDollars(0)}
                      </span></div>
                    </div>
                  </div>
                </div>
                {mortgageAnnual > 0 && (
                  <div className="bg-carto-blue-sky rounded-xl p-4 text-sm text-carto-slate">
                    <span className="font-semibold">Verdict:</span>{' '}
                    {mortgageAnnual < rentAnnual * 1.3
                      ? 'Buying is more cost-effective long-term with equity building and appreciation.'
                      : 'Renting may be cheaper month-to-month, but you miss out on equity and appreciation. Consider saving aggressively while renting.'}
                  </div>
                )}
              </div>
            </Section>

            {/* Wealth Generation */}
            <Section title="Wealth Generation">
              <div className="space-y-4">
                {wealthData && wealthData.isViable ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <MetricCard label="Wealth at 15 Years" value={fmtDollars(wealthData.wealthAt15)} accent="#E8F5E9" />
                      <MetricCard label="Wealth at 20 Years" value={fmtDollars(wealthData.wealthAt20)} accent="#E8F5E9" />
                      <MetricCard label="Wealth at 30 Years" value={fmtDollars(wealthData.wealthAt30)} accent="#E8F5E9" />
                      <MetricCard label="Wealth at 50 Years" value={fmtDollars(wealthData.wealthAt50)} accent="#E8F5E9" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <MetricCard label="Home Appreciation (30yr)" value={fmtDollars(wealthData.appreciationAt30)} sub={`${wealthData.appreciationPctAt30}% total`} />
                      <MetricCard label="RPP-Adjusted Wealth" value={fmtDollars(wealthData.totalEffectiveWealth)} sub={`RPP Factor: ${wealthData.rppFactor.toFixed(2)}`} />
                    </div>
                  </>
                ) : (
                  <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
                    Wealth generation projections require a viable path to homeownership. Consider more affordable locations.
                  </div>
                )}
              </div>
            </Section>

            {/* Cost of Living */}
            <Section title="Cost of Living">
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-500">Category</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-500">Without Kids</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-500">With 1 Kid</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-500">With 2 Kids</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-gray-50">
                        <td className="px-4 py-2 font-medium">Annual Cost of Living</td>
                        <td className="px-4 py-2 text-right">{fmtDollars(colOnePerson)}</td>
                        <td className="px-4 py-2 text-right">{fmtDollars(colWithOneKid)}</td>
                        <td className="px-4 py-2 text-right">{fmtDollars(colWithTwoKids)}</td>
                      </tr>
                      <tr className="border-t border-gray-50">
                        <td className="px-4 py-2 font-medium">Monthly Rent (2BR)</td>
                        <td className="px-4 py-2 text-right" colSpan={3}>{medianRent > 0 ? fmtDollars(medianRent) : 'N/A'}</td>
                      </tr>
                      <tr className="border-t border-gray-50">
                        <td className="px-4 py-2 font-medium">Annual Rent</td>
                        <td className="px-4 py-2 text-right">{fmtDollars(locData.rent.oneBedroomAnnual)} (1BR)</td>
                        <td className="px-4 py-2 text-right">{fmtDollars(locData.rent.twoBedroomAnnual)} (2BR)</td>
                        <td className="px-4 py-2 text-right">{fmtDollars(locData.rent.threeBedroomAnnual)} (3BR)</td>
                      </tr>
                      <tr className="border-t border-gray-100 bg-carto-blue-sky/30">
                        <td className="px-4 py-2 font-semibold">Estimated Annual Total</td>
                        <td className="px-4 py-2 text-right font-semibold">{fmtDollars(colOnePerson + locData.rent.oneBedroomAnnual)}</td>
                        <td className="px-4 py-2 text-right font-semibold">{fmtDollars(colWithOneKid + locData.rent.twoBedroomAnnual)}</td>
                        <td className="px-4 py-2 text-right font-semibold">{fmtDollars(colWithTwoKids + locData.rent.threeBedroomAnnual)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </Section>

            {/* Allocation Strategy */}
            <Section title="Allocation Strategy">
              <div className="space-y-4">
                <div className="flex gap-2">
                  {(['conservative', 'balanced', 'aggressive'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setAllocationMode(mode)}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize',
                        allocationMode === mode ? 'bg-carto-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-gray-500">Year</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-500">Age</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-500">Income</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-500">Expenses</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-500">Allocated</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-500">Debt Pay</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-500">Savings</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-500">Total Saved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocationTable.map(row => (
                        <tr key={row.year} className="border-t border-gray-50">
                          <td className="px-3 py-2 text-gray-400">{row.year}</td>
                          <td className="px-3 py-2">{row.age}</td>
                          <td className="px-3 py-2 text-right">{fmtDollars(row.income)}</td>
                          <td className="px-3 py-2 text-right">{fmtDollars(row.col)}</td>
                          <td className="px-3 py-2 text-right font-medium">{fmtDollars(row.allocated)}</td>
                          <td className="px-3 py-2 text-right text-red-600">{row.debtPayment > 0 ? fmtDollars(row.debtPayment) : '-'}</td>
                          <td className="px-3 py-2 text-right text-emerald-600">{fmtDollars(row.savings)}</td>
                          <td className="px-3 py-2 text-right font-semibold">{fmtDollars(row.totalSaved)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Section>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════
            JOB MARKET TAB
            ════════════════════════════════════════════════════════════ */}
        {activeTab === 'job-market' && (
          <>
            {/* Your Industry */}
            {profile?.userOccupation && (
              <Section title="Your Industry">
                <div className="bg-carto-blue-sky rounded-xl p-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-lg font-bold text-carto-slate">{profile.userOccupation}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Average salary: <span className="font-semibold text-carto-slate">{fmtDollars(userSalary)}</span>
                        {userIndustryRank > 0 && <span className="ml-2 text-gray-400">Rank #{userIndustryRank} of {jobMarketData.length}</span>}
                      </p>
                    </div>
                    {userSalary > locData.salaries.overallAverage ? (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full">Above Average</span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">Below Average</span>
                    )}
                  </div>
                </div>
              </Section>
            )}

            {/* Top & Bottom Industries */}
            <Section title="Industry Rankings">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-emerald-50 rounded-xl p-4">
                  <h3 className="font-semibold text-emerald-800 mb-2">Top 5 Industries</h3>
                  <ul className="space-y-1 text-sm">
                    {jobMarketData.slice(0, 5).map((j, i) => (
                      <li key={j.name} className="flex justify-between">
                        <span className="text-emerald-900">{i + 1}. {j.name}</span>
                        <span className="font-medium">{fmtDollars(j.salary)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-red-50 rounded-xl p-4">
                  <h3 className="font-semibold text-red-800 mb-2">Bottom 5 Industries</h3>
                  <ul className="space-y-1 text-sm">
                    {jobMarketData.slice(-5).reverse().map((j, i) => (
                      <li key={j.name} className="flex justify-between">
                        <span className="text-red-900">{jobMarketData.length - 4 + i}. {j.name}</span>
                        <span className="font-medium">{fmtDollars(j.salary)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Section>

            {/* Compare & Full Table */}
            <Section title="All Industries">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Compare with another industry</label>
                  <select
                    value={compareIndustry}
                    onChange={e => setCompareIndustry(e.target.value)}
                    className="w-full max-w-md px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="">Select an industry...</option>
                    {getOccupationList().map(occ => (
                      <option key={occ} value={occ}>{occ}</option>
                    ))}
                  </select>
                  {compareIndustry && (
                    <div className="mt-2 bg-gray-50 rounded-lg p-3">
                      <p className="text-sm"><span className="font-medium">{compareIndustry}:</span> {fmtDollars(getSalary(locationName, compareIndustry))}/yr</p>
                    </div>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-500">#</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-500">Industry</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-500">Avg Salary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobMarketData.map((j, i) => {
                        const isUser = profile?.userOccupation && j.name.toLowerCase().includes(profile.userOccupation.toLowerCase().split(' ')[0]);
                        return (
                          <tr key={j.name} className={cn('border-t border-gray-50', isUser && 'bg-carto-blue-sky/50 font-semibold')}>
                            <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                            <td className="px-4 py-2 text-carto-slate">{j.name}</td>
                            <td className="px-4 py-2 text-right text-carto-slate">{fmtDollars(j.salary)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </Section>
          </>
        )}

      </div>
    </div>
  );
}
