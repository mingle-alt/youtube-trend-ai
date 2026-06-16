"use client";

import { useState } from "react";

interface Props {
  initialKeys?: string[];
  onSave: (keys: string[]) => void;
}

export default function ApiKeyModal({ initialKeys = [], onSave }: Props) {
  const [input, setInput] = useState(initialKeys.join("\n"));
  const [error, setError] = useState("");

  const parsedKeys = input
    .split(/[,\n]/)
    .map((k) => k.trim())
    .filter(Boolean);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (parsedKeys.length === 0) {
      setError("API 키를 입력해주세요.");
      return;
    }
    onSave(parsedKeys);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-gray-900 p-8 shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-600">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">YouTube 트렌드 분석기</h2>
            <p className="text-xs text-gray-400 mt-0.5">API 키 설정</p>
          </div>
        </div>

        {/* Info */}
        <p className="mb-4 text-sm text-gray-400">
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-400 hover:text-red-300 underline"
          >
            Google Cloud Console
          </a>
          에서 YouTube Data API v3 키를 발급받아 입력하세요.
        </p>

        {/* Multi-key tip */}
        <div className="mb-4 flex gap-2 rounded-lg border border-blue-800 bg-blue-900/20 p-3">
          <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-blue-300">
            <strong>멀티 키 등록:</strong> 줄바꿈 또는 쉼표(,)로 여러 키를 구분하면 쿼터 초과 시 자동으로 다음 키로 전환됩니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError("");
              }}
              placeholder={"AIzaKey1...\nAIzaKey2...\nAIzaKey3..."}
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 font-mono text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
          </div>

          {/* Key chips */}
          {parsedKeys.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {parsedKeys.map((k, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 rounded-full border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      i === 0 ? "bg-green-400" : "bg-gray-500"
                    }`}
                  />
                  <span className="font-mono text-gray-300">
                    {k.slice(0, 8)}···
                  </span>
                  {i === 0 && (
                    <span className="text-green-400">주요</span>
                  )}
                </span>
              ))}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-95"
          >
            {parsedKeys.length > 1
              ? `${parsedKeys.length}개 키로 시작하기`
              : "시작하기"}
          </button>
        </form>

        <p className="mt-4 text-xs text-gray-500">
          API 키는 이 브라우저의 localStorage에 영구 저장되며 YouTube API 호출에만 사용됩니다.
        </p>
      </div>
    </div>
  );
}
