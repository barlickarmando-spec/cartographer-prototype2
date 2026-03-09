'use client';

import { useState, useMemo, useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useWealthCalculations } from '@/hooks/useWealthCalculations';
import { calculateAutoApproach, CalculationResult } from '@/lib/calculation-engine';
import { normalizeOnboardingAnswers } from '@/lib/onboarding/normalize';
import { getOnboardingAnswers } from '@/lib/storage';
import {
  generateWealthTimeline,
  analyzeSale,
  getHistoricalTrend,
  LocationWealth,
  WealthProjection,
} from '@/lib/wealth-calculations';
import { formatCurrency } from '@/lib/utils';
import { createRatingColorScale } from '@/lib/color-scale';
import LocationPicker from '@/components/shared/LocationPicker';
import statePathsData from '@/lib/us-state-paths.json';
import cityAreasData from '@/lib/us-city-areas.json';
import WealthMapTooltip from '@/components/wealth/WealthMapTooltip';
import type { MapMode } from '@/components/wealth/types';
import type { OnboardingAnswers } from '@/lib/onboarding/types';

const statePaths = statePathsData as { name: string; d: string }[];
const cityAreas = cityAreasData as unknown as Record<string, { center: [number, number]; d: string }>;

const GRAY = '#E5E7EB';
const WIDTH = 960;
const HEIGHT = 600;

const COMPARE_COLORS = [
  '#4A90D9', '#E76F51', '#4DB6AC', '#7E57C2', '#F59E0B',
  '#EC4899', '#10B981', '#6366F1', '#EF4444', '#14B8A6',
];

interface TooltipState {
  name: string;
  data: LocationWealth;
  rating: number;
  position: { x: number; y: number };
}

