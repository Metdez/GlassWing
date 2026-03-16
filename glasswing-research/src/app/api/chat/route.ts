import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { ResearchBrief } from '@/lib/types';

const RequestSchema = z.object({
  brief: z.record(z.string(), z.unknown()),
  question: z.string().min(1, 'Question cannot be empty'),
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let brief: ResearchBrief;
  let question: string;
  let history: { role: 'user' | 'assistant'; content: string }[];

  try {
    const body = await req.json();
    const parsed = RequestSchema.parse(body);
    brief = parsed.brief as unknown as ResearchBrief;
    question = parsed.question;
    history = parsed.history;
  } catch {
    return NextResponse.json(
      { error: 'Invalid request. Please provide a brief, question, and history.' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system:
          "You are a VC research assistant at Glasswing Ventures. You have access to a complete research brief about a company. Answer questions concisely and specifically, citing data from the brief. If the brief doesn't contain enough information to answer, say so and suggest what additional research would be needed.",
        messages: [
          {
            role: 'user',
            content: 'Here is the research brief for context: ' + JSON.stringify(brief),
          },
          {
            role: 'assistant',
            content:
              'I have the full research brief for ' +
              brief.companyName +
              '. What would you like to know?',
          },
          ...history,
          { role: 'user', content: question },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', err);
      return NextResponse.json(
        { error: 'Failed to get a response from Claude. Please try again.' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const answer =
      data.content?.[0]?.type === 'text' ? data.content[0].text : '';

    return NextResponse.json({ answer });
  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json(
      { error: 'Failed to get a response. Please try again.' },
      { status: 502 }
    );
  }
}
