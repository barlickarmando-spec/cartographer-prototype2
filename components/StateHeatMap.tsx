'use client';

import { useState, useMemo, useCallback } from 'react';
import { CITY_COORDINATES } from '@/lib/us-city-coordinates';
import { cn } from '@/lib/utils';

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
  cities: CityHeatData[];
  userOccupation?: string;
  onCityClick?: (cityName: string) => void;
}

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
      // Combined formula: viability 40% + QoL 25% + financial stability 20% + home size 15%
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
      // Use salary rank as proxy for job opportunity
      return city.salary > 0 ? Math.min(city.salary, 100000) / 100000 : 0;
    case 'quality-of-life':
      return city.qolScore / 100;
    default:
      return city.score / 10;
  }
}

function getHeatColor(value: number): string {
  // Gradient: red (0) -> yellow (0.5) -> green (1.0)
  if (value >= 0.7) return `rgba(34, 197, 94, ${0.5 + value * 0.5})`;  // green
  if (value >= 0.4) return `rgba(234, 179, 8, ${0.5 + value * 0.5})`;  // yellow
  return `rgba(239, 68, 68, ${0.4 + value * 0.6})`;                     // red
}

function fmtNum(n: number): string { return Math.round(n).toLocaleString(); }
function fmtDollars(n: number): string { return '$' + fmtNum(n); }

export default function StateHeatMap({ stateName, cities, userOccupation, onCityClick }: StateHeatMapProps) {
  const [metric, setMetric] = useState<HeatMapMetric>('most-recommended');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredCity, setHoveredCity] = useState<CityHeatData | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  // Get coordinates for cities in this state and compute bounds
  const cityPositions = useMemo(() => {
    const positions: { city: CityHeatData; lng: number; lat: number }[] = [];
    for (const city of cities) {
      // Try to find coordinates by city name (strip state suffix)
      const baseName = city.name.split(',')[0].trim();
      const coords = CITY_COORDINATES[baseName];
      if (coords) {
        positions.push({ city, lng: coords[0], lat: coords[1] });
      }
    }
    return positions;
  }, [cities]);

  // Compute SVG viewport from city positions
  const bounds = useMemo(() => {
    if (cityPositions.length === 0) return { minLng: -100, maxLng: -90, minLat: 30, maxLat: 40 };
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const { lng, lat } of cityPositions) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    // Add padding
    const padLng = Math.max((maxLng - minLng) * 0.15, 0.5);
    const padLat = Math.max((maxLat - minLat) * 0.15, 0.3);
    return { minLng: minLng - padLng, maxLng: maxLng + padLng, minLat: minLat - padLat, maxLat: maxLat + padLat };
  }, [cityPositions]);

  const toSvg = useCallback((lng: number, lat: number) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 600;
    const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * 400; // flip Y
    return { x, y };
  }, [bounds]);

  const handleMouseMove = useCallback((e: React.MouseEvent, city: CityHeatData) => {
    const rect = e.currentTarget.closest('svg')?.getBoundingClientRect();
    if (rect) {
      setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    setHoveredCity(city);
  }, []);

  if (cityPositions.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        No city data available for heat map visualization.
      </div>
    );
  }

  const mapContent = (
    <div className={cn('relative', isFullscreen && 'h-full')}>
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

      {/* SVG Heat Map */}
      <div className={cn('relative bg-gray-50 rounded-xl overflow-hidden border border-gray-200', isFullscreen ? 'flex-1' : '')}>
        <svg
          viewBox="0 0 600 400"
          className="w-full"
          style={{ minHeight: isFullscreen ? '60vh' : '280px' }}
        >
          {/* Background */}
          <rect x="0" y="0" width="600" height="400" fill="#F8FAFB" />

          {/* Heat circles (larger, semi-transparent) */}
          {cityPositions.map(({ city, lng, lat }) => {
            const { x, y } = toSvg(lng, lat);
            const val = getMetricValue(city, metric);
            const color = getHeatColor(val);
            return (
              <circle
                key={city.name + '-heat'}
                cx={x} cy={y}
                r={isFullscreen ? 35 : 25}
                fill={color}
                opacity={0.4}
              />
            );
          })}

          {/* City dots */}
          {cityPositions.map(({ city, lng, lat }) => {
            const { x, y } = toSvg(lng, lat);
            const val = getMetricValue(city, metric);
            const color = getHeatColor(val);
            return (
              <g
                key={city.name}
                className="cursor-pointer"
                onClick={() => onCityClick?.(city.displayName)}
                onMouseMove={e => handleMouseMove(e, city)}
                onMouseLeave={() => setHoveredCity(null)}
              >
                <circle cx={x} cy={y} r={isFullscreen ? 8 : 6} fill={color} stroke="white" strokeWidth={2} />
                <text
                  x={x}
                  y={y - (isFullscreen ? 12 : 9)}
                  textAnchor="middle"
                  className="pointer-events-none"
                  fill="#334155"
                  fontSize={isFullscreen ? 11 : 9}
                  fontWeight={600}
                >
                  {city.name.split(',')[0].trim()}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hoveredCity && (
          <div
            className="absolute z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-3 pointer-events-none"
            style={{
              left: Math.min(hoverPos.x + 12, (isFullscreen ? window.innerWidth - 260 : 340)),
              top: hoverPos.y - 10,
              minWidth: 200,
            }}
          >
            <p className="font-semibold text-carto-slate text-sm">{hoveredCity.name}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
              <span className="text-gray-500">Viability</span>
              <span className="font-medium text-right">{hoveredCity.score.toFixed(1)}/10</span>
              <span className="text-gray-500">Salary</span>
              <span className="font-medium text-right">{fmtDollars(hoveredCity.salary)}</span>
              <span className="text-gray-500">DI</span>
              <span className="font-medium text-right">{fmtDollars(hoveredCity.disposableIncome)}</span>
              <span className="text-gray-500">Home Size</span>
              <span className="font-medium text-right">{fmtNum(hoveredCity.projectedSqFt)} sqft</span>
              <span className="text-gray-500">Years to Home</span>
              <span className="font-medium text-right">{hoveredCity.yearsToMortgage > 0 && hoveredCity.yearsToMortgage < 99 ? `${hoveredCity.yearsToMortgage} yrs` : 'N/A'}</span>
              {hoveredCity.qolScore > 0 && (
                <>
                  <span className="text-gray-500">QoL</span>
                  <span className="font-medium text-right">{hoveredCity.qolScore.toFixed(0)}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(239, 68, 68, 0.7)' }} />
          <span>Low</span>
          <span className="w-3 h-3 rounded-full ml-2" style={{ background: 'rgba(234, 179, 8, 0.7)' }} />
          <span>Medium</span>
          <span className="w-3 h-3 rounded-full ml-2" style={{ background: 'rgba(34, 197, 94, 0.7)' }} />
          <span>High</span>
        </div>
        <span>Click a city to view details</span>
      </div>
    </div>
  );

  // Fullscreen modal
  if (isFullscreen) {
    return (
      <>
        {/* Trigger button placeholder */}
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

        {/* Fullscreen overlay */}
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
          <div className="flex-1 overflow-auto p-6">
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
