import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, MODEL } from '@/lib/openai';
import { scoreChunks } from '@/lib/chunks';
import type { TextChunk } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { message, chunks, history } = await req.json() as {
      message: string;
      chunks: TextChunk[];
      history: { role: string; content: string }[];
    };

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const openai = getOpenAIClient();

    // Score and select top chunks
    const topChunks = scoreChunks(message, chunks ?? [], 5);

    const systemPrompt = `You are a study assistant. Answer the user's question ONLY using the provided document excerpts.
If the answer is not in the excerpts, say: "I cannot find the answer to that in the provided material."

For each part of your answer that is supported by the document, include a citation in this format: [EVIDENCE: "exact quote from document" (page N if available)]

Document excerpts:
${topChunks.map((c, i) => `[Excerpt ${i + 1}${c.page ? ` (page ${c.page})` : ''}]: ${c.text}`).join('\n\n')}`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history.slice(-10).map((h) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.3,
    });

    const answer = completion.choices[0]?.message?.content ?? 'No response generated.';

    // Extract evidence from the answer
    const evidenceRegex = /\[EVIDENCE:\s*"([^"]+)"(?:\s*\(page\s*(\d+)\))?\]/g;
    const evidence: { quote: string; page?: number }[] = [];
    let match;
    while ((match = evidenceRegex.exec(answer)) !== null) {
      evidence.push({
        quote: match[1],
        page: match[2] ? parseInt(match[2], 10) : undefined,
      });
    }

    // Clean the answer of evidence tags for display
    const cleanAnswer = answer.replace(evidenceRegex, '').trim();

    return NextResponse.json({ answer: cleanAnswer, evidence });
  } catch (err) {
    console.error('Chat error:', err);
    const message = err instanceof Error ? err.message : 'Chat failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
