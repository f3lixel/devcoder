import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const isProjectsBase = req.nextUrl.pathname === "/projects";
  const isProjectsRoute = req.nextUrl.pathname.startsWith("/projects");
  const accept = req.headers.get("accept") || "";
  const isPageNavigation = accept.includes("text/html");

  // Always allow the base /projects page (public landing for projects list/editor)
  if (isProjectsBase) {
    return res;
  }

  // For non-HTML requests (RSC/data prefetch), bypass all auth logic entirely
  if (isProjectsRoute && !isPageNavigation) {
    return res;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    // Missing config -> do not block; let the request pass through
    return res;
  }

  let user: any = null;
  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnon,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              res.cookies.set(name, value, options);
            });
          },
        },
      }
    );
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch {
    // If Supabase throws and we're navigating to a protected projects page, enforce login redirect
    if (isProjectsRoute && isPageNavigation) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("redirect", `${req.nextUrl.pathname}${req.nextUrl.search}`);
      url.searchParams.set("login", "1");
      return NextResponse.redirect(url);
    }
    return res;
  }

  if (isProjectsRoute && !user && isPageNavigation) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("redirect", `${req.nextUrl.pathname}${req.nextUrl.search}`);
    url.searchParams.set("login", "1");
    return NextResponse.redirect(url);
  }
  return res;
}
export const config = { matcher: [
  "/projects",
  "/projects/:path*",
] };


