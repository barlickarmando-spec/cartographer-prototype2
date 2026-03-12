'use client';

import { createPortal } from 'react-dom';
import { formatCurrency } from '@/lib/utils';
import { createRatingColorScale } from '@/lib/color-scale';
import type { LocationCalculation } from '@/hooks/useAffordabilityCalculations';

interface HeatMapTooltipProps {
  locationName: string;
  data: LocationCalculation | null;
  mode: 'value' | 'sqft';
  position: { x: number; y: number };
}

const ratingScale = createRatingColorScale();

export default function HeatMapTooltip({ locationName, data, mode, position }: HeatMapTooltipProps) {
  return createPortal(
    <div
      className="fixed z-[9999] pointer-events-none shadow-2xl min-w-[340px] bg-[#4A90D9] rounded-lg"
      style={{
        left: position.x + 16,
        top: position.y - 12,
        transform: position.x > window.innerWidth - 380 ? 'translateX(-110%)' : undefined,
      }}
    >
      <div className="px-7 py-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/30">
          <p className="font-bold text-white text-lg">{locationName}</p>
          {data && (
            <span className="text-base font-bold px-3 py-1 bg-white/20 text-white rounded">
              {data.numericScore.toFixed(1)}/10
            </span>
          )}
        </div>
        {data ? (
          <>
            {mode === 'value' ? (
              <div className="space-y-3 text-base">
                <div className="flex justify-between gap-8">
                  <span className="text-white/80">Max Home Value</span>
                  <span className="font-semibold text-white">{formatCurrency(data.maxHomeValue)}</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-white/80">Monthly Payment</span>
                  <span className="font-semibold text-white">${data.monthlyPayment.toLocaleString()}/mo</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-white/80">Time to Own</span>
                  <span className="font-semibold text-white">
                    {data.yearsToOwn > 0 ? `${data.yearsToOwn} years` : 'N/A'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-base">
                <div className="flex justify-between gap-8">
                  <span className="text-white/80">Affordable Size</span>
                  <span className="font-semibold text-white">{data.sqft.toLocaleString()} sqft</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-white/80">Price/sqft</span>
                  <span className="font-semibold text-white">${data.pricePerSqft}/sqft</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-white/80">Time to Own</span>
                  <span className="font-semibold text-white">
                    {data.yearsToOwn > 0 ? `${data.yearsToOwn} years` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-white/80">Max Home Value</span>
                  <span className="font-semibold text-white">{formatCurrency(data.maxHomeValue)}</span>
                </div>
              </div>
            )}
            {!data.isViable && (
              <p className="text-base text-white/90 mt-4 pt-3 border-t border-white/30 font-medium">Not viable for homeownership</p>
            )}
          </>
        ) : (
          <p className="text-base text-white/80">Loading data...</p>
        )}
      </div>
    </div>,
    document.body
  );
}
