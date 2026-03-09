'use client';

import { useState, useMemo, useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useWealthCalculations } from '@/hooks/useWealthCalculations';
import { calculateAutoApproach } from '@/lib/calculation-engine';
import { normalizeOnboardingAnswers } from '@/lib/onboarding/normalize';
import { getOnboardingAnswers } from '@/lib/storage';
import {
  generateWealthTimeline,
  analyzeSale,
  getHistoricalTrend,
  LocationWealth,
  WealthProjection,
  SellAnalysis,
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

interface TooltipState {
  name: string;
  data: LocationWealth;
  rating: number;
  position: { x: number; y: number };
}

export default function WealthGenerationPage() {
  const router = useRouter();
  const { stateData, cityData, currentResult, profile, isLoading, progress, error } = useWealthCalculations();

  const [mapMode, setMapMode] = useState<MapMode>('wealth-gain');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [sellYear, setSellYear] = useState(15);

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

  // Calculator location override
  const [calcLocation, setCalcLocation] = useState('');

  const activeLocation = calcLocation || selectedLocation || currentResult?.location || '';

  // Compute wealth data for selected location
  const locationCalcResult = useMemo(() => {
    if (!activeLocation) return null;
    try {
      const answers = getOnboardingAnswers<OnboardingAnswers>(
        (d): d is OnboardingAnswers => d != null && typeof d === 'object'
      );
      if (!answers) return null;
      const prof = normalizeOnboardingAnswers(answers);
      return calculateAutoApproach(prof, activeLocation, 30);
    } catch {
      return null;
    }
  }, [activeLocation]);

  const maxPrice = locationCalcResult?.houseProjections.maxAffordable?.maxSustainableHousePrice ?? 0;
  const yearsToOwn = locationCalcResult?.yearsToMortgage ?? 0;

  const timeline = useMemo(() => {
    if (maxPrice <= 0) return [];
    const annualSavings = locationCalcResult?.yearByYear?.[0]?.savingsContribution ?? 0;
    return generateWealthTimeline(maxPrice, yearsToOwn, 50, 0.038, annualSavings);
  }, [maxPrice, yearsToOwn, locationCalcResult]);

  const saleAnalysis = useMemo(() => {
    if (maxPrice <= 0) return null;
    return analyzeSale(maxPrice, sellYear);
  }, [maxPrice, sellYear]);

  const historicalTrend = useMemo(() => getHistoricalTrend(30), []);

  // Heat map color scale based on mode
  const ratingScale = useMemo(() => createRatingColorScale(), []);

  const getHeatValue = useCallback((loc: LocationWealth): number => {
    switch (mapMode) {
      case 'wealth-gain': return loc.wealthAt30;
      case 'pct-increase': return loc.appreciationPctAt30;
      case 'effective-wealth': return loc.effectiveWealth;
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
  const chartW = 600;
  const chartH = 200;
  const chartPad = 40;

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
        <h2 className="text-xl font-bold text-[#4A90D9] mb-4">Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LocationPicker
            value={activeLocation}
            onChange={setCalcLocation}
            label="Location"
          />
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Sell After (Years)</label>
            <input
              type="range"
              min={5}
              max={50}
              step={1}
              value={sellYear}
              onChange={(e) => setSellYear(Number(e.target.value))}
              className="w-full accent-[#4A90D9]"
            />
            <div className="flex justify-between text-xs text-[#9CA3AF] mt-1">
              <span>5 yrs</span>
              <span className="font-semibold text-[#2C3E50]">{sellYear} years</span>
              <span>50 yrs</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Home Price</label>
            <p className="text-2xl font-bold text-[#2C3E50]">
              {maxPrice > 0 ? formatCurrency(maxPrice) : 'N/A'}
            </p>
            <p className="text-xs text-[#9CA3AF] mt-1">Max affordable in {activeLocation || 'selected location'}</p>
          </div>
        </div>
      </div>

      {/* Wealth Heat Map */}
      <div className="bg-white rounded-2xl border border-carto-blue-pale/30 overflow-hidden">
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#4A90D9]">Wealth Generation Map</h2>
            <div className="flex bg-gray-100 rounded-full p-1">
              {([
                { key: 'wealth-gain', label: 'Wealth Gain' },
                { key: 'pct-increase', label: '% Increase' },
                { key: 'effective-wealth', label: 'Effective Wealth' },
              ] as { key: MapMode; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setMapMode(key)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
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
                      onClick={() => setCalcLocation(state.name)}
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
                        onClick={() => setCalcLocation(cityName)}
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
                  {mapMode === 'wealth-gain' ? 'Wealth at 30 Years' :
                   mapMode === 'pct-increase' ? '% Home Appreciation' :
                   'Effective Equity'}
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
                        onClick={() => setCalcLocation(loc.name)}
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
                        onClick={() => setCalcLocation(loc.name)}
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
            Based on {formatCurrency(maxPrice)} home with 3.8% annual appreciation
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

          {/* Wealth Over Time Chart */}
          {timeline.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#4A90D9] mb-3">Wealth Growth Over Time</h3>
              <svg viewBox={`0 0 ${chartW} ${chartH + 40}`} className="w-full h-auto">
                {/* Axes */}
                <line x1={chartPad} y1={chartH} x2={chartW - 10} y2={chartH} stroke="#E5E7EB" strokeWidth={1} />
                <line x1={chartPad} y1={10} x2={chartPad} y2={chartH} stroke="#E5E7EB" strokeWidth={1} />

                {/* Y-axis labels */}
                {(() => {
                  const maxW = Math.max(...timeline.map(t => t.totalWealth), 1);
                  return [0, 0.25, 0.5, 0.75, 1].map(pct => {
                    const val = maxW * pct;
                    const y = chartH - (pct * (chartH - 20));
                    return (
                      <text key={pct} x={chartPad - 4} y={y + 3} textAnchor="end" fontSize={9} fill="#9CA3AF">
                        {formatCurrency(val)}
                      </text>
                    );
                  });
                })()}

                {/* X-axis labels */}
                {[10, 20, 30, 40, 50].map(y => {
                  const x = chartPad + ((y / 50) * (chartW - chartPad - 10));
                  return (
                    <text key={y} x={x} y={chartH + 15} textAnchor="middle" fontSize={9} fill="#9CA3AF">
                      {y}yr
                    </text>
                  );
                })}

                {/* Total Wealth line */}
                {(() => {
                  const maxW = Math.max(...timeline.map(t => t.totalWealth), 1);
                  const points = timeline.map((t, i) => {
                    const x = chartPad + ((t.year / 50) * (chartW - chartPad - 10));
                    const y = chartH - ((t.totalWealth / maxW) * (chartH - 20));
                    return `${x},${y}`;
                  }).join(' ');
                  return <polyline points={points} fill="none" stroke="#4A90D9" strokeWidth={2} />;
                })()}

                {/* Home Value line */}
                {(() => {
                  const maxW = Math.max(...timeline.map(t => t.totalWealth), 1);
                  const points = timeline.filter(t => t.homeValue > 0).map(t => {
                    const x = chartPad + ((t.year / 50) * (chartW - chartPad - 10));
                    const y = chartH - ((t.homeValue / maxW) * (chartH - 20));
                    return `${x},${y}`;
                  }).join(' ');
                  return <polyline points={points} fill="none" stroke="#4DB6AC" strokeWidth={2} strokeDasharray="4,3" />;
                })()}

                {/* Equity line */}
                {(() => {
                  const maxW = Math.max(...timeline.map(t => t.totalWealth), 1);
                  const points = timeline.filter(t => t.equity > 0).map(t => {
                    const x = chartPad + ((t.year / 50) * (chartW - chartPad - 10));
                    const y = chartH - ((t.equity / maxW) * (chartH - 20));
                    return `${x},${y}`;
                  }).join(' ');
                  return <polyline points={points} fill="none" stroke="#7E57C2" strokeWidth={2} strokeDasharray="6,3" />;
                })()}

                {/* Legend */}
                <rect x={chartPad + 10} y={15} width={12} height={3} fill="#4A90D9" />
                <text x={chartPad + 26} y={19} fontSize={9} fill="#2C3E50">Total Wealth</text>
                <rect x={chartPad + 110} y={15} width={12} height={3} fill="#4DB6AC" />
                <text x={chartPad + 126} y={19} fontSize={9} fill="#2C3E50">Home Value</text>
                <rect x={chartPad + 200} y={15} width={12} height={3} fill="#7E57C2" />
                <text x={chartPad + 216} y={19} fontSize={9} fill="#2C3E50">Equity</text>
              </svg>
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
          <line x1={chartPad} y1={chartH} x2={chartW - 10} y2={chartH} stroke="#E5E7EB" strokeWidth={1} />
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
            { title: 'Wealth Gain', desc: 'Total wealth accumulated through home equity plus savings over 30 years of ownership.' },
            { title: '% Increase', desc: 'How much your home value grows from appreciation alone — higher in markets with strong demand.' },
            { title: 'Effective Wealth', desc: 'Your net equity position after 30 years — home value minus any remaining mortgage.' },
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
