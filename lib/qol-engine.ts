import { StateQoLRawData, STATE_QOL_RAW_DATA } from './qol-data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QoLSubcategoryScore {
  name: string;
  score: number; // 0-100
}

export interface QoLCategoryScore {
  name: string;
  score: number; // 0-100
  subcategories: QoLSubcategoryScore[];
}

export interface QoLResult {
  state: string;
  objective_qol: number; // 0-100
  personal_qol: number;  // 0-100
  categories: {
    safety: QoLCategoryScore;
    healthcare: QoLCategoryScore;
    infrastructure: QoLCategoryScore;
    environment: QoLCategoryScore;
    education: QoLCategoryScore;
  };
  personal_categories: {
    safety: QoLCategoryScore;
    healthcare: QoLCategoryScore;
    infrastructure: QoLCategoryScore;
    environment: QoLCategoryScore;
    education: QoLCategoryScore;
  };
  label: string;
  personal_label: string;
  summary: string;
  rank: number;
  personal_rank: number;
}

// ---------------------------------------------------------------------------
// Metric descriptors
// ---------------------------------------------------------------------------

type MetricKey = keyof StateQoLRawData;

interface MetricDescriptor {
  key: MetricKey;
  higherIsBetter: boolean;
}

interface SubcategoryDef {
  name: string;
  weight: number;
  metrics: MetricDescriptor[]; // if >1, average their normalized scores
}

interface CategoryDef {
  name: string;
  subcategories: SubcategoryDef[];
}

const CATEGORY_DEFS: Record<string, CategoryDef> = {
  safety: {
    name: 'Safety',
    subcategories: [
      { name: 'Violent crime', weight: 0.45, metrics: [{ key: 'violent_rate_per_100k', higherIsBetter: false }] },
      { name: 'Property crime', weight: 0.35, metrics: [{ key: 'property_rate_per_100k', higherIsBetter: false }] },
      { name: 'Homelessness', weight: 0.20, metrics: [{ key: 'pit_rate_per_10k', higherIsBetter: false }] },
    ],
  },
  healthcare: {
    name: 'Healthcare',
    subcategories: [
      { name: 'Longevity', weight: 0.65, metrics: [{ key: 'life_expectancy', higherIsBetter: true }] },
      { name: 'Coverage', weight: 0.35, metrics: [{ key: 'uninsured_pct', higherIsBetter: false }] },
    ],
  },
  infrastructure: {
    name: 'Infrastructure',
    subcategories: [
      { name: 'Broadband', weight: 0.25, metrics: [{ key: 'broadband_pct', higherIsBetter: true }] },
      {
        name: 'Grid reliability',
        weight: 0.25,
        metrics: [
          { key: 'saidi_minutes', higherIsBetter: false },
          { key: 'saifi_interruptions', higherIsBetter: false },
        ],
      },
      { name: 'Disaster cost', weight: 0.25, metrics: [{ key: 'disaster_eal_millions', higherIsBetter: false }] },
      { name: 'Transportation', weight: 0.25, metrics: [] }, // placeholder
    ],
  },
  environment: {
    name: 'Environment',
    subcategories: [
      { name: 'Air quality', weight: 0.40, metrics: [{ key: 'aqi_median', higherIsBetter: false }] },
      { name: 'Water quality', weight: 0.35, metrics: [{ key: 'water_violation_rate', higherIsBetter: false }] },
      { name: 'Waste management', weight: 0.25, metrics: [{ key: 'waste_compliance_score', higherIsBetter: true }] },
    ],
  },
  education: {
    name: 'Education',
    subcategories: [
      { name: 'NAEP Math', weight: 0.18, metrics: [{ key: 'naep_math_g8', higherIsBetter: true }] },
      { name: 'NAEP Reading', weight: 0.18, metrics: [{ key: 'naep_reading_g8', higherIsBetter: true }] },
      { name: 'NAEP Science', weight: 0.12, metrics: [{ key: 'naep_science_g8', higherIsBetter: true }] },
      { name: 'Graduation', weight: 0.15, metrics: [{ key: 'graduation_rate', higherIsBetter: true }] },
      { name: 'University Affordability', weight: 0.12, metrics: [{ key: 'avg_public_tuition_instate', higherIsBetter: false }] },
      { name: 'Preschool Enrollment', weight: 0.10, metrics: [{ key: 'preschool_enrollment_pct', higherIsBetter: true }] },
      { name: 'Student-Teacher Ratio', weight: 0.10, metrics: [{ key: 'pupil_teacher_ratio', higherIsBetter: false }] },
      { name: 'Private Costs', weight: 0.05, metrics: [{ key: 'childcare_infant_annual', higherIsBetter: false }] },
    ],
  },
};

