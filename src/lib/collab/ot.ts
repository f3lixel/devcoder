export type InsertOp = { type: 'insert'; index: number; text: string };
export type DeleteOp = { type: 'delete'; index: number; length: number };
export type TextOp = InsertOp | DeleteOp;

export function apply(text: string, op: TextOp): string {
	if (op.type === 'insert') {
		const { index, text: t } = op;
		if (index < 0 || index > text.length) throw new Error('insert index out of bounds');
		return text.slice(0, index) + t + text.slice(index);
	} else {
		const { index, length } = op;
		if (index < 0 || index + length > text.length) throw new Error('delete range out of bounds');
		return text.slice(0, index) + text.slice(index + length);
	}
}

export function transform(a: TextOp, b: TextOp): { aPrime: TextOp; bPrime: TextOp } {
	// Transforms a against b, returning a' and b' such that applying in either order converges
	if (a.type === 'insert' && b.type === 'insert') {
		if (a.index < b.index || (a.index === b.index && a.text < b.text)) {
			return { aPrime: a, bPrime: { ...b, index: b.index + a.text.length } };
		} else {
			return { aPrime: { ...a, index: a.index + b.text.length }, bPrime: b };
		}
	}
	if (a.type === 'delete' && b.type === 'delete') {
		if (a.index >= b.index + b.length) {
			return { aPrime: { ...a, index: a.index - b.length }, bPrime: b };
		}
		if (b.index >= a.index + a.length) {
			return { aPrime: a, bPrime: { ...b, index: b.index - a.length } };
		}
		// Overlap
		const start = Math.min(a.index, b.index);
		const end = Math.max(a.index + a.length, b.index + b.length);
		const aEnd = a.index + a.length;
		const bEnd = b.index + b.length;
		const overlap = Math.min(aEnd, bEnd) - Math.max(a.index, b.index);
		const aPrime: DeleteOp = { type: 'delete', index: start, length: a.length - overlap };
		const bPrime: DeleteOp = { type: 'delete', index: start, length: b.length - overlap };
		return { aPrime, bPrime };
	}
	if (a.type === 'insert' && b.type === 'delete') {
		if (a.index <= b.index) return { aPrime: a, bPrime: { ...b, index: b.index + a.text.length } };
		if (a.index >= b.index + b.length) return { aPrime: { ...a, index: a.index - b.length }, bPrime: b };
		// insert inside deletion region -> shift insert to deletion index
		return { aPrime: { ...a, index: b.index }, bPrime: b };
	}
	if (a.type === 'delete' && b.type === 'insert') {
		const r = transform(b, a);
		return { aPrime: r.bPrime as TextOp, bPrime: r.aPrime as TextOp };
	}
	return { aPrime: a, bPrime: b };
}

export function compose(a: TextOp, b: TextOp): TextOp[] {
	// Compose two ops applied sequentially; may yield 0-2 ops
	const res: TextOp[] = [];
	const afterA = (text: string) => apply(text, a);
	try {
		const dummy = afterA('');
	} catch {}
	if (a.type === 'insert' && b.type === 'insert') {
		if (b.index >= a.index) return [a, { ...b, index: b.index + a.text.length }];
		return [a, b];
	}
	if (a.type === 'insert' && b.type === 'delete') {
		if (b.index >= a.index && b.index < a.index + a.text.length) {
			// deletion intersects newly inserted text
			const within = Math.min(b.length, a.index + a.text.length - b.index);
			const before = b.index - a.index;
			const newInsert = a.text.slice(0, before) + a.text.slice(before + within);
			const ops: TextOp[] = [];
			if (newInsert.length) ops.push({ type: 'insert', index: a.index, text: newInsert });
			const excess = b.length - within;
			if (excess > 0) ops.push({ type: 'delete', index: a.index, length: excess });
			return ops;
		}
		if (b.index >= a.index + a.text.length) return [a, { ...b, index: b.index + a.text.length }];
		return [a, b];
	}
	if (a.type === 'delete' && b.type === 'insert') {
		if (b.index <= a.index) return [{ ...a, index: a.index + b.text.length }, b];
		if (b.index >= a.index + a.length) return [a, b];
		return [a, { ...b, index: a.index }];
	}
	if (a.type === 'delete' && b.type === 'delete') {
		if (b.index >= a.index + a.length) return [a, { ...b, index: b.index - a.length }];
		if (b.index + b.length <= a.index) return [a, b];
		const start = Math.min(a.index, b.index);
		const end = Math.max(a.index + a.length, b.index + b.length);
		return [{ type: 'delete', index: start, length: end - start }];
	}
	return [a, b];
}
