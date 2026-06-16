import { NextRequest, NextResponse } from "next/server";
import { fetchCategories } from "@/lib/youtube";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const apiKeysRaw =
    searchParams.get("apiKeys") || process.env.YOUTUBE_API_KEY || "";
  const regionCode = searchParams.get("regionCode") || "KR";

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

  try {
    const result = await fetchCategories(apiKeys, regionCode);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
