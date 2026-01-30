import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({ user: { id: user.id, username: user.username, email: user.email, isDemo: user.isDemo } });
  } catch (e) {
    console.error("GET /api/auth/me error:", e);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
