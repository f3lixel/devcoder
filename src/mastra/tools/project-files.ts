import { createTool } from '@mastra/core/tools';
import z from 'zod';
import { supabaseService } from '@/lib/supabase/service';

export const listProjectFiles = createTool({
  id: 'listProjectFiles',
  description: 'List files for a project (flat list, persisted in Supabase)',
  inputSchema: z.object({
    projectId: z.string().min(1, 'projectId required'),
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
  execute: async ({ context }) => {
    try {
      const svc = supabaseService();
      const { data, error } = await svc
        .from('files')
        .select('path')
        .eq('project_id', context.projectId)
        .order('path');
      if (error) return { error: error.message };

      const all = (data || []).map((row: any) => row.path as string);
      const filtered = context.prefix
        ? all.filter(p => p.startsWith(context.prefix as string))
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
    projectId: z.string().min(1, 'projectId required'),
    path: z.string().min(1, 'path required'),
  }),
  outputSchema: z
    .object({ content: z.string(), path: z.string() })
    .or(z.object({ error: z.string() })),
  execute: async ({ context }) => {
    try {
      const svc = supabaseService();
      const { data, error } = await svc
        .from('files')
        .select('content, path')
        .eq('project_id', context.projectId)
        .eq('path', context.path)
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
    projectId: z.string().min(1, 'projectId required'),
    path: z.string().min(1, 'path required'),
    content: z.string().default(''),
  }),
  outputSchema: z
    .object({ success: z.boolean(), path: z.string() })
    .or(z.object({ error: z.string() })),
  execute: async ({ context }) => {
    try {
      const svc = supabaseService();
      const row = { project_id: context.projectId, path: context.path, content: context.content };
      const { error } = await svc.from('files').upsert([row], { onConflict: 'project_id,path' });
      if (error) return { error: error.message };
      return { success: true, path: context.path };
    } catch (e: any) {
      return { error: e?.message || 'failed to write file' };
    }
  },
});

export const writeProjectFiles = createTool({
  id: 'writeProjectFiles',
  description: 'Write (upsert) multiple files for a project',
  inputSchema: z.object({
    projectId: z.string().min(1, 'projectId required'),
    files: z
      .array(z.object({ path: z.string().min(1), content: z.string().default('') }))
      .min(1, 'files required'),
  }),
  outputSchema: z
    .object({ success: z.boolean(), filesWritten: z.array(z.string()) })
    .or(z.object({ error: z.string() })),
  execute: async ({ context }) => {
    try {
      const svc = supabaseService();
      const rows = context.files.map(f => ({ project_id: context.projectId, path: f.path, content: f.content }));
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
    projectId: z.string().min(1, 'projectId required'),
    path: z.string().min(1, 'path required'),
  }),
  outputSchema: z
    .object({ success: z.boolean(), path: z.string() })
    .or(z.object({ error: z.string() })),
  execute: async ({ context }) => {
    try {
      const svc = supabaseService();
      const { error } = await svc
        .from('files')
        .delete()
        .eq('project_id', context.projectId)
        .eq('path', context.path);
      if (error) return { error: error.message };
      return { success: true, path: context.path };
    } catch (e: any) {
      return { error: e?.message || 'failed to delete file' };
    }
  },
});


