import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId: string;
  isLoggedIn: boolean;
  username?: string;
  email?: string;
  isDemo?: boolean;
}

export interface CurrentUser {
  id: string;
  username: string;
  email: string;
  isDemo: boolean;
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "",
  cookieName: "cartographer_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    console.warn(
      "SESSION_SECRET is missing or shorter than 32 characters. Set it in .env (e.g. openssl rand -base64 32). Sessions will not persist."
    );
  }
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, { ...sessionOptions, password: secret || "temp-insecure-secret-min-32-chars!!" });
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return null;
  return session.userId;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) return null;
    if (session.isDemo && session.username != null && session.email != null) {
      return {
        id: session.userId,
        username: session.username,
        email: session.email,
        isDemo: true,
      };
    }
    const { prisma } = await import("@/lib/db");
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, username: true, email: true },
    });
    if (!user) return null;
    return { id: user.id, username: user.username, email: user.email, isDemo: false };
  } catch (e) {
    console.error("getCurrentUser error:", e);
    return null;
  }
}