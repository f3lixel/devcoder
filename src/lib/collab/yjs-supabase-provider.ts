import * as Y from 'yjs';
import { supabaseBrowser } from '@/lib/supabase/client';

export type PresenceUser = { id: string; name?: string; color?: string; cursor?: { x: number; y: number } | null };

function encodeUpdate(update: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < update.length; i++) binary += String.fromCharCode(update[i]);
	return btoa(binary);
}

function decodeUpdate(b64: string): Uint8Array {
	const binary = atob(b64);
	const len = binary.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

export class YjsSupabaseProvider {
	readonly doc: Y.Doc;
	readonly text: Y.Text;
	private channel: ReturnType<ReturnType<typeof supabaseBrowser>['channel']> | null = null;
	private readonly room: string;
	private readonly user: PresenceUser;

	constructor(room: string, user: PresenceUser) {
		this.room = room;
		this.user = user;
		this.doc = new Y.Doc();
		this.text = this.doc.getText('content');
	}

	async connect() {
		const supabase = supabaseBrowser();
		this.channel = supabase.channel(`doc:${this.room}`, { config: { presence: { key: this.user.id } } });

		// Broadcast local updates
		const updateHandler = (update: Uint8Array) => {
			this.channel?.send({ type: 'broadcast', event: 'y-update', payload: { u: encodeUpdate(update) } });
		};
		this.doc.on('update', updateHandler);

		// Receive updates
		this.channel.on('broadcast', { event: 'y-update' }, (p: any) => {
			try { Y.applyUpdate(this.doc, decodeUpdate(p?.payload?.u)); } catch {}
		});

		// Presence
		this.channel.on('presence', { event: 'sync' }, (_event: any) => {
			// consumer can read presenceState(); nothing to do here
		});

		await this.channel.subscribe(async (status: string) => {
			if (status === 'SUBSCRIBED') {
				await this.channel?.track(this.user as any);
				// Request a full sync from someone else
				this.channel?.send({ type: 'broadcast', event: 'y-sync-req', payload: {} });
			}
		});

		// Respond to sync requests with full state
		this.channel.on('broadcast', { event: 'y-sync-req' }, () => {
			const update = Y.encodeStateAsUpdate(this.doc);
			this.channel?.send({ type: 'broadcast', event: 'y-sync-res', payload: { u: encodeUpdate(update) } });
		});

		// Apply incoming full-state sync
		this.channel.on('broadcast', { event: 'y-sync-res' }, (p: any) => {
			try { Y.applyUpdate(this.doc, decodeUpdate(p?.payload?.u)); } catch {}
		});
	}

	async disconnect() {
		await this.channel?.untrack();
		await this.channel?.unsubscribe();
		this.channel = null;
	}

	presenceState(): Record<string, PresenceUser> {
		const state = (this.channel as any)?.presenceState?.() ?? {};
		return state;
	}

	updateCursor(pos: { x: number; y: number } | null) {
		this.channel?.track({ ...this.user, cursor: pos } as any);
	}
}
