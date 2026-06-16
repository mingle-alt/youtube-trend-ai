import { NextRequest, NextResponse } from "next/server";
import { fetchComments } from "@/lib/youtube";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const apiKeysRaw =
    searchParams.get("apiKeys") || process.env.YOUTUBE_API_KEY || "";
  const videoId = searchParams.get("videoId");
  const maxResults = parseInt(searchParams.get("maxResults") || "50");
  const pageToken = searchParams.get("pageToken") || undefined;

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
  if (!videoId) {
    return NextResponse.json({ error: "videoId가 필요합니다." }, { status: 400 });
  }

  try {
    const data = await fetchComments(apiKeys, videoId, maxResults, pageToken);
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
