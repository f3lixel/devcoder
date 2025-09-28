import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

// Persist tokens per project using Supabase DB via service role
async function saveProjectTokens({ projectId, accessToken, refreshToken, expiresIn }: { projectId: string; accessToken: string; refreshToken: string; expiresIn?: number }) {
	const admin = supabaseAdmin()
	const { error } = await admin.from("project_tokens").upsert({
		project_id: projectId,
		access_token: accessToken,
		refresh_token: refreshToken,
		expires_in: expiresIn ?? null,
		updated_at: new Date().toISOString(),
	}, { onConflict: "project_id" })
	if (error) throw error
}

export async function GET(request: Request) {
	// 1) Extract code and state from callback URL
	const url = new URL(request.url)
	const code = url.searchParams.get("code")
	const state = url.searchParams.get("state")
	if (!code || !state) {
		return NextResponse.json({ error: "Missing code or state" }, { status: 400 })
	}

	// 2) Verify CSRF using cookie and decode state to retrieve projectId
	const csrfCookie = (await cookies()).get("sb_oauth_csrf")?.value
	let projectId: string | undefined
	try {
		const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as { projectId: string; csrf: string }
		projectId = decoded.projectId
		if (!csrfCookie || decoded.csrf !== csrfCookie) {
			return NextResponse.json({ error: "Invalid CSRF" }, { status: 400 })
		}
	} catch {
		return NextResponse.json({ error: "Invalid state" }, { status: 400 })
	}
	if (!projectId) {
		return NextResponse.json({ error: "Missing projectId in state" }, { status: 400 })
	}

	// 3) Read env for token exchange
	const clientId = process.env.SUPABASE_OAUTH_CLIENT_ID
	const clientSecret = process.env.SUPABASE_OAUTH_CLIENT_SECRET
	if (!clientId || !clientSecret) {
		return NextResponse.json({ error: "Missing client credentials" }, { status: 500 })
	}
	const envRedirect = process.env.SUPABASE_OAUTH_REDIRECT_URI
	const redirectUri = envRedirect ?? new URL("/api/auth/callback/supabase", url.origin).toString()

	// 4) Exchange authorization code for tokens at Supabase token endpoint (v1)
	const tokenRes = await fetch("https://api.supabase.com/v1/oauth/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
		},
		body: new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: redirectUri,
		}).toString(),
	})

	if (!tokenRes.ok) {
		const text = await tokenRes.text()
		return NextResponse.json({ error: "Token exchange failed", status: tokenRes.status, details: text }, { status: 502 })
	}
	const tokens = await tokenRes.json() as { access_token: string; refresh_token: string; expires_in?: number }

	// 5) Persist tokens per project (non-blocking if service role key missing)
	const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
	if (hasServiceKey) {
		try {
			await saveProjectTokens({ projectId, accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresIn: tokens.expires_in })
		} catch (e: any) {
			console.error("Saving tokens failed", e?.message ?? e)
		}
	} else {
		console.warn("SUPABASE_SERVICE_ROLE_KEY not set; skipping token persistence")
	}

	// 6) Redirect back to the projects AI page with projectId and success flag; clear CSRF cookie
	const redirectBack = new URL(`/projects?projectId=${projectId}`, url.origin)
	redirectBack.searchParams.set("supabase", "connected")
	const res = NextResponse.redirect(redirectBack)
	res.cookies.set("sb_oauth_csrf", "", { maxAge: 0, path: "/" })
	return res
}
