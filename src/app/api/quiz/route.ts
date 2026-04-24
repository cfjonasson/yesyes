import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, MODEL } from '@/lib/openai';
import { MAX_TEXT_CHARS } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const openai = getOpenAIClient();

    const prompt = `Generate a quiz with 5 MCQ and 3 short-answer questions from the following text.
Return ONLY valid JSON array:
[
  {"id": "1", "type": "mcq", "question": "...", "choices": ["A", "B", "C", "D"], "answer": "A", "explanation": "..."},
  {"id": "2", "type": "short", "question": "...", "answer": "...", "explanation": "..."}
]

Text:
${text.slice(0, MAX_TEXT_CHARS)}`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
    });

    const content = completion.choices[0]?.message?.content ?? '[]';
    const match = content.match(/\[[\s\S]*\]/);
    const quiz = match ? JSON.parse(match[0]) : [];

    return NextResponse.json({ quiz });
  } catch (err) {
    console.error('Quiz error:', err);
    const message = err instanceof Error ? err.message : 'Failed to generate quiz';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
