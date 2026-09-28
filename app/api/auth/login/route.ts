import { NextResponse } from "next/server";
import * as bcryptNamespace from "bcryptjs";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

const bcrypt = typeof bcryptNamespace.compare === "function" ? bcryptNamespace : (bcryptNamespace as any).default;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { login, password } = body;
    const loginTrim = typeof login === "string" ? login.trim().toLowerCase() : "";

    if (!loginTrim || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    let user: { id: string; email: string; password_hash: string } | null = null;
    try {
      const { db } = await import("@/lib/db");
      const found = db.findUserByEmail(loginTrim);
      if (found) user = found;
    } catch (dbErr) {
      console.warn("DB unavailable for login:", dbErr);
      return NextResponse.json({ error: "Account storage is temporarily unavailable. Please try again later." }, { status: 503 });
    }

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (!bcrypt?.compare) {
      console.error("bcrypt.compare not available");
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const session = await getSession();
    session.userId = user.id;
    session.isLoggedIn = true;
    session.email = user.email;
    session.isDemo = false;
    await session.save();

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
    });
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
