"use client";

import { useEffect, useRef, useState } from "react";
import { getQuotaUsed, DAILY_LIMIT, resetQuota } from "@/lib/quota";

export default function QuotaWidget() {
  const [used, setUsed] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Refresh from localStorage every 3 s
  useEffect(() => {
    setUsed(getQuotaUsed());
    const id = setInterval(() => setUsed(getQuotaUsed()), 3_000);
    return () => clearInterval(id);
  }, []);

  // Close tooltip on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pct = Math.min((used / DAILY_LIMIT) * 100, 100);
  const barColor =
    pct > 80 ? "bg-red-500" : pct > 50 ? "bg-yellow-500" : "bg-green-500";
  const textColor =
    pct > 80 ? "text-red-400" : pct > 50 ? "text-yellow-400" : "text-green-400";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 hover:bg-gray-700 transition-colors"
        title="쿼터 현황 보기"
      >
        {/* Mini bar */}
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-700">
          <div
            className={`h-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`font-mono text-xs tabular-nums ${textColor}`}>
          {used.toLocaleString()}
          <span className="text-gray-600">/{(DAILY_LIMIT / 1000).toFixed(0)}K</span>
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-gray-700 bg-gray-900 p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-white">오늘의 쿼터 현황</p>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-500 hover:text-white"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-700">
            <div className={`h-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="mb-4 flex justify-between text-xs">
            <span className={textColor}>{used.toLocaleString()} 사용</span>
            <span className="text-gray-500">{(DAILY_LIMIT - used).toLocaleString()} 남음</span>
          </div>

          {/* Cost table */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-400">
              <span>videos.list</span>
              <span className="text-gray-500 font-mono">1 unit/호출</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>commentThreads.list</span>
              <span className="text-gray-500 font-mono">10 unit/호출</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>글로벌 TOP 100 1회</span>
              <span className="text-gray-500 font-mono">≈8 unit</span>
            </div>
            <div className="border-t border-gray-700 pt-1.5 flex justify-between text-gray-400">
              <span>일일 한도</span>
              <span className="text-gray-500 font-mono">10,000 unit</span>
            </div>
          </div>

          <button
            onClick={() => { resetQuota(); setUsed(0); }}
            className="mt-3 w-full rounded-lg border border-gray-700 py-1.5 text-xs text-gray-400 hover:border-gray-500 hover:text-white transition-colors"
          >
            카운터 리셋
          </button>
        </div>
      )}
    </div>
  );
}
