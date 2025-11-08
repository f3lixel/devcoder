import { createWorkflow, createStep } from '@mastra/core/workflows';
import z from 'zod';
import { codingAgent } from '../agent/coding-agent';

// Shared protocol to keep the UI todo-plan in sync with the existing /api/ai route
const todoProtocol = `You are integrated into a Next.js coding app that parses special fenced tool blocks.

Protocol for a visible To-do plan in the chat UI:
- Emit a first high-level plan immediately as a fenced block:
  \n\n\`\`\`tool: todo-plan
  {"plan": {"phase": "running", "progress": {"done": 0, "total": N}, "steps": [
    {"id": "s1", "type": "analyze", "label": "Analyze repository", "state": "pending"},
    {"id": "s2", "type": "create", "label": "Add route", "path": "/src/app/contact/page.tsx", "state": "pending"}
  ]}}
  \`\`\`
- While working, update using deltas with the same tool header. Examples:
  - Mark a step pending/done/error:
    \n\n\`\`\`tool: todo-plan
    {"delta": {"updateStep": {"id": "s1", "state": "done"}, "progress": {"done": 1}}}
    \`\`\`
  - Upsert or replace steps:
    \n\n\`\`\`tool: todo-plan
    {"delta": {"upsertStep": {"id": "s3", "type": "edit", "label": "Wire UI", "path": "/src/components/NewAIChat.tsx", "state": "pending"}}}
    \`\`\`
- Keep narrative reasoning outside of these blocks. Do not include prose in tool fences. Use concise IDs like s1, s2.
- When all done, send: {"delta": {"phase": "complete"}} in a final block.
`;

// Step: build the chat messages for the agent (mirrors the existing /api/ai route behavior)
const buildMessages = createStep({
  id: 'build-messages',
  inputSchema: z.object({
    goal: z.string().min(1),
    system: z.string().optional(),
    projectId: z.string().optional(),
    memory: z.string().optional(),
  }),
  outputSchema: z.object({
    messages: z.array(
      z.object({ role: z.enum(['system', 'user']), content: z.string() })
    ),
  }),
  execute: async ({ inputData }) => {
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (inputData.system && inputData.system.trim()) {
      messages.push({ role: 'system', content: inputData.system.trim() });
    }
    if (inputData.memory && inputData.memory.trim()) {
      messages.push({ role: 'system', content: `Session memory (read-only, keep consistent with user goals):\n${inputData.memory.trim()}` });
    }
    // Pass todo-plan protocol
    messages.push({ role: 'system', content: todoProtocol });

    // Strong output contract for the UI to ingest files into the sandbox editor
    messages.push({
      role: 'system',
      content:
        [
          'Output format for any code you produce:',
          '- For every file you create or modify, ECHO the full file in a fenced block with a path header.',
          '- Use exactly one file per code fence.',
          '- Header must include: path:/absolute-like/path starting with /. Example: tsx path:/src/components/Sidebar.tsx',
          '- Alternatively, the FIRST line inside the fence may be a comment containing an absolute path, e.g.: // /src/components/Sidebar.tsx OR <!-- /src/components/Sidebar.tsx --> OR /* /src/components/Sidebar.tsx */',
          '- Do not include commentary inside fences; only code.',
          '- Keep using tools (writeProjectFile[s]) to persist changes, BUT also echo the file as a code fence so the sandbox can ingest it live.'
        ].join('\n')
    });

    // Sandbox compatibility contract: ensure generated projects run in our Sandpack React template
    messages.push({
      role: 'system',
      content: [
        'Sandbox compatibility contract:',
        '- Always ensure a valid /package.json with dependencies: { "react": "^18.2.0", "react-dom": "^18.2.0" } (avoid React 19 canary/beta).',
        '- Ensure /public/index.html exists and contains <div id="root"></div>.',
        '- Provide one of these entrypoints: /index.js, /src/main.tsx, /src/main.jsx, /src/index.tsx, /src/index.jsx, or an /App.(js|tsx) used by /index.js.',
        '- If you emit TypeScript React, use .tsx and correct imports.',
        '- When unsure, emit /index.js that imports ./styles.css and renders <App /> from /App.js via react-dom/client.'
      ].join('\n')
    });

    // Require the agent to fetch current project state before making writes
    messages.push({
      role: 'system',
      content: [
        'Before writing any files:',
        '1) Call listProjectFiles (with optional prefix) to understand current structure.',
        '2) Only create directories/files that do not exist; prefer editing existing paths.',
        '3) If unsure, call readProjectFile before overwriting.',
      ].join('\n')
    });

    // Optionally include projectId so tools can act on the right project without extra clarification
    if (inputData.projectId) {
      messages.push({
        role: 'system',
        content: `Project context: projectId=${inputData.projectId}. When using project file tools, prefer passing this as projectId.`,
      });
    }

    // User goal last
    messages.push({ role: 'user', content: inputData.goal });
    return { messages };
  },
});

// Step: call the coding agent for a full completion (non-streaming)
const callAgent = createStep({
  id: 'call-agent',
  inputSchema: z.object({
    messages: z.array(z.object({ role: z.enum(['system', 'user']), content: z.string() })),
  }),
  outputSchema: z.object({ text: z.string() }),
  execute: async ({ inputData }) => {
    // Flatten messages to a single prompt string for maximum provider compatibility
    const prompt = inputData.messages
      .map(m => (m.role === 'system' ? `(system) ${m.content}` : m.content))
      .join('\n\n');
    const res = await codingAgent.generate(prompt, { maxSteps: 20 });
    return { text: res.text || '' };
  },
});

// Workflow: high-level wrapper that mirrors /api/ai behavior but via Mastra
export const aiChatWorkflow = createWorkflow({
  id: 'ai-chat-workflow',
  inputSchema: z.object({
    goal: z.string().min(1),
    system: z.string().optional(),
    projectId: z.string().optional(),
    memory: z.string().optional(),
  }),
  outputSchema: z.object({ text: z.string() }),
})
  .then(buildMessages)
  .then(callAgent)
  .commit();

// Convenience helper for streaming directly from the agent while reusing the message-builder step.
// This is useful for API routes that need token streaming.
export async function streamAiChat(input: {
  goal: string;
  system?: string;
  projectId?: string;
  memory?: string;
}) {
  const { messages } = await buildMessages.execute({ inputData: input } as any);
  const prompt = messages
    .map(m => (m.role === 'system' ? `(system) ${m.content}` : m.content))
    .join('\n\n');
  const stream = await codingAgent.stream(prompt, { maxSteps: 20 });
  return stream; // caller can iterate over stream.textStream
}
