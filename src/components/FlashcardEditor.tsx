'use client';

import { useState } from 'react';
import type { Flashcard } from '@/lib/types';

interface Props {
  flashcards: Flashcard[];
  onChange: (flashcards: Flashcard[]) => void;
}

export default function FlashcardEditor({ flashcards, onChange }: Props) {
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [editQ, setEditQ] = useState('');
  const [editA, setEditA] = useState('');

  const toggleFlip = (id: string) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = (card: Flashcard) => {
    setEditing(card.id);
    setEditQ(card.question);
    setEditA(card.answer);
  };

  const saveEdit = (id: string) => {
    onChange(flashcards.map((c) => (c.id === id ? { ...c, question: editQ, answer: editA } : c)));
    setEditing(null);
  };

  const deleteCard = (id: string) => {
    onChange(flashcards.filter((c) => c.id !== id));
  };

  if (flashcards.length === 0) {
    return <p className="text-gray-500 text-sm">No flashcards available.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {flashcards.map((card) => (
        <div key={card.id} className="border border-gray-200 rounded-lg overflow-hidden">
          {editing === card.id ? (
            <div className="p-4 space-y-3">
              <textarea
                value={editQ}
                onChange={(e) => setEditQ(e.target.value)}
                rows={2}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-gray-400"
                placeholder="Question"
              />
              <textarea
                value={editA}
                onChange={(e) => setEditA(e.target.value)}
                rows={2}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-gray-400"
                placeholder="Answer"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => saveEdit(card.id)}
                  className="text-xs font-medium bg-gray-900 text-white px-3 py-1 rounded hover:bg-gray-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="text-xs font-medium text-gray-600 px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                className="p-4 min-h-[100px] cursor-pointer"
                onClick={() => toggleFlip(card.id)}
              >
                <div className="text-xs font-medium text-gray-400 uppercase mb-2">
                  {flipped.has(card.id) ? 'Answer' : 'Question'}
                </div>
                <p className="text-sm text-gray-800">
                  {flipped.has(card.id) ? card.answer : card.question}
                </p>
              </div>
              <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-between bg-gray-50">
                <button
                  onClick={() => toggleFlip(card.id)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Flip
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => startEdit(card)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteCard(card.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
