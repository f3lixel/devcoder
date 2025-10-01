import { streamText, type CoreMessage } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// Für stabile SSE auf Next 15 explizit Edge-Runtime und dynamisches Rendering setzen
export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
	try {
		// Body sicher parsen
		const body = await req.json().catch(() => ({} as any));
		const { messages, prompt, system } = body || {};

		// OPENROUTER_API_KEY validieren
		if (!process.env.OPENROUTER_API_KEY) {
			return new Response(
				JSON.stringify({ error: "OPENROUTER_API_KEY is not set" }),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			);
		}

		// Provider initialisieren (im Handler, damit fehlende ENV nicht beim Import crasht)
		const openrouter = createOpenRouter({
			apiKey: process.env.OPENROUTER_API_KEY,
			headers: {
				"HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
				"X-Title": "felixel-dev",
			},
		});

		// Eingehende Nachrichten validieren und säubern
		let coreMessages: CoreMessage[] | undefined = undefined;
		if (Array.isArray(messages)) {
			const valid = (messages as Array<any>).filter(
				(m) => m && typeof m === "object" && typeof m.role === "string" && typeof m.content === "string"
			);
			if (valid.length > 0) {
				coreMessages = valid as CoreMessage[];
			}
		}

		// Fallback: prompt -> messages, ansonsten minimaler Start
		if (!coreMessages || coreMessages.length === 0) {
			if (typeof prompt === "string" && prompt.trim().length > 0) {
				coreMessages = [{ role: "user", content: prompt.trim() }];
			} else {
				coreMessages = [{ role: "user", content: "Hello" }];
			}
		}

		// Stream konfigurieren
		const result = await streamText({
			model: openrouter("openai/gpt-4o-mini"),
			messages: coreMessages,
			// System nur setzen, wenn vorhanden
			...(typeof system === "string" && system.trim().length > 0
				? { system: system.trim() }
				: {}),
		});

		// Stream als Text-SSE Antwort senden (kompatibel mit einfachen Client-Readern)
		return result.toTextStreamResponse();
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return new Response(
			JSON.stringify({ error: "Failed to process chat request", details: message }),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
}
