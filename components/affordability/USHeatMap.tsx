'use client';

import { useState, useMemo, useCallback } from 'react';
import { createRatingColorScale } from '@/lib/color-scale';
import statePathsData from '@/lib/us-state-paths.json';
import cityAreasData from '@/lib/us-city-areas.json';
import HeatMapTooltip from './HeatMapTooltip';
import type { LocationCalculation } from '@/hooks/useAffordabilityCalculations';
import { formatCurrency } from '@/lib/utils';

const GRAY = '#E5E7EB';
const WIDTH = 960;
const HEIGHT = 600;

const statePaths = statePathsData as { name: string; d: string }[];
const cityAreas = cityAreasData as unknown as Record<
  string,
  { center: [number, number]; d: string }
>;

interface USHeatMapProps {
  stateData: Map<string, LocationCalculation>;
  cityData: Map<string, LocationCalculation>;
  mode: 'value' | 'sqft';
  isLoading: boolean;
  progress: number;
  onLocationClick: (locationName: string) => void;
}

interface TooltipState {
  name: string;
  data: LocationCalculation;
  position: { x: number; y: number };
}

function getRatingColor(calc: LocationCalculation | undefined): string {
  if (!calc) return GRAY;
  const scale = createRatingColorScale();
  return scale(calc.numericScore);
}

