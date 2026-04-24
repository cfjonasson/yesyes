import type { StudyDocument } from './types';

const STORAGE_KEY = 'study_docs';

function getAll(): StudyDocument[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StudyDocument[];
  } catch {
    return [];
  }
}

function setAll(docs: StudyDocument[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

export function saveDocument(doc: StudyDocument): void {
  const docs = getAll();
  const existing = docs.findIndex((d) => d.id === doc.id);
  if (existing >= 0) {
    docs[existing] = doc;
  } else {
    docs.unshift(doc);
  }
  setAll(docs);
}

export function getDocument(id: string): StudyDocument | null {
  const docs = getAll();
  return docs.find((d) => d.id === id) ?? null;
}

export function getAllDocuments(): StudyDocument[] {
  return getAll();
}

export function updateDocument(id: string, updates: Partial<StudyDocument>): void {
  const docs = getAll();
  const idx = docs.findIndex((d) => d.id === id);
  if (idx >= 0) {
    docs[idx] = { ...docs[idx], ...updates };
    setAll(docs);
  }
}

export function deleteDocument(id: string): void {
  const docs = getAll().filter((d) => d.id !== id);
  setAll(docs);
}
