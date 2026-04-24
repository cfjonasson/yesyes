'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllDocuments, deleteDocument } from '@/lib/storage';
import type { StudyDocument } from '@/lib/types';

export default function LibraryPage() {
  const [docs, setDocs] = useState<StudyDocument[]>([]);

  useEffect(() => {
    setDocs(getAllDocuments());
  }, []);

  const handleDelete = (id: string) => {
    deleteDocument(id);
    setDocs(getAllDocuments());
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Library</h1>
        <p className="text-gray-600">Your saved study documents.</p>
      </div>

      {docs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg mb-4">No documents saved yet.</p>
          <Link href="/" className="text-sm font-medium text-gray-900 underline">
            Create your first summary
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="border border-gray-200 rounded-lg px-5 py-4 flex items-center justify-between hover:border-gray-300 transition-colors"
            >
              <Link href={`/result/${doc.id}`} className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{doc.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {new Date(doc.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                  {doc.summary && (
                    <span className="ml-2 text-gray-400">
                      · {doc.summary.length} · {doc.summary.style}
                    </span>
                  )}
                </p>
              </Link>
              <button
                onClick={() => handleDelete(doc.id)}
                className="ml-4 text-sm text-gray-400 hover:text-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
