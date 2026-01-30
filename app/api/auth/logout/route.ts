import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function POST() {
  try {
    const session = await getSession();
    session.destroy();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Logout error:", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
