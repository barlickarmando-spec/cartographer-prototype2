import { NextResponse } from "next/server";
import * as bcryptNamespace from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

const bcrypt = typeof bcryptNamespace.compare === "function" ? bcryptNamespace : (bcryptNamespace as any).default;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { login, password } = body;
    const loginTrim = typeof login === "string" ? login.trim() : "";

    if (!loginTrim || !password) {
      return NextResponse.json(
        { error: "Username or email and password are required." },
        { status: 400 }
      );
    }

    // Demo auth: any non-empty password, session-only
    if (process.env.DEMO_AUTH === "1") {
      const isEmail = loginTrim.includes("@");
      const session = await getSession();
      session.userId = "demo";
      session.isLoggedIn = true;
      session.username = isEmail ? loginTrim.split("@")[0] : loginTrim;
      session.email = isEmail ? loginTrim : `${loginTrim}@demo.local`;
      session.isDemo = true;
      await session.save();
      return NextResponse.json({
        success: true,
        user: {
          id: "demo",
          username: session.username,
          email: session.email,
          isDemo: true,
        },
      });
    }

    const isEmail = loginTrim.includes("@");
    const user = await prisma.user.findUnique({
      where: isEmail ? { email: loginTrim } : { username: loginTrim },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid username/email or password." }, { status: 401 });
    }

    if (!bcrypt?.compare) {
      console.error("bcrypt.compare not available");
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid username/email or password." }, { status: 401 });
    }

    const session = await getSession();
    session.userId = user.id;
    session.isLoggedIn = true;
    session.username = undefined;
    session.email = undefined;
    session.isDemo = false;
    await session.save();

    return NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, email: user.email, createdAt: user.createdAt },
    });
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
