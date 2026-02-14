import { NextResponse } from "next/server";
import { searchLocations } from "@/lib/locations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10))) : 25;
    const results = Number.isNaN(limit) ? searchLocations(q, 25) : searchLocations(q, limit);
    return NextResponse.json(results);
  } catch (e) {
    console.error("Locations search error:", e);
    return NextResponse.json([], { status: 500 });
  }
}
