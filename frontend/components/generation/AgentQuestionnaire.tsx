'use client';

import { useState } from 'react';
import type { QuestionnaireQuestion } from '@/hooks/useGenerationProgress';

export interface AgentQuestionnaireProps {
  questions: QuestionnaireQuestion[];
  onSubmit: (answers: Record<string, string>) => void;
}

export function AgentQuestionnaire({ questions, onSubmit }: AgentQuestionnaireProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleChange = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleCheckboxChange = (id: string, option: string, checked: boolean) => {
    setAnswers((prev) => {
      const current = prev[id] ? prev[id].split(', ') : [];
      if (checked) {
        return { ...prev, [id]: [...current, option].join(', ') };
      }
      return { ...prev, [id]: current.filter((o) => o !== option).join(', ') };
    });
  };

  const allRequiredAnswered = questions.every(
    (q) => !q.required || (answers[q.id] && answers[q.id].trim().length > 0)
  );

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-6 shadow-lg backdrop-blur">
      <h3 className="mb-4 text-lg font-semibold text-slate-100">
        A few questions to help us build exactly what you need
      </h3>
      <div className="space-y-5">
        {questions.map((q) => (
          <div key={q.id}>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              {q.question}
              {q.required && <span className="ml-1 text-red-400">*</span>}
            </label>
            {q.type === 'text' && (
              <input
                type="text"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder={q.placeholder || 'Your answer...'}
                value={answers[q.id] || ''}
                onChange={(e) => handleChange(q.id, e.target.value)}
              />
            )}
            {q.type === 'radio' && q.options && (
              <div className="space-y-2">
                {q.options.map((option) => (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 hover:bg-slate-800"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={option}
                      checked={answers[q.id] === option}
                      onChange={() => handleChange(q.id, option)}
                      className="h-4 w-4 text-indigo-500 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-300">{option}</span>
                  </label>
                ))}
              </div>
            )}
            {q.type === 'checkbox' && q.options && (
              <div className="space-y-2">
                {q.options.map((option) => {
                  const selected = answers[q.id]
                    ? answers[q.id].split(', ').includes(option)
                    : false;
                  return (
                    <label
                      key={option}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 hover:bg-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) =>
                          handleCheckboxChange(q.id, option, e.target.checked)
                        }
                        className="h-4 w-4 rounded text-indigo-500 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-300">{option}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={() => onSubmit(answers)}
        disabled={!allRequiredAnswered}
        className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Submit Answers
      </button>
    </div>
  );
}
