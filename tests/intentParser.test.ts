import { describe, it, expect } from 'vitest';
import { parseIntent } from '@/lib/intent/parser';

describe('parseIntent', () => {
  it('detects design intent', () => {
    const r = parseIntent('Build a landing page hero section');
    expect(r.intentType).toBe('design');
    expect(r.toolPlan.some(t => t.name === 'searchFile')).toBe(true);
  });

  it('detects edit intent', () => {
    const r = parseIntent('Fix the header alignment on mobile');
    expect(r.intentType).toBe('edit');
    expect(r.toolPlan.find(t => t.name === 'grepProject')).toBeTruthy();
  });

  it('detects integration intent', () => {
    const r = parseIntent('Add Supabase auth and storage');
    expect(r.intentType).toBe('integration');
    expect(r.toolPlan[0]?.name).toBe('searchFile');
  });

  it('detects knowledge intent', () => {
    const r = parseIntent('Wie funktioniert euer Auth-Flow?');
    expect(r.intentType).toBe('knowledge');
    expect(r.toolPlan[0]?.name).toBe('grepProject');
  });
});


