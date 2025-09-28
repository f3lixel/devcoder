"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import { YjsSupabaseProvider, PresenceUser } from '@/lib/collab/yjs-supabase-provider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function randomColor(seed: string) {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
	const hue = Math.abs(hash) % 360;
	return `hsl(${hue} 70% 50%)`;
}

export default function CollaborativeDoc({ room }: { room: string }) {
	const [provider, setProvider] = useState<YjsSupabaseProvider | null>(null);
	const [text, setText] = useState('');
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);

	const me = useMemo<PresenceUser>(() => {
		const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random());
		return { id, name: `User-${id.slice(0, 4)}`, color: randomColor(id), cursor: null };
	}, []);

	useEffect(() => {
		const p = new YjsSupabaseProvider(room, me);
		p.connect();
		setProvider(p);

		const ytext = p.text;
		const sub = (ev: Y.YTextEvent, tr: Y.Transaction) => {
			setText(ytext.toString());
		};
		ytext.observe(sub);
		setText(ytext.toString());

		return () => {
			ytext.unobserve(sub);
			p.disconnect();
		};
	}, [room, me]);

	useEffect(() => {
		const el = textareaRef.current;
		if (!el) return;
		const move = (e: MouseEvent) => {
			provider?.updateCursor({ x: e.clientX, y: e.clientY });
		};
		const leave = () => provider?.updateCursor(null);
		el.addEventListener('mousemove', move);
		el.addEventListener('mouseleave', leave);
		return () => {
			el.removeEventListener('mousemove', move);
			el.removeEventListener('mouseleave', leave);
		};
	}, [provider]);

	const others = useMemo(() => {
		const state = provider?.presenceState() || {} as any;
		const list: Array<{ id: string; name?: string; color?: string; cursor?: { x: number; y: number } | null }> = [];
		for (const key of Object.keys(state)) {
			const arr = state[key] as any[];
			if (Array.isArray(arr)) arr.forEach(v => list.push(v));
		}
		return list.filter(u => u.id !== me.id);
	}, [provider, text, me.id]);

	return (
		<div className="flex h-full w-full flex-col">
			<div className="flex items-center gap-2 p-2 border-b">
				<div className="text-sm font-medium">Room: {room}</div>
				<div className="ml-auto flex items-center gap-2">
					{others.map(u => (
						<div key={u.id} className="flex items-center gap-1 text-xs" style={{ color: u.color }}>
							<div className="w-2 h-2 rounded-full" style={{ background: u.color }} />
							<span>{u.name ?? u.id.slice(0,4)}</span>
						</div>
					))}
				</div>
			</div>
			<div className="relative flex-1">
				<textarea
					ref={textareaRef}
					className={cn('w-full h-full p-3 outline-none', 'bg-transparent')}
					value={text}
					onChange={(e) => {
						setText(e.target.value);
						provider?.text.delete(0, provider?.text.length);
						provider?.text.insert(0, e.target.value);
					}}
					placeholder="Schreibe gemeinsam in Echtzeit…"
				/>
				{others.map(u => (
					u.cursor ? (
						<div key={`c-${u.id}`} className="pointer-events-none absolute text-[10px] px-1 py-0.5 rounded" style={{ left: u.cursor.x, top: u.cursor.y, background: u.color, color: 'white' }}>
							{u.name ?? u.id.slice(0,4)}
						</div>
					) : null
				))}
			</div>
			<div className="border-t p-2 text-xs text-muted-foreground">
				Yjs + Supabase Realtime (Broadcast + Presence)
			</div>
		</div>
	);
}
