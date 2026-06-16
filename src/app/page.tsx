"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { YouTubeCategory, YouTubeVideo } from "@/types/youtube";
import { COUNTRIES } from "@/lib/countries";
import { addQuotaUsed } from "@/lib/quota";
import ApiKeyModal from "@/components/ApiKeyModal";
import VideoCard from "@/components/VideoCard";
import VideoDetailModal from "@/components/VideoDetailModal";
import CommentsPanel from "@/components/CommentsPanel";
import QuotaWidget from "@/components/QuotaWidget";

type Tab = "trending" | "education" | "global";

const EDUCATION_CATEGORY_ID = "27";

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportToCSV(videos: YouTubeVideo[], tab: Tab, regionCode: string) {
  const headers = [
    "순위",
    "제목",
    "채널",
    "조회수",
    "좋아요",
    "댓글수",
    "길이",
    "게시일",
    "URL",
  ];
  const rows = videos.map((v) => [
    v.rank,
    `"${v.title.replace(/"/g, '""')}"`,
    `"${v.channelTitle.replace(/"/g, '""')}"`,
    v.viewCount,
    v.likeCount,
    v.commentCount,
    v.duration,
    new Date(v.publishedAt).toLocaleDateString("ko-KR"),
    `https://www.youtube.com/watch?v=${v.id}`,
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  const label =
    tab === "global" ? "글로벌" : tab === "education" ? "교육" : `급상승_${regionCode}`;
  a.download = `유튜브_트렌드_${label}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  // ── API keys ──────────────────────────────────────────────────────────────
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [activeKeyIndex, setActiveKeyIndex] = useState(0);
  const [showKeyModal, setShowKeyModal] = useState(false);
  // Notification banner (key rotation etc.)
  const [notification, setNotification] = useState<string | null>(null);
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showNotif(msg: string) {
    setNotification(msg);
    if (notifTimer.current) clearTimeout(notifTimer.current);
    notifTimer.current = setTimeout(() => setNotification(null), 4_000);
  }

  // ── Filters ───────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>("trending");
  const [regionCode, setRegionCode] = useState("KR");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<YouTubeCategory[]>([]);

  // ── Data ──────────────────────────────────────────────────────────────────
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [globalCountries, setGlobalCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [fromCache, setFromCache] = useState(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [showComments, setShowComments] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Boot: restore keys from localStorage
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const savedKeys = localStorage.getItem("yt_api_keys");
    if (savedKeys) {
      try {
        const keys: string[] = JSON.parse(savedKeys);
        if (Array.isArray(keys) && keys.length > 0) {
          setApiKeys(keys);
          const idx = parseInt(localStorage.getItem("yt_active_key_index") || "0");
          setActiveKeyIndex(Math.min(idx, keys.length - 1));
          return;
        }
      } catch { /* ignore */ }
    }
    // Legacy single-key fallback (sessionStorage)
    const legacy = sessionStorage.getItem("yt_api_key");
    if (legacy) {
      setApiKeys([legacy]);
      localStorage.setItem("yt_api_keys", JSON.stringify([legacy]));
      sessionStorage.removeItem("yt_api_key");
      return;
    }
    setShowKeyModal(true);
  }, []);

  function handleSaveKeys(keys: string[]) {
    setApiKeys(keys);
    setActiveKeyIndex(0);
    localStorage.setItem("yt_api_keys", JSON.stringify(keys));
    localStorage.setItem("yt_active_key_index", "0");
    setShowKeyModal(false);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Key rotation + quota helper called after every API response
  // ─────────────────────────────────────────────────────────────────────────
  const handleApiResult = useCallback(
    (result: { usedKeyIndex?: number; quotaUsed?: number }) => {
      const rotatedIdx = result.usedKeyIndex ?? 0;
      if (rotatedIdx > 0) {
        const newAbs = (activeKeyIndex + rotatedIdx) % apiKeys.length;
        setActiveKeyIndex(newAbs);
        localStorage.setItem("yt_active_key_index", String(newAbs));
        showNotif(
          `🔄 API 키가 자동 전환되었습니다 (키 ${newAbs + 1}/${apiKeys.length})`
        );
      }
      if (result.quotaUsed && result.quotaUsed > 0) {
        addQuotaUsed(result.quotaUsed);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeKeyIndex, apiKeys.length]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch categories on key/region change
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (apiKeys.length === 0) return;
    const params = new URLSearchParams({
      apiKeys: apiKeys.join(","),
      regionCode,
    });
    fetch(`/api/categories?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories);
      })
      .catch(() => {});
  }, [apiKeys, regionCode]);

  // ─────────────────────────────────────────────────────────────────────────
  // Main video fetch
  // ─────────────────────────────────────────────────────────────────────────
  const fetchVideos = useCallback(async () => {
    if (apiKeys.length === 0) return;
    setLoading(true);
    setError("");
    setWarning("");
    setVideos([]);
    setGlobalCountries([]);
    setSelectedVideo(null);
    setFromCache(false);

    // Pre-rotate so the currently active key is tried first
    const rotatedKeys = [
      ...apiKeys.slice(activeKeyIndex),
      ...apiKeys.slice(0, activeKeyIndex),
    ];
    const apiKeysParam = rotatedKeys.join(",");

    try {
      if (tab === "global") {
        const params = new URLSearchParams({ apiKeys: apiKeysParam });
        const res = await fetch(`/api/global?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setVideos(data.videos);
        setGlobalCountries(data.successfulCountries ?? []);
        setFromCache(!!data.fromCache);
        handleApiResult(data);
        return;
      }

      const effectiveCategoryId =
        tab === "education" ? EDUCATION_CATEGORY_ID : categoryId;
      const maxResults = tab === "education" ? 30 : 100;

      const params = new URLSearchParams({
        apiKeys: apiKeysParam,
        regionCode,
        maxResults: String(maxResults),
      });
      if (effectiveCategoryId) params.set("categoryId", effectiveCategoryId);

      const res = await fetch(`/api/trending?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVideos(data.videos);
      setFromCache(!!data.fromCache);
      setWarning(data.warning ?? "");
      handleApiResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [apiKeys, activeKeyIndex, tab, regionCode, categoryId, handleApiResult]);

  useEffect(() => {
    if (apiKeys.length > 0) fetchVideos();
  }, [apiKeys, fetchVideos]);

  // ─────────────────────────────────────────────────────────────────────────
  // Derived UI values
  // ─────────────────────────────────────────────────────────────────────────
  const country = COUNTRIES.find((c) => c.code === regionCode);

  function statusText() {
    if (tab === "global") {
      return globalCountries.length
        ? `전세계 ${globalCountries.length}개국`
        : "전세계";
    }
    const region = country?.name ?? regionCode;
    const cat =
      tab === "education"
        ? "교육"
        : categoryId
        ? categories.find((c) => c.id === categoryId)?.title ?? "전체"
        : "전체 카테고리";
    return `${region} · ${cat}`;
  }

  const TAB_DEFS: { id: Tab; label: string }[] = [
    { id: "trending", label: "🔥 급상승 TOP 100" },
    { id: "global", label: "🌍 전세계 TOP 100" },
    { id: "education", label: "📚 교육 TOP 30" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {showKeyModal && (
        <ApiKeyModal
          initialKeys={apiKeys}
          onSave={handleSaveKeys}
        />
      )}

      {/* Notification banner */}
      {notification && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-yellow-700 bg-yellow-900/80 px-5 py-2.5 text-sm text-yellow-200 shadow-xl backdrop-blur">
          {notification}
        </div>
      )}

      {/* ─── Navbar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-600">
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
              </svg>
            </div>
            <span className="font-bold text-white">YouTube 트렌드</span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Quota widget */}
            <QuotaWidget />

            {/* Country selector (hidden for global tab) */}
            {tab !== "global" && (
              <select
                value={regionCode}
                onChange={(e) => {
                  setRegionCode(e.target.value);
                  setCategoryId("");
                }}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-red-500 focus:outline-none"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            )}

            {/* Key status + modal */}
            <button
              onClick={() => setShowKeyModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              {apiKeys.length > 1
                ? `키 ${activeKeyIndex + 1}/${apiKeys.length}`
                : "API 키"}
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main ───────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Tabs + filters toolbar */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {/* Tabs */}
          <div className="flex rounded-xl bg-gray-800 p-1">
            {TAB_DEFS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  tab === id
                    ? "bg-red-600 text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Category filter (trending tab only) */}
          {tab === "trending" && (
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
            >
              <option value="">전체 카테고리</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.title}
                </option>
              ))}
            </select>
          )}

          {/* Right-side actions */}
          <div className="ml-auto flex items-center gap-2">
            {/* CSV export */}
            {videos.length > 0 && (
              <button
                onClick={() => exportToCSV(videos, tab, regionCode)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                CSV 내보내기
              </button>
            )}

            {/* Refresh */}
            <button
              onClick={fetchVideos}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <svg
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              새로고침
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
          <span>{statusText()}</span>
          {videos.length > 0 && (
            <>
              <span>·</span>
              <span>{videos.length}개 동영상</span>
            </>
          )}
          {fromCache && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1 text-xs text-green-600">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                캐시 (쿼터 절약)
              </span>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-800 bg-red-900/30 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Warning */}
        {warning && (
          <div className="mb-4 rounded-xl border border-yellow-800 bg-yellow-900/30 p-4 text-sm text-yellow-200">
            {warning}
          </div>
        )}

        {/* Global info banner */}
        {tab === "global" && !loading && videos.length === 0 && !error && (
          <div className="mb-4 rounded-xl border border-blue-800 bg-blue-900/20 p-4 text-sm text-blue-300">
            🌍 US·KR·JP·GB·IN·DE·BR·FR 8개국 데이터를 병렬 수집하여 조회수 기반으로 통합 순위를 산정합니다.
            여러 국가에 동시 급상승한 영상일수록 가중 점수가 높습니다.
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid gap-2 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex gap-3 rounded-xl p-3">
                <div className="h-20 w-36 flex-shrink-0 animate-pulse rounded-lg bg-gray-800" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-full animate-pulse rounded bg-gray-800" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-gray-800" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-gray-800" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Video grid */}
        {!loading && videos.length > 0 && (
          <div className="grid gap-1 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                isSelected={selectedVideo?.id === video.id}
                countries={
                  tab === "global"
                    ? (video as YouTubeVideo & { countries?: string[] }).countries
                    : undefined
                }
                onClick={(v) => {
                  setSelectedVideo(v);
                  setShowComments(false);
                }}
              />
            ))}
          </div>
        )}

        {!loading && !error && videos.length === 0 && apiKeys.length > 0 && (
          <div className="py-24 text-center text-gray-500">
            <p className="text-lg">동영상이 없습니다.</p>
            <p className="mt-1 text-sm">
              {tab === "global"
                ? "새로고침하거나 잠시 후 다시 시도해주세요."
                : "다른 국가나 카테고리를 선택해보세요."}
            </p>
          </div>
        )}
      </main>

      {/* ─── Video detail modal ──────────────────────────────────────────── */}
      {selectedVideo && !showComments && (
        <VideoDetailModal
          video={selectedVideo}
          onClose={() => setSelectedVideo(null)}
          onOpenComments={() => setShowComments(true)}
        />
      )}

      {/* ─── Comments panel ──────────────────────────────────────────────── */}
      {selectedVideo && showComments && (
        <CommentsPanel
          video={selectedVideo}
          apiKeys={apiKeys}
          activeKeyIndex={activeKeyIndex}
          onClose={() => {
            setShowComments(false);
            setSelectedVideo(null);
          }}
          onApiResult={handleApiResult}
        />
      )}
    </div>
  );
}
