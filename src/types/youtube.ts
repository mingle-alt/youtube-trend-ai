export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  categoryId: string;
  tags: string[];
  duration: string;
  rank: number;
}

export interface GlobalTrendingVideo extends YouTubeVideo {
  globalScore: number;
  countries: string[];
}

export interface YouTubeComment {
  id: string;
  authorName: string;
  authorProfileImageUrl: string;
  text: string;
  likeCount: number;
  publishedAt: string;
  replyCount: number;
}

export interface YouTubeCategory {
  id: string;
  title: string;
}

export interface CountryOption {
  code: string;
  name: string;
}

export interface TrendingResponse {
  videos: YouTubeVideo[];
  nextPageToken?: string;
  totalResults: number;
  usedKeyIndex: number;
  quotaUsed: number;
  fromCache?: boolean;
  warning?: string;
}

export interface GlobalTrendingResponse {
  videos: GlobalTrendingVideo[];
  totalResults: number;
  usedKeyIndex: number;
  quotaUsed: number;
  successfulCountries: string[];
  fromCache?: boolean;
}

export interface CommentsResponse {
  comments: YouTubeComment[];
  nextPageToken?: string;
  totalResults: number;
  usedKeyIndex: number;
  quotaUsed: number;
}

export interface CategoriesResponse {
  categories: YouTubeCategory[];
  usedKeyIndex: number;
  quotaUsed: number;
}
