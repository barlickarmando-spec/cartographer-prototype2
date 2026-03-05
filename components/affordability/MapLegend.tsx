'use client';

import { useMemo } from 'react';
import { scaleSequential } from 'd3-scale';
import { interpolateGreens, interpolateBlues } from 'd3-scale-chromatic';
import { formatCurrency } from '@/lib/utils';

interface MapLegendProps {
  mode: 'value' | 'sqft';
  min: number;
  max: number;
}

export default function MapLegend({ mode, min, max }: MapLegendProps) {
  const colorScale = useMemo(() => {
    const interpolator = mode === 'value' ? interpolateGreens : interpolateBlues;
    return scaleSequential(interpolator).domain([min, max]);
  }, [mode, min, max]);

  const stops = 20;
  const gradientColors = Array.from({ length: stops }, (_, i) => {
    const t = min + (i / (stops - 1)) * (max - min);
    return colorScale(t);
  });

  const ticks = 5;
  const tickValues = Array.from({ length: ticks }, (_, i) => {
    return min + (i / (ticks - 1)) * (max - min);
  });

  const formatTick = (val: number) => {
    if (mode === 'value') return formatCurrency(val);
    return `${Math.round(val).toLocaleString()} sqft`;
  };

  return (
    <div className="mt-4 px-4">
      <div
        className="h-3 rounded-full w-full"
        style={{
          background: `linear-gradient(to right, ${gradientColors.join(', ')})`,
        }}
      />
      <div className="flex justify-between mt-1.5">
        {tickValues.map((val, i) => (
          <span key={i} className="text-xs text-gray-500">
            {formatTick(val)}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gray-200 border border-gray-300" />
          <span>No data / Not viable</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-[#1E3A5F] border border-white" />
          <span>City</span>
        </div>
      </div>
    </div>
  );
}
