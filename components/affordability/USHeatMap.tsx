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

    // Separate top states and top cities
    const stateNames = new Set<string>();
    stateData.forEach((_calc, name) => stateNames.add(name));

    const viableStates = viable.filter((l) => stateNames.has(l.name));
    const viableCities = viable.filter((l) => !stateNames.has(l.name));
    const bestStates = [...viableStates].sort((a, b) => b.numericScore - a.numericScore).slice(0, 3);
    const bestCities = [...viableCities].sort((a, b) => b.numericScore - a.numericScore).slice(0, 3);

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
      bestStates,
      bestCities,
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
            style={{ maxHeight: '85vh', transition: 'viewBox 0.5s' }}
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
                  strokeWidth={isZoomed ? 2 : 0.75}
                  strokeLinejoin="round"
                  strokeLinecap="round"
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
                  strokeWidth={1}
                  strokeLinejoin="round"
                  strokeLinecap="round"
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

        {/* Legend + Insights */}
        <div className="w-56 flex-shrink-0 pt-4 space-y-5">
          {/* Legend */}
          <div>
            <p className="text-sm font-semibold text-[#2C3E50] mb-3">
              Affordability Rating
            </p>
            <div className="space-y-2">
              {legendSteps.map((score, i) => (
                <div key={score} className="flex items-center gap-2.5">
                  <div
                    className="w-5 h-5 rounded"
                    style={{
                      backgroundColor:
                        score === 0 ? GRAY : ratingScale(score),
                    }}
                  />
                  <span className="text-sm text-[#6B7280]">
                    {legendLabels[i]}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 20 20">
                  <path
                    d="M10,2 Q15,3 17,10 Q15,17 10,18 Q5,17 3,10 Q5,3 10,2Z"
                    fill="none"
                    stroke="#444"
                    strokeWidth="1.2"
                  />
                </svg>
                <span className="text-sm text-[#6B7280]">Metro area</span>
              </div>
            </div>
          </div>

          {/* Compact Insights */}
          {insights && !isLoading && (
            <>
              {/* Top States */}
              {insights.bestStates.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#4A90D9] mb-2">Top States</p>
                  <div className="space-y-1.5">
                    {insights.bestStates.map((loc) => (
                      <div
                        key={loc.name}
                        className="flex items-center justify-between text-xs cursor-pointer hover:bg-[#F0F7FF] rounded px-1.5 py-1 -mx-1.5 transition-colors"
                        onClick={() => onLocationClick(loc.name)}
                      >
                        <span className="text-[#2C3E50] font-medium truncate flex-1 mr-2">
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
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Cities */}
              {insights.bestCities.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#4A90D9] mb-2">Top Cities</p>
                  <div className="space-y-1.5">
                    {insights.bestCities.map((loc) => (
                      <div
                        key={loc.name}
                        className="flex items-center justify-between text-xs cursor-pointer hover:bg-[#F0F7FF] rounded px-1.5 py-1 -mx-1.5 transition-colors"
                        onClick={() => onLocationClick(loc.name)}
                      >
                        <span className="text-[#2C3E50] font-medium truncate flex-1 mr-2">
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
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div>
                <p className="text-xs font-semibold text-[#4A90D9] mb-2">Overview</p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Viable</span>
                    <span className="font-semibold text-[#2C3E50]">
                      {insights.viableCount}/{insights.totalLocations}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Avg. rating</span>
                    <span className="font-semibold text-[#2C3E50]">
                      {insights.avgScore.toFixed(1)}/10
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Avg. value</span>
                    <span className="font-semibold text-[#2C3E50]">
                      {formatCurrency(insights.avgHomeValue)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

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
