import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password", "/invite", "/session-expired"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const demo = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DATA_MODE === "demo";
  const bearer = process.env.NEXT_PUBLIC_AUTH_STRATEGY === "bearer";
  if (demo || bearer || pathname === "/") return NextResponse.next();

  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (isPublic) return NextResponse.next();

  const cookieName = process.env.AUTH_SESSION_COOKIE || "wf_access";
  if (!request.cookies.get(cookieName)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
