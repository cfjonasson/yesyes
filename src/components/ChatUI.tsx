'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, TextChunk } from '@/lib/types';

interface Props {
  chunks: TextChunk[];
}

export default function ChatUI({ chunks }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: msg };
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, chunks, history }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Chat failed');
      }
      const { answer, evidence } = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: answer, evidence, showEvidence: false },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err instanceof Error ? err.message : 'An error occurred.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleEvidence = (idx: number) => {
    setMessages((prev) =>
      prev.map((m, i) =>
        i === idx ? { ...m, showEvidence: !m.showEvidence } : m
      )
    );
  };

  return (
    <div className="flex flex-col h-[600px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">
            Ask any question about the document.
          </p>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.role === 'assistant' && msg.evidence && msg.evidence.length > 0 && (
                <div className="mt-2">
                  <button
                    onClick={() => toggleEvidence(idx)}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    {msg.showEvidence ? 'Hide' : 'Show'} evidence ({msg.evidence.length})
                  </button>
                  {msg.showEvidence && (
                    <div className="mt-2 space-y-2">
                      {msg.evidence.map((e, ei) => (
                        <div key={ei} className="border-l-2 border-gray-300 pl-2 text-xs text-gray-600">
                          <p className="italic">&ldquo;{e.quote}&rdquo;</p>
                          {e.page && <p className="text-gray-400 mt-0.5">Page {e.page}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-500">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 border-t border-gray-200 pt-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Ask a question about the document..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}
