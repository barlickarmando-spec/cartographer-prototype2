'use client';

import { useState, useMemo, useCallback } from 'react';
import { createRatingColorScale } from '@/lib/color-scale';
import statePathsData from '@/lib/us-atlas-state-paths.json';
import countyPathsData from '@/lib/us-county-paths.json';
import nationPathData from '@/lib/us-nation-path.json';
import HeatMapTooltip from './HeatMapTooltip';
import type { LocationCalculation } from '@/hooks/useAffordabilityCalculations';
import { formatCurrency } from '@/lib/utils';

const GRAY = '#E5E7EB';
const WIDTH = 960;
const HEIGHT = 600;
const DEFAULT_VIEWBOX = `0 0 ${WIDTH} ${HEIGHT}`;

const statePaths = statePathsData as { fips: string; name: string; d: string }[];
const countyPaths = countyPathsData as { fips: string; stateAbbrev: string; cityName: string; d: string }[];
const nationPath = nationPathData as { d: string };

const STATE_NAME_TO_ABBREV: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
  'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
  'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
  'District of Columbia': 'DC',
};

interface USHeatMapProps {
  stateData: Map<string, LocationCalculation>;
  cityData: Map<string, LocationCalculation>;
  mode: 'value' | 'sqft';
  isLoading: boolean;
  progress: number;
  onLocationClick: (locationName: string) => void;
  onZoomedStateChange?: (stateName: string | null) => void;
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
  onZoomedStateChange,
}: USHeatMapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [zoomedState, setZoomedState] = useState<string | null>(null);
  const [viewBox, setViewBox] = useState(DEFAULT_VIEWBOX);
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
      e.stopPropagation();
      if (zoomedState) {
        // Already zoomed — clicking navigates to location
        onLocationClick(stateName);
        return;
      }
      const pathEl = e.currentTarget;
      const bbox = pathEl.getBBox();
      const padding = 20;
      const x = bbox.x - padding;
      const y = bbox.y - padding;
      const w = bbox.width + padding * 2;
      const h = bbox.height + padding * 2;
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
      onZoomedStateChange?.(stateName);
      setTooltip(null);
    },
    [zoomedState, onLocationClick, onZoomedStateChange]
  );

  const handleZoomOut = useCallback(() => {
    setViewBox(DEFAULT_VIEWBOX);
    setZoomedState(null);
    onZoomedStateChange?.(null);
    setTooltip(null);
  }, [onZoomedStateChange]);

  const insights = useMemo(() => {
    const allLocations: LocationCalculation[] = [];
    stateData.forEach((calc) => allLocations.push(calc));
    cityData.forEach((calc) => allLocations.push(calc));

    if (allLocations.length === 0) return null;

    const viable = allLocations.filter((l) => l.isViable);

    const stateNames = new Set<string>();
    stateData.forEach((_calc, name) => stateNames.add(name));

    const viableStates = viable.filter((l) => stateNames.has(l.name));
    const viableCities = viable.filter((l) => !stateNames.has(l.name));
    const bestStates = [...viableStates].sort((a, b) => b.numericScore - a.numericScore).slice(0, 3);
    const bestCities = [...viableCities].sort((a, b) => b.numericScore - a.numericScore).slice(0, 3);

    const avgScore =
      viable.length > 0
        ? viable.reduce((s, l) => s + l.numericScore, 0) / viable.length
        : 0;
    const avgHomeValue =
      viable.length > 0
        ? viable.reduce((s, l) => s + l.maxHomeValue, 0) / viable.length
        : 0;

    return {
      bestStates,
      bestCities,
      totalLocations: allLocations.length,
      viableCount: viable.length,
      avgScore,
      avgHomeValue,
    };
  }, [stateData, cityData]);

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
          {/* Back button overlay when zoomed */}
          {zoomedState && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-sm font-medium text-[#4A90D9]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <span className="px-3 py-1.5 bg-white/95 border border-gray-200 rounded-lg shadow-sm text-sm font-bold text-[#2C3E50]">
                {zoomedState}
              </span>
            </div>
          )}

          <svg
            viewBox={viewBox}
            className="w-full h-auto transition-all duration-500 ease-in-out"
            style={{ maxHeight: '85vh' }}
          >
            {/* State fills as background */}
            {statePaths.map((state, i) => {
              const calc = stateData.get(state.name);
              return (
                <path
                  key={`state-fill-${i}`}
                  d={state.d}
                  fill={getFillColor(calc)}
                  stroke="#FFFFFF"
                  strokeWidth={0.75}
                  strokeLinejoin="round"
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

            {/* City-county overlays with black borders */}
            {countyPaths.map((county) => {
              const cityCalc = cityData.get(county.cityName);
              const fill = getFillColor(cityCalc);
              return (
                <path
                  key={county.fips}
                  d={county.d}
                  fill={fill}
                  stroke="#000000"
                  strokeWidth={1}
                  strokeLinejoin="round"
                  cursor="pointer"
                  onClick={() => onLocationClick(county.cityName)}
                  onMouseEnter={(e) => {
                    if (cityCalc) handleMouseEnter(county.cityName, cityCalc, e);
                  }}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  className="transition-opacity hover:opacity-80"
                />
              );
            })}

            {/* Nation outline — black border around entire country */}
            <path
              d={nationPath.d}
              fill="none"
              stroke="#000000"
              strokeWidth={1.5}
              strokeLinejoin="round"
              pointerEvents="none"
            />

            {/* Zoomed state highlight */}
            {zoomedState && statePaths.filter(s => s.name === zoomedState).map((state, i) => (
              <path
                key={`zoom-highlight-${i}`}
                d={state.d}
                fill="none"
                stroke="#4A90D9"
                strokeWidth={2.5}
                strokeLinejoin="round"
                pointerEvents="none"
              />
            ))}
          </svg>
        </div>

        {/* Legend + Insights */}
        <div className="w-56 flex-shrink-0 pt-4 space-y-5">
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
          </div>

          {insights && !isLoading && (
            <>
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

      {/* Tooltip */}
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
