import { NextRequest, NextResponse } from "next/server";
import { createJsonResponse, normalizeAiModel } from "@/lib/openrouter";
import { VideoAnalysisRequest, VideoAnalysisResult } from "@/types/ai";

export const dynamic = "force-dynamic";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    whyTrending: { type: "array", items: { type: "string" } },
    audienceSignals: { type: "array", items: { type: "string" } },
    contentIdeas: { type: "array", items: { type: "string" } },
    viralScore: { type: "number", minimum: 0, maximum: 100 },
    recommendedActions: { type: "array", items: { type: "string" } },
  },
  required: [
    "summary",
    "whyTrending",
    "audienceSignals",
    "contentIdeas",
    "viralScore",
    "recommendedActions",
  ],
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<VideoAnalysisRequest>;
    if (!body.video) {
      return NextResponse.json({ error: "분석할 영상이 없습니다." }, { status: 400 });
    }

    const { video } = body;
    const result = await createJsonResponse<VideoAnalysisResult>({
      model: normalizeAiModel(body.model),
      instructions:
        "You are a YouTube content strategist. Answer in Korean. Analyze only from the supplied metadata. Give concrete creator actions.",
      input: JSON.stringify({
        video: {
          title: video.title,
          description: video.description,
          channelTitle: video.channelTitle,
          publishedAt: video.publishedAt,
          viewCount: video.viewCount,
          likeCount: video.likeCount,
          commentCount: video.commentCount,
          duration: video.duration,
          rank: video.rank,
          categoryId: video.categoryId,
          tags: video.tags.slice(0, 15),
        },
      }),
      jsonSchema: { name: "video_analysis", schema },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 영상 분석 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
