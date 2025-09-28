import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function textByteLength(input: string): number {
	// UTF-8 byte length
	return new TextEncoder().encode(input).length;
}

function isTransientDbError(message: string | undefined): boolean {
	if (!message) return false;
	const m = message.toLowerCase();
	return (
		m.includes("timeout") ||
		m.includes("connection") ||
		m.includes("deadlock") ||
		m.includes("could not serialize access")
	);
}

function makeSlug(input: string): string {
	const base = input
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
	const suffix = Math.random().toString(36).slice(2, 6);
	return base ? `${base}-${suffix}` : `project-${suffix}`;
}

export async function POST(req: NextRequest) {
	const errorId = crypto.randomUUID();
	let jwt: string | null = null;
	try {
		const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
		if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
			jwt = authHeader.slice(7).trim();
		}

		const supabase = await supabaseServer();
		let verifiedUserId: string | null = null;
		if (jwt) {
			const { data, error } = await supabase.auth.getUser(jwt);
			if (!error && data?.user) {
				verifiedUserId = data.user.id;
			}
		}
		if (!verifiedUserId) {
			const { data, error } = await supabase.auth.getUser();
			if (error || !data?.user) {
				return NextResponse.json({ status: "error", error: "unauthorized", message: "Kein gültiger Benutzerkontext (Token fehlt oder ungültig).", error_id: errorId }, { status: 401 });
			}
			verifiedUserId = data.user.id;
		}

		// Parse and validate payload
		const payload = await req.json().catch(() => null);
		if (!payload || typeof payload !== "object") {
			return NextResponse.json({ status: "error", error: "bad_request", message: "Ungültiger JSON-Body.", error_id: errorId }, { status: 400 });
		}

		let { user_id, name, metadata } = payload as {
			user_id?: string | null;
			name?: string | null;
			metadata?: unknown;
		};

		// user_id rule
		if (user_id && user_id !== verifiedUserId) {
			return NextResponse.json({ status: "error", error: "forbidden", message: "Die angegebene user_id entspricht nicht dem angemeldeten Benutzer.", error_id: errorId }, { status: 403 });
		}
		const effectiveUserId = verifiedUserId;

		// name validation
		if (typeof name !== "string") {
			return NextResponse.json({ status: "error", error: "bad_request", message: "Feld 'name' (String) ist erforderlich.", error_id: errorId }, { status: 400 });
		}
		const nameTrimmed = name.trim();
		if (nameTrimmed.length < 3 || nameTrimmed.length > 200) {
			return NextResponse.json({ status: "error", error: "bad_request", message: "'name' muss zwischen 3 und 200 Zeichen lang sein.", error_id: errorId }, { status: 400 });
		}
		if (/^[\r\n]|[\r\n]$/.test(name)) {
			return NextResponse.json({ status: "error", error: "bad_request", message: "'name' darf nicht mit einem Zeilenumbruch beginnen oder enden.", error_id: errorId }, { status: 400 });
		}

		// metadata validation
		let metadataValue: Record<string, unknown> | null = null;
		if (metadata !== undefined) {
			try {
				const json = JSON.parse(JSON.stringify(metadata));
				const size = textByteLength(JSON.stringify(json));
				if (size > 10 * 1024) {
					return NextResponse.json({ status: "error", error: "bad_request", message: "'metadata' darf maximal 10 KB groß sein.", error_id: errorId }, { status: 400 });
				}
				metadataValue = json as Record<string, unknown>;
			} catch (_e) {
				return NextResponse.json({ status: "error", error: "bad_request", message: "'metadata' muss JSON-serialisierbar sein.", error_id: errorId }, { status: 400 });
			}
		}

		// Ensure a profile row with UUID exists for this user (required by policies)
		let user_uuid: string | undefined;
		{
			const { data: profile } = await supabase
				.from("profiles")
				.select("uuid")
				.eq("id", effectiveUserId)
				.single();
			user_uuid = profile?.uuid;
		}
		if (!user_uuid && process.env.SUPABASE_SERVICE_ROLE_KEY) {
			try {
				const admin = supabaseAdmin();
				// Upsert profile with generated UUID
				await admin.from("profiles").upsert({ id: effectiveUserId }, { onConflict: "id" });
				// Re-read uuid
				const { data: p2, error: e2 } = await admin.from("profiles").select("uuid").eq("id", effectiveUserId).single();
				if (!e2 && p2?.uuid) user_uuid = p2.uuid as string;
			} catch {}
		}

		// Insert with simple retry on transient errors
		const supabaseInsert = async () => {
			return await supabase
				.from("projects")
				.insert({ owner_id: effectiveUserId, user_uuid, name: nameTrimmed, slug: makeSlug(nameTrimmed), meta: metadataValue ?? {} })
				.select("id, owner_id, name, meta, created_at")
				.single();
		};

		let lastError: any = null;
		for (let attempt = 0; attempt < 3; attempt++) {
			const { data, error } = await supabaseInsert();
			if (!error && data) {
				return NextResponse.json({ status: "ok", project: data }, { status: 200 });
			}
			lastError = error;
			if (!isTransientDbError(error?.message)) break;
			await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt)));
		}

		// Constraint errors -> 400, others -> 500
		const msg = lastError?.message || "Unbekannter Datenbankfehler.";
		const isConstraint = /unique|constraint|violates|invalid input value/i.test(msg);
		const status = isConstraint ? 400 : 500;
		console.error("create_project_error", { errorId, msg, details: lastError });
		return NextResponse.json({ status: "error", error: isConstraint ? "bad_request" : "internal", message: msg, error_id: errorId }, { status });
	} catch (e: any) {
		console.error("create_project_unhandled", { errorId, e });
		return NextResponse.json({ status: "error", error: "internal", message: "Interner Serverfehler.", error_id: errorId }, { status: 500 });
	}
}
