import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const maxDuration = 300;
import { runResearchWorkflow } from '@/lib/workflow';
import type { StreamEvent } from '@/lib/workflow';

const RequestSchema = z.object({
  url: z.string().url('Must be a valid URL'),
});

export async function POST(req: NextRequest): Promise<Response | NextResponse> {
  let url: string;
  try {
    const body = await req.json();
    ({ url } = RequestSchema.parse(body));
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid URL provided. Please enter a valid URL.' },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      };

      try {
        const result = await runResearchWorkflow(url, send);
        if (!result.success) {
          send({ type: 'error', data: { error: result.error ?? 'Research workflow failed.' } });
        } else {
          send({ type: 'done', data: result.brief! });
        }
      } catch (err) {
        send({ type: 'error', data: { error: String(err) } });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
