'use client';

import { useMemo } from 'react';
import { QoLResult, QoLCategoryScore, getQoLLabel, getPersonalizedQoL, getObjectiveQoL } from '@/lib/qol-engine';
import { getStateRawData } from '@/lib/qol-engine';
import { getStateNameFromLocation } from '@/lib/state-flags';

// ─── Helpers ───────────────────────────────────────────────────────

function getLabelColor(label: string): { text: string; bg: string; ring: string } {
  switch (label) {
    case 'Great': return { text: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-200' };
    case 'Good': return { text: 'text-blue-700', bg: 'bg-blue-50', ring: 'ring-blue-200' };
    case 'Mixed': return { text: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-200' };
    default: return { text: 'text-red-700', bg: 'bg-red-50', ring: 'ring-red-200' };
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return '#059669';
  if (score >= 65) return '#2563EB';
  if (score >= 50) return '#D97706';
  if (score >= 35) return '#EA580C';
  return '#DC2626';
}

function ScoreBar({ score, label, showValue = true }: { score: number; label: string; showValue?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-gray-600 w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(2, score))}%`, backgroundColor: scoreColor(score) }}
        />
      </div>
      {showValue && (
        <span className="text-xs font-bold w-10 text-right" style={{ color: scoreColor(score) }}>
          {score.toFixed(0)}
        </span>
      )}
    </div>
  );
}

function CategoryCard({ cat, personalCat, isPersonalized }: { cat: QoLCategoryScore; personalCat?: QoLCategoryScore; isPersonalized: boolean }) {
  const activeCat = isPersonalized && personalCat ? personalCat : cat;
  const label = getQoLLabel(activeCat.score);
  const colors = getLabelColor(label);

  const iconMap: Record<string, string> = {
    Safety: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    Healthcare: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    Infrastructure: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
    Environment: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    Education: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-[#4A90D9]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={iconMap[activeCat.name] || iconMap.Safety} />
          </svg>
          <h4 className="font-semibold text-carto-slate">{activeCat.name}</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ${colors.text} ${colors.bg} ${colors.ring}`}>
            {label}
          </span>
          <span className="text-lg font-bold" style={{ color: scoreColor(activeCat.score) }}>
            {activeCat.score.toFixed(0)}
          </span>
        </div>
      </div>
      <div className="p-4 space-y-2">
        {activeCat.subcategories.map((sub) => (
          <ScoreBar key={sub.name} label={sub.name} score={sub.score} />
        ))}
      </div>
    </div>
  );
}