const CATEGORY_KEYS = ['safety', 'healthcare', 'infrastructure', 'environment', 'education'] as const;
type CategoryKey = (typeof CATEGORY_KEYS)[number];

// ---------------------------------------------------------------------------
// Precomputed percentile bounds (P5 / P95) per metric
// ---------------------------------------------------------------------------

interface PercentileBounds {
  p5: number;
  p95: number;
}

const metricBounds: Map<MetricKey, PercentileBounds> = new Map();

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function precomputeBounds(): void {
  // Collect all metric keys referenced in category defs
  const allMetricKeys = new Set<MetricKey>();
  for (const catKey of CATEGORY_KEYS) {
    for (const sub of CATEGORY_DEFS[catKey].subcategories) {
      for (const m of sub.metrics) {
        allMetricKeys.add(m.key);
      }
    }
  }

  // Also add rpp_all_items which is used in personalization
  allMetricKeys.add('rpp_all_items' as MetricKey);

  const stateNames = Object.keys(STATE_QOL_RAW_DATA);

  for (const key of Array.from(allMetricKeys)) {
    const values: number[] = [];
    for (const st of stateNames) {
      const raw = STATE_QOL_RAW_DATA[st];
      const val = raw[key];
      if (val != null && typeof val === 'number' && !isNaN(val)) {
        values.push(val);
      }
    }
    values.sort((a, b) => a - b);
    metricBounds.set(key, {
      p5: percentile(values, 5),
      p95: percentile(values, 95),
    });
  }
}

// Run once at module load
precomputeBounds();

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

function winsorizedNormalize(value: number, key: MetricKey, higherIsBetter: boolean): number {
  const bounds = metricBounds.get(key);
  if (!bounds) return 50; // fallback
  const { p5, p95 } = bounds;
  if (p95 === p5) return 50; // no spread
  const clamped = Math.max(p5, Math.min(p95, value));
  const ratio = (clamped - p5) / (p95 - p5);
  return higherIsBetter ? 100 * ratio : 100 * (1 - ratio);
}

// ---------------------------------------------------------------------------
// Category scoring
// ---------------------------------------------------------------------------

function scoreSubcategory(sub: SubcategoryDef, raw: StateQoLRawData): number {
  // Placeholder subcategory (Transportation)
  if (sub.metrics.length === 0) return 60;

  let total = 0;
  let count = 0;
  for (const m of sub.metrics) {
    const val = raw[m.key];
    if (val == null || typeof val !== 'number' || isNaN(val)) continue;
    total += winsorizedNormalize(val, m.key, m.higherIsBetter);
    count++;
  }
  return count > 0 ? total / count : 50;
}

function scoreCategory(catKey: string, raw: StateQoLRawData): QoLCategoryScore {
  const def = CATEGORY_DEFS[catKey];
  const subcategories: QoLSubcategoryScore[] = [];
  let weightedSum = 0;
  let weightSum = 0;

  for (const sub of def.subcategories) {
    const s = scoreSubcategory(sub, raw);
    subcategories.push({ name: sub.name, score: round2(s) });
    weightedSum += sub.weight * s;
    weightSum += sub.weight;
  }

  const score = weightSum > 0 ? weightedSum / weightSum : 50;

  return {
    name: def.name,
    score: round2(score),
    subcategories,
  };
}

