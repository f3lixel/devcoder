export type TypedAIEvent =
	| { type: 'text'; content: string }
	| { type: 'code'; content: string; file?: string };

export type TypedAIHandlers = {
	onText: (text: string) => void;
	onCode: (filePath: string | undefined, content: string) => void;
};

// Liest einen Response-Stream (SSE oder Plain) und ruft passende Handler auf.
// Gibt true zurück, wenn mind. ein typisiertes Event erkannt wurde.
export async function readTypedAIStream(
	res: Response,
	handlers: TypedAIHandlers,
	signal?: AbortSignal
): Promise<boolean> {
	const reader = res.body?.getReader();
	if (!reader) return false;
	const decoder = new TextDecoder();
	let buffer = '';
	let sawTyped = false;

	const contentType = res.headers.get('content-type') || '';
	const isSSE = contentType.includes('text/event-stream');

	while (true) {
		const { value, done } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });

		if (isSSE) {
			let idx: number;
			while ((idx = buffer.indexOf('\n\n')) !== -1) {
				const chunk = buffer.slice(0, idx);
				buffer = buffer.slice(idx + 2);
				const line = chunk.split('\n').find((l) => l.startsWith('data: '));
				const raw = line ? line.slice(6).trim() : '';
				if (!raw) continue;
				try {
					const obj = JSON.parse(raw) as Partial<TypedAIEvent>;
					if (obj && typeof obj === 'object' && 'type' in obj) {
						sawTyped = true;
						if (obj.type === 'text' && typeof obj.content === 'string') {
							handlers.onText(obj.content);
							continue;
						}
						if (obj.type === 'code' && typeof obj.content === 'string') {
							handlers.onCode(typeof obj.file === 'string' ? obj.file : undefined, obj.content);
							continue;
						}
					}
				} catch {
					// ignorieren – kein typisiertes JSON
				}
			}
		} else {
			// Plain: verarbeite pro Zeile (NDJSON oder JSON Blöcke)
			let lineIdx: number;
			while ((lineIdx = buffer.indexOf('\n')) !== -1) {
				const line = buffer.slice(0, lineIdx).trim();
				buffer = buffer.slice(lineIdx + 1);
				if (!line) continue;
				try {
					const obj = JSON.parse(line) as Partial<TypedAIEvent>;
					if (obj && typeof obj === 'object' && 'type' in obj) {
						sawTyped = true;
						if (obj.type === 'text' && typeof obj.content === 'string') {
							handlers.onText(obj.content);
							continue;
						}
						if (obj.type === 'code' && typeof obj.content === 'string') {
							handlers.onCode(typeof obj.file === 'string' ? obj.file : undefined, obj.content);
							continue;
						}
					}
				} catch {
					// keine typisierte Zeile
				}
			}
		}
	}
	return sawTyped;
}

