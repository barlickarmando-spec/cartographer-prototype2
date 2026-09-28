import { NextResponse } from "next/server";
import * as bcryptNamespace from "bcryptjs";
import { getSession } from "@/lib/session";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const bcrypt = typeof bcryptNamespace.hash === "function" ? bcryptNamespace : (bcryptNamespace as any).default;

function validatePassword(pw: string): string | null {
  if (typeof pw !== "string") return "Password is required.";
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (/\s/.test(pw)) return "Password cannot contain spaces.";
  if (!/[A-Z]/.test(pw)) return "Password must include at least one capital letter.";
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, emailUpdates } = body;
    const emailTrim = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!emailTrim || !emailTrim.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    const pwError = validatePassword(password);
    if (pwError) {
      return NextResponse.json({ error: pwError }, { status: 400 });
    }

    if (!bcrypt?.hash) {
      console.error("bcrypt.hash not available");
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = randomUUID();

    let savedToDb = false;
    try {
      const { db } = await import("@/lib/db");
      const existing = db.findUserByEmail(emailTrim);
      if (existing) {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
      }
      db.createUser(userId, emailTrim, passwordHash, !!emailUpdates);
      savedToDb = true;
    } catch (dbErr) {
      console.warn("DB unavailable, creating session-only account:", dbErr);
    }

    const session = await getSession();
    session.userId = userId;
    session.isLoggedIn = true;
    session.email = emailTrim;
    session.isDemo = !savedToDb;
    await session.save();

    return NextResponse.json({
      success: true,
      user: { id: userId, email: emailTrim },
    });
  } catch (e) {
    console.error("Signup error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
