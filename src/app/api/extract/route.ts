export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 25MB.' }, { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // pdf-parse uses CommonJS and has dynamic requires internally;
    // using require() here avoids ESM/CJS interop issues at runtime.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);

    const fullText = data.text as string;

    // Create chunks with page approximation
    const chunks = [];
    const pages = fullText.split(/\f/); // form feed character often separates pages
    if (pages.length > 1) {
      for (let i = 0; i < pages.length; i++) {
        const pageText = pages[i].trim();
        if (pageText) {
          chunks.push({ text: pageText, page: i + 1 });
        }
      }
    } else {
      // fallback: chunk by ~800 chars
      for (let i = 0; i < fullText.length; i += 800) {
        chunks.push({ text: fullText.slice(i, i + 800).trim() });
      }
    }

    return NextResponse.json({ text: fullText, chunks });
  } catch (err) {
    console.error('Extract error:', err);
    return NextResponse.json(
      { error: 'Failed to extract text from PDF.' },
      { status: 500 }
    );
  }
}
