import { NextRequest, NextResponse } from "next/server";
import { createJsonResponse, normalizeAiModel } from "@/lib/openrouter";
import { TrendSummaryRequest, TrendSummaryResult } from "@/types/ai";
import { YouTubeVideo } from "@/types/youtube";

export const dynamic = "force-dynamic";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string" },
    overview: { type: "string" },
    keyInsights: { type: "array", items: { type: "string" } },
    keywords: { type: "array", items: { type: "string" } },
    opportunities: { type: "array", items: { type: "string" } },
    cautions: { type: "array", items: { type: "string" } },
  },
  required: ["headline", "overview", "keyInsights", "keywords", "opportunities", "cautions"],
};

function compactVideo(video: YouTubeVideo) {
  return {
    rank: video.rank,
    title: video.title,
    channelTitle: video.channelTitle,
    publishedAt: video.publishedAt,
    viewCount: video.viewCount,
    likeCount: video.likeCount,
    commentCount: video.commentCount,
    duration: video.duration,
    categoryId: video.categoryId,
    tags: video.tags.slice(0, 10),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<TrendSummaryRequest>;
    const videos = Array.isArray(body.videos) ? body.videos.slice(0, 100) : [];
    if (videos.length === 0) {
      return NextResponse.json({ error: "분석할 영상 목록이 없습니다." }, { status: 400 });
    }

    const result = await createJsonResponse<TrendSummaryResult>({
      model: normalizeAiModel(body.model),
      instructions:
        "You are a YouTube trend analyst for Korean creators and marketers. Answer in Korean. Be concise, practical, and grounded only in the supplied video data. Do not claim external facts.",
      input: JSON.stringify({
        contextLabel: body.contextLabel || "YouTube trend list",
        videos: videos.map(compactVideo),
      }),
      jsonSchema: { name: "trend_summary", schema },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 요약 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
