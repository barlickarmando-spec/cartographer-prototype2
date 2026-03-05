'use client';

import { formatCurrency } from '@/lib/utils';
import { createRatingColorScale } from '@/lib/color-scale';
import type { LocationCalculation } from '@/hooks/useAffordabilityCalculations';

interface HeatMapTooltipProps {
  locationName: string;
  data: LocationCalculation;
  mode: 'value' | 'sqft';
  position: { x: number; y: number };
}

const ratingScale = createRatingColorScale();

export default function HeatMapTooltip({ locationName, data, mode, position }: HeatMapTooltipProps) {
  const ratingColor = ratingScale(data.numericScore);

  return (
    <div
      className="fixed z-50 pointer-events-none bg-white rounded-lg shadow-xl border border-gray-200 px-4 py-3 min-w-[220px]"
      style={{
        left: position.x + 12,
        top: position.y - 10,
        transform: position.x > window.innerWidth - 250 ? 'translateX(-110%)' : undefined,
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="font-semibold text-gray-900 text-sm">{locationName}</p>
        <span
          className="text-xs font-bold px-1.5 py-0.5 rounded"
          style={{ backgroundColor: ratingColor, color: data.numericScore > 6 ? '#fff' : '#1a1a1a' }}
        >
          {data.numericScore.toFixed(1)}/10
        </span>
      </div>
      {mode === 'value' ? (
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex justify-between gap-4">
            <span>Max Home Value</span>
            <span className="font-semibold text-gray-900">{formatCurrency(data.maxHomeValue)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Monthly Payment</span>
            <span className="font-semibold text-gray-900">${data.monthlyPayment.toLocaleString()}/mo</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Time to Own</span>
            <span className="font-semibold text-gray-900">
              {data.yearsToOwn > 0 ? `${data.yearsToOwn} years` : 'N/A'}
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex justify-between gap-4">
            <span>Affordable Size</span>
            <span className="font-semibold text-gray-900">{data.sqft.toLocaleString()} sqft</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Price/sqft</span>
            <span className="font-semibold text-gray-900">${data.pricePerSqft}/sqft</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Max Home Value</span>
            <span className="font-semibold text-gray-900">{formatCurrency(data.maxHomeValue)}</span>
          </div>
        </div>
      )}
      {!data.isViable && (
        <p className="text-xs text-red-500 mt-1.5 font-medium">Not viable for homeownership</p>
      )}
    </div>
  );
}
