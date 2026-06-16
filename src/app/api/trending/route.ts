import { NextRequest, NextResponse } from "next/server";
import { fetchTrendingVideos } from "@/lib/youtube";
import { getCached, setCached } from "@/lib/cache";
import { TrendingResponse } from "@/types/youtube";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const apiKeysRaw =
    searchParams.get("apiKeys") || process.env.YOUTUBE_API_KEY || "";
  const regionCode = searchParams.get("regionCode") || "KR";
  const categoryId = searchParams.get("categoryId") || "";
  const maxResults = Math.min(parseInt(searchParams.get("maxResults") || "100"), 100);

  const apiKeys = apiKeysRaw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  if (apiKeys.length === 0) {
    return NextResponse.json(
      { error: "YouTube API 키가 필요합니다." },
      { status: 400 }
    );
  }

  const cacheKey = `trending:${regionCode}:${categoryId}:${maxResults}`;
  const cached = getCached<TrendingResponse>(cacheKey);
  if (cached) {
    return NextResponse.json({
      ...cached,
      fromCache: true,
      usedKeyIndex: 0,
      quotaUsed: 0,
    });
  }

  try {
    const data = await fetchTrendingVideos(apiKeys, regionCode, categoryId, maxResults);
    // Cache without key-specific fields
    setCached<TrendingResponse>(cacheKey, {
      videos: data.videos,
      nextPageToken: data.nextPageToken,
      totalResults: data.totalResults,
      usedKeyIndex: 0,
      quotaUsed: 0,
      warning: data.warning,
    });
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
