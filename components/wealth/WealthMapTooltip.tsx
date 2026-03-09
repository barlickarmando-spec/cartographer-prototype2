'use client';

import { formatCurrency } from '@/lib/utils';
import type { LocationWealth } from '@/lib/wealth-calculations';
import type { MapMode } from './types';

interface WealthMapTooltipProps {
  locationName: string;
  data: LocationWealth;
  mode: MapMode;
  position: { x: number; y: number };
}

export default function WealthMapTooltip({ locationName, data, mode, position }: WealthMapTooltipProps) {
  return (
    <div
      className="fixed z-50 pointer-events-none shadow-2xl min-w-[340px] bg-[#4A90D9]"
      style={{
        left: position.x + 16,
        top: position.y - 12,
        transform: position.x > window.innerWidth - 380 ? 'translateX(-110%)' : undefined,
      }}
    >
      <div className="px-7 py-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/30">
          <p className="font-bold text-white text-lg">{locationName}</p>
          {data.isViable ? (
            <span className="text-base font-bold px-3 py-1 bg-white/20 text-white">
              {mode === 'wealth-gain'
                ? formatCurrency(data.wealthAt30)
                : mode === 'pct-increase'
                ? `+${Math.round(data.appreciationPctAt30)}%`
                : formatCurrency(data.effectiveWealth)}
            </span>
          ) : (
            <span className="text-sm font-medium px-3 py-1 bg-white/20 text-white/80">
              Not viable
            </span>
          )}
        </div>

        {data.isViable ? (
          <div className="space-y-3 text-base">
            <div className="flex justify-between gap-8">
              <span className="text-white/80">Max Affordable Home</span>
              <span className="font-semibold text-white">{formatCurrency(data.maxAffordableValue)}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-white/80">Typical Home Value</span>
              <span className="font-semibold text-white">{formatCurrency(data.currentHomeValue)}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-white/80">Wealth at 15 yrs</span>
              <span className="font-semibold text-white">{formatCurrency(data.wealthAt15)}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-white/80">Wealth at 30 yrs</span>
              <span className="font-semibold text-white">{formatCurrency(data.wealthAt30)}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-white/80">Appreciation (30 yr)</span>
              <span className="font-semibold text-white">+{Math.round(data.appreciationPctAt30)}%</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-white/80">Effective Equity</span>
              <span className="font-semibold text-white">{formatCurrency(data.effectiveWealth)}</span>
            </div>
          </div>
        ) : (
          <p className="text-base text-white/90 font-medium">Not viable for homeownership</p>
        )}
      </div>
    </div>
  );
}
