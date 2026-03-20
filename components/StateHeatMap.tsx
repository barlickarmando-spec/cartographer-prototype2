'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { CITY_COORDINATES } from '@/lib/us-city-coordinates';
import { cn } from '@/lib/utils';
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
  stateData?: CityHeatData | null; // state-level fallback data for non-city counties
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
  // Smooth gradient: red -> yellow -> green
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

// Parse SVG path d attribute to compute bounding box
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

export default function StateHeatMap({ stateName, stateAbbrev, cities, stateData, userOccupation, onCityClick }: StateHeatMapProps) {
  const [metric, setMetric] = useState<HeatMapMetric>('most-recommended');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredCounty, setHoveredCounty] = useState<{ data: CityHeatData; isCity: boolean; countyFips: string } | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  // Zoom/pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const svgContainerRef = useRef<HTMLDivElement>(null);

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

  // Compute bounding box of all state counties
  const viewBox = useMemo(() => {
    if (stateCounties.length === 0) return '0 0 960 600';
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const county of stateCounties) {
      const bb = pathBBox(county.d);
      if (bb.minX < minX) minX = bb.minX;
      if (bb.minY < minY) minY = bb.minY;
      if (bb.maxX > maxX) maxX = bb.maxX;
      if (bb.maxY > maxY) maxY = bb.maxY;
    }
    const pad = Math.max((maxX - minX), (maxY - minY)) * 0.05;
    return `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
  }, [stateCounties]);

  // Map city coordinates to Albers projection positions (for labels)
  // The county paths are already in Albers projection (960x600), so we need city positions in same space
  const cityLabelPositions = useMemo(() => {
    const positions: { city: CityHeatData; x: number; y: number }[] = [];
    // For each city, find its county and compute centroid from the county path
    for (const city of cities) {
      const baseName = city.name.split(',')[0].trim();
      const countyMatch = stateCounties.find(c => c.cityName === baseName);
      if (countyMatch) {
        const bb = pathBBox(countyMatch.d);
        positions.push({
          city,
          x: (bb.minX + bb.maxX) / 2,
          y: (bb.minY + bb.maxY) / 2,
        });
      } else {
        // Fallback: use raw coordinates projected roughly
        const coords = CITY_COORDINATES[baseName];
        if (coords) {
          // rough mercator-like projection - won't be perfect but ok as fallback
          positions.push({
            city,
            x: (coords[0] + 130) * 7,
            y: (52 - coords[1]) * 8.5,
          });
        }
      }
    }
    return positions;
  }, [cities, stateCounties]);

  // Zoom handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom(z => Math.max(0.5, Math.min(8, z + delta * z)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
    }
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Reset zoom
  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Handle county hover
  const handleCountyHover = useCallback((e: React.MouseEvent, county: CountyPath) => {
    if (isPanning) return;
    const rect = svgContainerRef.current?.getBoundingClientRect();
    if (rect) {
      setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    const cityData = county.cityName ? cityDataMap[county.cityName] : null;
    if (cityData) {
      setHoveredCounty({ data: cityData, isCity: true, countyFips: county.fips });
    } else if (stateData) {
      setHoveredCounty({ data: stateData, isCity: false, countyFips: county.fips });
    }
  }, [cityDataMap, stateData, isPanning]);

  const handleCountyMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) return;
    const rect = svgContainerRef.current?.getBoundingClientRect();
    if (rect) {
      setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }, [isPanning]);

  // Reset zoom/pan when switching fullscreen
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [isFullscreen]);

  if (stateCounties.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        No map data available for {stateName}.
      </div>
    );
  }

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
        ref={svgContainerRef}
        className={cn(
          'relative bg-gray-50 rounded-xl overflow-hidden border border-gray-200 select-none',
          isFullscreen ? 'flex-1' : '',
          isPanning ? 'cursor-grabbing' : 'cursor-grab'
        )}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setIsPanning(false); setHoveredCounty(null); }}
      >
        <svg
          viewBox={viewBox}
          className="w-full"
          style={{ minHeight: isFullscreen ? '60vh' : '320px' }}
        >
          <g transform={`translate(${pan.x / (isFullscreen ? 1 : 2)}, ${pan.y / (isFullscreen ? 1 : 2)}) scale(${zoom})`}
             style={{ transformOrigin: 'center center' }}>
            {/* County shapes */}
            {stateCounties.map(county => {
              const cityData = county.cityName ? cityDataMap[county.cityName] : null;
              const dataForColor = cityData || stateData;
              const val = dataForColor ? getMetricValue(dataForColor, metric) : 0.3;
              const isCity = !!cityData;
              const fillColor = dataForColor ? getHeatColor(val, isCity) : 'rgba(200, 200, 200, 0.3)';
              const isHovered = hoveredCounty?.countyFips === county.fips;

              return (
                <path
                  key={county.fips}
                  d={county.d}
                  fill={fillColor}
                  stroke={isCity ? '#555' : '#999'}
                  strokeWidth={isCity ? 1.2 : 0.5}
                  opacity={isHovered ? 1 : undefined}
                  className="transition-opacity duration-100"
                  style={isHovered ? { filter: 'brightness(1.15)' } : undefined}
                  onMouseEnter={(e) => handleCountyHover(e, county)}
                  onMouseMove={handleCountyMouseMove}
                  onMouseLeave={() => setHoveredCounty(null)}
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
              .filter(c => c.cityName && cityDataMap[c.cityName])
              .map(county => (
                <path
                  key={county.fips + '-outline'}
                  d={county.d}
                  fill="none"
                  stroke="#333"
                  strokeWidth={2}
                  pointerEvents="none"
                />
              ))
            }

            {/* City labels */}
            {cityLabelPositions.map(({ city, x, y }) => {
              const val = getMetricValue(city, metric);
              const textSize = zoom > 2 ? 4 : zoom > 1.5 ? 5 : 6;
              const dotR = zoom > 2 ? 2 : 3;
              return (
                <g key={city.name + '-label'} pointerEvents="none">
                  <circle
                    cx={x}
                    cy={y}
                    r={dotR}
                    fill={getHeatColorSolid(val)}
                    stroke="white"
                    strokeWidth={1.5}
                  />
                  <text
                    x={x}
                    y={y - dotR - 3}
                    textAnchor="middle"
                    fill="#1e293b"
                    fontSize={textSize}
                    fontWeight={700}
                    style={{ textShadow: '0 0 3px white, 0 0 3px white, 0 0 3px white' }}
                  >
                    {city.name.split(',')[0].trim()}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Zoom controls */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1">
          <button
            onClick={() => setZoom(z => Math.min(8, z * 1.3))}
            className="w-7 h-7 bg-white border border-gray-300 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 text-sm font-bold shadow-sm"
          >
            +
          </button>
          <button
            onClick={() => setZoom(z => Math.max(0.5, z / 1.3))}
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

        {/* Hover tooltip */}
        {hoveredCounty && (
          <div
            className="absolute z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-3 pointer-events-none"
            style={{
              left: Math.min(hoverPos.x + 12, (isFullscreen ? window.innerWidth - 280 : 320)),
              top: Math.max(hoverPos.y - 10, 10),
              minWidth: 210,
            }}
          >
            <p className="font-semibold text-carto-slate text-sm">
              {hoveredCounty.isCity ? hoveredCounty.data.name : stateName}
            </p>
            {!hoveredCounty.isCity && (
              <p className="text-[10px] text-gray-400 mb-1">State average</p>
            )}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1.5 text-xs">
              <span className="text-gray-500">Viability</span>
              <span className="font-medium text-right">{hoveredCounty.data.score.toFixed(1)}/10</span>
              <span className="text-gray-500">Salary</span>
              <span className="font-medium text-right">{fmtDollars(hoveredCounty.data.salary)}</span>
              <span className="text-gray-500">DI</span>
              <span className="font-medium text-right">{fmtDollars(hoveredCounty.data.disposableIncome)}</span>
              <span className="text-gray-500">Home Size</span>
              <span className="font-medium text-right">{fmtNum(hoveredCounty.data.projectedSqFt)} sqft</span>
              <span className="text-gray-500">Years to Home</span>
              <span className="font-medium text-right">
                {hoveredCounty.data.yearsToMortgage > 0 && hoveredCounty.data.yearsToMortgage < 99
                  ? `${hoveredCounty.data.yearsToMortgage} yrs` : 'N/A'}
              </span>
              {hoveredCounty.data.qolScore > 0 && (
                <>
                  <span className="text-gray-500">QoL</span>
                  <span className="font-medium text-right">{hoveredCounty.data.qolScore.toFixed(0)}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend + instructions */}
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

  // Fullscreen modal
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
              onClick={() => setIsFullscreen(false)}
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
