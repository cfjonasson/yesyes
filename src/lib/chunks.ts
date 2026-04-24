import type { TextChunk } from './types';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'dare',
  'ought', 'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i',
  'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who', 'whom',
  'when', 'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'not', 'only', 'same', 'so',
  'than', 'too', 'very', 'just', 'about', 'above', 'after', 'before',
]);

export function chunkText(text: string, maxChars = 800): TextChunk[] {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chunks: TextChunk[] = [];
  let current = '';

  for (const para of paragraphs) {
    if (current.length + para.length > maxChars && current.length > 0) {
      chunks.push({ text: current.trim() });
      current = para;
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }
  if (current.trim()) {
    chunks.push({ text: current.trim() });
  }

  // If no paragraphs found, split by chars
  if (chunks.length === 0) {
    for (let i = 0; i < text.length; i += maxChars) {
      chunks.push({ text: text.slice(i, i + maxChars).trim() });
    }
  }

  return chunks;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

export function scoreChunks(query: string, chunks: TextChunk[], topN = 5): TextChunk[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return chunks.slice(0, topN);

  const querySet = new Set(queryTokens);
  if (querySet.size === 0) return chunks.slice(0, topN);

  const scored = chunks.map((chunk) => {
    const chunkTokens = tokenize(chunk.text);
    const chunkSet = new Set(chunkTokens);
    let overlap = 0;
    for (const t of querySet) {
      if (chunkSet.has(t)) overlap++;
    }
    const score = overlap / querySet.size;
    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN).map((s) => s.chunk);
}
