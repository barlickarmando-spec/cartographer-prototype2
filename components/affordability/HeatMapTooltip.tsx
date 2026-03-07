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
      className="fixed z-50 pointer-events-none bg-white rounded-xl shadow-2xl border border-[#E5E7EB] px-6 py-5 min-w-[280px]"
      style={{
        left: position.x + 16,
        top: position.y - 12,
        transform: position.x > window.innerWidth - 320 ? 'translateX(-110%)' : undefined,
      }}
    >
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#E5E7EB]">
        <p className="font-bold text-[#2C3E50] text-base">{locationName}</p>
        <span
          className="text-sm font-bold px-2.5 py-1 rounded-lg"
          style={{ backgroundColor: ratingColor, color: data.numericScore > 6 ? '#fff' : '#1a1a1a' }}
        >
          {data.numericScore.toFixed(1)}/10
        </span>
      </div>
      {mode === 'value' ? (
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between gap-6">
            <span className="text-[#6B7280]">Max Home Value</span>
            <span className="font-semibold text-[#2C3E50]">{formatCurrency(data.maxHomeValue)}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-[#6B7280]">Monthly Payment</span>
            <span className="font-semibold text-[#2C3E50]">${data.monthlyPayment.toLocaleString()}/mo</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-[#6B7280]">Time to Own</span>
            <span className="font-semibold text-[#2C3E50]">
              {data.yearsToOwn > 0 ? `${data.yearsToOwn} years` : 'N/A'}
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between gap-6">
            <span className="text-[#6B7280]">Affordable Size</span>
            <span className="font-semibold text-[#2C3E50]">{data.sqft.toLocaleString()} sqft</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-[#6B7280]">Price/sqft</span>
            <span className="font-semibold text-[#2C3E50]">${data.pricePerSqft}/sqft</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-[#6B7280]">Time to Own</span>
            <span className="font-semibold text-[#2C3E50]">
              {data.yearsToOwn > 0 ? `${data.yearsToOwn} years` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-[#6B7280]">Max Home Value</span>
            <span className="font-semibold text-[#2C3E50]">{formatCurrency(data.maxHomeValue)}</span>
          </div>
        </div>
      )}
      {!data.isViable && (
        <p className="text-sm text-red-500 mt-3 pt-2.5 border-t border-[#E5E7EB] font-medium">Not viable for homeownership</p>
      )}
    </div>
  );
}
