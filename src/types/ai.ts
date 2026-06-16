import { YouTubeComment, YouTubeVideo } from "@/types/youtube";

export type AiModel =
  | "openai/gpt-4o-mini"
  | "~openai/gpt-latest"
  | "~anthropic/claude-sonnet-latest";

export interface AiModelOption {
  id: AiModel;
  label: string;
  description: string;
}

export const AI_MODEL_OPTIONS: AiModelOption[] = [
  {
    id: "openai/gpt-4o-mini",
    label: "균형",
    description: "대부분의 요약과 분석에 적합한 OpenAI 저비용 모델",
  },
  {
    id: "~openai/gpt-latest",
    label: "정밀",
    description: "OpenRouter의 최신 OpenAI 플래그십 alias",
  },
  {
    id: "~anthropic/claude-sonnet-latest",
    label: "대안",
    description: "긴 문맥과 해석에 강한 Claude Sonnet 최신 alias",
  },
];

export interface TrendSummaryRequest {
  model: AiModel;
  contextLabel: string;
  videos: YouTubeVideo[];
}

export interface TrendSummaryResult {
  headline: string;
  overview: string;
  keyInsights: string[];
  keywords: string[];
  opportunities: string[];
  cautions: string[];
}

export interface VideoAnalysisRequest {
  model: AiModel;
  video: YouTubeVideo;
}

export interface VideoAnalysisResult {
  summary: string;
  whyTrending: string[];
  audienceSignals: string[];
  contentIdeas: string[];
  viralScore: number;
  recommendedActions: string[];
}

export interface CommentsSummaryRequest {
  model: AiModel;
  video: YouTubeVideo;
  comments: YouTubeComment[];
}

export interface CommentsSummaryResult {
  overallSentiment: "positive" | "neutral" | "negative" | "mixed";
  summary: string;
  positiveSignals: string[];
  negativeSignals: string[];
  repeatedTopics: string[];
  creatorTakeaways: string[];
}
