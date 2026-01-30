import workbookData from '@/data/State_City_Data_Final.json';

/**
 * Raw workbook data type - matches the JSON structure
 */
type RawWorkbook = {
  [key: string]: unknown;
};

/**
 * Row type - a single row from any sheet (object with string keys)
 */
type Row = Record<string, unknown>;

/**
 * Get the raw workbook object defensively
 * @returns The raw workbook object, or empty object if unavailable
 */
export function getRawWorkbook(): RawWorkbook {
  try {
    if (!workbookData || typeof workbookData !== 'object') {
      console.warn('Workbook data is not a valid object');
      return {};
    }
    return workbookData as RawWorkbook;
  } catch (error) {
    console.error('Error loading workbook data:', error);
    return {};
  }
}

/**
 * Get a specific sheet by key
 * @param sheetKey - The key of the sheet to retrieve
 * @returns Array of rows from the sheet, or empty array if sheet doesn't exist
 */
export function getSheet(sheetKey: string): Row[] {
  try {
    const workbook = getRawWorkbook();
    const sheet = workbook[sheetKey];
    
    if (!sheet) {
      console.warn(`Sheet "${sheetKey}" not found in workbook`);
      return [];
    }
    
    if (!Array.isArray(sheet)) {
      console.warn(`Sheet "${sheetKey}" is not an array`);
      return [];
    }
    
    return sheet as Row[];
  } catch (error) {
    console.error(`Error loading sheet "${sheetKey}":`, error);
    return [];
  }
}

/**
 * List all top-level keys in the workbook.
 * Useful for discovering available sheet names when keys differ.
 * @returns Array of top-level keys
 */
export function listTopLevelKeys(): string[] {
  try {
    const workbook = getRawWorkbook();
    return Object.keys(workbook);
  } catch (error) {
    console.error('Error listing top-level keys:', error);
    return [];
  }
}

const FALLBACK_STATES_KEY = "rough_affordability_model";
const FALLBACK_CITIES_KEY = "rough_affordability_model_citie";

/**
 * Discover the sheet key for states (Tab A) by matching likely names.
 * Prefers keys that contain "affordability" and do not contain "cities" or "citie".
 * @returns Sheet key or null if none found
 */
function getStatesSheetKey(): string | null {
  try {
    const keys = listTopLevelKeys();
    const lower = (s: string) => s.toLowerCase();
    const statesKey = keys.find(
      (k) =>
        lower(k).includes("affordability") &&
        !lower(k).includes("cities") &&
        !lower(k).includes("citie")
    );
    return statesKey ?? null;
  } catch {
    return null;
  }
}

/**
 * Discover the sheet key for cities (Tab B) by matching likely names.
 * Prefers keys that contain "affordability" and ("cities" or "citie").
 * @returns Sheet key or null if none found
 */
function getCitiesSheetKey(): string | null {
  try {
    const keys = listTopLevelKeys();
    const lower = (s: string) => s.toLowerCase();
    const citiesKey = keys.find(
      (k) =>
        lower(k).includes("affordability") &&
        (lower(k).includes("cities") || lower(k).includes("citie"))
    );
    return citiesKey ?? null;
  } catch {
    return null;
  }
}

/**
 * Get rows from the states sheet (Tab A).
 * Uses discovered sheet key when possible; falls back to known key so build never breaks.
 * @returns Array of state rows (empty if sheet missing or invalid)
 */
export function getStatesRows(): Row[] {
  const key = getStatesSheetKey() ?? FALLBACK_STATES_KEY;
  return getSheet(key);
}

/**
 * Get rows from the cities sheet (Tab B).
 * Uses discovered sheet key when possible; falls back to known key so build never breaks.
 * @returns Array of city rows (empty if sheet missing or invalid)
 */
export function getCitiesRows(): Row[] {
  const key = getCitiesSheetKey() ?? FALLBACK_CITIES_KEY;
  return getSheet(key);
}

/**
 * Get rows from the rough_housing_model sheet (housing data)
 * @returns Array of housing rows
 */
export function getHousingRows(): Row[] {
  return getSheet('rough_housing_model');
}
