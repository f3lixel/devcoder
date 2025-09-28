import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { CoreMessage } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    const result = await streamText({
      model: openai('gpt-4'),
      messages: messages as CoreMessage[],
      onError: (error) => {
        console.error('Stream error:', error);
      },
    });

    // Convert the result to a streaming response
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ 
      error: 'An error occurred while processing your request' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}