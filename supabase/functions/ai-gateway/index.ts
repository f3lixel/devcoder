import "jsr:@supabase/functions-js/edge-runtime.d.ts";
declare const Deno: any;

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
	"Access-Control-Max-Age": "86400",
	"Vary": "Origin, Access-Control-Request-Headers",
};

function jsonResponse(data: unknown, init?: ResponseInit) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-cache",
			...corsHeaders,
			...(init?.headers || {}),
		},
	});
}

// Extract files from AI response text
function extractFilesFromText(text: string): Array<{ path: string; content: string }> {
	const results: Array<{ path: string; content: string }> = [];
	if (!text) return results;

	const fenceRe = /```([^\n]*)\n([\s\S]*?)```/g;
	let m: RegExpExecArray | null;

	const tryFromHeader = (header: string): string | null => {
		const h = header.trim();
		// filename/path markers
		const kv = h.match(/(?:^|\s)(?:file(?:name)?|path)\s*[:=]\s*([^\s]+)/i);
		if (kv?.[1]) return kv[1];
		// header contains a filename-looking token
		const fileInHeader = h.match(/([A-Za-z0-9_./-]+\.(?:tsx|ts|jsx|js|mjs|cjs|css|html|json|md|txt|sh|yml|yaml|toml))/);
		if (fileInHeader?.[1]) return fileInHeader[1];
		return null;
	};

	const tryFromBody = (body: string): { path: string; content: string } | null => {
		const lines = body.split("\n");
		const checkLines = lines.slice(0, 3);
		for (let i = 0; i < checkLines.length; i++) {
			const line = checkLines[i];
			const cleaned = line.replace(/<!--\s*|\s*-->/g, "").trim();
			const m1 = cleaned.match(/^\s*(?:\/\/|#|;)?\s*(?:File|Filename|Path)\s*:\s*(.+?)\s*$/i);
			if (m1?.[1]) {
				const path = m1[1].trim();
				const content = [...lines.slice(0, i), ...lines.slice(i + 1)].join("\n");
				return { path, content };
			}
		}
		return null;
	};

	const normalizePath = (p: string): string => {
		let path = p.trim().replace(/^["'`]|["'`]$/g, "");
		path = path.replace(/^\[|\]$/g, "");
		if (!path.startsWith("/")) path = "/" + path;
		return path;
	};

	while ((m = fenceRe.exec(text)) != null) {
		const header = m[1] ?? "";
		const body = m[2] ?? "";

		let path = tryFromHeader(header);
		let content = body;

		if (!path) {
			const fromBody = tryFromBody(body);
			if (fromBody) {
				path = fromBody.path;
				content = fromBody.content;
			}
		}

		if (!path) continue;

		const normalized = normalizePath(path);
		if (!/\.[A-Za-z0-9]+$/.test(normalized)) continue;

		results.push({ path: normalized, content });
	}

	// De-duplicate by last occurrence
	const dedup: Record<string, string> = {};
	for (const f of results) dedup[f.path] = f.content;
	return Object.entries(dedup).map(([path, content]) => ({ path, content }));
}

// Check if prompt is asking for code generation
function isCodeGenerationRequest(prompt: string): boolean {
	const codeKeywords = [
		"erstelle", "create", "schreibe", "write", "generiere", "generate",
		"baue", "build", "implementiere", "implement", "code", "component",
		"function", "class", "app", "website", "interface", "api"
	];
	const lowerPrompt = prompt.toLowerCase();
	return codeKeywords.some(keyword => lowerPrompt.includes(keyword));
}

Deno.serve(async (req: Request) => {
	// Handle CORS preflight (reflect requested headers)
	if (req.method === "OPTIONS") {
		const requested = req.headers.get("Access-Control-Request-Headers");
		const headers = {
			...corsHeaders,
			...(requested ? { "Access-Control-Allow-Headers": requested } : {}),
		};
		return new Response(null, { status: 204, headers });
	}

	try {
		if (!OPENROUTER_API_KEY) {
			return jsonResponse({ error: "Missing OPENROUTER_API_KEY" }, { status: 500 });
		}

		if (req.method !== "POST") {
			return jsonResponse({ error: "Method not allowed" }, { status: 405 });
		}

		let body: unknown;
		try {
			body = await req.json();
		} catch {
			return jsonResponse({ error: "Invalid JSON" }, { status: 400 });
		}

		const prompt = (body && typeof body === "object" && (body as any).prompt) ? String((body as any).prompt) : "";
		if (!prompt.trim()) {
			return jsonResponse({ error: "Missing prompt" }, { status: 400 });
		}

		const isCodeRequest = isCodeGenerationRequest(prompt);

		// Enhance prompt for code generation
		const enhancedPrompt = isCodeRequest
			? `${prompt}

Bitte liefere lauffähigen Code als vollständige Dateien für eine React + Node.js Mini-Anwendung, die in einer Sandpack React Preview sofort funktioniert.

Wichtige Regeln:
1) Erstelle React-Komponenten und alle zugehörigen Dateien. Nutze Standard-Dateien für Sandpack:
   - /package.json (Dependencies, Scripts)
   - /App.js (Root React Komponente)
   - /index.js (ReactDOM Render)
   - /styles.css (globale Styles)
   - /public/index.html (Root HTML)
   - weitere Dateien wie /src/components/Sidebar.tsx, etc.
2) Verwende nur Browser-kompatiblen Code (keine Node APIs wie fs/net). Node-Funktionalität nur als Mock/Frontend-Simulation.
3) Jede Datei in einem eigenen Markdown-Codeblock mit Kopfzeile: "\`\`\`<lang> path:/relativer/pfad" und danach der Dateiinhalt.
4) Stelle sicher, dass Imports und Pfade konsistent sind und die App ohne Fehler startet.
5) Keine Erklärtexte innerhalb der Codeblöcke. Optionaler kurzer Text außerhalb der Blöcke ist erlaubt.`
			: prompt;

        // Use OpenRouter upstream with SSE and transform to plain text token stream
        const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Accept": "text/event-stream",
            },
            body: JSON.stringify({
                model: (body as any)?.model || "qwen/qwen3-next-80b-a3b-thinking",
                messages: [{ role: "user", content: enhancedPrompt }],
                stream: true,
                // Hint providers to include reasoning when supported
                include_reasoning: true,
                reasoning: { effort: "medium" },
            }),
            // Allow client abort to cancel upstream
            signal: (req as any).signal,
        });

		if (!upstream.ok) {
			let errText = "";
			try { errText = await upstream.text(); } catch { /* ignore */ }
			return jsonResponse({ error: "Upstream error", status: upstream.status, detail: errText }, { status: 502 });
		}

		if (!upstream.body) {
			return jsonResponse({ error: "No response body" }, { status: 500 });
		}

		// Transform upstream SSE (OpenAI-compatible JSON events) into typed SSE events
		const reader = upstream.body.getReader();
		const decoder = new TextDecoder();
		const encoder = new TextEncoder();

		let buffer = "";

		const stream = new ReadableStream<Uint8Array>({
			async start(controller) {
				const send = (obj: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
				// Prelude status
				send({ type: 'status', message: 'Analysiere Prompt…' });
				send({ type: 'stepStart', id: 'generate' });

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split(/\r?\n/);
					buffer = lines.pop() ?? "";
					for (const line of lines) {
						const t = line.trim();
						if (!t || t.startsWith(":")) continue;
						if (t.startsWith("data:")) {
							const payload = t.slice(5).trim();
							if (payload === "[DONE]") continue;
							try {
								const json = JSON.parse(payload);
								// Mid-stream provider error
								if (json?.error) {
									const msg = typeof json.error === 'string' ? json.error : (json.error?.message || 'Stream error');
									send({ type: 'error', message: msg });
									break;
								}
								const token = json?.choices?.[0]?.delta?.content ?? json?.choices?.[0]?.message?.content ?? "";
								if (token) send({ type: 'token', text: token });
								const rDelta = json?.choices?.[0]?.delta?.reasoning?.content
									?? json?.choices?.[0]?.delta?.reasoning_content
									?? json?.choices?.[0]?.message?.reasoning_content
									?? json?.reasoning_content;
								if (rDelta) {
									if (Array.isArray(rDelta)) {
										for (const ch of rDelta) {
											const txt = typeof ch === 'string' ? ch : (ch?.text ?? ch?.content ?? '');
											if (txt) send({ type: 'reasoning', text: txt });
										}
									} else {
										const txt = typeof rDelta === 'string' ? rDelta : (rDelta?.text ?? rDelta?.content ?? '');
										if (txt) send({ type: 'reasoning', text: txt });
									}
								}
								const finish = json?.choices?.[0]?.finish_reason;
								if (finish === 'error') {
									send({ type: 'error', message: 'Stream terminated by provider' });
									break;
								}
							} catch {
								if (payload) send({ type: 'token', text: payload });
							}
						} else {
							send({ type: 'token', text: t });
						}
					}
				}
				send({ type: 'stepDone', id: 'generate' });
				send({ type: 'done' });
				controller.close();
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/event-stream; charset=utf-8",
				"Cache-Control": "no-cache, no-transform",
				"Connection": "keep-alive",
				...corsHeaders,
			},
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		return jsonResponse({ error: message }, { status: 500 });
	}
});
