import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPublicAdminAuthPath, requiresAdminRole } from "@/src/lib/admin-auth-policy";
import { isAuthCallbackPath, shouldRedirectAuthCallback } from "@/src/lib/auth-callback";
import { getAdminBasePath, isPathWithin, toPublicAdminPath } from "@/src/lib/admin-route";

const INTERNAL_ADMIN_BASE_PATH = "/admin";

function privateResponse(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

function hiddenNotFound(): NextResponse {
  return new NextResponse("Not Found", {
    status: 404,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const basePath = getAdminBasePath();

  if (!isAuthCallbackPath(pathname) && shouldRedirectAuthCallback(pathname, request.nextUrl.search, "")) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/confirm";
    return privateResponse(NextResponse.redirect(callbackUrl, 303));
  }

  const isLegacyAdminPath = isPathWithin(pathname, INTERNAL_ADMIN_BASE_PATH);

  // In production, `/admin` and every child path intentionally reveal nothing.
  if (isLegacyAdminPath && basePath !== INTERNAL_ADMIN_BASE_PATH) return hiddenNotFound();
  if (isAuthCallbackPath(pathname)) return privateResponse(NextResponse.next({ request }));
  if (!basePath || !isPathWithin(pathname, basePath)) return NextResponse.next({ request });

  const internalUrl = request.nextUrl.clone();
  internalUrl.pathname = `${INTERNAL_ADMIN_BASE_PATH}${pathname.slice(basePath.length)}`;
  const cookiesToPropagate = new Map<string, { name: string; value: string; options: CookieOptions }>();
  const headersToPropagate = new Map<string, string>();

  const applyAuthState = (target: NextResponse) => {
    for (const cookie of cookiesToPropagate.values()) {
      target.cookies.set(cookie.name, cookie.value, cookie.options);
    }
    for (const [name, value] of headersToPropagate) target.headers.set(name, value);
    return privateResponse(target);
  };
  const buildPrivateRewrite = () => applyAuthState(NextResponse.rewrite(internalUrl, { request }));

  let response = buildPrivateRewrite();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return new NextResponse("Service Unavailable", {
      status: 503,
      headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach((cookie) => {
          request.cookies.set(cookie.name, cookie.value);
          cookiesToPropagate.set(cookie.name, cookie);
        });
        Object.entries(headers).forEach(([name, value]) => headersToPropagate.set(name, value));
        response = buildPrivateRewrite();
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const internalPath = internalUrl.pathname;
  const isPublicAuthPage = isPublicAdminAuthPath(internalPath);

  if (!user && !isPublicAuthPage) {
    const loginPath = toPublicAdminPath("/admin/connexion");
    if (!loginPath) return hiddenNotFound();
    const destination = new URL(loginPath, request.url);
    return applyAuthState(NextResponse.redirect(destination));
  }

  if (user && requiresAdminRole(internalPath)) {
    const { data: role, error } = await supabase.from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || role?.role !== "admin") return hiddenNotFound();
  }

  if (user && internalPath === "/admin/connexion") {
    const { data: role, error } = await supabase.from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!error && role?.role === "admin") {
      const homePath = toPublicAdminPath("/admin");
      if (!homePath) return hiddenNotFound();
      return applyAuthState(NextResponse.redirect(new URL(homePath, request.url)));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
