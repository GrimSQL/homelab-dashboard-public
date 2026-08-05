import { NextResponse, type NextRequest } from "next/server";

// Paths that bypass auth. Everything else requires a session cookie.
// /signup + /api/signup are public so invite recipients can redeem without
// an account. Invite validity is enforced by the signup route handler.
const PUBLIC_PATH_PREFIXES = ["/login", "/signup", "/api/auth", "/api/signup"];

function isPublic(path: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets + the public pages
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    isPublic(pathname)
  ) {
    return NextResponse.next();
  }

  // The proxy runs on every request, so it only checks that a session cookie
  // is present — full validation happens in the dashboard layout's auth()
  // call, which owns the database round-trip. This is safe: the
  // cookie is signed/encrypted with AUTH_SECRET, so a forged one won't pass
  // auth() on the server.
  const sessionCookie =
    req.cookies.get("authjs.session-token") ??
    req.cookies.get("__Secure-authjs.session-token");

  if (!sessionCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
