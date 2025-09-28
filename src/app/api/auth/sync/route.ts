import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const res = NextResponse.json({ ok: true }, { status: 200 });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              res.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const body = await req.json().catch(() => ({} as any));
    const accessToken = body?.access_token as string | undefined;
    const refreshToken = body?.refresh_token as string | undefined;

    if (accessToken && refreshToken) {
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    } else {
      await supabase.auth.getUser();
    }

    return res;
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}


