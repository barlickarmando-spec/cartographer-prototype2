'use client';

import { formatCurrency } from '@/lib/utils';
import type { LocationWealth } from '@/lib/wealth-calculations';
import type { MapMode } from './types';

interface WealthMapTooltipProps {
  locationName: string;
  data: LocationWealth;
  mode: MapMode;
  rating: number; // 0-5 star rating
  position: { x: number; y: number };
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => {
          if (rating >= i) {
            return <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
          } else if (rating >= i - 0.5) {
            return <svg key={i} className="w-4 h-4" viewBox="0 0 24 24"><defs><linearGradient id={`wstar-${i}`}><stop offset="50%" stopColor="#FACC15" /><stop offset="50%" stopColor="rgba(255,255,255,0.3)" /></linearGradient></defs><path fill={`url(#wstar-${i})`} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
          }
          return <svg key={i} className="w-4 h-4 text-white/30" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
        })}
      </div>
      <span className="text-sm font-semibold text-white">{rating.toFixed(1)}/5</span>
    </div>
  );
}

export default function WealthMapTooltip({ locationName, data, mode, rating, position }: WealthMapTooltipProps) {
  const viabilityLabel = !data.isViable
    ? 'Not Viable'
    : rating >= 4 ? 'Excellent' : rating >= 3 ? 'Strong' : rating >= 2 ? 'Fair' : 'Low';
  const viabilityBg = !data.isViable
    ? 'bg-red-400/30'
    : rating >= 4 ? 'bg-green-400/30' : rating >= 3 ? 'bg-blue-400/30' : rating >= 2 ? 'bg-yellow-400/30' : 'bg-red-400/30';

  return (
    <div
      className="fixed z-50 pointer-events-none shadow-2xl min-w-[320px] bg-[#4A90D9]"
      style={{
        left: position.x + 16,
        top: position.y - 12,
        transform: position.x > window.innerWidth - 360 ? 'translateX(-110%)' : undefined,
      }}
    >
      <div className="px-7 py-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/30">
          <p className="font-bold text-white text-lg">{locationName}</p>
          <span className={`text-sm font-bold px-3 py-1 ${viabilityBg} text-white rounded`}>
            {viabilityLabel}
          </span>
        </div>

        {data.isViable ? (
          <div className="space-y-3 text-base">
            <div className="flex justify-between items-center gap-8">
              <span className="text-white/80">Rating</span>
              <StarRow rating={rating} />
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-white/80">Projected Home Value</span>
              <span className="font-semibold text-white">{formatCurrency(data.maxAffordableValue)}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-white/80">Typical Home Value</span>
              <span className="font-semibold text-white">{formatCurrency(data.currentHomeValue)}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-white/80">Wealth in 20 yrs</span>
              <span className="font-semibold text-white">{formatCurrency(data.wealthAt20)}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-white/80">Appreciation</span>
              <span className="font-semibold text-white">+{Math.round(data.appreciationPctAt30)}%</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-white/80">Total Effective Wealth</span>
              <span className="font-semibold text-white">{formatCurrency(data.totalEffectiveWealth)}</span>
            </div>
          </div>
        ) : (
          <p className="text-base text-white/90 font-medium">Not viable for homeownership</p>
        )}
      </div>
    </div>
  );
}
