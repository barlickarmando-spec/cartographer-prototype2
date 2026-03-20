'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { CITY_COORDINATES } from '@/lib/us-city-coordinates';
import { cn } from '@/lib/utils';
import { resolveCountyCityName } from '@/lib/city-name-aliases';
import countyPathsRaw from '@/lib/us-county-paths.json';

export type HeatMapMetric = 'most-recommended' | 'financial-stability' | 'projected-home-size' | 'projected-salary' | 'job-opportunity' | 'quality-of-life';

export interface CityHeatData {
  name: string;
  displayName: string;
  score: number;          // viability score 0-10
  salary: number;
  projectedSqFt: number;
  disposableIncome: number;
  yearsToMortgage: number;
  qolScore: number;
  minAllocation: number;
}

interface StateHeatMapProps {
  stateName: string;
  stateAbbrev: string;
  cities: CityHeatData[];
  stateData?: CityHeatData | null;
  userOccupation?: string;
  onCityClick?: (cityName: string) => void;
}

interface CountyPath {
  fips: string;
  stateAbbrev: string;
  cityName: string;
  d: string;
}

const countyPaths = countyPathsRaw as CountyPath[];

const METRIC_OPTIONS: { value: HeatMapMetric; label: string }[] = [
  { value: 'most-recommended', label: 'Most Recommended' },
  { value: 'financial-stability', label: 'Financial Stability' },
  { value: 'projected-home-size', label: 'Projected Home Size' },
  { value: 'projected-salary', label: 'Projected Salary' },
  { value: 'job-opportunity', label: 'Job Opportunity' },
  { value: 'quality-of-life', label: 'Quality of Life' },
];

function getMetricValue(city: CityHeatData, metric: HeatMapMetric): number {
  switch (metric) {
    case 'most-recommended':
      return (city.score / 10) * 0.4
        + (city.qolScore / 100) * 0.25
        + (Math.min(city.disposableIncome, 80000) / 80000) * 0.2
        + (Math.min(city.projectedSqFt, 3000) / 3000) * 0.15;
    case 'financial-stability':
      return Math.min(city.disposableIncome, 80000) / 80000;
    case 'projected-home-size':
      return Math.min(city.projectedSqFt, 3000) / 3000;
    case 'projected-salary':
      return Math.min(city.salary, 120000) / 120000;
    case 'job-opportunity':
      return city.salary > 0 ? Math.min(city.salary, 100000) / 100000 : 0;
    case 'quality-of-life':
      return city.qolScore / 100;
    default:
      return city.score / 10;
  }
}

