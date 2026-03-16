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
import SimpleHomeCarousel from '@/components/SimpleHomeCarousel';
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
  return Math.round((score / 10) * 5 * 2) / 2; // half-star increments
}

// Decode slug back to location name
function decodeSlug(slug: string): string {
  return decodeURIComponent(slug).replace(/-/g, ' ');
}

function encodeSlug(name: string): string {
  return encodeURIComponent(name.replace(/ /g, '-'));
}

// ─── Section Wrapper ────────────────────────────────────────────────
function Section({ id, title, children, className }: { id: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={cn('bg-white rounded-2xl border border-carto-blue-pale/30 overflow-hidden', className)}>
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-carto-slate">{title}</h2>
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

// ─── Filter Nav ─────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'overall', label: 'Overview' },
  { id: 'job-market', label: 'Job Market' },
  { id: 'quality-of-life', label: 'Quality of Life' },
  { id: 'housing', label: 'Housing' },
  { id: 'allocation', label: 'Allocation Strategy' },
  { id: 'cost-of-living', label: 'Cost of Living' },
  { id: 'wealth', label: 'Wealth Generation' },
  { id: 'buy-vs-rent', label: 'Buying vs Renting' },
  { id: 'job-overview', label: 'Job Overview' },
  { id: 'ai-summary', label: 'AI Summary' },
  { id: 'suggestions', label: 'Suggestions' },
  { id: 'qol-details', label: 'QoL Details' },
];

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
  const [activeTab, setActiveTab] = useState<'overview' | 'quality-of-life' | 'housing' | 'map'>('overview');
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [compareIndustry, setCompareIndustry] = useState<string>('');
  const [allocationMode, setAllocationMode] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [loading, setLoading] = useState(true);

  // Load profile + run calculation
  useEffect(() => {
    const answers = getOnboardingAnswers<OnboardingAnswers>(
      (d): d is OnboardingAnswers => d != null && typeof d === 'object'
    );
    if (!answers) {
      setLoading(false);
      return;
    }
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

  // Sell analyses
  const sellAnalyses = useMemo(() => {
    if (!calcResult) return {};
    return {
      y5: analyzeSale(calcResult, 5),
      y10: analyzeSale(calcResult, 10),
      y15: analyzeSale(calcResult, 15),
      y30: analyzeSale(calcResult, 30),
    };
  }, [calcResult]);

  // Job market data
  const jobMarketData = useMemo(() => {
    if (!locData) return [];
    const occupations = getOccupationList();
    return occupations.map(occ => ({
      name: occ,
      salary: getSalary(locationName, occ),
    })).sort((a, b) => b.salary - a.salary);
  }, [locData, locationName]);

  // QoL score
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

  // All states calculation for suggestions
  const [suggestions, setSuggestions] = useState<{ name: string; score: number; reason: string }[]>([]);
  useEffect(() => {
    if (!profile || !calcResult) return;
    // Compute a few comparison locations in background
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

  // Toggle save
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

  // Scroll to section
  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Allocation strategy table (must be before early returns)
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
        savings: savings,
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

  // Cost of living variants
  const colOnePerson = locData.adjustedCOL.onePerson;
  const colWithOneKid = locData.adjustedCOL.singleParentOneKid || locData.adjustedCOL.familyThreeOneWorker;
  const colWithTwoKids = locData.adjustedCOL.singleParentTwoKids || locData.adjustedCOL.familyFourOneWorker;

  // Disposable income
  const yearByYear = calcResult.yearByYear;
  const firstYear = yearByYear[0];
  const disposableIncome = firstYear?.disposableIncome || 0;

  // Minimum allocation
  const minAllocation = calcResult.minimumAllocationRequired;

  // Rent
  const medianRent = locData.rent.twoBedroomAnnual > 0 ? Math.round(locData.rent.twoBedroomAnnual / 12) : 0;

  // Kid viability
  const kv = calcResult.kidViability;

  // (allocationTable computed above early returns)

  // Buying vs Renting comparison
  const rentAnnual = locData.rent.twoBedroomAnnual;
  const maxAffordable = calcResult.houseProjections.maxAffordable;
  const mortgageAnnual = maxAffordable?.sustainableAnnualPayment || 0;

  // Job ranking
  const userSalary = profile ? getSalary(locationName, profile.userOccupation, profile.userSalary) : 0;
  const userIndustryRank = jobMarketData.findIndex(j =>
    j.name.toLowerCase().includes((profile?.userOccupation || '').toLowerCase().split(' ')[0])
  ) + 1;

  return (
    <div className="max-w-7xl mx-auto pb-24">
      {/* ═══ HERO / BANNER ═══ */}
      <div id="overview" className="mb-6">
        {/* Image carousel / hero image */}
        {(() => {
          const heroImages = getLocationImages(locationName);
          // Always use carousel — it fetches hi-res images from Google API internally.
          // Local images serve as instant placeholders while hi-res load.
          const placeholders: LocationImage[] = heroImages && heroImages.length > 0
            ? heroImages
            : [{ src: flagPath, alt: locationName }];
          return (
            <LocationHeroCarousel images={placeholders} locationName={locationName} />
          );
        })()}

        {/* Title card below carousel */}
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

        {/* ═══ HORIZONTAL TAB BAR ═══ */}
        <div className="bg-white border border-t-0 border-gray-200 rounded-b-2xl px-2 overflow-x-auto">
          <nav className="flex gap-1 min-w-max" role="tablist">
            {([
              { id: 'overview' as const, label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
              { id: 'quality-of-life' as const, label: 'Quality of Life', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
              { id: 'housing' as const, label: 'Housing', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
              { id: 'map' as const, label: 'Map', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
            ]).map(tab => (
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

      {/* ═══ OVERVIEW TAB (original scrolling layout) ═══ */}
      {activeTab === 'overview' && (
      <div className="flex gap-6">
        {/* ═══ LEFT SIDEBAR NAV ═══ */}
        <aside className="hidden lg:block w-52 shrink-0">
          <nav className="sticky top-24 space-y-1">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={cn(
                  'block w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeSection === s.id
                    ? 'bg-carto-blue text-white'
                    : 'text-carto-steel hover:bg-carto-blue-sky hover:text-carto-slate'
                )}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ═══ MAIN CONTENT ═══ */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* ═══ OVERVIEW (combined) ═══ */}
          <Section id="overall" title="Overview">
            <div className="space-y-6">
              {/* Key Metrics — full-width horizontal row */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Key Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricCard
                    label="Your Salary"
                    value={userSalary > 0 ? fmtDollars(userSalary) : 'N/A'}
                    sub={profile?.userOccupation || 'Your industry'}
                    accent="#E8F2FB"
                  />
                  <MetricCard
                    label="Cost of Living"
                    value={fmtDollars(colOnePerson)}
                    sub="Annual, single person"
                  />
                  <MetricCard
                    label="Median Rent"
                    value={medianRent > 0 ? `${fmtDollars(medianRent)}/mo` : 'N/A'}
                    sub="2-bedroom"
                  />
                  <MetricCard
                    label="Typical Home Value"
                    value={fmtDollars(locData.housing.medianHomeValue)}
                    sub={`${fmtDollars(getPricePerSqft(locationName))}/sqft`}
                  />
                </div>
              </div>

              {/* Your Path — full-width horizontal row */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Path</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricCard
                    label="Homeownership"
                    value={calcResult.yearsToMortgage > 0 ? formatYears(calcResult.yearsToMortgage) : 'N/A'}
                    sub={calcResult.yearsToMortgage > 0 ? `Age ${calcResult.ageMortgageAcquired}` : 'May not be viable'}
                  />
                  <MetricCard
                    label="Affordable Home"
                    value={calcResult.projectedSqFt > 0 ? `${fmtNum(Math.round(calcResult.projectedSqFt))} sqft` : 'N/A'}
                    sub={calcResult.houseTag}
                  />
                  <MetricCard
                    label="Debt-Free"
                    value={calcResult.yearsToDebtFree > 0 ? formatYears(calcResult.yearsToDebtFree) : 'No Debt'}
                    sub={calcResult.yearsToDebtFree > 0 ? `Age ${calcResult.ageDebtFree}` : undefined}
                  />
                  <MetricCard
                    label="Min Allocation"
                    value={`${minAllocation.toFixed(0)}%`}
                    sub="Of disposable income"
                    accent={minAllocation > 60 ? '#FFF3E0' : '#E8F5E9'}
                  />
                </div>
              </div>

              {/* Pros & Cons — horizontal side-by-side below */}
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
            </div>
          </Section>

          {/* ═══ JOB MARKET ═══ */}
          <Section id="job-market" title="Job Market">
            <div className="space-y-4">
              {/* User's industry */}
              {profile?.userOccupation && (
                <div className="bg-carto-blue-sky rounded-xl p-4">
                  <p className="text-sm font-medium text-carto-steel">Your Industry</p>
                  <p className="text-lg font-bold text-carto-slate">{profile.userOccupation}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Average salary: <span className="font-semibold">{fmtDollars(userSalary)}</span>
                    {userIndustryRank > 0 && <span className="ml-2 text-gray-400">Rank #{userIndustryRank} of {jobMarketData.length}</span>}
                  </p>
                </div>
              )}

              {/* Compare dropdown */}
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

              {/* All industries ranked */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">All Industries — Ranked by Salary</h3>
                <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-100">
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
            </div>
          </Section>

          {/* ═══ ANALYSIS ═══ */}
          <Section id="ai-overview" title="Analysis">
            <div className="space-y-6">
              {/* Scorecard */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Quality of Life', value: qolResult ? qolResult.personal_qol / 10 : Math.min(10, score + (colOnePerson < 35000 ? 1 : 0)) },
                  { label: 'Healthcare', value: qolResult ? qolResult.personal_categories.healthcare.score / 10 : Math.min(10, 5 + (score > 6 ? 2 : 0)) },
                  { label: 'Safety', value: qolResult ? qolResult.personal_categories.safety.score / 10 : Math.min(10, colOnePerson < 40000 ? 7 : colOnePerson < 50000 ? 5 : 3) },
                  { label: 'Education', value: qolResult ? qolResult.personal_categories.education.score / 10 : Math.min(10, 5 + (locData.salaries.educationTrainingLibrary > 50000 ? 2 : 0)) },
                ].map(item => (
                  <div key={item.label} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-carto-blue">{item.value.toFixed(1)}</div>
                    <div className="text-xs text-gray-500 mt-1">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Minimum allocation bar */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Minimum Allocation Required</h3>
                <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-carto-blue rounded-full transition-all"
                    style={{ width: `${Math.min(100, minAllocation)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white mix-blend-difference">
                    {minAllocation.toFixed(0)}% of disposable income
                  </span>
                </div>
              </div>

              {/* Recommendations */}
              {calcResult.recommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Recommendations</h3>
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

          {/* ═══ QUALITY OF LIFE (Grade Card) ═══ */}
          <Section id="quality-of-life" title="Quality of Life">
            <QoLGradeCard locationName={locationName} annualIncome={userSalaryForQoL || undefined} />
          </Section>

          {/* ═══ HOUSING ═══ */}
          <Section id="housing" title="Housing">
            <div className="space-y-6">
              {/* Key metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="Max Affordable Home" value={maxAffordable ? fmtDollars(maxAffordable.maxSustainableHousePrice) : 'N/A'} />
                <MetricCard label="Projected Home Size" value={calcResult.projectedSqFt > 0 ? `${fmtNum(Math.round(calcResult.projectedSqFt))} sqft` : 'N/A'} />
                <MetricCard label="Monthly Payment" value={maxAffordable ? fmtDollars(Math.round(maxAffordable.sustainableAnnualPayment / 12)) : 'N/A'} />
                <MetricCard label="Down Payment" value={maxAffordable ? fmtDollars(maxAffordable.sustainableDownPayment) : 'N/A'} />
              </div>

              {/* Fastest time */}
              {calcResult.fastestHomeProjection && (
                <div className="bg-emerald-50 rounded-xl p-4">
                  <h3 className="font-semibold text-emerald-800">Fastest Path to Homeownership</h3>
                  <p className="text-sm text-emerald-700 mt-1">
                    A {fmtNum(calcResult.fastestHomeSqFt)} sqft home in <span className="font-bold">{formatYears(calcResult.fastestHomeProjection.year)}</span> (age {calcResult.fastestHomeProjection.age}) for {fmtDollars(calcResult.fastestHomeProjection.maxSustainableHousePrice)}
                  </p>
                </div>
              )}

              {/* House by timeline */}
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

              {/* Warnings */}
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

          {/* ═══ ALLOCATION STRATEGY ═══ */}
          <Section id="allocation" title="Allocation Strategy">
            <div className="space-y-4">
              {/* Mode selector */}
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

              {/* Table */}
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

          {/* ═══ COST OF LIVING ═══ */}
          <Section id="cost-of-living" title="Cost of Living">
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

              {/* Minimum income notes */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-700 mb-2">Minimum Annual Income Notes</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>1 Kid: Minimum ~{fmtDollars(Math.round((colWithOneKid + locData.rent.twoBedroomAnnual) * 1.3))}/yr income recommended</li>
                  <li>2 Kids: Minimum ~{fmtDollars(Math.round((colWithTwoKids + locData.rent.threeBedroomAnnual) * 1.3))}/yr income recommended</li>
                  <li>3 Kids: Minimum ~{fmtDollars(Math.round((locData.adjustedCOL.singleParentThreeKids + locData.rent.threeBedroomAnnual) * 1.3))}/yr income recommended</li>
                </ul>
                <p className="text-xs text-gray-400 mt-2">Estimates assume 30% buffer above total expenses for savings and emergencies.</p>
              </div>
            </div>
          </Section>

          {/* ═══ WEALTH GENERATION ═══ */}
          <Section id="wealth" title="Wealth Generation">
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

          {/* ═══ BUYING VS RENTING ═══ */}
          <Section id="buy-vs-rent" title="Buying vs Renting">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Buying column */}
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
                {/* Renting column */}
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

          {/* ═══ JOB OVERVIEW ═══ */}
          <Section id="job-overview" title="Job Overview">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-50 rounded-xl p-4">
                  <h3 className="font-semibold text-emerald-800 mb-2">Most Viable Industries</h3>
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
                  <h3 className="font-semibold text-red-800 mb-2">Least Viable Industries</h3>
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
            </div>
          </Section>

          {/* ═══ AI SUMMARY ═══ */}
          <Section id="ai-summary" title="AI Summary">
            <div className="space-y-4">
              {/* Final Assessment */}
              <div className={cn('rounded-xl p-5', score >= 6 ? 'bg-emerald-50' : score >= 4 ? 'bg-amber-50' : 'bg-red-50')}>
                <h3 className={cn('font-bold text-lg', score >= 6 ? 'text-emerald-800' : score >= 4 ? 'text-amber-800' : 'text-red-800')}>
                  Final Assessment: {viability.label}
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

              {/* Hard rules */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-700 mb-2">Fiscal Responsibility Rules</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex gap-2"><span className="text-red-500">!</span> Do not take on new debt while paying off existing debt</li>
                  <li className="flex gap-2"><span className="text-red-500">!</span> Keep housing costs below 30% of gross income</li>
                  <li className="flex gap-2"><span className="text-red-500">!</span> Maintain 3-6 months emergency fund before major purchases</li>
                  {minAllocation > 50 && <li className="flex gap-2"><span className="text-red-500">!</span> Your required allocation ({minAllocation.toFixed(0)}%) leaves little room for error — avoid lifestyle inflation</li>}
                  {!kv.firstKid.isViable && <li className="flex gap-2"><span className="text-red-500">!</span> Kids are not financially viable here — do not plan for children without a significant income increase</li>}
                </ul>
              </div>

              {/* What you can and can't afford */}
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
            </div>
          </Section>

          {/* ═══ SUGGESTIONS ═══ */}
          <Section id="suggestions" title="Suggestions">
            <div className="space-y-4">
              {calcResult.isViable ? (
                <>
                  <p className="text-sm text-gray-600">
                    Since {locationName} is viable, here are similar locations that may offer even better value:
                  </p>
                  {suggestions.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {suggestions.map(s => (
                        <button
                          key={s.name}
                          onClick={() => router.push(`/location/${encodeSlug(s.name)}`)}
                          className="flex items-center justify-between bg-gray-50 hover:bg-carto-blue-sky rounded-xl p-4 text-left transition-colors"
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
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    Since {locationName} is not viable, here are better and more optimal locations:
                  </p>
                  {suggestions.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {suggestions.map(s => (
                        <button
                          key={s.name}
                          onClick={() => router.push(`/location/${encodeSlug(s.name)}`)}
                          className="flex items-center justify-between bg-emerald-50 hover:bg-emerald-100 rounded-xl p-4 text-left transition-colors"
                        >
                          <div>
                            <p className="font-semibold text-carto-slate">{s.name}</p>
                            <p className="text-xs text-emerald-700">{s.reason}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-emerald-600">{s.score.toFixed(1)}</p>
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
                </>
              )}
            </div>
          </Section>

          {/* ═══ QOL DETAILS (In-depth breakdown) ═══ */}
          <Section id="qol-details" title="Quality of Life — In-Depth">
            <QoLSection locationName={locationName} annualIncome={userSalaryForQoL || undefined} />
          </Section>

        </div>
      </div>
      )}

      {/* ═══ QUALITY OF LIFE TAB ═══ */}
      {activeTab === 'quality-of-life' && (
        <div className="mt-6 space-y-6">
          {/* Rankings Scorecard */}
          <Section id="qol-scorecard" title="Rankings Scorecard">
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

          {/* Lifestyle Affordability */}
          <Section id="qol-lifestyle" title="Lifestyle Affordability">
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

          {/* QoL Grades */}
          <Section id="qol-grades" title="Quality of Life Grades">
            <QoLGradeCard locationName={locationName} annualIncome={userSalaryForQoL || undefined} />
          </Section>

          {/* In-depth QoL */}
          <Section id="qol-indepth" title="Quality of Life — In-Depth">
            <QoLSection locationName={locationName} annualIncome={userSalaryForQoL || undefined} />
          </Section>
        </div>
      )}

      {/* ═══ HOUSING TAB ═══ */}
      {activeTab === 'housing' && (
        <div className="mt-6 space-y-6">
          {/* Housing Overview */}
          <Section id="housing-overview" title="Housing Overview">
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
            </div>
          </Section>

          {/* Home Size Calculator — by Area Quality */}
          <Section id="home-size-calc" title="What You Can Get in Each Neighborhood">
            <div className="space-y-6">
              <p className="text-sm text-gray-600">
                At <span className="font-semibold">{fmtDollars(getPricePerSqft(locationName))}/sqft</span> in {locationName}, here&apos;s what your budget looks like across different neighborhood tiers:
              </p>

              {/* Quality tier cards */}
              {(() => {
                const basePrice = maxAffordable?.maxSustainableHousePrice || 0;
                const tiers = [
                  { key: 'nice' as const, label: 'Nice Area', sub: 'Premium neighborhoods', multiplier: 1.3, color: { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', accent: '#E8F5E9' } },
                  { key: 'average' as const, label: 'Average Area', sub: 'Typical neighborhoods', multiplier: 1.0, color: { text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', accent: '#E3F2FD' } },
                  { key: 'any' as const, label: 'Budget-Friendly Area', sub: 'More affordable neighborhoods', multiplier: 0.75, color: { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', accent: '#FFF8E1' } },
                ];

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {tiers.map(tier => {
                        const sqft = basePrice > 0 ? Math.round(estimateHomeSizeSqft(basePrice / tier.multiplier, locationName)) : 0;
                        const effectivePrice = basePrice;
                        const tag = sqft >= 2500 ? '3+ BR House' : sqft >= 1500 ? '2-3 BR Home' : sqft >= 800 ? '1-2 BR Condo/Apt' : sqft > 0 ? 'Studio/1 BR' : 'N/A';
                        return (
                          <div key={tier.key} className={`rounded-xl border ${tier.color.border} ${tier.color.bg} p-5`}>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className={`font-semibold ${tier.color.text}`}>{tier.label}</h4>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tier.color.bg} ${tier.color.text} border ${tier.color.border}`}>
                                {tier.multiplier > 1 ? `${((tier.multiplier - 1) * 100).toFixed(0)}% premium` : tier.multiplier < 1 ? `${((1 - tier.multiplier) * 100).toFixed(0)}% cheaper` : 'Baseline'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mb-3">{tier.sub}</p>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Budget</span>
                                <span className="font-bold text-carto-slate">{effectivePrice > 0 ? fmtDollars(effectivePrice) : 'N/A'}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Est. Size</span>
                                <span className="font-bold text-carto-slate">{sqft > 0 ? `${fmtNum(sqft)} sqft` : 'N/A'}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Home Type</span>
                                <span className="font-medium text-gray-700">{tag}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Price/sqft</span>
                                <span className="font-medium text-gray-700">{fmtDollars(Math.round(getPricePerSqft(locationName) * tier.multiplier))}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary insight */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-600">
                        {basePrice > 0 ? (
                          <>
                            Your max budget of <span className="font-semibold">{fmtDollars(basePrice)}</span> gets you anywhere from{' '}
                            <span className="font-semibold">{fmtNum(Math.round(estimateHomeSizeSqft(basePrice / 1.3, locationName)))} sqft</span> in a nice area to{' '}
                            <span className="font-semibold">{fmtNum(Math.round(estimateHomeSizeSqft(basePrice / 0.75, locationName)))} sqft</span> in a budget-friendly area.
                            {calcResult.projectedSqFt > 0 && calcResult.projectedSqFt < 800 && ' Consider budget-friendly neighborhoods for more room.'}
                            {calcResult.projectedSqFt >= 2000 && ' You have great buying power in this market.'}
                          </>
                        ) : (
                          'Complete your financial profile to see personalized home size estimates.'
                        )}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </Section>

          {/* Browse Homes — real listings */}
          {maxAffordable && maxAffordable.maxSustainableHousePrice > 0 && (
            <Section id="browse-homes" title={`Browse Homes in ${locationName}`}>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Real listings near your <span className="font-semibold">{fmtDollars(maxAffordable.maxSustainableHousePrice)}</span> budget in {locationName}:
                </p>
                <SimpleHomeCarousel
                  location={locationName}
                  targetPrice={maxAffordable.maxSustainableHousePrice}
                  priceRange={50000}
                />
              </div>
            </Section>
          )}

          {/* Buying vs Renting */}
          <Section id="housing-bvr" title="Buying vs Renting">
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
          <Section id="housing-wealth" title="Wealth Generation">
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
        </div>
      )}

      {/* ═══ MAP TAB ═══ */}
      {activeTab === 'map' && (
        <div className="mt-6 space-y-6">
          <Section id="map-view" title={`${locationName} — Housing Map`}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  label="Typical Home Value"
                  value={fmtDollars(locData.housing.medianHomeValue)}
                  sub={`${fmtDollars(getPricePerSqft(locationName))}/sqft`}
                />
                <MetricCard
                  label="Projected Home Size"
                  value={calcResult.projectedSqFt > 0 ? `${fmtNum(Math.round(calcResult.projectedSqFt))} sqft` : 'N/A'}
                  sub={calcResult.houseTag}
                />
                <MetricCard
                  label="Home Appreciation"
                  value={fmtPct(locData.housing.appreciationRate)}
                  sub="Annual rate"
                  accent={locData.housing.appreciationRate > 0.04 ? '#E8F5E9' : undefined}
                />
                <MetricCard
                  label="Viability Score"
                  value={score.toFixed(1)}
                  sub={viability.label}
                  accent={score >= 6 ? '#E8F5E9' : score >= 4 ? '#FFF8E1' : '#FFF3E0'}
                />
              </div>

              {/* Home size projections by price point */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Home Size by Price Point in {locationName}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[150000, 250000, 400000, 600000].map(price => {
                    const sqft = estimateHomeSizeSqft(price, locationName);
                    return (
                      <div key={price} className="bg-gray-50 rounded-xl p-4 text-center">
                        <p className="text-xs font-medium text-gray-500 uppercase">{fmtDollars(price)}</p>
                        <p className="text-xl font-bold text-carto-slate mt-1">{fmtNum(sqft)} sqft</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {sqft < 600 ? 'Studio/1BR' : sqft < 1000 ? 'Small' : sqft < 1500 ? 'Medium' : sqft < 2500 ? 'Large' : 'Very Large'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Comparison with other locations */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">How {locationName} Compares</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-500">Location</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-500">Score</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-500">Home Value</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-500">Your Home Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-gray-100 bg-carto-blue-sky/30">
                        <td className="px-4 py-2 font-semibold text-carto-slate">{locationName}</td>
                        <td className="px-4 py-2 text-right font-semibold">{score.toFixed(1)}</td>
                        <td className="px-4 py-2 text-right">{fmtDollars(locData.housing.medianHomeValue)}</td>
                        <td className="px-4 py-2 text-right">{calcResult.projectedSqFt > 0 ? `${fmtNum(Math.round(calcResult.projectedSqFt))} sqft` : 'N/A'}</td>
                      </tr>
                      {suggestions.slice(0, 5).map(s => {
                        const sData = getLocationData(s.name);
                        const sSqft = maxAffordable ? estimateHomeSizeSqft(maxAffordable.maxSustainableHousePrice, s.name) : 0;
                        return (
                          <tr key={s.name} className="border-t border-gray-50 cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/location/${encodeSlug(s.name)}`)}>
                            <td className="px-4 py-2 text-carto-slate">{s.name}</td>
                            <td className="px-4 py-2 text-right">{s.score.toFixed(1)}</td>
                            <td className="px-4 py-2 text-right">{sData ? fmtDollars(sData.housing.medianHomeValue) : 'N/A'}</td>
                            <td className="px-4 py-2 text-right">{sSqft > 0 ? `${fmtNum(sSqft)} sqft` : 'N/A'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {suggestions.length === 0 && (
                  <div className="animate-pulse mt-2 h-32 bg-gray-100 rounded-xl" />
                )}
              </div>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}
