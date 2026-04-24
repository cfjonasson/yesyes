import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, MODEL } from '@/lib/openai';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const openai = getOpenAIClient();

    const prompt = `Generate 8-12 flashcards from the following text.
Return ONLY valid JSON array:
[{"id": "1", "question": "...", "answer": "..."}]

Text:
${text.slice(0, 12000)}`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
    });

    const content = completion.choices[0]?.message?.content ?? '[]';
    // Extract JSON array from the response
    const match = content.match(/\[[\s\S]*\]/);
    const flashcards = match ? JSON.parse(match[0]) : [];

    return NextResponse.json({ flashcards });
  } catch (err) {
    console.error('Flashcards error:', err);
    const message = err instanceof Error ? err.message : 'Failed to generate flashcards';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
