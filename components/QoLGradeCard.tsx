'use client';

import { useMemo } from 'react';
import { getPersonalizedQoL, getObjectiveQoL, getQoLLabel } from '@/lib/qol-engine';
import { getStateNameFromLocation } from '@/lib/state-flags';

// ─── Grade Helpers ──────────────────────────────────────────────────

function scoreToGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 83) return 'A';
  if (score >= 77) return 'A-';
  if (score >= 73) return 'B+';
  if (score >= 67) return 'B';
  if (score >= 63) return 'B-';
  if (score >= 58) return 'C+';
  if (score >= 50) return 'C';
  if (score >= 43) return 'C-';
  if (score >= 37) return 'D+';
  if (score >= 30) return 'D';
  if (score >= 23) return 'D-';
  return 'F';
}

function gradeColor(score: number): string {
  if (score >= 77) return '#4ADE80'; // green
  if (score >= 63) return '#86EFAC'; // light green
  if (score >= 50) return '#FCD34D'; // yellow
  if (score >= 37) return '#FB923C'; // orange
  return '#F87171'; // red
}

function GradeCircle({ score, size = 'lg' }: { score: number; size?: 'xl' | 'lg' | 'md' }) {
  const grade = scoreToGrade(score);
  const color = gradeColor(score);
  const sizeClasses = {
    xl: 'w-24 h-24 text-3xl',
    lg: 'w-14 h-14 text-lg',
    md: 'w-11 h-11 text-sm',
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-gray-700 shrink-0`}
      style={{ backgroundColor: color }}
    >
      {grade}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

interface QoLGradeCardProps {
  locationName: string;
  annualIncome?: number;
}

export default function QoLGradeCard({ locationName, annualIncome }: QoLGradeCardProps) {
  const qol = useMemo(() => {
    const stateName = getStateNameFromLocation(locationName);
    if (!stateName) return null;
    if (annualIncome && annualIncome > 0) {
      return getPersonalizedQoL(stateName, annualIncome);
    }
    return getObjectiveQoL(stateName);
  }, [locationName, annualIncome]);

  if (!qol) {
    return (
      <div className="text-sm text-gray-400 py-8 text-center">
        Quality of Life data is not available for this location.
      </div>
    );
  }

  const isPersonalized = !!(annualIncome && annualIncome > 0);
  const primaryScore = isPersonalized ? qol.personal_qol : qol.objective_qol;
  const catKeys = ['safety', 'healthcare', 'infrastructure', 'environment', 'education'] as const;
  const categories = catKeys.map(k => {
    const cat = isPersonalized ? qol.personal_categories[k] : qol.categories[k];
    return { name: cat.name, score: cat.score };
  });

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row items-center gap-8">
        {/* Overall grade */}
        <div className="flex flex-col items-center shrink-0">
          <GradeCircle score={primaryScore} size="xl" />
          <p className="mt-3 text-base font-bold text-carto-slate">Overall QoL Grade</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Rank #{isPersonalized ? qol.personal_rank : qol.rank} of 51
          </p>
        </div>

        {/* Category grades grid */}
        <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-4">
          {categories.map(cat => (
            <div key={cat.name} className="flex items-center gap-3">
              <GradeCircle score={cat.score} size="lg" />
              <span className="text-sm font-medium text-gray-700">{cat.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
