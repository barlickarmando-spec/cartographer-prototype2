import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "cartographer_session";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = path.startsWith("/account") || path.startsWith("/questionnaire");
  if (isProtected) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE);
    if (!sessionCookie?.value) {
      const login = new URL("/login", request.url);
      login.searchParams.set("from", path);
      return NextResponse.redirect(login);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/account", "/account/", "/questionnaire", "/questionnaire/"],
};
