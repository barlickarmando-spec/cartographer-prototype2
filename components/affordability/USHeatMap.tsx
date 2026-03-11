'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { createRatingColorScale } from '@/lib/color-scale';
import statePathsData from '@/lib/us-state-paths.json';
import cityAreasData from '@/lib/us-city-areas.json';
import HeatMapTooltip from './HeatMapTooltip';
import { CITY_TO_STATE_ABBREV } from '@/lib/us-city-coordinates';
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

// State name to abbreviation for matching cities
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomedViewBox, setZoomedViewBox] = useState(DEFAULT_VIEWBOX);
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
      if (isFullscreen && zoomedState === stateName) {
        // Already zoomed into this state in fullscreen - clicking state again navigates
        onLocationClick(stateName);
        return;
      }
      // Compute viewBox from the clicked path
      const pathEl = e.currentTarget;
      const bbox = pathEl.getBBox();
      const padding = 30;
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
      setZoomedViewBox(`${vx} ${vy} ${vw} ${vh}`);
      setZoomedState(stateName);
      setIsFullscreen(true);
      setTooltip(null);
    },
    [zoomedState, isFullscreen, onLocationClick]
  );

  const handleCloseFullscreen = useCallback(() => {
    setIsFullscreen(false);
    setZoomedState(null);
    setZoomedViewBox(DEFAULT_VIEWBOX);
    setTooltip(null);
  }, []);

  // Escape key to close fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseFullscreen();
    };
    document.addEventListener('keydown', handleKey);
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isFullscreen, handleCloseFullscreen]);

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

  // Cities in the currently zoomed state
  const zoomedStateCities = useMemo(() => {
    if (!zoomedState) return [];
    const stateAbbrev = STATE_NAME_TO_ABBREV[zoomedState];
    if (!stateAbbrev) return [];
    const cities: { name: string; calc: LocationCalculation }[] = [];
    cityData.forEach((calc, cityName) => {
      if (CITY_TO_STATE_ABBREV[cityName] === stateAbbrev) {
        cities.push({ name: cityName, calc });
      }
    });
    return cities.sort((a, b) => b.calc.numericScore - a.calc.numericScore);
  }, [zoomedState, cityData]);

  // State-level calc for zoomed state
  const zoomedStateCalc = useMemo(() => {
    if (!zoomedState) return null;
    return stateData.get(zoomedState) ?? null;
  }, [zoomedState, stateData]);

  const insights = useMemo(() => {
    const allLocations: LocationCalculation[] = [];
    stateData.forEach((calc) => allLocations.push(calc));
    cityData.forEach((calc) => allLocations.push(calc));

    if (allLocations.length === 0) return null;

    const viable = allLocations.filter((l) => l.isViable);

    // Separate top states and top cities
    const stateNames = new Set<string>();
    stateData.forEach((_calc, name) => stateNames.add(name));

    const viableStates = viable.filter((l) => stateNames.has(l.name));
    const viableCities = viable.filter((l) => !stateNames.has(l.name));
    const bestStates = [...viableStates].sort((a, b) => b.numericScore - a.numericScore).slice(0, 3);
    const bestCities = [...viableCities].sort((a, b) => b.numericScore - a.numericScore).slice(0, 3);

    const unviableCount = allLocations.filter((l) => !l.isViable).length;
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
      unviableCount,
      totalLocations: allLocations.length,
      viableCount: viable.length,
      avgScore,
      avgHomeValue,
    };
  }, [stateData, cityData]);

  // Build 5 legend swatches
  const legendSteps = [10, 7.5, 5, 2.5, 0];
  const legendLabels = ['Excellent', 'Good', 'Fair', 'Poor', 'Not viable'];

  // Shared SVG map content renderer
  const renderMapSvg = (vb: string, maxH: string, clipId: string) => (
    <svg
      viewBox={vb}
      className="w-full h-auto"
      style={{ maxHeight: maxH }}
    >
      <defs>
        <clipPath id={clipId}>
          {statePaths.map((state, i) => (
            <path key={i} d={state.d} />
          ))}
        </clipPath>
      </defs>
      {statePaths.map((state, i) => {
        const calc = stateData.get(state.name);
        const fill = getFillColor(calc);
        const isZoomed = zoomedState === state.name;
        return (
          <path
            key={i}
            d={state.d}
            data-state={state.name}
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

      <g clipPath={`url(#${clipId})`}>
        {cityShapes.map(({ name, d, calc }) => {
          const fill = getFillColor(calc);
          return (
            <path
              key={name}
              d={d}
              fill={fill}
              stroke="#666"
              strokeWidth={0.5}
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
      </g>
    </svg>
  );

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
          {renderMapSvg(DEFAULT_VIEWBOX, '85vh', 'us-boundary-clip')}
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

      {/* Regular tooltip */}
      {tooltip && !isFullscreen && (
        <HeatMapTooltip
          locationName={tooltip.name}
          data={tooltip.data}
          mode={mode}
          position={tooltip.position}
        />
      )}

      {/* Fullscreen State Zoom Overlay */}
      {isFullscreen && zoomedState && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
          onClick={handleCloseFullscreen}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-[95vw] h-[90vh] max-w-[1600px] flex overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleCloseFullscreen}
              className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white/90 border border-gray-200 rounded-full shadow-md hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Zoomed Map */}
            <div className="flex-1 min-w-0 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={handleCloseFullscreen}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[#4A90D9] hover:bg-[#F0F7FF] rounded-lg transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to US
                </button>
                <h2 className="text-xl font-bold text-[#2C3E50]">{zoomedState}</h2>
                {zoomedStateCalc && (
                  <span
                    className="text-sm font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: ratingScale(zoomedStateCalc.numericScore) + '22',
                      color: ratingScale(zoomedStateCalc.numericScore),
                    }}
                  >
                    Score: {zoomedStateCalc.numericScore.toFixed(1)}/10
                  </span>
                )}
              </div>
              <div className="flex-1 min-h-0">
                {renderMapSvg(zoomedViewBox, '100%', 'us-boundary-clip-fs')}
              </div>
            </div>

            {/* State Detail Sidebar */}
            <div className="w-80 border-l border-gray-200 bg-gray-50 overflow-y-auto p-5 space-y-5">
              {/* State Summary */}
              {zoomedStateCalc && (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <h3 className="text-sm font-semibold text-[#2C3E50] mb-3">State Overview</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Max Home Value</span>
                      <span className="font-semibold text-[#2C3E50]">{formatCurrency(zoomedStateCalc.maxHomeValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Home Size</span>
                      <span className="font-semibold text-[#2C3E50]">{zoomedStateCalc.sqft.toLocaleString()} sqft</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Monthly Payment</span>
                      <span className="font-semibold text-[#2C3E50]">{formatCurrency(zoomedStateCalc.monthlyPayment)}/mo</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Years to Own</span>
                      <span className="font-semibold text-[#2C3E50]">
                        {zoomedStateCalc.yearsToOwn > 0 ? `${zoomedStateCalc.yearsToOwn} yrs` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Price/sqft</span>
                      <span className="font-semibold text-[#2C3E50]">${zoomedStateCalc.pricePerSqft.toFixed(0)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onLocationClick(zoomedState)}
                    className="mt-3 w-full py-2 bg-[#4A90D9] text-white text-sm font-medium rounded-lg hover:bg-[#3A7BC8] transition-colors"
                  >
                    View Full Profile
                  </button>
                </div>
              )}

              {/* Cities in State */}
              <div>
                <h3 className="text-sm font-semibold text-[#2C3E50] mb-3">
                  Cities in {zoomedState}
                  {zoomedStateCities.length > 0 && (
                    <span className="text-[#6B7280] font-normal ml-1">({zoomedStateCities.length})</span>
                  )}
                </h3>
                {zoomedStateCities.length === 0 ? (
                  <p className="text-sm text-[#6B7280]">No city data available for this state.</p>
                ) : (
                  <div className="space-y-2">
                    {zoomedStateCities.map(({ name, calc }) => (
                      <div
                        key={name}
                        className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer hover:border-[#4A90D9] hover:shadow-md transition-all"
                        onClick={() => onLocationClick(name)}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-[#2C3E50]">{name}</span>
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: ratingScale(calc.numericScore) + '22',
                              color: ratingScale(calc.numericScore),
                            }}
                          >
                            {calc.numericScore.toFixed(1)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-[#6B7280]">Home</span>
                            <span className="text-[#2C3E50] font-medium">{formatCurrency(calc.maxHomeValue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#6B7280]">Size</span>
                            <span className="text-[#2C3E50] font-medium">{calc.sqft.toLocaleString()} sqft</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#6B7280]">Monthly</span>
                            <span className="text-[#2C3E50] font-medium">{formatCurrency(calc.monthlyPayment)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#6B7280]">$/sqft</span>
                            <span className="text-[#2C3E50] font-medium">${calc.pricePerSqft.toFixed(0)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Legend in fullscreen */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-sm font-semibold text-[#2C3E50] mb-3">Rating Scale</p>
                <div className="space-y-2">
                  {legendSteps.map((score, i) => (
                    <div key={score} className="flex items-center gap-2.5">
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor: score === 0 ? GRAY : ratingScale(score),
                        }}
                      />
                      <span className="text-sm text-[#6B7280]">{legendLabels[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Fullscreen tooltip */}
          {tooltip && (
            <HeatMapTooltip
              locationName={tooltip.name}
              data={tooltip.data}
              mode={mode}
              position={tooltip.position}
            />
          )}
        </div>
      )}
    </div>
  );
}
