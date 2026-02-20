/**
 * localStorage helpers for onboarding and user profile.
 * Defensive: fail gracefully if localStorage is unavailable or malformed.
 */

const KEY_ONBOARDING_ANSWERS = "onboardingAnswers";
const KEY_USER_PROFILE = "userProfile";
const KEY_SAVED_LOCATIONS = "savedLocations";

export { KEY_ONBOARDING_ANSWERS, KEY_USER_PROFILE, KEY_SAVED_LOCATIONS };

function safeGetItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // no-op
  }
}

/**
 * Get parsed onboarding answers from localStorage.
 * Returns null if missing, unparseable, or not an object.
 */
export function getOnboardingAnswers<T = unknown>(validator?: (data: unknown) => data is T): T | null {
  const raw = safeGetItem(KEY_ONBOARDING_ANSWERS);
  if (raw == null || raw === "") return null;
  try {
    const data = JSON.parse(raw) as unknown;
    if (data == null || typeof data !== "object") return null;
    if (validator) return validator(data) ? data : null;
    return data as T;
  } catch {
    return null;
  }
}

/**
 * Save onboarding answers to localStorage.
 */
export function setOnboardingAnswers(value: unknown): boolean {
  try {
    const json = JSON.stringify(value);
    return safeSetItem(KEY_ONBOARDING_ANSWERS, json);
  } catch {
    return false;
  }
}

/**
 * Get parsed user profile from localStorage.
 * Returns null if missing, unparseable, or not an object.
 */
export function getUserProfile<T = unknown>(validator?: (data: unknown) => data is T): T | null {
  const raw = safeGetItem(KEY_USER_PROFILE);
  if (raw == null || raw === "") return null;
  try {
    const data = JSON.parse(raw) as unknown;
    if (data == null || typeof data !== "object") return null;
    if (validator) return validator(data) ? data : null;
    return data as T;
  } catch {
    return null;
  }
}

/**
 * Save user profile to localStorage.
 */
export function setUserProfile(value: unknown): boolean {
  try {
    const json = JSON.stringify(value);
    return safeSetItem(KEY_USER_PROFILE, json);
  } catch {
    return false;
  }
}

/**
 * Get saved locations list from localStorage.
 */
export function getSavedLocations(): string[] {
  const raw = safeGetItem(KEY_SAVED_LOCATIONS);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Save locations list to localStorage.
 */
export function setSavedLocations(locations: string[]): boolean {
  try {
    return safeSetItem(KEY_SAVED_LOCATIONS, JSON.stringify(locations));
  } catch {
    return false;
  }
}

/**
 * Clear onboarding and user profile from localStorage (Reset onboarding).
 */
export function clearOnboardingStorage(): void {
  safeRemoveItem(KEY_ONBOARDING_ANSWERS);
  safeRemoveItem(KEY_USER_PROFILE);
}
