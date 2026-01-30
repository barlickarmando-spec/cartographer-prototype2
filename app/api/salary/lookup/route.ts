import { NextResponse } from "next/server";
import { getStateSalary, getCitySalary } from "@/lib/salary";
import { isOccupationKey } from "@/lib/occupations";

export const runtime = "nodejs";

function getSalaryForLocation(locationName: string, occupation: string): number | null {
  if (!isOccupationKey(occupation)) return null;
  const stateSalary = getStateSalary(locationName, occupation);
  if (stateSalary != null) return stateSalary;
  return getCitySalary(locationName, occupation);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const locations = Array.isArray(body.locations) ? body.locations.filter((l: unknown) => typeof l === "string") : [];
    const primaryOccupation = typeof body.primaryOccupation === "string" ? body.primaryOccupation : "";
    const partnerOccupation = body.partnerOccupation != null && typeof body.partnerOccupation === "string" ? body.partnerOccupation : null;

    if (!primaryOccupation || !isOccupationKey(primaryOccupation)) {
      return NextResponse.json({ byLocation: [] });
    }

    const byLocation = locations.map((loc: string) => {
      const primarySalary = getSalaryForLocation(loc, primaryOccupation);
      const partnerSalary = partnerOccupation != null && isOccupationKey(partnerOccupation)
        ? getSalaryForLocation(loc, partnerOccupation)
        : null;
      return { location: loc, primarySalary, partnerSalary };
    });

    return NextResponse.json({ byLocation });
  } catch (e) {
    console.error("Salary lookup error:", e);
    return NextResponse.json({ byLocation: [] }, { status: 500 });
  }
}
