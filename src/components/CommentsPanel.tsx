"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { YouTubeVideo, YouTubeComment } from "@/types/youtube";

interface ApiResult {
  usedKeyIndex: number;
  quotaUsed: number;
}

interface Props {
  video: YouTubeVideo;
  apiKeys: string[];
  activeKeyIndex: number;
  onClose: () => void;
  onApiResult: (result: ApiResult) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days >= 365) return `${Math.floor(days / 365)}년 전`;
  if (days >= 30) return `${Math.floor(days / 30)}달 전`;
  if (days >= 1) return `${days}일 전`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours >= 1) return `${hours}시간 전`;
  return `${Math.floor(diff / 60_000)}분 전`;
}

export default function CommentsPanel({
  video,
  apiKeys,
  activeKeyIndex,
  onClose,
  onApiResult,
}: Props) {
  const [comments, setComments] = useState<YouTubeComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);

  // Stable ref so the effect doesn't re-run when the callback identity changes
  const onApiResultRef = useRef(onApiResult);
  useEffect(() => { onApiResultRef.current = onApiResult; });

  // Pre-rotate keys so the active key is tried first
  const apiKeysParam = [
    ...apiKeys.slice(activeKeyIndex),
    ...apiKeys.slice(0, activeKeyIndex),
  ].join(",");

  const loadComments = useCallback(
    async (pageToken?: string) => {
      const params = new URLSearchParams({
        videoId: video.id,
        apiKeys: apiKeysParam,
        maxResults: "30",
      });
      if (pageToken) params.set("pageToken", pageToken);
      const res = await fetch(`/api/comments?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data as {
        comments: YouTubeComment[];
        nextPageToken?: string;
        usedKeyIndex: number;
        quotaUsed: number;
      };
    },
    [video.id, apiKeysParam]
  );

  useEffect(() => {
    setLoading(true);
    setError("");
    setComments([]);
    setNextPageToken(undefined);

    loadComments()
      .then((data) => {
        setComments(data.comments);
        setNextPageToken(data.nextPageToken);
        onApiResultRef.current({
          usedKeyIndex: data.usedKeyIndex ?? 0,
          quotaUsed: data.quotaUsed ?? 10,
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "오류 발생"))
      .finally(() => setLoading(false));
  }, [loadComments]);

  async function handleLoadMore() {
    if (!nextPageToken) return;
    setLoadingMore(true);
    try {
      const data = await loadComments(nextPageToken);
      setComments((prev) => [...prev, ...data.comments]);
      setNextPageToken(data.nextPageToken);
      onApiResultRef.current({
        usedKeyIndex: data.usedKeyIndex ?? 0,
        quotaUsed: data.quotaUsed ?? 10,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류 발생");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="flex h-full w-full max-w-xl flex-col border-l border-gray-700 bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-gray-700 p-4">
          <img
            src={video.thumbnailUrl}
            alt=""
            className="h-14 w-24 flex-shrink-0 rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-sm font-semibold text-white">
              {video.title}
            </h2>
            <p className="mt-1 text-xs text-gray-400">{video.channelTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-2 text-gray-400 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-gray-700 px-4 py-2">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="text-sm font-medium text-white">댓글</span>
          <span className="text-sm text-gray-400">
            ({parseInt(video.commentCount).toLocaleString()}개)
          </span>
        </div>

        {/* List */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-red-500" />
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-800 bg-red-900/30 p-4 text-sm text-red-300">
              {error}
            </div>
          )}
          {!loading && !error && comments.length === 0 && (
            <p className="py-12 text-center text-sm text-gray-500">댓글이 없습니다.</p>
          )}
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <img
                src={comment.authorProfileImageUrl}
                alt={comment.authorName}
                className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-gray-300">
                    {comment.authorName}
                  </span>
                  <span className="text-xs text-gray-600">
                    {timeAgo(comment.publishedAt)}
                  </span>
                </div>
                <p
                  className="mt-1 text-sm leading-relaxed text-gray-300"
                  dangerouslySetInnerHTML={{ __html: comment.text }}
                />
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                  <span>👍 {comment.likeCount.toLocaleString()}</span>
                  {comment.replyCount > 0 && (
                    <span>💬 답글 {comment.replyCount}개</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {nextPageToken && !loading && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full rounded-lg border border-gray-600 py-2 text-sm text-gray-400 hover:border-gray-500 hover:text-gray-300 disabled:opacity-50"
            >
              {loadingMore ? "불러오는 중..." : "더 보기"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
