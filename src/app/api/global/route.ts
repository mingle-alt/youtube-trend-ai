import { NextRequest, NextResponse } from "next/server";
import { fetchGlobalTrending } from "@/lib/youtube";
import { getCached, setCached } from "@/lib/cache";
import { GlobalTrendingResponse } from "@/types/youtube";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const apiKeysRaw =
    searchParams.get("apiKeys") || process.env.YOUTUBE_API_KEY || "";
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

  const cacheKey = "global:top100";
  const cached = getCached<GlobalTrendingResponse>(cacheKey);
  if (cached) {
    return NextResponse.json({
      ...cached,
      fromCache: true,
      usedKeyIndex: 0,
      quotaUsed: 0,
    });
  }

  try {
    const data = await fetchGlobalTrending(apiKeys);
    setCached<GlobalTrendingResponse>(cacheKey, data);
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