export default function USHeatMap({
  stateData,
  cityData,
  mode,
  isLoading,
  progress,
  onLocationClick,
}: USHeatMapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const ratingScale = useMemo(() => createRatingColorScale(), []);

  const getFillColor = useCallback(
    (calc: LocationCalculation | undefined): string => {
      if (!calc) return GRAY;
      return ratingScale(calc.numericScore);
    },
    [ratingScale]
  );

  const handleMouseEnter = useCallback(
    (name: string, data: LocationCalculation, e: React.MouseEvent) => {
      setTooltip({ name, data, position: { x: e.clientX, y: e.clientY } });
    },
    []
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltip((prev) =>
      prev ? { ...prev, position: { x: e.clientX, y: e.clientY } } : null
    );
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  // Build city area shapes
  const cityShapes = useMemo(() => {
    const shapes: {
      name: string;
      d: string;
      center: [number, number];
      calc: LocationCalculation;
    }[] = [];
    cityData.forEach((calc, cityName) => {
      const area = cityAreas[cityName];
      if (area) {
        shapes.push({ name: cityName, d: area.d, center: area.center, calc });
      }
    });
    return shapes;
  }, [cityData]);

  // Compute insights from all location data
  const insights = useMemo(() => {
    const allLocations: LocationCalculation[] = [];
    stateData.forEach((calc) => allLocations.push(calc));
    cityData.forEach((calc) => allLocations.push(calc));

    if (allLocations.length === 0) return null;

    const viable = allLocations.filter((l) => l.isViable);
    const sorted = [...viable].sort((a, b) => b.numericScore - a.numericScore);

    const bestLocations = sorted.slice(0, 5);
    const worstViable = [...viable]
      .sort((a, b) => a.numericScore - b.numericScore)
      .slice(0, 5);
    const unviableCount = allLocations.filter((l) => !l.isViable).length;
    const avgScore =
      viable.length > 0
        ? viable.reduce((s, l) => s + l.numericScore, 0) / viable.length
        : 0;
    const avgHomeValue =
      viable.length > 0
        ? viable.reduce((s, l) => s + l.maxHomeValue, 0) / viable.length
        : 0;
    const highestValue = viable.length > 0
      ? viable.reduce((best, l) => (l.maxHomeValue > best.maxHomeValue ? l : best))
      : null;
    const largestHome = viable.length > 0
      ? viable.reduce((best, l) => (l.sqft > best.sqft ? l : best))
      : null;

    return {
      bestLocations,
      worstViable,
      unviableCount,
      totalLocations: allLocations.length,
      viableCount: viable.length,
      avgScore,
      avgHomeValue,
      highestValue,
      largestHome,
    };
  }, [stateData, cityData]);

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-md flex items-center gap-3">
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#4CAF50] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-600 font-medium">
            Computing {progress}%
          </span>
        </div>
      )}

      <div className="flex gap-4">
        {/* Map */}
        <div className="flex-1 min-w-0">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full h-auto"
            style={{ maxHeight: '70vh' }}
          >
            {/* State shapes */}
            {statePaths.map((state, i) => {
              const calc = stateData.get(state.name);
              const fill = getFillColor(calc);

              return (
                <path
                  key={i}
                  d={state.d}
                  fill={fill}
                  stroke="#FFFFFF"
                  strokeWidth={0.5}
                  cursor="pointer"
                  onClick={() => onLocationClick(state.name)}
                  onMouseEnter={(e) => {
                    if (calc) handleMouseEnter(state.name, calc, e);
                  }}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  className="transition-colors hover:stroke-[#333] hover:stroke-[1.5]"
                />
              );
            })}

            {/* City metro areas */}
            {cityShapes.map(({ name, d, calc }) => {
              const fill = getFillColor(calc);
              return (
                <path
                  key={name}
                  d={d}
                  fill={fill}
                  stroke="#333"
                  strokeWidth={0.8}
                  fillOpacity={0.85}
                  cursor="pointer"
                  onClick={() => onLocationClick(name)}
                  onMouseEnter={(e) => handleMouseEnter(name, calc, e)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  className="transition-colors hover:stroke-[#000] hover:stroke-[2]"
                />
              );
            })}

            {/* City labels */}
            {cityShapes.map(({ name, center }) => (
              <text
                key={`label-${name}`}
                x={center[0]}
                y={center[1]}
                textAnchor="middle"
                dominantBaseline="central"
                className="pointer-events-none select-none"
                fontSize={6}
                fontWeight={600}
                fill="#1a1a1a"
                stroke="#fff"
                strokeWidth={0.3}
                paintOrder="stroke"
              >
                {name.length > 12 ? name.slice(0, 11) + '…' : name}
              </text>
            ))}
          </svg>
        </div>

        {/* Legend / Key on the side */}
        <div className="w-48 flex-shrink-0 py-2">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">
            Affordability Rating
          </h4>

          {/* Vertical gradient bar */}
          <div className="flex gap-2 mb-4">
            <div className="flex flex-col justify-between text-[10px] text-gray-500 leading-tight py-0.5">
              <span>10</span>
              <span>8</span>
              <span>5</span>
              <span>2</span>
              <span>0</span>
            </div>
            <div
              className="w-5 rounded-sm flex-1"
              style={{
                background: `linear-gradient(to bottom, ${ratingScale(10)}, ${ratingScale(8)}, ${ratingScale(5)}, ${ratingScale(2)}, ${ratingScale(0)})`,
              }}
            />
            <div className="flex flex-col justify-between text-[10px] text-gray-600 leading-tight py-0.5">
              <span>Great</span>
              <span>Good</span>
              <span>Fair</span>
              <span>Poor</span>
              <span>Bad</span>
            </div>
          </div>

          {/* Legend items */}
          <div className="space-y-2 text-xs text-gray-600 border-t border-gray-200 pt-3">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-sm border border-gray-300"
                style={{ backgroundColor: ratingScale(8) }}
              />
              <span>Highly affordable</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-sm border border-gray-300"
                style={{ backgroundColor: ratingScale(5) }}
              />
              <span>Neutral / borderline</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-sm border border-gray-300"
                style={{ backgroundColor: ratingScale(2) }}
              />
              <span>Unaffordable</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm bg-gray-200 border border-gray-300" />
              <span>No data</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-4 h-4 rounded-full border-2 border-gray-600 bg-transparent" />
              <span>Metro area</span>
            </div>
          </div>
        </div>
      </div>

      {/* Insights section below the map */}
      {insights && !isLoading && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 px-2">
          {/* Most Affordable */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-green-800 mb-2">
              Most Affordable
            </h4>
            <ul className="space-y-1.5">
              {insights.bestLocations.map((loc) => (
                <li
                  key={loc.name}
                  className="flex justify-between items-center text-xs cursor-pointer hover:bg-green-100 rounded px-1 py-0.5"
                  onClick={() => onLocationClick(loc.name)}
                >
                  <span className="text-green-900 font-medium truncate mr-2">
                    {loc.name}
                  </span>
                  <span className="text-green-700 font-semibold whitespace-nowrap">
                    {loc.numericScore.toFixed(1)}/10
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Least Affordable (viable) */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-red-800 mb-2">
              Least Affordable
            </h4>
            <ul className="space-y-1.5">
              {insights.worstViable.map((loc) => (
                <li
                  key={loc.name}
                  className="flex justify-between items-center text-xs cursor-pointer hover:bg-red-100 rounded px-1 py-0.5"
                  onClick={() => onLocationClick(loc.name)}
                >
                  <span className="text-red-900 font-medium truncate mr-2">
                    {loc.name}
                  </span>
                  <span className="text-red-700 font-semibold whitespace-nowrap">
                    {loc.numericScore.toFixed(1)}/10
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Key Stats */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">
              Key Stats
            </h4>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Viable locations</span>
                <span className="font-semibold text-gray-900">
                  {insights.viableCount} / {insights.totalLocations}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Not viable</span>
                <span className="font-semibold text-red-600">
                  {insights.unviableCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Avg. rating</span>
                <span className="font-semibold text-gray-900">
                  {insights.avgScore.toFixed(1)}/10
                </span>
              </div>
              <div className="flex justify-between">
                <span>Avg. home value</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(insights.avgHomeValue)}
                </span>
              </div>
              {insights.highestValue && (
                <div className="flex justify-between">
                  <span>Highest value</span>
                  <span
                    className="font-semibold text-gray-900 truncate ml-2 cursor-pointer hover:text-blue-600"
                    title={insights.highestValue.name}
                    onClick={() => onLocationClick(insights.highestValue!.name)}
                  >
                    {formatCurrency(insights.highestValue.maxHomeValue)}
                  </span>
                </div>
              )}
              {insights.largestHome && (
                <div className="flex justify-between">
                  <span>Largest home</span>
                  <span
                    className="font-semibold text-gray-900 truncate ml-2 cursor-pointer hover:text-blue-600"
                    title={insights.largestHome.name}
                    onClick={() => onLocationClick(insights.largestHome!.name)}
                  >
                    {insights.largestHome.sqft.toLocaleString()} sqft
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tooltip && (
        <HeatMapTooltip
          locationName={tooltip.name}
          data={tooltip.data}
          mode={mode}
          position={tooltip.position}
        />
      )}
    </div>
  );
}
