import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "./lib/supabase/config";

export async function proxy(request: NextRequest) {
  const { url, key } = supabaseConfig();
  let response = NextResponse.next({ request });
  const client = createServerClient(url, key, {
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, cacheHeaders) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        for (const [name, value] of Object.entries(cacheHeaders ?? {}))
          response.headers.set(name, value);
      },
    },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
          signal: init?.signal ?? AbortSignal.timeout(15000),
        }),
    },
  });
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : undefined;
  const { data, error } = await client.auth.getClaims(token);
  if (!error && data?.claims?.sub) {
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  const target = new URL("/login", request.url);
  target.searchParams.set(
    "return_to",
    request.nextUrl.pathname + request.nextUrl.search,
  );
  const blocked = request.nextUrl.pathname.startsWith("/api/")
    ? NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Entre com sua conta para continuar.",
          },
        },
        { status: 401 },
      )
    : NextResponse.redirect(target);
  // A refreshed/deleted session cookie must survive redirects too.
  response.cookies.getAll().forEach((cookie) => blocked.cookies.set(cookie));
  blocked.headers.set("Cache-Control", "private, no-store");
  return blocked;
}
export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/leads/:path*",
    "/sites/:path*",
    "/crm/:path*",
    "/history/:path*",
    "/lists/:path*",
    "/opportunities/:path*",
    "/scripts/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/admin/:path*",
    "/proposals/:path*",
    "/api/v1/:path*",
    "/api/internal/:path*",
  ],
};
