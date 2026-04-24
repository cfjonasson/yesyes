'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDocument, updateDocument } from '@/lib/storage';
import type { StudyDocument } from '@/lib/types';
import SummaryView from '@/components/SummaryView';
import FlashcardEditor from '@/components/FlashcardEditor';
import QuizPlayer from '@/components/QuizPlayer';
import ChatUI from '@/components/ChatUI';

type Tab = 'summary' | 'study' | 'chat';

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [doc, setDoc] = useState<StudyDocument | null>(null);
  const [tab, setTab] = useState<Tab>('summary');
  const [studyTab, setStudyTab] = useState<'flashcards' | 'quiz'>('flashcards');

  useEffect(() => {
    const d = getDocument(id);
    if (!d) {
      router.push('/');
      return;
    }
    setDoc(d);
  }, [id, router]);

  const handleUpdateFlashcards = (updatedFlashcards: StudyDocument['flashcards']) => {
    if (!doc) return;
    updateDocument(doc.id, { flashcards: updatedFlashcards });
    setDoc({ ...doc, flashcards: updatedFlashcards });
  };

  if (!doc) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 truncate">{doc.title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date(doc.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Main tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {(['summary', 'study', 'chat'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'summary' ? '📄 Summary' : t === 'study' ? '🎓 Study' : '💬 Chat'}
          </button>
        ))}
      </div>

      {/* Summary tab */}
      {tab === 'summary' && doc.summary && (
        <SummaryView summary={doc.summary} />
      )}

      {/* Study tab */}
      {tab === 'study' && (
        <div>
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setStudyTab('flashcards')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                studyTab === 'flashcards'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🃏 Flashcards
            </button>
            <button
              onClick={() => setStudyTab('quiz')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                studyTab === 'quiz'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📝 Quiz
            </button>
          </div>

          {studyTab === 'flashcards' && (
            <FlashcardEditor
              flashcards={doc.flashcards ?? []}
              onChange={handleUpdateFlashcards}
            />
          )}
          {studyTab === 'quiz' && (
            <QuizPlayer quiz={doc.quiz ?? []} />
          )}
        </div>
      )}

      {/* Chat tab */}
      {tab === 'chat' && (
        <ChatUI chunks={doc.chunks} />
      )}
    </div>
  );
}
