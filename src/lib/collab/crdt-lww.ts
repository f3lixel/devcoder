export type Timestamp = { wallTime: number; nodeId: string; counter: number };

export function compareTs(a: Timestamp, b: Timestamp): number {
	if (a.wallTime !== b.wallTime) return a.wallTime - b.wallTime;
	if (a.counter !== b.counter) return a.counter - b.counter;
	return a.nodeId < b.nodeId ? -1 : a.nodeId > b.nodeId ? 1 : 0;
}

export class LWWRegister<T> {
	private value: T | undefined;
	private ts: Timestamp | undefined;

	set(value: T, ts: Timestamp) {
		if (!this.ts || compareTs(ts, this.ts) >= 0) {
			this.value = value;
			this.ts = ts;
		}
	}

	get(): T | undefined {
		return this.value;
	}

	snapshot() {
		return { value: this.value, ts: this.ts };
	}
}

export class LWWMap<K extends string, V> {
	private entries = new Map<K, { reg: LWWRegister<V> }>();

	set(key: K, value: V, ts: Timestamp) {
		let e = this.entries.get(key);
		if (!e) {
			e = { reg: new LWWRegister<V>() };
			this.entries.set(key, e);
		}
		e.reg.set(value, ts);
	}

	get(key: K): V | undefined {
		return this.entries.get(key)?.reg.get();
	}

	toObject(): Record<string, V | undefined> {
		const out: Record<string, V | undefined> = {};
		for (const [k, e] of this.entries) out[k] = e.reg.get();
		return out;
	}
}
