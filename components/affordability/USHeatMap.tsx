'use client';

import { useState, useMemo, useCallback } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { scaleSequential } from 'd3-scale';
import { interpolateGreens, interpolateBlues } from 'd3-scale-chromatic';
import { CITY_COORDINATES } from '@/lib/us-city-coordinates';
import HeatMapTooltip from './HeatMapTooltip';
import MapLegend from './MapLegend';
import type { LocationCalculation } from '@/hooks/useAffordabilityCalculations';

const GEO_URL = '/data/us-states-10m.json';
const GRAY = '#E5E7EB';

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
    const scale = scaleSequential(interpolator).domain([min, max]);

    return { colorScale: scale, minVal: min, maxVal: max };
  }, [stateData, mode]);

  const getFillColor = useCallback(
    (stateName: string): string => {
      const calc = stateData.get(stateName);
      if (!calc || !calc.isViable || !colorScale) return GRAY;
      const val = mode === 'value' ? calc.maxHomeValue : calc.sqft;
      if (val <= 0) return GRAY;
      return colorScale(val) as string;
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
      setTooltip((prev) => prev ? { ...prev, position: { x: e.clientX, y: e.clientY } } : null);
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

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

      <ComposableMap
        projection="geoAlbersUsa"
        projectionConfig={{ scale: 1000 }}
        width={800}
        height={500}
        style={{ width: '100%', height: 'auto' }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const stateName = geo.properties.name as string;
              const calc = stateData.get(stateName);
              const fill = getFillColor(stateName);

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="#FFFFFF"
                  strokeWidth={0.5}
                  onClick={() => onLocationClick(stateName)}
                  onMouseEnter={(e) => {
                    if (calc) handleMouseEnter(stateName, calc, e as unknown as React.MouseEvent);
                  }}
                  onMouseMove={(e) => handleMouseMove(e as unknown as React.MouseEvent)}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    default: { outline: 'none' },
                    hover: {
                      fill,
                      stroke: '#5BA4E5',
                      strokeWidth: 2,
                      cursor: 'pointer',
                      outline: 'none',
                    },
                    pressed: { fill, outline: 'none' },
                  }}
                />
              );
            })
          }
        </Geographies>

        {/* City markers */}
        {Array.from(cityData.entries()).map(([cityName, calc]) => {
          const coords = CITY_COORDINATES[cityName];
          if (!coords) return null;
          return (
            <Marker key={cityName} coordinates={coords}>
              <circle
                r={3}
                fill="#1E3A5F"
                stroke="#FFF"
                strokeWidth={0.5}
                cursor="pointer"
                onClick={() => onLocationClick(cityName)}
                onMouseEnter={(e) => handleMouseEnter(cityName, calc, e as unknown as React.MouseEvent)}
                onMouseMove={(e) => handleMouseMove(e as unknown as React.MouseEvent)}
                onMouseLeave={handleMouseLeave}
              />
            </Marker>
          );
        })}
      </ComposableMap>

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
