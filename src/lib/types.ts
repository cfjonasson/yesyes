export interface TextChunk {
  text: string;
  page?: number;
}

export interface OutlineItem {
  heading: string;
  subpoints: string[];
}

export interface Summary {
  length: 'short' | 'medium' | 'long';
  style: 'bullets' | 'paragraph';
  mainSummary: string;
  keyTakeaways: string[];
  outline: OutlineItem[];
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
}

export interface QuizItem {
  id: string;
  type: 'mcq' | 'short';
  question: string;
  choices?: string[];
  answer: string;
  explanation: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  evidence?: Evidence[];
  showEvidence?: boolean;
}

export interface Evidence {
  quote: string;
  page?: number;
}

export interface StudyDocument {
  id: string;
  title: string;
  text: string;
  chunks: TextChunk[];
  createdAt: number;
  summary?: Summary;
  flashcards?: Flashcard[];
  quiz?: QuizItem[];
}