// ---------------------------------------------------------------------------
// Personalization
// ---------------------------------------------------------------------------

const SPENDABILITY: Record<CategoryKey, number> = {
  safety: 0.20,
  healthcare: 0.55,
  infrastructure: 0.35,
  environment: 0.10,
  education: 0.60,
};

const DEFAULT_BUDGET_FRACTIONS: Record<CategoryKey, number> = {
  safety: 0.02,
  healthcare: 0.12,
  infrastructure: 0.08,
  environment: 0.02,
  education: 0.15,
};

function costAnchor(catKey: CategoryKey, raw: StateQoLRawData): number {
  switch (catKey) {
    case 'education':
      return ((raw.avg_public_tuition_instate ?? 0) + (raw.childcare_infant_annual ?? 0)) / 2;
    case 'healthcare':
      return 8000 * ((raw.uninsured_pct ?? 10) / 10) + 3000;
    case 'infrastructure':
      return 2000;
    case 'safety':
      return 1500;
    case 'environment':
      return 500;
    default:
      return 1000;
  }
}

function accessFactor(affordabilityRatio: number): number {
  // phi(A) = 1 / (1 + exp(-1.2 * ln(A)))
  if (affordabilityRatio <= 0) return 0;
  const lnA = Math.log(affordabilityRatio);
  return 1 / (1 + Math.exp(-1.2 * lnA));
}

function personalizeCategory(
  catKey: CategoryKey,
  catScore: QoLCategoryScore,
  raw: StateQoLRawData,
  realIncome: number,
  budgetFraction: number,
): QoLCategoryScore {
  const alpha = SPENDABILITY[catKey];
  const K = costAnchor(catKey, raw);
  const B = budgetFraction * realIncome;
  const A = K > 0 ? B / K : 1;
  const phi = accessFactor(A);
  const personalScore = catScore.score + alpha * (100 - catScore.score) * phi;

  // Also personalize subcategories proportionally
  const boost = catScore.score > 0 ? personalScore / catScore.score : 1;
  const personalSubs = catScore.subcategories.map((sub) => ({
    name: sub.name,
    score: round2(Math.min(100, sub.score * boost)),
  }));

  return {
    name: catScore.name,
    score: round2(Math.min(100, personalScore)),
    subcategories: personalSubs,
  };
}

// ---------------------------------------------------------------------------
// Labels & summary
// ---------------------------------------------------------------------------

export function getQoLLabel(score: number): string {
  if (score >= 80) return 'Great';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Mixed';
  return 'Low';
}

