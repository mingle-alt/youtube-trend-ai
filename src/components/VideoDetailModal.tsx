"use client";

import { useState } from "react";
import AiResultPanel from "@/components/AiResultPanel";
import { AiModel, VideoAnalysisResult } from "@/types/ai";
import { YouTubeVideo } from "@/types/youtube";

interface Props {
  video: YouTubeVideo;
  aiModel: AiModel;
  onClose: () => void;
  onOpenComments: () => void;
}

function formatCount(n: string): string {
  const num = parseInt(n);
  if (isNaN(num)) return "0";
  if (num >= 100000000) return `${(num / 100000000).toFixed(1)}억`;
  if (num >= 10000) return `${(num / 10000).toFixed(1)}만`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}천`;
  return num.toLocaleString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function VideoDetailModal({ video, aiModel, onClose, onOpenComments }: Props) {
  const [aiAnalysis, setAiAnalysis] = useState<VideoAnalysisResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  async function handleAiAnalysis() {
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/ai/video-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ model: aiModel, video }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiAnalysis(data as VideoAnalysisResult);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "AI 영상 분석 중 오류가 발생했습니다.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl bg-gray-900 shadow-2xl border border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <img src={video.thumbnailUrl} alt={video.title} className="w-full h-56 object-cover" />
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-black/70 p-1.5 text-white hover:bg-black/90"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
              #{video.rank} 급상승
            </span>
            <span className="rounded-full bg-black/70 px-2 py-1 text-xs text-white">{video.duration}</span>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          <h2 className="text-lg font-bold leading-snug text-white">{video.title}</h2>
          <p className="mt-1 text-sm text-gray-400">{video.channelTitle}</p>
          <p className="mt-1 text-xs text-gray-600">{formatDate(video.publishedAt)}</p>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-gray-800 p-3 text-center">
              <p className="text-xl font-bold text-white">{formatCount(video.viewCount)}</p>
              <p className="text-xs text-gray-400">조회수</p>
            </div>
            <div className="rounded-xl bg-gray-800 p-3 text-center">
              <p className="text-xl font-bold text-white">{formatCount(video.likeCount)}</p>
              <p className="text-xs text-gray-400">좋아요</p>
            </div>
            <div className="rounded-xl bg-gray-800 p-3 text-center">
              <p className="text-xl font-bold text-white">{formatCount(video.commentCount)}</p>
              <p className="text-xs text-gray-400">댓글</p>
            </div>
          </div>

          {video.description && (
            <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-gray-400">{video.description}</p>
          )}

          {video.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {video.tags.slice(0, 8).map((tag: string) => (
                <span key={tag} className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {aiError && (
            <div className="mt-4 rounded-xl border border-sky-900 bg-sky-950/30 p-3 text-sm text-sky-200">
              {aiError}
            </div>
          )}

          {aiAnalysis && (
            <div className="mt-4">
              <AiResultPanel
                title="영상 AI 분석"
                data={aiAnalysis as unknown as Record<string, unknown>}
                onClose={() => setAiAnalysis(null)}
              />
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <a
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              YouTube에서 보기
            </a>
            <button
              onClick={handleAiAnalysis}
              disabled={aiLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-700 py-3 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
            >
              <svg className={`h-4 w-4 ${aiLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
              AI 분석
            </button>
            <button
              onClick={onOpenComments}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-700 py-3 text-sm font-semibold text-white hover:bg-gray-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              댓글 보기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
