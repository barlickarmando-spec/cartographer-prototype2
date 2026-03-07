'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { createRatingColorScale } from '@/lib/color-scale';
import statePathsData from '@/lib/us-state-paths.json';
import cityAreasData from '@/lib/us-city-areas.json';
import HeatMapTooltip from './HeatMapTooltip';
import type { LocationCalculation } from '@/hooks/useAffordabilityCalculations';
import { formatCurrency } from '@/lib/utils';

const GRAY = '#E5E7EB';
const WIDTH = 960;
const HEIGHT = 600;
const DEFAULT_VIEWBOX = `0 0 ${WIDTH} ${HEIGHT}`;

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

export default function USHeatMap({
  stateData,
  cityData,
  mode,
  isLoading,
  progress,
  onLocationClick,
}: USHeatMapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [zoomedState, setZoomedState] = useState<string | null>(null);
  const [viewBox, setViewBox] = useState(DEFAULT_VIEWBOX);
  const svgRef = useRef<SVGSVGElement>(null);

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

  const handleStateClick = useCallback(
    (stateName: string, e: React.MouseEvent<SVGPathElement>) => {
      if (zoomedState === stateName) {
        onLocationClick(stateName);
        return;
      }
      const pathEl = e.currentTarget;
      const bbox = pathEl.getBBox();
      const padding = 40;
      const x = bbox.x - padding;
      const y = bbox.y - padding;
      const w = bbox.width + padding * 2;
      const h = bbox.height + padding * 2;
      // Maintain aspect ratio
      const aspect = WIDTH / HEIGHT;
      const boxAspect = w / h;
      let vx = x, vy = y, vw = w, vh = h;
      if (boxAspect > aspect) {
        vh = vw / aspect;
        vy = y - (vh - h) / 2;
      } else {
        vw = vh * aspect;
        vx = x - (vw - w) / 2;
      }
      setViewBox(`${vx} ${vy} ${vw} ${vh}`);
      setZoomedState(stateName);
    },
    [zoomedState, onLocationClick]
  );

  const handleZoomOut = useCallback(() => {
    setViewBox(DEFAULT_VIEWBOX);
    setZoomedState(null);
  }, []);

  const cityShapes = useMemo(() => {
    const shapes: {
      name: string;
      d: string;
      calc: LocationCalculation;
    }[] = [];
    cityData.forEach((calc, cityName) => {
      const area = cityAreas[cityName];
      if (area) {
        shapes.push({ name: cityName, d: area.d, calc });
      }
    });
    return shapes;
  }, [cityData]);

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
    const highestValue =
      viable.length > 0
        ? viable.reduce((best, l) =>
            l.maxHomeValue > best.maxHomeValue ? l : best
          )
        : null;
    const largestHome =
      viable.length > 0
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

  // Build 5 legend swatches
  const legendSteps = [10, 7.5, 5, 2.5, 0];
  const legendLabels = ['Excellent', 'Good', 'Fair', 'Poor', 'Not viable'];

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

      <div className="flex items-start gap-3">
        {/* Map */}
        <div className="flex-1 min-w-0 relative">
          <svg
            ref={svgRef}
            viewBox={viewBox}
            className="w-full h-auto"
            style={{ maxHeight: '70vh', transition: 'viewBox 0.5s' }}
          >
            <style>{`svg { transition: all 0.5s ease-in-out; }`}</style>
            {statePaths.map((state, i) => {
              const calc = stateData.get(state.name);
              const fill = getFillColor(calc);
              const isZoomed = zoomedState === state.name;
              return (
                <path
                  key={i}
                  d={state.d}
                  fill={fill}
                  stroke={isZoomed ? '#4A90D9' : '#FFFFFF'}
                  strokeWidth={isZoomed ? 2 : 0.5}
                  cursor="pointer"
                  onClick={(e) => handleStateClick(state.name, e)}
                  onMouseEnter={(e) => {
                    if (calc) handleMouseEnter(state.name, calc, e);
                  }}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  className="transition-opacity hover:opacity-80"
                />
              );
            })}

            {cityShapes.map(({ name, d, calc }) => {
              const fill = getFillColor(calc);
              return (
                <path
                  key={name}
                  d={d}
                  fill={fill}
                  stroke="#444"
                  strokeWidth={1.2}
                  fillOpacity={0.92}
                  cursor="pointer"
                  onClick={() => onLocationClick(name)}
                  onMouseEnter={(e) => handleMouseEnter(name, calc, e)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  className="transition-opacity hover:opacity-75"
                />
              );
            })}
          </svg>

          {zoomedState && (
            <button
              onClick={handleZoomOut}
              className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#4A90D9] text-[#4A90D9] rounded-lg shadow-md hover:bg-[#4A90D9] hover:text-white transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
              Zoom Out
            </button>
          )}
        </div>

        {/* Legend */}
        <div className="w-40 flex-shrink-0 pt-4">
          <p className="text-xs font-semibold text-gray-700 mb-3">
            Affordability Rating
          </p>
          <div className="space-y-1.5">
            {legendSteps.map((score, i) => (
              <div key={score} className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded"
                  style={{
                    backgroundColor:
                      score === 0 ? GRAY : ratingScale(score),
                  }}
                />
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-medium text-gray-700">
                    {legendLabels[i]}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {score === 0 ? '0' : score.toString()}/10
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <path
                  d="M10,2 Q15,3 17,10 Q15,17 10,18 Q5,17 3,10 Q5,3 10,2Z"
                  fill="none"
                  stroke="#444"
                  strokeWidth="1.2"
                />
              </svg>
              <span className="text-xs text-gray-600">
                Metro area
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      {insights && !isLoading && (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Most Affordable */}
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
              Most Affordable
            </h4>
            <ul className="space-y-1.5">
              {insights.bestLocations.map((loc, i) => (
                <li
                  key={loc.name}
                  className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 rounded px-1.5 py-1 -mx-1.5"
                  onClick={() => onLocationClick(loc.name)}
                >
                  <span className="text-gray-400 text-[10px] w-3">{i + 1}</span>
                  <span className="text-gray-800 font-medium truncate flex-1">
                    {loc.name}
                  </span>
                  <span
                    className="font-semibold text-[11px] px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: ratingScale(loc.numericScore) + '22',
                      color: ratingScale(loc.numericScore),
                    }}
                  >
                    {loc.numericScore.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Least Affordable */}
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
              Least Affordable
            </h4>
            <ul className="space-y-1.5">
              {insights.worstViable.map((loc, i) => (
                <li
                  key={loc.name}
                  className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 rounded px-1.5 py-1 -mx-1.5"
                  onClick={() => onLocationClick(loc.name)}
                >
                  <span className="text-gray-400 text-[10px] w-3">{i + 1}</span>
                  <span className="text-gray-800 font-medium truncate flex-1">
                    {loc.name}
                  </span>
                  <span
                    className="font-semibold text-[11px] px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: ratingScale(loc.numericScore) + '22',
                      color: ratingScale(loc.numericScore),
                    }}
                  >
                    {loc.numericScore.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Key Stats */}
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
              Overview
            </h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Viable</span>
                <span className="font-semibold text-gray-800">
                  {insights.viableCount}/{insights.totalLocations}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Not viable</span>
                <span className="font-semibold text-gray-800">
                  {insights.unviableCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Avg. rating</span>
                <span className="font-semibold text-gray-800">
                  {insights.avgScore.toFixed(1)}/10
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Avg. home value</span>
                <span className="font-semibold text-gray-800">
                  {formatCurrency(insights.avgHomeValue)}
                </span>
              </div>
              {insights.highestValue && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Top value</span>
                  <span
                    className="font-semibold text-gray-800 cursor-pointer hover:text-blue-600"
                    onClick={() => onLocationClick(insights.highestValue!.name)}
                  >
                    {formatCurrency(insights.highestValue.maxHomeValue)}
                  </span>
                </div>
              )}
              {insights.largestHome && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Largest home</span>
                  <span
                    className="font-semibold text-gray-800 cursor-pointer hover:text-blue-600"
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
