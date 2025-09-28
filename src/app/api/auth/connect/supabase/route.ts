import { NextResponse } from "next/server"

export const runtime = "nodejs"

// GET /api/auth/connect/supabase?projectId=...
export async function GET(request: Request) {
	// 1) Read query params and required env vars
	const { searchParams, origin, protocol } = new URL(request.url)
	const projectId = searchParams.get("projectId")
	if (!projectId) {
		return NextResponse.json({ error: "Missing projectId" }, { status: 400 })
	}
	const clientId = process.env.SUPABASE_OAUTH_CLIENT_ID
	if (!clientId) {
		return NextResponse.json({ error: "Missing SUPABASE_OAUTH_CLIENT_ID" }, { status: 500 })
	}

	// 2) Build redirect_uri. Prefer explicit env var, fallback to dynamic current origin
	const envRedirect = process.env.SUPABASE_OAUTH_REDIRECT_URI
	const redirectUri = envRedirect ?? new URL("/api/auth/callback/supabase", origin).toString()

	// 3) Create a CSRF token and encode state with projectId
	const csrf = crypto.randomUUID()
	const statePayload = { projectId, csrf }
	const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url")

	// 4) Construct Supabase OAuth authorize URL (v1)
	const authorizeUrl = new URL("https://api.supabase.com/v1/oauth/authorize")
	authorizeUrl.searchParams.set("response_type", "code")
	authorizeUrl.searchParams.set("client_id", clientId)
	authorizeUrl.searchParams.set("redirect_uri", redirectUri)
	authorizeUrl.searchParams.set("state", state)
	const scope = process.env.SUPABASE_OAUTH_SCOPE
	if (scope) authorizeUrl.searchParams.set("scope", scope)

	// 5) Set CSRF cookie and redirect to Supabase OAuth
	const response = NextResponse.redirect(authorizeUrl)
	response.cookies.set("sb_oauth_csrf", csrf, {
		httpOnly: true,
		secure: protocol === "https:",
		sameSite: "lax",
		path: "/",
		maxAge: 60 * 10, // 10 minutes
	})
	return response
}
