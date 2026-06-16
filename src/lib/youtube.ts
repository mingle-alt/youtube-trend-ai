import {
  YouTubeVideo,
  YouTubeComment,
  YouTubeCategory,
  GlobalTrendingVideo,
  TrendingResponse,
  GlobalTrendingResponse,
  CommentsResponse,
  CategoriesResponse,
} from "@/types/youtube";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const EDUCATION_CATEGORY_ID = "27";

class YouTubeApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public reason: string
  ) {
    super(message);
    this.name = "YouTubeApiError";
  }
}

// ─── Key pool ────────────────────────────────────────────────────────────────

interface KeyPool {
  keys: string[];
  currentIndex: number;
}

function buildUrl(endpoint: string, params: Record<string, string>): string {
  const url = new URL(`${YOUTUBE_API_BASE}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  return url.toString();
}

function parseDuration(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "0:00";
  const h = parseInt(m[1] || "0");
  const min = parseInt(m[2] || "0");
  const s = parseInt(m[3] || "0");
  if (h > 0) return `${h}:${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${min}:${String(s).padStart(2, "0")}`;
}

function educationQueryForRegion(regionCode: string): string {
  const queries: Record<string, string> = {
    BR: "educação",
    DE: "bildung",
    FR: "éducation",
    IN: "education",
    JP: "教育",
    KR: "교육",
    US: "education",
  };
  return queries[regionCode] ?? "education";
}

function isQuotaError(status: number, reason: string): boolean {
  return (
    status === 403 &&
    (reason === "quotaExceeded" ||
      reason === "dailyLimitExceeded" ||
      reason === "rateLimitExceeded" ||
      reason === "userRateLimitExceeded")
  );
}

/**
 * Fetch a YouTube API endpoint with automatic key rotation on quota errors.
 * Mutates pool.currentIndex when rotation occurs.
 */
async function ytFetch(
  pool: KeyPool,
  endpoint: string,
  params: Record<string, string>
): Promise<Record<string, unknown>> {
  const maxAttempts = pool.keys.length;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const key = pool.keys[pool.currentIndex];
    const res = await fetch(buildUrl(endpoint, { ...params, key }));
    if (res.ok) return (await res.json()) as Record<string, unknown>;

    const err = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const apiError = err?.error as Record<string, unknown> | undefined;
    const reason: string =
      ((apiError?.errors as Record<string, unknown>[])?.[0]?.reason as string) ?? "";

    if (isQuotaError(res.status, reason) && attempt < maxAttempts - 1) {
      pool.currentIndex = (pool.currentIndex + 1) % pool.keys.length;
      continue;
    }

    throw new YouTubeApiError(
      (apiError?.message as string) ||
        `YouTube API 오류 (${res.status})`,
      res.status,
      reason
    );
  }
  throw new Error(
    "모든 API 키의 쿼터가 소진되었습니다. 내일 다시 시도하거나 새 키를 등록해주세요."
  );
}

// ─── Item parser ─────────────────────────────────────────────────────────────

function parseVideo(item: Record<string, unknown>, rank: number): YouTubeVideo {
  const snippet = (item.snippet as Record<string, unknown>) ?? {};
  const stats = (item.statistics as Record<string, unknown>) ?? {};
  const cd = (item.contentDetails as Record<string, unknown>) ?? {};
  const thumbs = (snippet.thumbnails as Record<string, { url: string }>) ?? {};

  return {
    id: item.id as string,
    title: snippet.title as string,
    description: (snippet.description as string) ?? "",
    channelId: snippet.channelId as string,
    channelTitle: snippet.channelTitle as string,
    publishedAt: snippet.publishedAt as string,
    thumbnailUrl: thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url || "",
    viewCount: (stats.viewCount as string) ?? "0",
    likeCount: (stats.likeCount as string) ?? "0",
    commentCount: (stats.commentCount as string) ?? "0",
    categoryId: (snippet.categoryId as string) ?? "",
    tags: (snippet.tags as string[]) ?? [],
    duration: parseDuration((cd.duration as string) ?? "PT0S"),
    rank,
  };
}

async function fetchVideosByIds(
  pool: KeyPool,
  ids: string[],
  startRank = 1
): Promise<YouTubeVideo[]> {
  if (ids.length === 0) return [];

  const data = await ytFetch(pool, "/videos", {
    part: "snippet,statistics,contentDetails",
    id: ids.join(","),
  });

  const rankById = new Map(ids.map((id, i) => [id, startRank + i]));
  return ((data.items as Record<string, unknown>[]) ?? [])
    .map((item) => parseVideo(item, rankById.get(item.id as string) ?? startRank))
    .sort((a, b) => a.rank - b.rank);
}

async function fetchEducationSearchFallback(
  pool: KeyPool,
  regionCode: string,
  maxResults: number
): Promise<TrendingResponse> {
  const publishedAfter = new Date();
  publishedAfter.setDate(publishedAfter.getDate() - 90);

  const searchData = await ytFetch(pool, "/search", {
    part: "snippet",
    type: "video",
    q: educationQueryForRegion(regionCode),
    regionCode,
    order: "viewCount",
    publishedAfter: publishedAfter.toISOString(),
    maxResults: String(Math.min(maxResults, 50)),
  });

  const ids = ((searchData.items as Record<string, unknown>[]) ?? [])
    .map((item) => {
      const id = item.id as Record<string, unknown> | undefined;
      return id?.videoId as string | undefined;
    })
    .filter((id): id is string => Boolean(id));

  const videos = await fetchVideosByIds(pool, ids, 1);

  return {
    videos,
    nextPageToken: searchData.nextPageToken as string | undefined,
    totalResults: (searchData.pageInfo as Record<string, number>)?.totalResults ?? videos.length,
    usedKeyIndex: pool.currentIndex,
    quotaUsed: 101,
    warning:
      "YouTube API가 이 국가의 교육 급상승 차트를 제공하지 않아 최근 90일 교육 검색 결과를 조회수순으로 대체 표시합니다.",
  };
}

// ─── Public API functions ─────────────────────────────────────────────────────

export async function fetchTrendingVideos(
  apiKeys: string[],
  regionCode = "KR",
  categoryId = "",
  maxResults = 100
): Promise<TrendingResponse> {
  const pool: KeyPool = { keys: apiKeys, currentIndex: 0 };

  const baseParams: Record<string, string> = {
    part: "snippet,statistics,contentDetails",
    chart: "mostPopular",
    regionCode,
  };
  if (categoryId) baseParams.videoCategoryId = categoryId;

  const videos: YouTubeVideo[] = [];
  let nextPageToken: string | undefined;
  let totalResults = 0;
  let remaining = maxResults;
  let pageToken = "";
  let quotaUsed = 0;
  let rank = 1;

  while (remaining > 0) {
    const params: Record<string, string> = {
      ...baseParams,
      maxResults: String(Math.min(remaining, 50)),
    };
    if (pageToken) params.pageToken = pageToken;

    let data: Record<string, unknown>;
    try {
      data = await ytFetch(pool, "/videos", params);
      quotaUsed++;
    } catch (error) {
      if (
        error instanceof YouTubeApiError &&
        error.status === 404 &&
        error.reason === "notFound" &&
        categoryId === EDUCATION_CATEGORY_ID &&
        !pageToken
      ) {
        return fetchEducationSearchFallback(pool, regionCode, maxResults);
      }
      throw error;
    }

    const pageInfo = data.pageInfo as Record<string, number>;
    totalResults = pageInfo?.totalResults ?? 0;
    nextPageToken = data.nextPageToken as string | undefined;

    for (const item of (data.items as Record<string, unknown>[]) ?? []) {
      videos.push(parseVideo(item, rank++));
    }

    remaining -= ((data.items as unknown[]) ?? []).length;
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken as string;
  }

  return {
    videos,
    nextPageToken,
    totalResults,
    usedKeyIndex: pool.currentIndex,
    quotaUsed,
  };
}

// ─── Global trending ──────────────────────────────────────────────────────────

const GLOBAL_COUNTRIES = ["US", "KR", "JP", "GB", "IN", "DE", "BR", "FR"];

export async function fetchGlobalTrending(
  apiKeys: string[]
): Promise<GlobalTrendingResponse> {
  // Shared pool so key rotation propagates across concurrent fetches
  const pool: KeyPool = { keys: apiKeys, currentIndex: 0 };

  const results = await Promise.allSettled(
    GLOBAL_COUNTRIES.map((code) =>
      ytFetch(pool, "/videos", {
        part: "snippet,statistics,contentDetails",
        chart: "mostPopular",
        regionCode: code,
        maxResults: "50",
      }).then((data) => ({
        code,
        items: (data.items as Record<string, unknown>[]) ?? [],
      }))
    )
  );

  const quotaUsed = results.filter((r) => r.status === "fulfilled").length;
  const successfulCountries: string[] = [];

  // Collect and deduplicate by video ID
  const videoMap = new Map<string, { video: YouTubeVideo; countries: string[] }>();

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const { code, items } = result.value;
    successfulCountries.push(code);
    items.forEach((item, i) => {
      const v = parseVideo(item, i + 1);
      const entry = videoMap.get(v.id);
      if (entry) {
        entry.countries.push(code);
      } else {
        videoMap.set(v.id, { video: v, countries: [code] });
      }
    });
  }

  // Score: viewCount × (1 + 0.2 × (countryCount − 1)), re-rank TOP 100
  const ranked: GlobalTrendingVideo[] = [...videoMap.values()]
    .map(({ video, countries }) => {
      const baseViews = parseInt(video.viewCount) || 0;
      const globalScore = Math.round(baseViews * (1 + 0.2 * (countries.length - 1)));
      return { ...video, globalScore, countries };
    })
    .sort((a, b) => b.globalScore - a.globalScore)
    .slice(0, 100)
    .map((v, i) => ({ ...v, rank: i + 1 }));

  return {
    videos: ranked,
    totalResults: ranked.length,
    usedKeyIndex: pool.currentIndex,
    quotaUsed,
    successfulCountries,
  };
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function fetchCategories(
  apiKeys: string[],
  regionCode = "KR"
): Promise<CategoriesResponse> {
  const pool: KeyPool = { keys: apiKeys, currentIndex: 0 };

  const data = await ytFetch(pool, "/videoCategories", {
    part: "snippet",
    regionCode,
    hl: regionCode === "KR" ? "ko" : "en",
  });

  const categories: YouTubeCategory[] = (
    (data.items as Record<string, unknown>[]) ?? []
  )
    .filter(
      (item) =>
        (item.snippet as Record<string, unknown>)?.assignable === true
    )
    .map((item) => ({
      id: item.id as string,
      title: (item.snippet as Record<string, unknown>).title as string,
    }));

  return { categories, usedKeyIndex: pool.currentIndex, quotaUsed: 1 };
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function fetchComments(
  apiKeys: string[],
  videoId: string,
  maxResults = 50,
  pageToken?: string
): Promise<CommentsResponse> {
  const pool: KeyPool = { keys: apiKeys, currentIndex: 0 };

  const params: Record<string, string> = {
    part: "snippet",
    videoId,
    maxResults: String(Math.min(maxResults, 100)),
    order: "relevance",
  };
  if (pageToken) params.pageToken = pageToken;

  const data = await ytFetch(pool, "/commentThreads", params);

  const comments: YouTubeComment[] = (
    (data.items as Record<string, unknown>[]) ?? []
  ).map((item) => {
    const threadSnippet = item.snippet as Record<string, unknown>;
    const topComment = threadSnippet.topLevelComment as Record<string, unknown>;
    const cs = topComment.snippet as Record<string, unknown>;
    return {
      id: item.id as string,
      authorName: cs.authorDisplayName as string,
      authorProfileImageUrl: cs.authorProfileImageUrl as string,
      text: cs.textDisplay as string,
      likeCount: (cs.likeCount as number) ?? 0,
      publishedAt: cs.publishedAt as string,
      replyCount: (threadSnippet.totalReplyCount as number) ?? 0,
    };
  });

  return {
    comments,
    nextPageToken: data.nextPageToken as string | undefined,
    totalResults: (data.pageInfo as Record<string, number>)?.totalResults ?? 0,
    usedKeyIndex: pool.currentIndex,
    quotaUsed: 10, // commentThreads.list = 10 units per user spec
  };
}
