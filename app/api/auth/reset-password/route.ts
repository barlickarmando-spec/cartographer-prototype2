import { NextResponse } from "next/server";
import * as bcryptNamespace from "bcryptjs";

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
    const { token, password } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Reset token is required." }, { status: 400 });
    }

    const pwError = validatePassword(password);
    if (pwError) {
      return NextResponse.json({ error: pwError }, { status: 400 });
    }

    try {
      const { db } = await import("@/lib/db");
      const reset = db.findPasswordReset(token);

      if (!reset) {
        return NextResponse.json({ error: "This reset link is invalid or has already been used." }, { status: 400 });
      }

      if (new Date(reset.expires_at) < new Date()) {
        return NextResponse.json({ error: "This reset link has expired. Please request a new one." }, { status: 400 });
      }

      if (!bcrypt?.hash) {
        return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      db.updatePassword(reset.user_id, passwordHash);
      db.markResetUsed(token);

      return NextResponse.json({ success: true });
    } catch (dbErr) {
      console.warn("DB unavailable for password reset:", dbErr);
      return NextResponse.json({ error: "Password reset is temporarily unavailable." }, { status: 503 });
    }
  } catch (e) {
    console.error("Reset password error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
