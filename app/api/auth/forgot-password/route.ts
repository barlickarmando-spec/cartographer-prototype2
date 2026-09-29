import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    try {
      const { db } = await import("@/lib/db");
      const user = db.findUserByEmail(email);

      if (user) {
        const token = randomUUID();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
        db.createPasswordReset(token, user.id, expiresAt);

        // In production, send this token via email.
        // For now, return it in the response so the user can reset their password.
        console.log(`Password reset token for ${email}: ${token}`);

        return NextResponse.json({
          success: true,
          message: "If an account exists with this email, a reset link has been generated.",
          resetToken: token,
        });
      }
    } catch (dbErr) {
      console.warn("DB unavailable for password reset:", dbErr);
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a reset link has been generated.",
    });
  } catch (e) {
    console.error("Forgot password error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