export default function WealthGenerationPage() {
  const router = useRouter();

  const [mapMode, setMapMode] = useState<MapMode>('wealth-gain');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [sellYear, setSellYear] = useState(15);
  const [pendingSellYear, setPendingSellYear] = useState(15);

  // Calculator location override
  const [calcLocation, setCalcLocation] = useState('');
  const [pendingCalcLocation, setPendingCalcLocation] = useState('');

  // Compare locations for multi-line chart
  const [compareLocations, setCompareLocations] = useState<string[]>([]);
  const [compareSearch, setCompareSearch] = useState('');

  const { stateData, cityData, currentResult, profile, isLoading, progress, error, recompute } = useWealthCalculations(sellYear);

  // Tooltip state
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const handleMouseMove = useCallback((e: ReactMouseEvent) => {
    setTooltip((prev) =>
      prev ? { ...prev, position: { x: e.clientX, y: e.clientY } } : null
    );
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const activeLocation = calcLocation || selectedLocation || currentResult?.location || '';

  // Handle Calculate button press
  const handleCalculate = useCallback(() => {
    setCalcLocation(pendingCalcLocation);
    setSellYear(pendingSellYear);
    recompute(pendingSellYear);
  }, [pendingCalcLocation, pendingSellYear, recompute]);

  // Compute wealth data for selected location
  const locationCalcResult = useMemo(() => {
    if (!activeLocation) return null;
    try {
      const answers = getOnboardingAnswers<OnboardingAnswers>(
        (d): d is OnboardingAnswers => d != null && typeof d === 'object'
      );
      if (!answers) return null;
      const prof = normalizeOnboardingAnswers(answers);
      return calculateAutoApproach(prof, activeLocation, 50, true);
    } catch {
      return null;
    }
  }, [activeLocation]);

  const maxPrice = locationCalcResult?.houseProjections.maxAffordable?.maxSustainableHousePrice ?? 0;
  const yearsToOwn = locationCalcResult?.yearsToMortgage ?? 0;

  const timeline = useMemo(() => {
    if (!locationCalcResult || maxPrice <= 0) return [];
    return generateWealthTimeline(locationCalcResult, 50);
  }, [locationCalcResult, maxPrice]);

  const saleAnalysis = useMemo(() => {
    if (!locationCalcResult || maxPrice <= 0) return null;
    return analyzeSale(locationCalcResult, sellYear);
  }, [locationCalcResult, maxPrice, sellYear]);

  const historicalTrend = useMemo(() => getHistoricalTrend(30), []);

  // Compute timelines for all compare locations (including active)
  const compareTimelines = useMemo(() => {
    const allLocs = [activeLocation, ...compareLocations].filter(Boolean);
    const unique = [...new Set(allLocs)];
    const results: { name: string; timeline: WealthProjection[]; color: string }[] = [];

    const answers = (() => {
      try {
        return getOnboardingAnswers<OnboardingAnswers>(
          (d): d is OnboardingAnswers => d != null && typeof d === 'object'
        );
      } catch { return null; }
    })();
    if (!answers) return results;

    const prof = normalizeOnboardingAnswers(answers);

    unique.forEach((loc, i) => {
      try {
        const result = calculateAutoApproach(prof, loc, 50, true);
        if (!result) return;
        const mp = result.houseProjections.maxAffordable?.maxSustainableHousePrice ?? 0;
        if (mp <= 0) return;
        const tl = generateWealthTimeline(result, 50);
        results.push({ name: loc, timeline: tl, color: COMPARE_COLORS[i % COMPARE_COLORS.length] });
      } catch { /* skip */ }
    });

    return results;
  }, [activeLocation, compareLocations]);

  // All locations list for search
  const allLocationNames = useMemo(() => {
    const names: string[] = [];
    stateData.forEach((_, k) => names.push(k));
    cityData.forEach((_, k) => names.push(k));
    return names.sort();
  }, [stateData, cityData]);

  const filteredCompareOptions = useMemo(() => {
    if (!compareSearch.trim()) return [];
    const q = compareSearch.toLowerCase();
    const existing = new Set([activeLocation, ...compareLocations].map(s => s.toLowerCase()));
    return allLocationNames
      .filter(n => n.toLowerCase().includes(q) && !existing.has(n.toLowerCase()))
      .slice(0, 8);
  }, [compareSearch, allLocationNames, activeLocation, compareLocations]);

  // Heat map color scale based on mode
  const ratingScale = useMemo(() => createRatingColorScale(), []);

  const getHeatValue = useCallback((loc: LocationWealth): number => {
    switch (mapMode) {
      case 'wealth-gain': return loc.wealthAtSell > 0 ? loc.wealthAtSell : loc.wealthAt30;
      case 'pct-increase': return loc.appreciationPctAt30;
      case 'total-wealth': return loc.totalWealth;
      case 'total-effective-wealth': return loc.totalEffectiveWealth;
      default: return 0;
    }
  }, [mapMode]);

  // Compute min/max for color scaling
  const { minVal, maxVal } = useMemo(() => {
    let min = Infinity, max = -Infinity;
    const process = (loc: LocationWealth) => {
      if (!loc.isViable) return;
      const v = getHeatValue(loc);
      if (v < min) min = v;
      if (v > max) max = v;
    };
    stateData.forEach(process);
    cityData.forEach(process);
    if (min === Infinity) { min = 0; max = 1; }
    return { minVal: min, maxVal: max };
  }, [stateData, cityData, getHeatValue]);

  const getColor = useCallback((loc: LocationWealth | undefined): string => {
    if (!loc || !loc.isViable) return GRAY;
    const v = getHeatValue(loc);
    const range = maxVal - minVal;
    const t = range > 0 ? ((v - minVal) / range) * 10 : 5;
    return ratingScale(t);
  }, [getHeatValue, minVal, maxVal, ratingScale]);

  // Compute star rating (0-5) from heat value position in range
  const getStarRating = useCallback((loc: LocationWealth): number => {
    if (!loc.isViable) return 0;
    const v = getHeatValue(loc);
    const range = maxVal - minVal;
    const normalized = range > 0 ? (v - minVal) / range : 0.5;
    return Math.round(normalized * 5 * 2) / 2; // half-star increments
  }, [getHeatValue, minVal, maxVal]);

  const handleMouseEnter = useCallback(
    (name: string, data: LocationWealth, e: ReactMouseEvent) => {
      setTooltip({ name, data, rating: getStarRating(data), position: { x: e.clientX, y: e.clientY } });
    },
    [getStarRating]
  );

  // Top locations for sidebar
  const topStates = useMemo(() => {
    const viable: LocationWealth[] = [];
    stateData.forEach(l => { if (l.isViable) viable.push(l); });
    return viable.sort((a, b) => getHeatValue(b) - getHeatValue(a)).slice(0, 3);
  }, [stateData, getHeatValue]);

  const topCities = useMemo(() => {
    const viable: LocationWealth[] = [];
    cityData.forEach(l => { if (l.isViable) viable.push(l); });
    return viable.sort((a, b) => getHeatValue(b) - getHeatValue(a)).slice(0, 3);
  }, [cityData, getHeatValue]);

  // Projection milestones
  const projectionRows = useMemo(() => {
    if (timeline.length === 0) return [];
    return [15, 25, 30, 50].map(y => {
      const t = timeline.find(p => p.year === y);
      return t ?? null;
    }).filter(Boolean) as WealthProjection[];
  }, [timeline]);

  // Chart dimensions
  const chartW = 640;
  const chartH = 200;
  const chartPad = 40;
  const chartRight = 30;

  // Check if pending settings differ from applied
  const hasPendingChanges = pendingSellYear !== sellYear || pendingCalcLocation !== calcLocation;

  if (error) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-[#4A90D9]">Wealth Generation</h1>
        </div>
        <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
          <p className="text-yellow-800">
            Please complete the{' '}
            <button onClick={() => router.push('/onboarding')} className="underline font-semibold hover:text-yellow-900">
              onboarding process
            </button>{' '}
            to generate your wealth analysis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-[#4A90D9]">Wealth Generation</h1>
      </div>

      {/* Calculator Controls */}
      <div className="bg-white rounded-2xl border border-carto-blue-pale/30 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-[#4A90D9]">Settings</h2>
          {hasPendingChanges && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full font-medium">Unsaved changes</span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {/* Location */}
          <div className="bg-[#F8FAFB] rounded-xl p-4 border border-[#E5E7EB]">
            <LocationPicker
              value={pendingCalcLocation || activeLocation}
              onChange={setPendingCalcLocation}
              label="Location"
            />
          </div>

          {/* Sell After */}
          <div className="bg-[#F8FAFB] rounded-xl p-4 border border-[#E5E7EB]">
            <label className="block text-xs font-medium text-[#6B7280] mb-2">Sell After</label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={1}
                  value={pendingSellYear}
                  onChange={(e) => setPendingSellYear(Number(e.target.value))}
                  className="w-full accent-[#4A90D9] h-1.5"
                />
                <div className="flex justify-between text-[10px] text-[#9CA3AF] mt-1">
                  <span>5 yrs</span>
                  <span>50 yrs</span>
                </div>
              </div>
              <div className="w-16 text-center px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white">
                <span className="text-lg font-bold text-[#2C3E50]">{pendingSellYear}</span>
                <span className="text-[10px] text-[#9CA3AF] block -mt-0.5">years</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Home Price display */}
          <div className="flex-1 flex items-center gap-3 bg-[#F0F7FF] rounded-xl px-4 py-3 border border-[#4A90D9]/15">
            <div className="w-8 h-8 rounded-lg bg-[#4A90D9]/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-[#4A90D9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-[#6B7280]">Max Affordable Home</p>
              <p className="text-lg font-bold text-[#2C3E50] leading-tight">
                {maxPrice > 0 ? formatCurrency(maxPrice) : 'N/A'}
              </p>
            </div>
            <p className="ml-auto text-xs text-[#9CA3AF] max-w-[120px] text-right leading-tight">
              in {activeLocation || 'selected location'}
            </p>
          </div>

          {/* Calculate button */}
          <button
            onClick={handleCalculate}
            disabled={isLoading}
            className={`px-8 py-3.5 rounded-xl font-semibold text-white transition-all flex items-center gap-2 ${
              hasPendingChanges
                ? 'bg-[#4A90D9] hover:bg-[#3A7BC8] shadow-md hover:shadow-lg'
                : 'bg-[#4A90D9]/60 hover:bg-[#4A90D9]/80'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Computing...
              </>
            ) : 'Calculate'}
          </button>
        </div>
      </div>

      {/* Wealth Heat Map */}
      <div className="bg-white rounded-2xl border border-carto-blue-pale/30 overflow-hidden">
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-xl font-bold text-[#4A90D9]">Wealth Generation Map</h2>
            <div className="flex bg-gray-100 rounded-full p-1">
              {([
                { key: 'wealth-gain', label: 'Wealth Gain' },
                { key: 'pct-increase', label: '% Increase' },
                { key: 'total-wealth', label: 'Total Wealth' },
                { key: 'total-effective-wealth', label: 'Total Effective Wealth' },
              ] as { key: MapMode; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setMapMode(key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    mapMode === key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0 relative">
              {isLoading && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-md flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#4CAF50] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-xs text-gray-600 font-medium">Computing {progress}%</span>
                </div>
              )}
              <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" style={{ maxHeight: '75vh' }}>
                <defs>
                  <clipPath id="us-wealth-clip">
                    {statePaths.map((state, i) => <path key={i} d={state.d} />)}
                  </clipPath>
                </defs>
                {statePaths.map((state, i) => {
                  const loc = stateData.get(state.name);
                  return (
                    <path
                      key={i}
                      d={state.d}
                      fill={getColor(loc)}
                      stroke="#FFFFFF"
                      strokeWidth={0.75}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      cursor="pointer"
                      onClick={() => { setPendingCalcLocation(state.name); setCalcLocation(state.name); }}
                      onMouseEnter={(e) => { if (loc) handleMouseEnter(state.name, loc, e); }}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                      className="transition-opacity hover:opacity-80"
                    />
                  );
                })}
                <g clipPath="url(#us-wealth-clip)">
                  {Object.entries(cityAreas).map(([cityName, area]) => {
                    const loc = cityData.get(cityName);
                    if (!loc) return null;
                    return (
                      <path
                        key={cityName}
                        d={area.d}
                        fill={getColor(loc)}
                        stroke="#666"
                        strokeWidth={0.5}
                        strokeLinejoin="round"
                        fillOpacity={0.92}
                        cursor="pointer"
                        onClick={() => { setPendingCalcLocation(cityName); setCalcLocation(cityName); }}
                        onMouseEnter={(e) => handleMouseEnter(cityName, loc, e)}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                        className="transition-opacity hover:opacity-75"
                      />
                    );
                  })}
                </g>
              </svg>

              {tooltip && (
                <WealthMapTooltip
                  locationName={tooltip.name}
                  data={tooltip.data}
                  mode={mapMode}
                  rating={tooltip.rating}
                  position={tooltip.position}
                />
              )}
            </div>

            {/* Legend + Top Locations */}
            <div className="w-56 flex-shrink-0 pt-4 space-y-5">
              <div>
                <p className="text-sm font-semibold text-[#2C3E50] mb-3">
                  {mapMode === 'wealth-gain' ? `Wealth Gain (${sellYear} yrs)` :
                   mapMode === 'pct-increase' ? '% Home Appreciation' :
                   mapMode === 'total-wealth' ? `Total Wealth (${sellYear} yrs)` :
                   `Total Effective Wealth (RPP-adj)`}
                </p>
                <div className="space-y-2">
                  {[10, 7.5, 5, 2.5, 0].map((score, i) => (
                    <div key={score} className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded" style={{ backgroundColor: score === 0 ? GRAY : ratingScale(score) }} />
                      <span className="text-sm text-[#6B7280]">
                        {['Highest', 'High', 'Medium', 'Low', 'Not viable'][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {!isLoading && topStates.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#4A90D9] mb-2">Top States</p>
                  <div className="space-y-1.5">
                    {topStates.map(loc => (
                      <div
                        key={loc.name}
                        className="flex items-center justify-between text-xs cursor-pointer hover:bg-[#F0F7FF] rounded px-1.5 py-1 -mx-1.5 transition-colors"
                        onClick={() => { setPendingCalcLocation(loc.name); setCalcLocation(loc.name); }}
                      >
                        <span className="text-[#2C3E50] font-medium truncate flex-1 mr-2">{loc.name}</span>
                        <span className="font-semibold text-[11px] text-[#4A90D9]">
                          {mapMode === 'pct-increase'
                            ? `${Math.round(getHeatValue(loc))}%`
                            : formatCurrency(getHeatValue(loc))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isLoading && topCities.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#4A90D9] mb-2">Top Cities</p>
                  <div className="space-y-1.5">
                    {topCities.map(loc => (
                      <div
                        key={loc.name}
                        className="flex items-center justify-between text-xs cursor-pointer hover:bg-[#F0F7FF] rounded px-1.5 py-1 -mx-1.5 transition-colors"
                        onClick={() => { setPendingCalcLocation(loc.name); setCalcLocation(loc.name); }}
                      >
                        <span className="text-[#2C3E50] font-medium truncate flex-1 mr-2">{loc.name}</span>
                        <span className="font-semibold text-[11px] text-[#4A90D9]">
                          {mapMode === 'pct-increase'
                            ? `${Math.round(getHeatValue(loc))}%`
                            : formatCurrency(getHeatValue(loc))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Wealth Projections */}
      {activeLocation && maxPrice > 0 && (
        <div className="bg-white rounded-2xl border border-carto-blue-pale/30 p-6">
          <h2 className="text-xl font-bold text-[#4A90D9] mb-1">
            Projected Wealth — {activeLocation}
          </h2>
          <p className="text-sm text-[#6B7280] mb-6">
            Based on {formatCurrency(maxPrice)} home with {((locationCalcResult?.locationData.housing.appreciationRate ?? 0.038) * 100).toFixed(1)}% annual appreciation
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {projectionRows.map(p => (
              <div key={p.year} className="rounded-xl p-5 bg-[#4A90D9] text-white">
                <p className="text-sm font-medium opacity-90 mb-1">{p.year} Years</p>
                <p className="text-2xl font-bold">{formatCurrency(p.totalWealth)}</p>
                <p className="text-xs opacity-80 mt-1">
                  Home: {formatCurrency(p.homeValue)} | +{Math.round(p.appreciationPct)}%
                </p>
              </div>
            ))}
          </div>

          {/* Wealth Over Time Chart — Compare Locations */}
          {compareTimelines.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#4A90D9]">Wealth Growth Over Time</h3>
                {/* Legend — positioned above chart */}
                <div className="flex items-center gap-4 flex-wrap">
                  {compareTimelines.map((ct) => (
                    <div key={`legend-loc-${ct.name}`} className="flex items-center gap-1.5">
                      <div className="w-3 h-[3px] rounded-full" style={{ backgroundColor: ct.color }} />
                      <span className="text-[11px] text-[#2C3E50] font-medium">
                        {ct.name.length > 16 ? ct.name.slice(0, 15) + '...' : ct.name}
                      </span>
                    </div>
                  ))}
                  {compareTimelines.length > 0 && (
                    <>
                      <div className="w-px h-3 bg-gray-200" />
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-[3px] rounded-full opacity-40" style={{ backgroundColor: compareTimelines[0].color }} />
                        <span className="text-[11px] text-[#6B7280]">Home Value</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-[3px] rounded-full" style={{ backgroundColor: compareTimelines[0].color, opacity: 1 }}>
                          <div className="w-full h-full" style={{ backgroundImage: `repeating-linear-gradient(90deg, ${compareTimelines[0].color} 0 3px, transparent 3px 6px)` }} />
                        </div>
                        <span className="text-[11px] text-[#6B7280]">Equity</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <svg viewBox={`0 0 ${chartW} ${chartH + 40}`} className="w-full h-auto">
                {/* Axes */}
                <line x1={chartPad} y1={chartH} x2={chartW - chartRight} y2={chartH} stroke="#E5E7EB" strokeWidth={1} />
                <line x1={chartPad} y1={10} x2={chartPad} y2={chartH} stroke="#E5E7EB" strokeWidth={1} />

                {/* Y-axis labels */}
                {(() => {
                  const allMax = Math.max(
                    ...compareTimelines.flatMap(ct => ct.timeline.map(t => Math.max(t.totalWealth, t.homeValue))),
                    1
                  );
                  return [0, 0.25, 0.5, 0.75, 1].map(pct => {
                    const val = allMax * pct;
                    const y = chartH - (pct * (chartH - 20));
                    return (
                      <text key={pct} x={chartPad - 4} y={y + 3} textAnchor="end" fontSize={9} fill="#9CA3AF">
                        {formatCurrency(val)}
                      </text>
                    );
                  });
                })()}

                {/* X-axis labels (age) */}
                {(() => {
                  const startAge = profile?.currentAge ?? 22;
                  return [10, 20, 30, 40, 50].map(y => {
                    const x = chartPad + ((y / 50) * (chartW - chartPad - chartRight));
                    return (
                      <text key={y} x={x} y={chartH + 15} textAnchor="middle" fontSize={9} fill="#9CA3AF">
                        Age {startAge + y}
                      </text>
                    );
                  });
                })()}

                {/* Sell year marker */}
                {(() => {
                  const startAge = profile?.currentAge ?? 22;
                  const x = chartPad + ((sellYear / 50) * (chartW - chartPad - chartRight));
                  return (
                    <>
                      <line x1={x} y1={20} x2={x} y2={chartH} stroke="#888" strokeWidth={1} strokeDasharray="4,3" />
                      <text x={x} y={chartH + 28} textAnchor="middle" fontSize={8} fill="#888">Sell (Age {startAge + sellYear})</text>
                    </>
                  );
                })()}

                {/* Location lines — Total Wealth (solid), Home Value (lighter), Equity (dashed) */}
                {(() => {
                  const allMax = Math.max(
                    ...compareTimelines.flatMap(ct => ct.timeline.map(t => Math.max(t.totalWealth, t.homeValue))),
                    1
                  );
                  return compareTimelines.flatMap((ct) => {
                    const toPoints = (accessor: (t: WealthProjection) => number) =>
                      ct.timeline.map((t) => {
                        const x = chartPad + ((t.year / 50) * (chartW - chartPad - chartRight));
                        const y = chartH - ((accessor(t) / allMax) * (chartH - 20));
                        return `${x},${y}`;
                      }).join(' ');

                    return [
                      // Home Value — lighter/thinner
                      <polyline
                        key={`${ct.name}-homeValue`}
                        points={toPoints(t => t.homeValue)}
                        fill="none"
                        stroke={ct.color}
                        strokeWidth={1.5}
                        strokeOpacity={0.35}
                      />,
                      // Equity — dashed
                      <polyline
                        key={`${ct.name}-equity`}
                        points={toPoints(t => t.equity)}
                        fill="none"
                        stroke={ct.color}
                        strokeWidth={1.5}
                        strokeDasharray="5,3"
                        strokeOpacity={0.7}
                      />,
                      // Total Wealth — solid bold
                      <polyline
                        key={`${ct.name}-totalWealth`}
                        points={toPoints(t => t.totalWealth)}
                        fill="none"
                        stroke={ct.color}
                        strokeWidth={2.5}
                      />,
                    ];
                  });
                })()}
              </svg>

              {/* Compare Locations picker */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-[#2C3E50] mb-2">Compare Locations</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {/* Active location tag */}
                  {activeLocation && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: COMPARE_COLORS[0] }}>
                      {activeLocation}
                      <span className="text-white/60 text-[10px] ml-1">primary</span>
                    </span>
                  )}
                  {/* Compare location tags */}
                  {compareLocations.map((loc, i) => (
                    <span
                      key={loc}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: COMPARE_COLORS[(i + 1) % COMPARE_COLORS.length] }}
                    >
                      {loc}
                      <button
                        onClick={() => setCompareLocations(prev => prev.filter(l => l !== loc))}
                        className="ml-1 hover:text-white/60 transition-colors"
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
                <div className="relative max-w-sm">
                  <input
                    type="text"
                    value={compareSearch}
                    onChange={(e) => setCompareSearch(e.target.value)}
                    placeholder="Add a location to compare..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/30 focus:border-[#4A90D9]"
                  />
                  {filteredCompareOptions.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-y-auto">
                      {filteredCompareOptions.map(loc => (
                        <button
                          key={loc}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-[#F0F7FF] transition-colors"
                          onClick={() => {
                            setCompareLocations(prev => [...prev, loc]);
                            setCompareSearch('');
                          }}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sale Profit Calculator */}
      {saleAnalysis && activeLocation && (
        <div className="bg-white rounded-2xl border border-carto-blue-pale/30 p-6">
          <h2 className="text-xl font-bold text-[#4A90D9] mb-1">
            Sale Profit Calculator
          </h2>
          <p className="text-sm text-[#6B7280] mb-6">
            If you sell your {activeLocation} home after {sellYear} years
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Sale Price" value={formatCurrency(saleAnalysis.homeValue)} color="#4A90D9" />
            <StatCard label="Net Profit" value={formatCurrency(saleAnalysis.netProfit)} color={saleAnalysis.netProfit >= 0 ? '#4DB6AC' : '#E76F51'} />
            <StatCard label="ROI" value={`${saleAnalysis.roi}%`} color="#7E57C2" />
            <StatCard label="Upgrade Home" value={formatCurrency(saleAnalysis.upgradeHomeValue)} color="#E76F51" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sale breakdown */}
            <div className="bg-[#F8FAFB] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#2C3E50] mb-3">Sale Breakdown</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Purchase Price</span>
                  <span className="font-semibold text-[#2C3E50]">{formatCurrency(maxPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Sale Price ({sellYear} yrs)</span>
                  <span className="font-semibold text-[#2C3E50]">{formatCurrency(saleAnalysis.homeValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Remaining Mortgage</span>
                  <span className="font-semibold text-[#2C3E50]">-{formatCurrency(saleAnalysis.mortgageBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Selling Costs (~6%)</span>
                  <span className="font-semibold text-[#2C3E50]">-{formatCurrency(saleAnalysis.sellingCosts)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#E5E7EB]">
                  <span className="text-[#2C3E50] font-semibold">Net Profit</span>
                  <span className={`font-bold ${saleAnalysis.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {formatCurrency(saleAnalysis.netProfit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Upgrade path */}
            <div className="bg-[#F8FAFB] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#2C3E50] mb-3">After Selling</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Your Equity</span>
                  <span className="font-semibold text-[#2C3E50]">{formatCurrency(saleAnalysis.equity)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">After Selling Costs</span>
                  <span className="font-semibold text-[#2C3E50]">{formatCurrency(saleAnalysis.equity - saleAnalysis.sellingCosts)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Total Invested</span>
                  <span className="font-semibold text-[#2C3E50]">{formatCurrency(saleAnalysis.totalInvested)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#E5E7EB]">
                  <span className="text-[#2C3E50] font-semibold">Next Home You Can Buy</span>
                  <span className="font-bold text-[#4A90D9]">{formatCurrency(saleAnalysis.upgradeHomeValue)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historical Trends */}
      <div className="bg-white rounded-2xl border border-carto-blue-pale/30 p-6">
        <h2 className="text-xl font-bold text-[#4A90D9] mb-1">Historical Home Value Trends</h2>
        <p className="text-sm text-[#6B7280] mb-6">
          US National Home Price Index — normalized to 100
        </p>

        <svg viewBox={`0 0 ${chartW} ${chartH + 40}`} className="w-full h-auto">
          <line x1={chartPad} y1={chartH} x2={chartW - chartRight} y2={chartH} stroke="#E5E7EB" strokeWidth={1} />
          <line x1={chartPad} y1={10} x2={chartPad} y2={chartH} stroke="#E5E7EB" strokeWidth={1} />

          {/* Y-axis */}
          {(() => {
            const maxV = Math.max(...historicalTrend.map(t => t.indexValue));
            return [0, 0.25, 0.5, 0.75, 1].map(pct => {
              const val = maxV * pct;
              const y = chartH - (pct * (chartH - 20));
              return (
                <text key={pct} x={chartPad - 4} y={y + 3} textAnchor="end" fontSize={9} fill="#9CA3AF">
                  {Math.round(val)}
                </text>
              );
            });
          })()}

          {/* X-axis years */}
          {historicalTrend.filter((_, i) => i % 5 === 0).map(t => {
            const idx = historicalTrend.indexOf(t);
            const x = chartPad + ((idx / (historicalTrend.length - 1)) * (chartW - chartPad - 10));
            return (
              <text key={t.year} x={x} y={chartH + 15} textAnchor="middle" fontSize={9} fill="#9CA3AF">
                {t.year}
              </text>
            );
          })}

          {/* Trend line */}
          {(() => {
            const maxV = Math.max(...historicalTrend.map(t => t.indexValue));
            const points = historicalTrend.map((t, i) => {
              const x = chartPad + ((i / (historicalTrend.length - 1)) * (chartW - chartPad - 10));
              const y = chartH - ((t.indexValue / maxV) * (chartH - 20));
              return `${x},${y}`;
            }).join(' ');

            // Fill area
            const firstX = chartPad;
            const lastX = chartPad + (chartW - chartPad - 10);
            const fillPoints = `${firstX},${chartH} ${points} ${lastX},${chartH}`;

            return (
              <>
                <polygon points={fillPoints} fill="#4A90D9" fillOpacity={0.1} />
                <polyline points={points} fill="none" stroke="#4A90D9" strokeWidth={2} />
              </>
            );
          })()}

          {/* 2008 crisis marker */}
          {(() => {
            const crisisIdx = historicalTrend.findIndex(t => t.year === 2008);
            if (crisisIdx < 0) return null;
            const x = chartPad + ((crisisIdx / (historicalTrend.length - 1)) * (chartW - chartPad - 10));
            return (
              <>
                <line x1={x} y1={20} x2={x} y2={chartH} stroke="#E76F51" strokeWidth={1} strokeDasharray="3,3" />
                <text x={x} y={chartH + 28} textAnchor="middle" fontSize={8} fill="#E76F51">2008 Crisis</text>
              </>
            );
          })()}

          {/* COVID surge marker */}
          {(() => {
            const covidIdx = historicalTrend.findIndex(t => t.year === 2020);
            if (covidIdx < 0) return null;
            const x = chartPad + ((covidIdx / (historicalTrend.length - 1)) * (chartW - chartPad - 10));
            return (
              <>
                <line x1={x} y1={20} x2={x} y2={chartH} stroke="#4DB6AC" strokeWidth={1} strokeDasharray="3,3" />
                <text x={x} y={chartH + 28} textAnchor="middle" fontSize={8} fill="#4DB6AC">COVID Surge</text>
              </>
            );
          })()}
        </svg>
      </div>

      {/* Tips */}
      <div className="bg-carto-sky rounded-xl p-6 border border-carto-blue-pale/40">
        <h3 className="text-lg font-bold text-carto-slate mb-3">Understanding Wealth Generation</h3>
        <ul className="space-y-2">
          {[
            { title: 'Wealth Gain', desc: 'Total wealth accumulated through home equity plus savings over the sell period.' },
            { title: '% Increase', desc: 'How much your home value grows from appreciation alone — higher in markets with strong demand.' },
            { title: 'Total Wealth', desc: 'Your total wealth (equity + savings) at the sell year — the full picture of what you\'ve built.' },
            { title: 'Total Effective Wealth', desc: 'Total wealth adjusted for Regional Price Parity — shows what your wealth is actually worth relative to local costs.' },
            { title: 'Upgrade Path', desc: 'When you sell, your equity becomes a down payment for a larger home — building generational wealth.' },
          ].map(tip => (
            <li key={tip.title} className="flex items-start gap-2 text-sm text-gray-700">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span><strong>{tip.title}</strong> — {tip.desc}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-5 text-white" style={{ backgroundColor: color }}>
      <p className="text-sm font-medium opacity-90 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
