'use client';

import { useState } from 'react';
import type { QuizItem } from '@/lib/types';

interface Props {
  quiz: QuizItem[];
}

interface Answer {
  value: string;
  submitted: boolean;
  correct?: boolean;
}

export default function QuizPlayer({ quiz }: Props) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [showExplanation, setShowExplanation] = useState<Record<string, boolean>>({});

  const setAnswer = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: { value, submitted: false } }));
  };

  const submitAnswer = (item: QuizItem) => {
    const ans = answers[item.id];
    if (!ans) return;
    // Short-answer grading uses a simple substring match on the first 3 answer
    // words as a best-effort heuristic. Users are shown the correct answer when
    // marked incorrect so they can self-assess.
    const correct =
      item.type === 'mcq'
        ? ans.value.trim().toLowerCase() === item.answer.trim().toLowerCase()
        : ans.value.trim().toLowerCase().includes(item.answer.trim().toLowerCase().split(' ').slice(0, 3).join(' '));
    setAnswers((prev) => ({
      ...prev,
      [item.id]: { ...ans, submitted: true, correct },
    }));
  };

  const reset = () => { setAnswers({}); setShowExplanation({}); };

  const submitted = Object.values(answers).filter((a) => a.submitted);
  const correct = submitted.filter((a) => a.correct).length;

  if (quiz.length === 0) {
    return <p className="text-gray-500 text-sm">No quiz available.</p>;
  }

  return (
    <div className="space-y-6">
      {submitted.length === quiz.length && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
          <p className="font-medium text-gray-900">
            Score: {correct}/{quiz.length} ({Math.round((correct / quiz.length) * 100)}%)
          </p>
          <button
            onClick={reset}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Retry
          </button>
        </div>
      )}

      {quiz.map((item) => {
        const ans = answers[item.id];
        const isSubmitted = ans?.submitted;

        return (
          <div key={item.id} className="border border-gray-200 rounded-lg p-5">
            <div className="flex items-start gap-2 mb-3">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                item.type === 'mcq' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
              }`}>
                {item.type === 'mcq' ? 'Multiple Choice' : 'Short Answer'}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-3">{item.question}</p>

            {item.type === 'mcq' && item.choices && (
              <div className="space-y-2 mb-3">
                {item.choices.map((choice) => (
                  <label
                    key={choice}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                      isSubmitted
                        ? choice === item.answer
                          ? 'border-green-400 bg-green-50 text-green-800'
                          : ans.value === choice && !ans.correct
                          ? 'border-red-300 bg-red-50 text-red-700'
                          : 'border-gray-200 text-gray-600'
                        : ans?.value === choice
                        ? 'border-gray-400 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={item.id}
                      value={choice}
                      disabled={isSubmitted}
                      onChange={() => setAnswer(item.id, choice)}
                      className="sr-only"
                    />
                    {choice}
                  </label>
                ))}
              </div>
            )}

            {item.type === 'short' && (
              <textarea
                value={ans?.value ?? ''}
                onChange={(e) => setAnswer(item.id, e.target.value)}
                disabled={isSubmitted}
                rows={2}
                placeholder="Type your answer..."
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-50 mb-3"
              />
            )}

            {!isSubmitted ? (
              <button
                onClick={() => submitAnswer(item)}
                disabled={!ans?.value}
                className="text-sm font-medium bg-gray-900 text-white px-4 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            ) : (
              <div className={`mt-2 text-sm rounded-lg p-3 ${
                ans.correct ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                <p className="font-medium">{ans.correct ? '✓ Correct' : '✗ Incorrect'}</p>
                {!ans.correct && (
                  <p className="mt-1">Correct answer: <span className="font-medium">{item.answer}</span></p>
                )}
                <button
                  onClick={() => setShowExplanation((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                  className="mt-1 text-xs underline opacity-70 hover:opacity-100"
                >
                  {showExplanation[item.id] ? 'Hide' : 'Show'} explanation
                </button>
                {showExplanation[item.id] && (
                  <p className="mt-1 text-xs">{item.explanation}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
