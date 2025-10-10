import { NextRequest } from 'next/server';
import { mastra } from '@/mastra';
import { codingAgent } from '@/mastra/agent/coding-agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Deprecated route – keep a friendly message if called by old clients
export async function POST(_req: NextRequest) {
  return new Response(JSON.stringify({ error: 'deprecated', message: 'Use /api/ai instead of /api/agent/coding' }), { status: 410 });
}


