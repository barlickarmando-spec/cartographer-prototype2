import type { Location } from "@/lib/data";
import type { SimulationResult } from "@/lib/types";
import Card from "./Card";
import Badge from "./Badge";

interface LocationOverviewCardProps {
  location: Location;
  result: SimulationResult;
  onViewDetails?: () => void;
  onSave?: () => void;
}

export default function LocationOverviewCard({
  location,
  result,
  onViewDetails,
  onSave,
}: LocationOverviewCardProps) {
  const getViabilityVariant = (tier: string): Badge["variant"] => {
    switch (tier) {
      case "Excellent":
        return "success";
      case "Good":
        return "info";
      case "Borderline":
        return "warning";
      case "Low":
        return "warning";
      default:
        return "danger";
    }
  };

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatYears = (years: number | null) => {
    if (years === null || years === undefined) return "N/A";
    return `${years} year${years !== 1 ? "s" : ""}`;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{location.name}</h3>
          {location.stateName && (
            <p className="text-sm text-slate-600">{location.stateName}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={getViabilityVariant(result.viabilityTier)}>
            {result.viabilityTier}
          </Badge>
          <span className="text-xs text-slate-500">Confidence: {result.confidenceLabel}</span>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {result.estimatedSalary && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Estimated Salary:</span>
            <span className="font-medium text-slate-900">{formatCurrency(result.estimatedSalary)}</span>
          </div>
        )}

        {result.qualityOfLifeScore !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Quality of Life:</span>
            <span className="font-medium text-slate-900">{result.qualityOfLifeScore}/100</span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Time to Home Ownership:</span>
          <span className="font-medium text-slate-900">{formatYears(result.yearsToMortgage)}</span>
        </div>

        {result.minimumAllocationPercentNeeded !== null && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Min % for Viability:</span>
            <span className="font-medium text-slate-900">
              {(result.minimumAllocationPercentNeeded * 100).toFixed(0)}%
            </span>
          </div>
        )}

        {result.medianHomeValue && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Median Home Value:</span>
            <span className="font-medium text-slate-900">{formatCurrency(result.medianHomeValue)}</span>
          </div>
        )}

        {result.targetHomeValue && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Target Home Value:</span>
            <span className="font-medium text-slate-900">{formatCurrency(result.targetHomeValue)}</span>
          </div>
        )}

        {result.estimatedHouseSize && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-xs font-medium text-slate-700 mb-2">Estimated House Size:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {result.estimatedHouseSize.horizon3 && (
                <div>
                  <span className="text-slate-600">3 years:</span>{" "}
                  <span className="font-medium">{result.estimatedHouseSize.horizon3}</span>
                </div>
              )}
              {result.estimatedHouseSize.horizon5 && (
                <div>
                  <span className="text-slate-600">5 years:</span>{" "}
                  <span className="font-medium">{result.estimatedHouseSize.horizon5}</span>
                </div>
              )}
              {result.estimatedHouseSize.horizon10 && (
                <div>
                  <span className="text-slate-600">10 years:</span>{" "}
                  <span className="font-medium">{result.estimatedHouseSize.horizon10}</span>
                </div>
              )}
              {result.estimatedHouseSize.horizon20 && (
                <div>
                  <span className="text-slate-600">20 years:</span>{" "}
                  <span className="font-medium">{result.estimatedHouseSize.horizon20}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-4 border-t border-slate-200">
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="flex-1 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View Detailed Analysis
          </button>
        )}
        {onSave && (
          <button
            onClick={onSave}
            className="flex-1 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Save Location
          </button>
        )}
      </div>
    </Card>
  );
}
