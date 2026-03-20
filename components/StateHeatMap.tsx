'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { interpolateRatingColor } from '@/lib/color-scale';
import { resolveCountyCityName } from '@/lib/city-name-aliases';
import countyPathsRaw from '@/lib/us-county-paths.json';
import statePathsRaw from '@/lib/us-atlas-state-paths.json';
import nationPathRaw from '@/lib/us-nation-path.json';

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
const statePaths = statePathsRaw as { fips: string; name: string; d: string }[];
const nationPath = nationPathRaw as { d: string };

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
  const hex = interpolateRatingColor(value);
  // Convert hex to rgba for alpha support
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const alpha = isCity ? 0.85 : 0.55;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

  // ViewBox-based zoom/pan
  const svgRef = useRef<SVGSVGElement>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, vbX: 0, vbY: 0 });
  const [viewBoxState, setViewBoxState] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // All counties for the focused state
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

  // Compute zoomed-in bounding box from the focused state's counties
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
    const pad = Math.max(w, h) * 0.15; // extra padding to show surrounding context
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
      }
    }
    return positions;
  }, [cities, stateCounties]);

  // Zoom via viewBox
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;

    const direction = e.deltaY > 0 ? 1 : -1;
    const factor = 1 + direction * 0.12;

    setViewBoxState(prev => {
      const cur = prev || defaultVB;
      const newW = Math.max(cur.w * factor, defaultVB.w * 0.05);
      const newH = Math.max(cur.h * factor, defaultVB.h * 0.05);
      if (newW >= defaultVB.w && newH >= defaultVB.h) {
        return null;
      }
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
    if (tooltip) {
      setTooltip(prev => prev ? { ...prev, position: { x: e.clientX, y: e.clientY } } : null);
    }

    if (!isPanningRef.current) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
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
  const zoomRatio = defaultVB.w / vb.w;
  const labelSize = Math.max(3, 6 / Math.max(zoomRatio, 1));

  const metricIcons: Record<HeatMapMetric, React.ReactNode> = {
    'most-recommended': (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
    'financial-stability': (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    'projected-home-size': (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
    'projected-salary': (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    'job-opportunity': (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
    ),
    'quality-of-life': (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
      </svg>
    ),
  };

  const mapContent = (
    <div className={cn('relative', isFullscreen && 'h-full flex flex-col')}>
      {/* Centered title */}
      <h3 className="text-center font-heading text-xl font-bold text-carto-blue mb-4">
        Viability Across {stateName}
      </h3>

      <div className="flex gap-4">
        {/* Left sidebar: metric filters + legend */}
        <div className="flex-shrink-0 w-[170px] space-y-2">
          {METRIC_OPTIONS.map(opt => {
            const isActive = metric === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setMetric(opt.value)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all text-left',
                  isActive
                    ? 'bg-carto-blue text-white shadow-md shadow-carto-blue/25'
                    : 'bg-carto-blue-sky text-carto-slate hover:bg-carto-blue-pale/60 hover:text-carto-blue border border-carto-blue-pale/40'
                )}
              >
                <span className={cn('flex-shrink-0', isActive ? 'text-white' : 'text-carto-blue')}>
                  {metricIcons[opt.value]}
                </span>
                {opt.label}
              </button>
            );
          })}

          {/* Legend */}
          <div className="pt-3 mt-2 border-t border-carto-blue-pale/40">
            <p className="text-xs font-semibold text-carto-steel mb-2 uppercase tracking-wide">Legend</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ background: 'rgb(210, 75, 80)' }} />
                <span className="text-xs font-medium text-carto-slate">Low</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ background: 'rgb(250, 220, 70)' }} />
                <span className="text-xs font-medium text-carto-slate">Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ background: 'rgb(45, 155, 70)' }} />
                <span className="text-xs font-medium text-carto-slate">High</span>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3.5 h-3.5 border-2 border-gray-800 rounded-sm" />
                <span className="text-xs font-medium text-carto-slate">City</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3.5 h-3.5 border border-gray-400 rounded-sm" />
                <span className="text-xs font-medium text-carto-slate">County</span>
              </div>
            </div>
          </div>
        </div>

        {/* Map area */}
        <div className="flex-1 min-w-0">
          {/* SVG Map — full US with focused state zoomed in */}
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
          <defs>
            <filter id="blur-bg">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>

          {/* Background: all non-focused states — blurred and dimmed */}
          <g filter="url(#blur-bg)" opacity={0.35}>
            {statePaths.map((state, i) => (
              <path
                key={`bg-state-${i}`}
                d={state.d}
                fill={state.name === stateName ? 'none' : '#d1d5db'}
                stroke="#FFFFFF"
                strokeWidth={0.5}
                pointerEvents="none"
              />
            ))}
          </g>

          {/* Focused state: county shapes with heat colors */}
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
                stroke={isCity ? '#333' : '#999'}
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
                  stroke="#1a1a1a"
                  strokeWidth={outlineW}
                  pointerEvents="none"
                />
              );
            })
          }

          {/* Nation outline */}
          <path
            d={nationPath.d}
            fill="none"
            stroke="#000000"
            strokeWidth={1}
            strokeLinejoin="round"
            pointerEvents="none"
            opacity={0.3}
          />

          {/* Focused state border highlight */}
          {statePaths.filter(s => s.name === stateName).map((state, i) => (
            <path
              key={`focus-border-${i}`}
              d={state.d}
              fill="none"
              stroke="#4A90D9"
              strokeWidth={Math.max(1.5, 2.5 / Math.max(zoomRatio, 1))}
              strokeLinejoin="round"
              pointerEvents="none"
            />
          ))}

          {/* City labels — text only, no circles */}
          {cityLabelPositions.map(({ city, x, y }) => (
            <text
              key={city.name + '-label'}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#1e293b"
              fontSize={labelSize}
              fontWeight={700}
              pointerEvents="none"
              style={{ textShadow: '0 0 3px white, 0 0 3px white, 0 0 3px white' }}
            >
              {city.name.split(',')[0].trim()}
            </text>
          ))}
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

      {/* Tooltip */}
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

          {/* Map interaction hint */}
          <p className="text-center text-xs text-carto-steel mt-2">Scroll to zoom · Drag to pan · Click a city</p>
        </div>
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
            <h2 className="text-xl font-bold font-heading text-carto-blue">
              Viability Across {stateName}
              {userOccupation && <span className="text-sm font-normal text-carto-steel ml-2">({userOccupation})</span>}
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
