import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, MODEL } from '@/lib/openai';
import { MAX_TEXT_CHARS } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const { text, length, style } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const openai = getOpenAIClient();

    const prompt = `You are a study assistant. Summarize the following text.
Summary length: ${length} (short=~100 words, medium=~250 words, long=~500 words)
Output style: ${style}

Return ONLY valid JSON with this exact shape:
{
  "mainSummary": "...",
  "keyTakeaways": ["...", "...", "..."],
  "outline": [{"heading": "...", "subpoints": ["...", "..."]}]
}

Text to summarize:
${text.slice(0, MAX_TEXT_CHARS)}`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content ?? '{}';
    const result = JSON.parse(content);

    return NextResponse.json(result);
  } catch (err) {
    console.error('Summarize error:', err);
    const message = err instanceof Error ? err.message : 'Failed to summarize';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
