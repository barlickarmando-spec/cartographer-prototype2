'use client';

import { useState, useMemo, useCallback } from 'react';
import { createSequentialScale, interpolateGreens, interpolateBlues } from '@/lib/color-scale';
import statePathsData from '@/lib/us-state-paths.json';
import cityPositionsData from '@/lib/us-city-projected.json';
import HeatMapTooltip from './HeatMapTooltip';
import MapLegend from './MapLegend';
import type { LocationCalculation } from '@/hooks/useAffordabilityCalculations';

const GRAY = '#E5E7EB';
const WIDTH = 960;
const HEIGHT = 600;

const statePaths = statePathsData as { name: string; d: string }[];
const cityPositions = cityPositionsData as unknown as Record<string, [number, number]>;

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

  const { colorScale, minVal, maxVal } = useMemo(() => {
    const values: number[] = [];
    const field = mode === 'value' ? 'maxHomeValue' : 'sqft';

    stateData.forEach((calc) => {
      if (calc.isViable && calc[field] > 0) values.push(calc[field]);
    });

    if (values.length === 0) return { colorScale: null, minVal: 0, maxVal: 0 };

    const min = Math.min(...values);
    const max = Math.max(...values);
    const interpolator = mode === 'value' ? interpolateGreens : interpolateBlues;
    const scale = createSequentialScale(interpolator, [min, max]);

    return { colorScale: scale, minVal: min, maxVal: max };
  }, [stateData, mode]);

  const getFillColor = useCallback(
    (stateName: string): string => {
      const calc = stateData.get(stateName);
      if (!calc || !calc.isViable || !colorScale) return GRAY;
      const val = mode === 'value' ? calc.maxHomeValue : calc.sqft;
      if (val <= 0) return GRAY;
      return colorScale(val);
    },
    [stateData, mode, colorScale]
  );

  const handleMouseEnter = useCallback(
    (name: string, data: LocationCalculation, e: React.MouseEvent) => {
      setTooltip({ name, data, position: { x: e.clientX, y: e.clientY } });
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      setTooltip((prev) =>
        prev ? { ...prev, position: { x: e.clientX, y: e.clientY } } : null
      );
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  // Build city markers from pre-projected positions
  const cityMarkers = useMemo(() => {
    const markers: { name: string; x: number; y: number; calc: LocationCalculation }[] = [];
    cityData.forEach((calc, cityName) => {
      const pos = cityPositions[cityName];
      if (pos) {
        markers.push({ name: cityName, x: pos[0], y: pos[1], calc });
      }
    });
    return markers;
  }, [cityData]);

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

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        style={{ maxHeight: '70vh' }}
      >
        {/* State shapes */}
        {statePaths.map((state, i) => {
          const fill = getFillColor(state.name);
          const calc = stateData.get(state.name);

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
              className="transition-colors hover:stroke-[#5BA4E5] hover:stroke-[2]"
            />
          );
        })}

        {/* City dots */}
        {cityMarkers.map(({ name, x, y, calc }) => (
          <circle
            key={name}
            cx={x}
            cy={y}
            r={4}
            fill="#1E3A5F"
            stroke="#FFF"
            strokeWidth={1}
            cursor="pointer"
            onClick={() => onLocationClick(name)}
            onMouseEnter={(e) => handleMouseEnter(name, calc, e)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
        ))}
      </svg>

      {colorScale && <MapLegend mode={mode} min={minVal} max={maxVal} />}

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