function getHeatColor(value: number, isCity: boolean): string {
  const r = value < 0.5 ? 220 : Math.round(220 - (value - 0.5) * 2 * 180);
  const g = value < 0.5 ? Math.round(60 + value * 2 * 160) : 200;
  const b = 60;
  const alpha = isCity ? 0.75 : 0.45;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getHeatColorSolid(value: number): string {
  const r = value < 0.5 ? 220 : Math.round(220 - (value - 0.5) * 2 * 180);
  const g = value < 0.5 ? Math.round(60 + value * 2 * 160) : 200;
  const b = 60;
  return `rgb(${r}, ${g}, ${b})`;
}

function fmtNum(n: number): string { return Math.round(n).toLocaleString(); }
function fmtDollars(n: number): string { return '$' + fmtNum(n); }

// Parse SVG path to compute bounding box
function pathBBox(d: string): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const nums = d.match(/-?\d+(?:\.\d+)?/g);
  if (!nums) return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  for (let i = 0; i < nums.length - 1; i += 2) {
    const x = parseFloat(nums[i]);
    const y = parseFloat(nums[i + 1]);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

// Tooltip data for hover
interface TooltipState {
  data: CityHeatData;
  isCity: boolean;
  position: { x: number; y: number };
}

export default function StateHeatMap({ stateName, stateAbbrev, cities, stateData, userOccupation, onCityClick }: StateHeatMapProps) {
  const [metric, setMetric] = useState<HeatMapMetric>('most-recommended');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // ViewBox-based zoom/pan (like USHeatMap - much more stable than CSS transforms)
  const svgRef = useRef<SVGSVGElement>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, vbX: 0, vbY: 0 });
  const [viewBoxState, setViewBoxState] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Filter county paths for this state
  const stateCounties = useMemo(() => {
    return countyPaths.filter(c => c.stateAbbrev === stateAbbrev);
  }, [stateAbbrev]);

  // Build a map from cityName -> CityHeatData
  const cityDataMap = useMemo(() => {
    const map: Record<string, CityHeatData> = {};
    for (const city of cities) {
      const baseName = city.name.split(',')[0].trim();
      map[baseName] = city;
    }
    return map;
  }, [cities]);

  // Compute default bounding box of all state counties
  const defaultVB = useMemo(() => {
    if (stateCounties.length === 0) return { x: 0, y: 0, w: 960, h: 600 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const county of stateCounties) {
      const bb = pathBBox(county.d);
      if (bb.minX < minX) minX = bb.minX;
      if (bb.minY < minY) minY = bb.minY;
      if (bb.maxX > maxX) maxX = bb.maxX;
      if (bb.maxY > maxY) maxY = bb.maxY;
    }
    const w = maxX - minX;
    const h = maxY - minY;
    const pad = Math.max(w, h) * 0.05;
    // Maintain aspect ratio (target ~3:2)
    const targetAspect = 3 / 2;
    let vw = w + pad * 2;
    let vh = h + pad * 2;
    const currentAspect = vw / vh;
    if (currentAspect > targetAspect) {
      vh = vw / targetAspect;
    } else {
      vw = vh * targetAspect;
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return { x: cx - vw / 2, y: cy - vh / 2, w: vw, h: vh };
  }, [stateCounties]);

  const vb = viewBoxState || defaultVB;
  const viewBoxStr = `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;

  // City label positions (centroid of matching county)
  const cityLabelPositions = useMemo(() => {
    const positions: { city: CityHeatData; x: number; y: number }[] = [];
    for (const city of cities) {
      const baseName = city.name.split(',')[0].trim();
      const countyMatch = stateCounties.find(c => resolveCountyCityName(c.cityName) === baseName);
      if (countyMatch) {
        const bb = pathBBox(countyMatch.d);
        positions.push({ city, x: (bb.minX + bb.maxX) / 2, y: (bb.minY + bb.maxY) / 2 });
      } else {
        const coords = CITY_COORDINATES[baseName];
        if (coords) {
          positions.push({ city, x: (coords[0] + 130) * 7, y: (52 - coords[1]) * 8.5 });
        }
      }
    }
    return positions;
  }, [cities, stateCounties]);

  // Zoom via viewBox (scroll zooms into/out of cursor position)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    // Fraction of mouse within the SVG element
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;

    // Zoom factor - gentler sensitivity
    const direction = e.deltaY > 0 ? 1 : -1;
    const factor = 1 + direction * 0.12;

    setViewBoxState(prev => {
      const cur = prev || defaultVB;
      const newW = Math.max(cur.w * factor, defaultVB.w * 0.05); // min zoom: 20x
      const newH = Math.max(cur.h * factor, defaultVB.h * 0.05);
      // Clamp: don't zoom out beyond default
      if (newW >= defaultVB.w && newH >= defaultVB.h) {
        return null; // reset to default
      }
      // Keep the point under the cursor fixed
      const newX = cur.x + (cur.w - newW) * fx;
      const newY = cur.y + (cur.h - newH) * fy;
      return { x: newX, y: newY, w: newW, h: newH };
    });
  }, [defaultVB]);

  // Pan via viewBox
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX, y: e.clientY, vbX: vb.x, vbY: vb.y };
  }, [vb]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Update tooltip position
    if (tooltip) {
      setTooltip(prev => prev ? { ...prev, position: { x: e.clientX, y: e.clientY } } : null);
    }

    if (!isPanningRef.current) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // Convert pixel drag to viewBox units
    const dx = (e.clientX - panStartRef.current.x) / rect.width * vb.w;
    const dy = (e.clientY - panStartRef.current.y) / rect.height * vb.h;
    setViewBoxState({
      x: panStartRef.current.vbX - dx,
      y: panStartRef.current.vbY - dy,
      w: vb.w,
      h: vb.h,
    });
  }, [vb, tooltip]);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  const resetView = useCallback(() => {
    setViewBoxState(null);
  }, []);

  // County hover
  const handleCountyEnter = useCallback((e: React.MouseEvent, county: CountyPath) => {
    const resolvedName = county.cityName ? resolveCountyCityName(county.cityName) : '';
    const cityData = resolvedName ? cityDataMap[resolvedName] : null;
    const data = cityData || stateData;
    if (!data) return;
    setTooltip({ data, isCity: !!cityData, position: { x: e.clientX, y: e.clientY } });
  }, [cityDataMap, stateData]);

  if (stateCounties.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        No map data available for {stateName}.
      </div>
    );
  }

  // Font size scales inversely with zoom so labels stay readable
  const zoomRatio = defaultVB.w / vb.w; // >1 when zoomed in
  const labelSize = Math.max(3, 6 / Math.max(zoomRatio, 1));
  const dotR = Math.max(1.5, 3 / Math.max(zoomRatio, 1));

  const mapContent = (
    <div className={cn('relative', isFullscreen && 'h-full flex flex-col')}>
      {/* Metric filter buttons */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {METRIC_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setMetric(opt.value)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
              metric === opt.value
                ? 'bg-[#4A90D9] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* SVG County Map */}
      <div
        className={cn(
          'relative bg-gray-50 rounded-xl overflow-hidden border border-gray-200 select-none',
          isFullscreen ? 'flex-1' : '',
          isPanningRef.current ? 'cursor-grabbing' : 'cursor-grab'
        )}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { isPanningRef.current = false; setTooltip(null); }}
      >
        <svg
          ref={svgRef}
          viewBox={viewBoxStr}
          className="w-full transition-[viewBox] duration-100 ease-out"
          style={{ minHeight: isFullscreen ? '60vh' : '320px' }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        >
          {/* County shapes */}
          {stateCounties.map(county => {
            const resolvedName = county.cityName ? resolveCountyCityName(county.cityName) : '';
            const cityData = resolvedName ? cityDataMap[resolvedName] : null;
            const dataForColor = cityData || stateData;
            const val = dataForColor ? getMetricValue(dataForColor, metric) : 0.3;
            const isCity = !!cityData;
            const fillColor = dataForColor ? getHeatColor(val, isCity) : 'rgba(200, 200, 200, 0.3)';
            const strokeW = isCity ? Math.max(0.8, 1.2 / Math.max(zoomRatio, 1)) : Math.max(0.2, 0.5 / Math.max(zoomRatio, 1));

            return (
              <path
                key={county.fips}
                d={county.d}
                fill={fillColor}
                stroke={isCity ? '#555' : '#999'}
                strokeWidth={strokeW}
                onMouseEnter={(e) => handleCountyEnter(e, county)}
                onMouseLeave={() => setTooltip(null)}
                onClick={() => {
                  if (cityData && onCityClick) {
                    onCityClick(cityData.displayName);
                  }
                }}
              />
            );
          })}

          {/* City county outlines (thicker border to emphasize) */}
          {stateCounties
            .filter(c => c.cityName && cityDataMap[resolveCountyCityName(c.cityName)])
            .map(county => {
              const outlineW = Math.max(1, 2 / Math.max(zoomRatio, 1));
              return (
                <path
                  key={county.fips + '-outline'}
                  d={county.d}
                  fill="none"
                  stroke="#333"
                  strokeWidth={outlineW}
                  pointerEvents="none"
                />
              );
            })
          }

          {/* City labels */}
          {cityLabelPositions.map(({ city, x, y }) => {
            const val = getMetricValue(city, metric);
            return (
              <g key={city.name + '-label'} pointerEvents="none">
                <circle
                  cx={x} cy={y} r={dotR}
                  fill={getHeatColorSolid(val)}
                  stroke="white"
                  strokeWidth={dotR * 0.5}
                />
                <text
                  x={x} y={y - dotR - labelSize * 0.4}
                  textAnchor="middle"
                  fill="#1e293b"
                  fontSize={labelSize}
                  fontWeight={700}
                  style={{ textShadow: '0 0 3px white, 0 0 3px white, 0 0 3px white' }}
                >
                  {city.name.split(',')[0].trim()}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Zoom controls */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1">
          <button
            onClick={() => {
              setViewBoxState(prev => {
                const cur = prev || defaultVB;
                const factor = 0.75;
                const newW = Math.max(cur.w * factor, defaultVB.w * 0.05);
                const newH = Math.max(cur.h * factor, defaultVB.h * 0.05);
                const cx = cur.x + cur.w / 2;
                const cy = cur.y + cur.h / 2;
                return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH };
              });
            }}
            className="w-7 h-7 bg-white border border-gray-300 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 text-sm font-bold shadow-sm"
          >
            +
          </button>
          <button
            onClick={() => {
              setViewBoxState(prev => {
                if (!prev) return null;
                const factor = 1.35;
                const newW = prev.w * factor;
                const newH = prev.h * factor;
                if (newW >= defaultVB.w) return null;
                const cx = prev.x + prev.w / 2;
                const cy = prev.y + prev.h / 2;
                return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH };
              });
            }}
            className="w-7 h-7 bg-white border border-gray-300 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 text-sm font-bold shadow-sm"
          >
            -
          </button>
          <button
            onClick={resetView}
            className="w-7 h-7 bg-white border border-gray-300 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 shadow-sm"
            title="Reset view"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tooltip - fixed position, matching USHeatMap/HeatMapTooltip style */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none shadow-2xl min-w-[340px] bg-[#4A90D9]"
          style={{
            left: tooltip.position.x + 16,
            top: tooltip.position.y - 12,
            transform: tooltip.position.x > (typeof window !== 'undefined' ? window.innerWidth : 1200) - 380 ? 'translateX(-110%)' : undefined,
          }}
        >
          <div className="px-7 py-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/30">
              <p className="font-bold text-white text-lg">
                {tooltip.isCity ? tooltip.data.name : stateName}
              </p>
              <span className="text-base font-bold px-3 py-1 bg-white/20 text-white">
                {tooltip.data.score.toFixed(1)}/10
              </span>
            </div>

            <div className="space-y-3 text-base">
              <div className="flex justify-between gap-8">
                <span className="text-white/80">Projected Salary</span>
                <span className="font-semibold text-white">{fmtDollars(tooltip.data.salary)}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span className="text-white/80">Disposable Income</span>
                <span className="font-semibold text-white">{fmtDollars(tooltip.data.disposableIncome)}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span className="text-white/80">Affordable Home Size</span>
                <span className="font-semibold text-white">{fmtNum(tooltip.data.projectedSqFt)} sqft</span>
              </div>
              <div className="flex justify-between gap-8">
                <span className="text-white/80">Time to Own</span>
                <span className="font-semibold text-white">
                  {tooltip.data.yearsToMortgage > 0 && tooltip.data.yearsToMortgage < 99
                    ? `${tooltip.data.yearsToMortgage} years` : 'N/A'}
                </span>
              </div>
            </div>

            {tooltip.data.qolScore > 0 && (
              <div className="flex justify-between gap-8 mt-3 pt-3 border-t border-white/30">
                <span className="text-white/80">Quality of Life</span>
                <span className="font-semibold text-white">{tooltip.data.qolScore.toFixed(0)}/100</span>
              </div>
            )}

            {!tooltip.isCity && (
              <p className="text-base text-white/90 mt-3 pt-3 border-t border-white/30 font-medium">State average</p>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full" style={{ background: 'rgb(220, 60, 60)' }} />
          <span>Low</span>
          <span className="w-3 h-3 rounded-full ml-2" style={{ background: 'rgb(220, 220, 60)' }} />
          <span>Medium</span>
          <span className="w-3 h-3 rounded-full ml-2" style={{ background: 'rgb(40, 200, 60)' }} />
          <span>High</span>
          <span className="mx-2">|</span>
          <span className="inline-block w-3 h-3 border-2 border-gray-800 rounded-sm mr-0.5" />
          <span>City</span>
          <span className="inline-block w-3 h-3 border border-gray-400 rounded-sm ml-1.5 mr-0.5" />
          <span>County</span>
        </div>
        <span>Scroll to zoom &middot; Drag to pan &middot; Click a city</span>
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <>
        <div className="relative">
          <button
            onClick={() => setIsFullscreen(true)}
            className="absolute top-2 right-2 z-10 p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Full screen"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          </button>
        </div>

        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-carto-slate">
              {stateName} — {METRIC_OPTIONS.find(m => m.value === metric)?.label || 'Heat Map'}
              {userOccupation && <span className="text-sm font-normal text-gray-500 ml-2">({userOccupation})</span>}
            </h2>
            <button
              onClick={() => { setIsFullscreen(false); setViewBoxState(null); }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-hidden p-6">
            {mapContent}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsFullscreen(true)}
        className="absolute top-0 right-0 z-10 p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        title="Full screen"
      >
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
        </svg>
      </button>
      {mapContent}
    </div>
  );
}
