/**
 * Normalize OnboardingAnswers into UserProfile with derived flags.
 */

import type { LocationOption } from "@/lib/locations";
import { OCCUPATION_KEYS, isOccupationKey } from "@/lib/occupations";
import type { OnboardingAnswers, UserProfile } from "./types";

function num(x: unknown): number | null {
  if (typeof x === "number" && !Number.isNaN(x)) return x;
  if (typeof x === "string") {
    const n = parseFloat(x);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function str(x: unknown): string {
  if (x == null) return "";
  return String(x);
}

export function normalizeOnboardingAnswers(answers: OnboardingAnswers): UserProfile {
  const a = answers ?? {};
  const goal = str(a.goal);
  const currentStatus = str(a.currentStatus);
  const relationshipStatus = str(a.relationshipStatus);
  const financialRelationship = str(a.financialRelationship);
  const planKids = str(a.planKids);
  const locationSituation = str(a.locationSituation);

  // isStudent: student_independent, student_soon, or career student_deciding / student_sure
  const isStudent =
    currentStatus === "student_independent" ||
    currentStatus === "student_soon" ||
    str(a.careerOutlook) === "student_deciding" ||
    str(a.careerOutlook) === "student_sure";

  // isFinanciallyIndependent
  const isFinanciallyIndependent = currentStatus === "graduated_independent" || currentStatus === "student_independent";

  // expectedIndependenceAge: from currentAge (already independent), expectedIndependenceAge, or expectedGraduationAge
  let expectedIndependenceAge: number | null = null;
  if (currentStatus === "graduated_independent") expectedIndependenceAge = num(a.currentAge) ?? null;
  else if (currentStatus === "student_soon") expectedIndependenceAge = num(a.expectedIndependenceAge) ?? null;
  else if (currentStatus === "student_independent") expectedIndependenceAge = num(a.expectedGraduationAge) ?? null;

  // householdType
  let householdType: UserProfile["householdType"] = "unknown";
  if (relationshipStatus === "single") householdType = "single";
  else if (relationshipStatus === "married") householdType = "married";
  else if (relationshipStatus === "prefer_not") householdType = "single";

  // numEarners: 1 or 2 based on relationship + financial relationship / two incomes
  let numEarners = 1;
  if (relationshipStatus === "married" && financialRelationship === "two_earners") numEarners = 2;
  else if (relationshipStatus === "single" && str(a.planToMarry) === "yes" && str(a.twoIncomesOrJustMe) === "two_incomes") numEarners = 2;

  // kidsPlan
  let kidsPlan: UserProfile["kidsPlan"] = "none";
  if (planKids === "yes") kidsPlan = "planned";
  else if (planKids === "already") kidsPlan = "existing";
  else if (planKids === "unsure") kidsPlan = "unsure";

  // locationMode
  let locationMode: UserProfile["locationMode"] = "unknown";
  if (locationSituation === "moving") locationMode = "moving";
  else if (locationSituation === "know_exactly") locationMode = "fixed";
  else if (locationSituation === "deciding") locationMode = "choosing";
  else if (locationSituation === "no_idea") locationMode = "unknown";

  // locations: defaultLocationId, currentLocation, consideredLocations
  const currentLocation: LocationOption | null =
    a.currentLocation && typeof a.currentLocation === "object" && "id" in a.currentLocation && "label" in a.currentLocation
      ? (a.currentLocation as LocationOption)
      : null;
  const selectedList: LocationOption[] = Array.isArray(a.selectedLocations)
    ? a.selectedLocations.filter((x): x is LocationOption => x != null && typeof x === "object" && "id" in x && "label" in x)
    : [];
  const defaultLocationId = currentLocation?.id ?? selectedList[0]?.id ?? null;

  // career: primary and partner occupation keys (fallback primary to first key if missing/invalid)
  const primaryOccupation = isOccupationKey(str(a.occupation)) ? str(a.occupation) : OCCUPATION_KEYS[0];
  const partnerOccupation = numEarners === 2 && isOccupationKey(str(a.partnerOccupation)) ? str(a.partnerOccupation) : null;

  return {
    raw: { ...a },
    isStudent,
    isFinanciallyIndependent,
    expectedIndependenceAge,
    householdType,
    numEarners,
    kidsPlan,
    locationMode,
    locations: {
      defaultLocationId,
      currentLocation: currentLocation ?? null,
      consideredLocations: selectedList,
    },
    career: { primaryOccupation, partnerOccupation },
  };
}
