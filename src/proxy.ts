import { NextResponse, type NextRequest } from "next/server";

/**
 * Fast-path route guard (Next 16 renamed this convention from Middleware to Proxy).
 *
 * Proxy only checks that a session cookie is *present* — it runs on the edge
 * runtime where the scrypt/HMAC verification in `lib/auth` isn't available. Actual authority sits in `requireAuth()` / `requireRole()` inside
 * the server components, which validate the signature, the session record and
 * the user's status on every request. This layer exists to bounce signed-out
 * visitors before a protected page starts rendering.
 */

const PUBLIC_ROUTES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/verify",
  "/forgot-password",
  "/reset-password",
  "/pending",
  "/setup",
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  if (pathname.startsWith("/invite/")) return true;
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has("ayava_session");

  if (!hasSession && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = `?redirect_url=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // Already signed in? The credential pages have nothing to offer.
  if (hasSession && (pathname === "/sign-in" || pathname === "/sign-up")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|webp|woff2?)$).*)"],
};
