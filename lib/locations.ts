import { getStatesRows, getCitiesRows } from "@/lib/data";

export type LocationType = "state" | "city";

export type LocationOption = {
  id: string;
  type: LocationType;
  label: string;
  state?: string;
  rawName: string;
};

type Row = Record<string, unknown>;

const STATE_NAME_KEYS = ["State", "state", "Location", "location", "Name", "name"];
const CITY_NAME_KEYS = [
  "City/County",
  "City",
  "city",
  "Location",
  "location",
  "Name",
  "name",
];
const CITY_STATE_KEYS = ["State", "state", "State Name", "stateName"];

/**
 * Find the first key in the row that exists in the candidate list.
 * Defensive: JSON keys may differ across sources.
 */
function findKey(row: Row, candidates: string[]): string | null {
  if (!row || typeof row !== "object") return null;
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    if (keys.includes(candidate)) return candidate;
  }
  return null;
}

/**
 * Get string value from a row by key (or first matching candidate).
 * Returns trimmed string or empty string if missing/invalid.
 */
function getString(row: Row, candidates: string[]): string {
  const key = findKey(row, candidates);
  if (!key) return "";
  const val = row[key];
  if (val == null) return "";
  const s = String(val).trim();
  return s;
}

/**
 * Build all location options from states (Tab A) and cities (Tab B).
 * Deduplicated by id (case-insensitive), sorted: states A–Z, then cities A–Z.
 */
export function getAllLocationOptions(): LocationOption[] {
  const byIdLower = new Map<string, LocationOption>();

  const stateRows = getStatesRows();
  for (const row of stateRows) {
    const rawName = getString(row, STATE_NAME_KEYS);
    if (!rawName) continue;
    const id = `state:${rawName}`;
    const idLower = id.toLowerCase();
    if (byIdLower.has(idLower)) continue;
    byIdLower.set(idLower, {
      id,
      type: "state",
      label: rawName,
      rawName,
    });
  }

  const cityRows = getCitiesRows();
  for (const row of cityRows) {
    const cityRaw = getString(row, CITY_NAME_KEYS);
    if (!cityRaw) continue;
    const stateRaw = getString(row, CITY_STATE_KEYS);
    const label = stateRaw ? `${cityRaw}, ${stateRaw}` : cityRaw;
    const id = stateRaw ? `city:${cityRaw},${stateRaw}` : `city:${cityRaw}`;
    const idLower = id.toLowerCase();
    if (byIdLower.has(idLower)) continue;
    const opt: LocationOption = {
      id,
      type: "city",
      label,
      rawName: cityRaw,
    };
    if (stateRaw) opt.state = stateRaw;
    byIdLower.set(idLower, opt);
  }

  const states = Array.from(byIdLower.values())
    .filter((o) => o.type === "state")
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  const cities = Array.from(byIdLower.values())
    .filter((o) => o.type === "city")
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));

  return [...states, ...cities];
}

const DEFAULT_SEARCH_LIMIT = 25;

/**
 * Search locations by case-insensitive contains on label.
 * Returns up to limit results (default 25).
 */
export function searchLocations(query: string, limit: number = DEFAULT_SEARCH_LIMIT): LocationOption[] {
  const q = (query ?? "").trim();
  if (!q) return [];
  const all = getAllLocationOptions();
  const lower = q.toLowerCase();
  const matched = all.filter((o) => o.label.toLowerCase().includes(lower));
  return matched.slice(0, limit);
}
