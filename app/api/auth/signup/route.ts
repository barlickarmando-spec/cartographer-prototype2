import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

// TEMPORARY FACADE: signup accepts any input, does not save to DB, just sets session and returns success so you can test onboarding.
// Remove this and restore real signup (Prisma + bcrypt) when ready.

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Empty or invalid JSON body is ok for facade
  }
  if (body == null || typeof body !== "object") body = {};

  const usernameTrim = typeof body.username === "string" ? body.username.trim() : "user";
  const emailTrim = typeof body.email === "string" ? body.email.trim() : "user@example.com";

  try {
    const session = await getSession();
    session.userId = "facade";
    session.isLoggedIn = true;
    session.username = usernameTrim || "user";
    session.email = emailTrim || "user@example.com";
    session.isDemo = true;
    await session.save();

    return NextResponse.json({
      success: true,
      user: { id: "facade", username: session.username, email: session.email, isDemo: true },
    });
  } catch (e) {
    console.error("Signup facade error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
