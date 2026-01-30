/**
 * Salary lookup from workbook: state and city rows by occupation key.
 * Defensive: handles missing sheets/rows/keys gracefully.
 */

import type { OccupationKey } from "@/lib/occupations";
import { getStatesRows, getCitiesRows } from "@/lib/data";

type Row = Record<string, unknown>;

/** Candidate keys for the state name column (column A equivalent), in priority order */
const STATE_NAME_KEYS = [
  "State",
  "state",
  "Location",
  "location",
  "Name",
  "name",
] as const;

/** Candidate keys for the city name column (column A equivalent), in priority order */
const CITY_NAME_KEYS = [
  "City/County",
  "City",
  "city",
  "Location",
  "location",
  "Name",
  "name",
] as const;

function normalizeName(s: string): string {
  return s.trim().toLowerCase();
}

function getNameKey(row: Row, candidates: readonly string[]): string | null {
  for (const key of candidates) {
    if (key in row && row[key] != null && String(row[key]).trim() !== "") {
      return key;
    }
  }
  return null;
}

function findRowByName(
  rows: Row[],
  searchName: string,
  nameCandidates: readonly string[]
): Row | null {
  if (!rows.length) return null;
  const normSearch = normalizeName(searchName);
  const nameKey = getNameKey(rows[0], nameCandidates) ?? nameCandidates[0];
  for (const row of rows) {
    const val = row[nameKey];
    if (val == null) continue;
    if (normalizeName(String(val)) === normSearch) return row;
  }
  return null;
}

function salaryFromRow(row: Row, occupation: OccupationKey): number | null {
  const raw = row[occupation];
  if (raw == null) return null;
  if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

/**
 * Get state-level salary for a given state name and occupation.
 * Matches state by name (case-insensitive, trimmed) in the states sheet.
 * @returns Annual salary number or null if not found / invalid
 */
export function getStateSalary(
  stateName: string,
  occupation: OccupationKey
): number | null {
  try {
    if (!stateName || typeof stateName !== "string") return null;
    const rows = getStatesRows();
    const row = findRowByName(rows, stateName, STATE_NAME_KEYS);
    if (!row) return null;
    return salaryFromRow(row, occupation);
  } catch {
    return null;
  }
}

/**
 * Get city-level salary for a given city name and occupation.
 * Matches city by name (case-insensitive, trimmed) in the cities sheet.
 * @returns Annual salary number or null if not found / invalid
 */
export function getCitySalary(
  cityName: string,
  occupation: OccupationKey
): number | null {
  try {
    if (!cityName || typeof cityName !== "string") return null;
    const rows = getCitiesRows();
    const row = findRowByName(rows, cityName, CITY_NAME_KEYS);
    if (!row) return null;
    return salaryFromRow(row, occupation);
  } catch {
    return null;
  }
}