function CircularScore({ score, size = 120, label }: { score: number; size?: number; label: string }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F3F4F6" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-3xl font-extrabold" style={{ color }}>{score.toFixed(0)}</span>
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">/100</span>
      </div>
      <p className="mt-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────

interface QoLSectionProps {
  locationName: string;
  annualIncome?: number;
}

export default function QoLSection({ locationName, annualIncome }: QoLSectionProps) {
  const qol = useMemo<QoLResult | null>(() => {
    const stateName = getStateNameFromLocation(locationName);
    if (!stateName) return null;

    if (annualIncome && annualIncome > 0) {
      return getPersonalizedQoL(stateName, annualIncome);
    }
    return getObjectiveQoL(stateName);
  }, [locationName, annualIncome]);

  const rawData = useMemo(() => {
    const stateName = getStateNameFromLocation(locationName);
    if (!stateName) return null;
    return getStateRawData(stateName);
  }, [locationName]);

  if (!qol) {
    return (
      <div className="text-sm text-gray-400 py-8 text-center">
        Quality of Life data is not available for this location.
      </div>
    );
  }

  const isPersonalized = !!(annualIncome && annualIncome > 0);
  const primaryScore = isPersonalized ? qol.personal_qol : qol.objective_qol;
  const primaryLabel = isPersonalized ? qol.personal_label : qol.label;
  const primaryRank = isPersonalized ? qol.personal_rank : qol.rank;
  const labelColors = getLabelColor(primaryLabel);

  const catKeys = ['safety', 'healthcare', 'infrastructure', 'environment', 'education'] as const;

  return (
    <div className="space-y-6">
      {/* Header with overall score */}
      <div className="bg-gradient-to-br from-[#F8FAFB] to-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Circular score */}
          <div className="relative">
            <CircularScore score={primaryScore} label={isPersonalized ? 'Your QoL Score' : 'Objective QoL'} />
          </div>

          {/* Summary info */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ring-1 ${labelColors.text} ${labelColors.bg} ${labelColors.ring}`}>
                {primaryLabel}
              </span>
              <span className="text-sm text-gray-500">
                Rank <strong className="text-carto-slate">#{primaryRank}</strong> of 51
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{qol.summary}</p>

            {/* Show both scores if personalized */}
            {isPersonalized && (
              <div className="mt-3 flex items-center gap-4 justify-center md:justify-start">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: scoreColor(qol.personal_qol) }} />
                  <span className="text-xs text-gray-500">
                    Personal: <strong style={{ color: scoreColor(qol.personal_qol) }}>{qol.personal_qol.toFixed(1)}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  <span className="text-xs text-gray-500">
                    Objective: <strong className="text-gray-600">{qol.objective_qol.toFixed(1)}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Category quick overview */}
          <div className="grid grid-cols-5 gap-3 shrink-0">
            {catKeys.map((k) => {
              const cat = isPersonalized ? qol.personal_categories[k] : qol.categories[k];
              return (
                <div key={k} className="text-center">
                  <div className="text-lg font-bold" style={{ color: scoreColor(cat.score) }}>{cat.score.toFixed(0)}</div>
                  <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide leading-tight mt-0.5">
                    {cat.name.slice(0, 5)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category breakdown cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {catKeys.map((k) => (
          <CategoryCard
            key={k}
            cat={qol.categories[k]}
            personalCat={qol.personal_categories[k]}
            isPersonalized={isPersonalized}
          />
        ))}
      </div>

      {/* Raw data highlights */}
      {rawData && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Key Indicators</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-xs">
            <div>
              <span className="text-gray-400">Violent Crime</span>
              <p className="font-semibold text-carto-slate">{rawData.violent_rate_per_100k.toFixed(0)} per 100k</p>
            </div>
            <div>
              <span className="text-gray-400">Life Expectancy</span>
              <p className="font-semibold text-carto-slate">{rawData.life_expectancy.toFixed(1)} years</p>
            </div>
            <div>
              <span className="text-gray-400">Uninsured</span>
              <p className="font-semibold text-carto-slate">{rawData.uninsured_pct.toFixed(1)}%</p>
            </div>
            <div>
              <span className="text-gray-400">Broadband</span>
              <p className="font-semibold text-carto-slate">{rawData.broadband_pct.toFixed(0)}%</p>
            </div>
            <div>
              <span className="text-gray-400">Median AQI</span>
              <p className="font-semibold text-carto-slate">{rawData.aqi_median}</p>
            </div>
            <div>
              <span className="text-gray-400">Graduation Rate</span>
              <p className="font-semibold text-carto-slate">{rawData.graduation_rate.toFixed(0)}%</p>
            </div>
            <div>
              <span className="text-gray-400">Price Level (RPP)</span>
              <p className="font-semibold text-carto-slate">{rawData.rpp_all_items.toFixed(1)}</p>
            </div>
            <div>
              <span className="text-gray-400">Childcare (Infant)</span>
              <p className="font-semibold text-carto-slate">${rawData.childcare_infant_annual.toLocaleString()}/yr</p>
            </div>
          </div>
        </div>
      )}

      {/* Methodology note */}
      <p className="text-[10px] text-gray-400 leading-relaxed">
        Quality of Life Index uses winsorized percentile normalization (P5–P95) across {isPersonalized ? 'all 51 jurisdictions, personalized for your income and spending power' : 'all 51 US jurisdictions'}.
        Categories: Safety (crime, homelessness), Healthcare (longevity, coverage), Infrastructure (broadband, grid reliability, disaster risk), Environment (air, water, waste), Education (NAEP scores, graduation, affordability).
        {isPersonalized && ' Personalization adjusts scores based on your purchasing power in each state using Regional Price Parities.'}
      </p>
    </div>
  );
}
