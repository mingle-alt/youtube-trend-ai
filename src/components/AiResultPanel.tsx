"use client";

interface Props {
  title: string;
  data: Record<string, unknown>;
  onClose?: () => void;
}

const LABELS: Record<string, string> = {
  headline: "핵심",
  overview: "요약",
  keyInsights: "주요 인사이트",
  keywords: "키워드",
  opportunities: "기회",
  cautions: "주의점",
  summary: "요약",
  whyTrending: "인기 요인",
  audienceSignals: "시청자 신호",
  contentIdeas: "콘텐츠 아이디어",
  viralScore: "바이럴 점수",
  recommendedActions: "추천 액션",
  overallSentiment: "댓글 분위기",
  positiveSignals: "긍정 신호",
  negativeSignals: "부정 신호",
  repeatedTopics: "반복 주제",
  creatorTakeaways: "크리에이터 시사점",
};

function formatValue(value: unknown): string {
  if (typeof value === "number") return `${Math.round(value)}/100`;
  if (typeof value === "string") {
    const sentiment: Record<string, string> = {
      positive: "긍정",
      neutral: "중립",
      negative: "부정",
      mixed: "혼합",
    };
    return sentiment[value] ?? value;
  }
  return "";
}

export default function AiResultPanel({ title, data, onClose }: Props) {
  const entries = Object.entries(data).filter(([, value]) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value)
  );

  return (
    <section className="mb-4 rounded-xl border border-sky-900 bg-sky-950/30 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-sky-400">AI</p>
          <h2 className="text-base font-semibold text-white">{title}</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg border border-sky-900 px-2 py-1 text-xs text-sky-300 hover:bg-sky-900/40"
          >
            닫기
          </button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded-lg bg-gray-950/50 p-3">
            <p className="mb-1 text-xs font-semibold text-sky-300">
              {LABELS[key] ?? key}
            </p>
            {Array.isArray(value) ? (
              <ul className="space-y-1 text-sm leading-relaxed text-gray-300">
                {value.map((item, idx) => (
                  <li key={`${key}-${idx}`}>- {String(item)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-relaxed text-gray-300">
                {formatValue(value)}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
