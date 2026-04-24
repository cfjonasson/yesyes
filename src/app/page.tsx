'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { saveDocument } from '@/lib/storage';
import { chunkText } from '@/lib/chunks';
import { MAX_PDF_SIZE_BYTES } from '@/lib/constants';
import type { StudyDocument } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [style, setStyle] = useState<'bullets' | 'paragraph'>('bullets');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_PDF_SIZE_BYTES) {
      setError('File too large. Maximum size is 25MB.');
      return;
    }
    setFile(f);
    setText('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let documentText = text.trim();
    let title = 'Untitled Document';

    if (!documentText && !file) {
      setError('Please paste text or upload a PDF file.');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Extract text from PDF if needed
      if (file) {
        setStep('Extracting text from PDF...');
        title = file.name.replace(/\.pdf$/i, '');
        const formData = new FormData();
        formData.append('file', file);
        const extractRes = await fetch('/api/extract', {
          method: 'POST',
          body: formData,
        });
        if (!extractRes.ok) {
          const err = await extractRes.json();
          throw new Error(err.error || 'Failed to extract PDF text');
        }
        const { text: extracted } = await extractRes.json();
        documentText = extracted;
      } else {
        // Use first line as title
        const firstLine = documentText.split('\n')[0].slice(0, 60);
        title = firstLine || 'Untitled Document';
      }

      if (!documentText.trim()) {
        throw new Error('No text could be extracted from the document.');
      }

      // Step 2: Summarize
      setStep('Generating summary...');
      const summarizeRes = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: documentText, length, style }),
      });
      if (!summarizeRes.ok) {
        const err = await summarizeRes.json();
        throw new Error(err.error || 'Failed to generate summary');
      }
      const summary = await summarizeRes.json();

      // Step 3: Flashcards
      setStep('Generating flashcards...');
      const flashcardsRes = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: documentText }),
      });
      if (!flashcardsRes.ok) {
        const err = await flashcardsRes.json();
        throw new Error(err.error || 'Failed to generate flashcards');
      }
      const { flashcards } = await flashcardsRes.json();

      // Step 4: Quiz
      setStep('Generating quiz...');
      const quizRes = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: documentText }),
      });
      if (!quizRes.ok) {
        const err = await quizRes.json();
        throw new Error(err.error || 'Failed to generate quiz');
      }
      const { quiz } = await quizRes.json();

      // Save to localStorage
      const id = crypto.randomUUID();
      const chunks = chunkText(documentText);
      const doc: StudyDocument = {
        id,
        title,
        text: documentText,
        chunks,
        createdAt: Date.now(),
        summary: { ...summary, length, style },
        flashcards,
        quiz,
      };
      saveDocument(doc);

      router.push(`/result/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
      setStep('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Study Summarizer</h1>
        <p className="text-gray-600">Paste text or upload a PDF to generate summaries, flashcards, and quizzes.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Text input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paste text
          </label>
          <textarea
            value={text}
            onChange={handleTextChange}
            rows={8}
            placeholder="Paste your study material here..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-gray-200" />
          <span className="text-sm text-gray-500">or</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* File upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload PDF (max 25MB)
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
          />
          {file && (
            <p className="mt-1 text-sm text-gray-500">Selected: {file.name}</p>
          )}
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Summary Length
            </label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {(['short', 'medium', 'long'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLength(l)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors capitalize ${
                    length === l
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Output Style
            </label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {(['bullets', 'paragraph'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors capitalize ${
                    style === s
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? step || 'Processing...' : 'Generate Study Materials'}
        </button>
      </form>
    </div>
  );
}
