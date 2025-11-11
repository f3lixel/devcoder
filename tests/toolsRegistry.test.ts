import { describe, it, expect } from 'vitest';
import { searchFile, grepProject, readFile } from '@/lib/tools/registry';

function makeSupabaseMock(rows: Array<{ path: string; content: string }>) {
  // very small builder that supports the chained calls we use
  const builder = {
    _rows: rows,
    select() { return this; },
    eq() { return this; },
    or() { return this; },
    limit() {
      return Promise.resolve({ data: this._rows, error: null });
    }
  };
  return {
    from() { return builder; }
  } as any;
}

describe('tools/registry', () => {
  it('searchFile returns hits with excerpts', async () => {
    const mock = makeSupabaseMock([
      { path: 'src/app/page.tsx', content: 'This renders the landing page layout' },
      { path: 'src/components/Header.tsx', content: 'Header component with sticky behavior' },
    ]);
    const hits = await searchFile(mock, 'proj-1', 'landing');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].path).toBeDefined();
  });

  it('grepProject finds regex matches with line numbers', async () => {
    const mock = makeSupabaseMock([
      { path: 'src/a.ts', content: 'line1\nhello world\nline3' },
      { path: 'src/b.ts', content: 'test\nHeader component\nfooter' },
    ]);
    const hits = await grepProject(mock, 'proj-1', /header|hello/i, { limitFiles: 10, limitHitsPerFile: 2 });
    expect(hits.some(h => h.path.endsWith('a.ts') && h.line === 2)).toBe(true);
    expect(hits.some(h => h.path.endsWith('b.ts'))).toBe(true);
  });

  it('readFile returns a single file content', async () => {
    const mock = makeSupabaseMock([
      { path: 'README.md', content: '# Title\nSome content' },
    ]);
    const file = await readFile(mock, 'proj-1', 'README.md');
    expect(file?.path).toBe('README.md');
    expect(file?.content).toContain('Title');
  });
});


