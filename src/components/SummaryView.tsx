import type { Summary } from '@/lib/types';

interface Props {
  summary: Summary;
}

export default function SummaryView({ summary }: Props) {
  return (
    <div className="space-y-8">
      {/* Main Summary */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Summary</h2>
        <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap">
          {summary.mainSummary}
        </div>
      </section>

      {/* Key Takeaways */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Key Takeaways</h2>
        <ul className="space-y-2">
          {summary.keyTakeaways.map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-0.5 text-gray-400 font-medium">{i + 1}.</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Outline */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Outline</h2>
        <div className="space-y-4">
          {summary.outline.map((item, i) => (
            <div key={i}>
              <h3 className="font-medium text-gray-900 text-sm">{item.heading}</h3>
              {item.subpoints.length > 0 && (
                <ul className="mt-1 ml-4 space-y-1">
                  {item.subpoints.map((sp, j) => (
                    <li key={j} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>{sp}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
