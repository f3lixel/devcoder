import { createTool } from '@mastra/core/tools';
import z from 'zod';
import { supabaseService } from '@/lib/supabase/service';

export const listProjectFiles = createTool({
  id: 'listProjectFiles',
  description: 'List files for a project (flat list, persisted in Supabase)',
  inputSchema: z.object({
    projectId: z.string().optional().describe('Optional; will default to context.projectId'),
    prefix: z.string().optional().describe('Optional path prefix to filter'),
  }),
  outputSchema: z
    .object({
      files: z.array(
        z.object({
          name: z.string(),
          path: z.string(),
          isDirectory: z.boolean().default(false),
        }),
      ),
    })
    .or(z.object({ error: z.string() })),
  execute: async ({ input, context }) => {
    try {
      const projectId = (input as any)?.projectId || (context as any)?.projectId;
      if (!projectId) return { error: 'projectId missing' };
      const svc = supabaseService();
      const { data, error } = await svc
        .from('files')
        .select('path')
        .eq('project_id', projectId)
        .order('path');
      if (error) return { error: error.message };

      const all = (data || []).map((row: any) => row.path as string);
      const filtered = (input as any)?.prefix
        ? all.filter(p => p.startsWith(String((input as any).prefix)))
        : all;

      return {
        files: filtered.map(p => ({ name: p.split('/').pop() || p, path: p, isDirectory: false })),
      };
    } catch (e: any) {
      return { error: e?.message || 'failed to list files' };
    }
  },
});

export const readProjectFile = createTool({
  id: 'readProjectFile',
  description: 'Read a file content for a project (Supabase-backed)',
  inputSchema: z.object({
    projectId: z.string().optional().describe('Optional; will default to context.projectId'),
    path: z.string().min(1, 'path required'),
  }),
  outputSchema: z
    .object({ content: z.string(), path: z.string() })
    .or(z.object({ error: z.string() })),
  execute: async ({ input, context }) => {
    try {
      const projectId = (input as any)?.projectId || (context as any)?.projectId;
      if (!projectId) return { error: 'projectId missing' };
      const path = String((input as any)?.path || '');
      if (!path) return { error: 'path required' };
      const svc = supabaseService();
      const { data, error } = await svc
        .from('files')
        .select('content, path')
        .eq('project_id', projectId)
        .eq('path', path)
        .single();
      if (error) return { error: error.message };
      if (!data) return { error: 'not_found' };
      return { content: String(data.content ?? ''), path: data.path };
    } catch (e: any) {
      return { error: e?.message || 'failed to read file' };
    }
  },
});

export const writeProjectFile = createTool({
  id: 'writeProjectFile',
  description: 'Write (upsert) a single file for a project',
  inputSchema: z.object({
    projectId: z.string().optional().describe('Optional; will default to context.projectId'),
    path: z.string().min(1, 'path required'),
    content: z.string().default(''),
  }),
  outputSchema: z
    .object({ success: z.boolean(), path: z.string() })
    .or(z.object({ error: z.string() })),
  execute: async ({ input, context }) => {
    try {
      const projectId = (input as any)?.projectId || (context as any)?.projectId;
      if (!projectId) return { error: 'projectId missing' };
      const path = String((input as any)?.path || '');
      if (!path) return { error: 'path required' };
      const content = String((input as any)?.content ?? '');
      const svc = supabaseService();
      const row = { project_id: projectId, path, content };
      const { error } = await svc.from('files').upsert([row], { onConflict: 'project_id,path' });
      if (error) return { error: error.message };
      return { success: true, path };
    } catch (e: any) {
      return { error: e?.message || 'failed to write file' };
    }
  },
});

export const writeProjectFiles = createTool({
  id: 'writeProjectFiles',
  description: 'Write (upsert) multiple files for a project',
  inputSchema: z.object({
    projectId: z.string().optional().describe('Optional; will default to context.projectId'),
    files: z
      .array(z.object({ path: z.string().min(1), content: z.string().default('') }))
      .min(1, 'files required'),
  }),
  outputSchema: z
    .object({ success: z.boolean(), filesWritten: z.array(z.string()) })
    .or(z.object({ error: z.string() })),
  execute: async ({ input, context }) => {
    try {
      const projectId = (input as any)?.projectId || (context as any)?.projectId;
      if (!projectId) return { error: 'projectId missing' };
      const files = Array.isArray((input as any)?.files) ? (input as any).files : [];
      if (files.length === 0) return { error: 'files required' };
      const svc = supabaseService();
      const rows = files.map((f: any) => ({ project_id: projectId, path: String(f.path), content: String(f.content ?? '') }));
      const { error } = await svc.from('files').upsert(rows, { onConflict: 'project_id,path' });
      if (error) return { error: error.message };
      return { success: true, filesWritten: rows.map(r => r.path) };
    } catch (e: any) {
      return { error: e?.message || 'failed to write files' };
    }
  },
});

export const deleteProjectFile = createTool({
  id: 'deleteProjectFile',
  description: 'Delete a file for a project',
  inputSchema: z.object({
    projectId: z.string().optional().describe('Optional; will default to context.projectId'),
    path: z.string().min(1, 'path required'),
  }),
  outputSchema: z
    .object({ success: z.boolean(), path: z.string() })
    .or(z.object({ error: z.string() })),
  execute: async ({ input, context }) => {
    try {
      const projectId = (input as any)?.projectId || (context as any)?.projectId;
      if (!projectId) return { error: 'projectId missing' };
      const path = String((input as any)?.path || '');
      if (!path) return { error: 'path required' };
      const svc = supabaseService();
      const { error } = await svc
        .from('files')
        .delete()
        .eq('project_id', projectId)
        .eq('path', path);
      if (error) return { error: error.message };
      return { success: true, path };
    } catch (e: any) {
      return { error: e?.message || 'failed to delete file' };
    }
  },
});