function generateSummary(
  state: string,
  categories: Record<CategoryKey, QoLCategoryScore>,
): string {
  const entries = CATEGORY_KEYS.map((k) => ({ key: k, score: categories[k].score, name: categories[k].name }));
  entries.sort((a, b) => b.score - a.score);

  const top2 = entries.slice(0, 2).map((e) => e.name.toLowerCase());
  const bottom2 = entries.slice(-2).reverse().map((e) => e.name.toLowerCase());

  const strengths = top2.join(' and ');
  const weaknesses = bottom2.join(' and ');

  return `${state} scores strongest in ${strengths}, while ${weaknesses} present the greatest room for improvement.`;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Core computation for a single state
// ---------------------------------------------------------------------------

function computeForState(
  stateName: string,
  annualIncome?: number,
  budgetOverrides?: Partial<Record<string, number>>,
): QoLResult | null {
  const raw = STATE_QOL_RAW_DATA[stateName];
  if (!raw) return null;

  // Objective category scores
  const categories = {} as Record<CategoryKey, QoLCategoryScore>;
  for (const k of CATEGORY_KEYS) {
    categories[k] = scoreCategory(k, raw);
  }

  // Objective overall
  let objectiveQoL = 0;
  for (const k of CATEGORY_KEYS) {
    objectiveQoL += 0.20 * categories[k].score;
  }
  objectiveQoL = round2(objectiveQoL);

  // Personalization
  let personalQoL = objectiveQoL;
  const personalCategories = {} as Record<CategoryKey, QoLCategoryScore>;

  if (annualIncome != null && annualIncome > 0) {
    const rpp = (raw.rpp_all_items ?? 100) / 100;
    const realIncome = annualIncome / rpp;

    const budgetFractions: Record<CategoryKey, number> = { ...DEFAULT_BUDGET_FRACTIONS };
    if (budgetOverrides) {
      for (const k of CATEGORY_KEYS) {
        if (budgetOverrides[k] != null) {
          budgetFractions[k] = budgetOverrides[k]!;
        }
      }
    }

    personalQoL = 0;
    for (const k of CATEGORY_KEYS) {
      personalCategories[k] = personalizeCategory(k, categories[k], raw, realIncome, budgetFractions[k]);
      personalQoL += 0.20 * personalCategories[k].score;
    }
    personalQoL = round2(personalQoL);
  } else {
    // No personalization — personal = objective
    for (const k of CATEGORY_KEYS) {
      personalCategories[k] = { ...categories[k], subcategories: [...categories[k].subcategories] };
    }
  }

  const summary = generateSummary(stateName, categories);

  return {
    state: stateName,
    objective_qol: objectiveQoL,
    personal_qol: personalQoL,
    categories: {
      safety: categories.safety,
      healthcare: categories.healthcare,
      infrastructure: categories.infrastructure,
      environment: categories.environment,
      education: categories.education,
    },
    personal_categories: {
      safety: personalCategories.safety,
      healthcare: personalCategories.healthcare,
      infrastructure: personalCategories.infrastructure,
      environment: personalCategories.environment,
      education: personalCategories.education,
    },
    label: getQoLLabel(objectiveQoL),
    personal_label: getQoLLabel(personalQoL),
    summary,
    rank: 0,         // filled in by ranking pass
    personal_rank: 0, // filled in by ranking pass
  };
}

// ---------------------------------------------------------------------------
// Ranking helpers
// ---------------------------------------------------------------------------

function assignRanks(results: QoLResult[], field: 'objective_qol' | 'personal_qol'): void {
  const sorted = [...results].sort((a, b) => b[field] - a[field]);
  for (let i = 0; i < sorted.length; i++) {
    if (field === 'objective_qol') {
      sorted[i].rank = i + 1;
    } else {
      sorted[i].personal_rank = i + 1;
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getObjectiveQoL(stateName: string): QoLResult | null {
  const allResults = getAllStatesQoLRanked();
  return allResults.find((r) => r.state === stateName) ?? null;
}

export function getPersonalizedQoL(
  stateName: string,
  annualIncome: number,
  budgetOverrides?: Partial<Record<string, number>>,
): QoLResult | null {
  const allResults = getAllStatesPersonalizedRanked(annualIncome, budgetOverrides);
  return allResults.find((r) => r.state === stateName) ?? null;
}

export function getAllStatesQoLRanked(): QoLResult[] {
  const stateNames = Object.keys(STATE_QOL_RAW_DATA);
  const results: QoLResult[] = [];

  for (const st of stateNames) {
    const r = computeForState(st);
    if (r) results.push(r);
  }

  assignRanks(results, 'objective_qol');
  // For objective-only, personal rank mirrors objective rank
  for (const r of results) {
    r.personal_rank = r.rank;
  }

  results.sort((a, b) => a.rank - b.rank);
  return results;
}

export function getAllStatesPersonalizedRanked(
  annualIncome: number,
  budgetOverrides?: Partial<Record<string, number>>,
): QoLResult[] {
  const stateNames = Object.keys(STATE_QOL_RAW_DATA);
  const results: QoLResult[] = [];

  for (const st of stateNames) {
    const r = computeForState(st, annualIncome, budgetOverrides);
    if (r) results.push(r);
  }

  assignRanks(results, 'objective_qol');
  assignRanks(results, 'personal_qol');

  results.sort((a, b) => a.personal_rank - b.personal_rank);
  return results;
}

export function getStateRawData(stateName: string): StateQoLRawData | null {
  return STATE_QOL_RAW_DATA[stateName] ?? null;
}
