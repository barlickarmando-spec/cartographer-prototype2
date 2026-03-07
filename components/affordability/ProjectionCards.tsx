'use client';

import { CalculationResult } from '@/lib/calculation-engine';
import { formatCurrency } from '@/lib/utils';
import { getPricePerSqft, getTypicalHomeValue } from '@/lib/home-value-lookup';

interface ProjectionCardsProps {
  result: CalculationResult | null;
  isLoading: boolean;
}

export default function ProjectionCards({ result, isLoading }: ProjectionCardsProps) {
  const maxAffordable = result?.houseProjections.maxAffordable;
  const maxHomeValue = maxAffordable?.maxSustainableHousePrice ?? 0;
  const monthlyPayment = maxAffordable ? Math.round(maxAffordable.sustainableAnnualPayment / 12) : 0;
  const yearsToOwn = result?.yearsToMortgage ?? 0;
  const location = result?.location ?? '';
  const pricePerSqft = location ? getPricePerSqft(location) : 0;
  const typicalValue = location ? getTypicalHomeValue(location) : 0;

  const placeholder = '---';

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#4A90D9] rounded-xl p-6 text-white shadow-md">
          <p className="text-sm font-medium mb-2">Projected Home Value</p>
          <p className="text-4xl font-bold">
            {isLoading ? placeholder : (maxHomeValue > 0 ? formatCurrency(maxHomeValue) : 'N/A')}
          </p>
          <p className="text-sm opacity-90 mt-2">Max sustainable purchase price</p>
        </div>

        <div className="bg-[#4DB6AC] rounded-xl p-6 text-white shadow-md">
          <p className="text-sm font-medium mb-2">Monthly Payment</p>
          <p className="text-4xl font-bold">
            {isLoading ? placeholder : (monthlyPayment > 0 ? `$${monthlyPayment.toLocaleString()}` : 'N/A')}
          </p>
          <p className="text-sm opacity-90 mt-2">Sustainable monthly mortgage</p>
        </div>

        <div className="bg-[#E76F51] rounded-xl p-6 text-white shadow-md">
          <p className="text-sm font-medium mb-2">Time to Homeownership</p>
          <p className="text-4xl font-bold">
            {isLoading ? placeholder : (yearsToOwn > 0 ? `${yearsToOwn} yrs` : 'N/A')}
          </p>
          <p className="text-sm opacity-90 mt-2">Projected timeline</p>
        </div>
      </div>

      {location && !isLoading && (
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
          <span className="bg-gray-100 px-3 py-1.5 rounded-full">
            {location}
          </span>
          {pricePerSqft > 0 && (
            <span className="bg-gray-100 px-3 py-1.5 rounded-full">
              ${pricePerSqft}/sqft
            </span>
          )}
          {typicalValue > 0 && (
            <span className="bg-gray-100 px-3 py-1.5 rounded-full">
              Typical home: {formatCurrency(typicalValue)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
