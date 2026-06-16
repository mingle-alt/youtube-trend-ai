import { NextRequest, NextResponse } from "next/server";
import { createJsonResponse, normalizeAiModel } from "@/lib/openrouter";
import { CommentsSummaryRequest, CommentsSummaryResult } from "@/types/ai";

export const dynamic = "force-dynamic";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    overallSentiment: { type: "string", enum: ["positive", "neutral", "negative", "mixed"] },
    summary: { type: "string" },
    positiveSignals: { type: "array", items: { type: "string" } },
    negativeSignals: { type: "array", items: { type: "string" } },
    repeatedTopics: { type: "array", items: { type: "string" } },
    creatorTakeaways: { type: "array", items: { type: "string" } },
  },
  required: [
    "overallSentiment",
    "summary",
    "positiveSignals",
    "negativeSignals",
    "repeatedTopics",
    "creatorTakeaways",
  ],
};

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<CommentsSummaryRequest>;
    const comments = Array.isArray(body.comments) ? body.comments.slice(0, 80) : [];
    if (!body.video) {
      return NextResponse.json({ error: "댓글을 분석할 영상이 없습니다." }, { status: 400 });
    }
    if (comments.length === 0) {
      return NextResponse.json({ error: "분석할 댓글이 없습니다." }, { status: 400 });
    }

    const result = await createJsonResponse<CommentsSummaryResult>({
      model: normalizeAiModel(body.model),
      instructions:
        "You summarize YouTube audience comments for creators. Answer in Korean. Do not quote usernames. Focus on patterns, sentiment, and actionable takeaways.",
      input: JSON.stringify({
        video: {
          title: body.video.title,
          channelTitle: body.video.channelTitle,
          viewCount: body.video.viewCount,
          likeCount: body.video.likeCount,
          commentCount: body.video.commentCount,
        },
        comments: comments.map((comment) => ({
          text: stripHtml(comment.text).slice(0, 500),
          likeCount: comment.likeCount,
          replyCount: comment.replyCount,
          publishedAt: comment.publishedAt,
        })),
      }),
      jsonSchema: { name: "comments_summary", schema },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 댓글 요약 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
