"use client";

import { YouTubeVideo } from "@/types/youtube";

const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸",
  KR: "🇰🇷",
  JP: "🇯🇵",
  GB: "🇬🇧",
  IN: "🇮🇳",
  DE: "🇩🇪",
  BR: "🇧🇷",
  FR: "🇫🇷",
};

interface Props {
  video: YouTubeVideo;
  onClick: (video: YouTubeVideo) => void;
  isSelected: boolean;
  countries?: string[];
}

function formatCount(n: string): string {
  const num = parseInt(n);
  if (isNaN(num)) return "0";
  if (num >= 100_000_000) return `${(num / 100_000_000).toFixed(1)}억`;
  if (num >= 10_000) return `${(num / 10_000).toFixed(1)}만`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}천`;
  return num.toLocaleString();
}

export default function VideoCard({ video, onClick, isSelected, countries }: Props) {
  return (
    <div
      onClick={() => onClick(video)}
      className={`group flex cursor-pointer gap-3 rounded-xl p-3 transition-all duration-150 hover:bg-gray-800 ${
        isSelected ? "bg-gray-800 ring-1 ring-red-500" : ""
      }`}
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0">
        <span className="absolute left-1 top-1 z-10 flex h-5 w-6 items-center justify-center rounded bg-black/80 text-xs font-bold text-white">
          {video.rank}
        </span>
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="h-20 w-36 rounded-lg object-cover"
          loading="lazy"
        />
        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-xs text-white">
          {video.duration}
        </span>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-white group-hover:text-red-400">
          {video.title}
        </h3>
        <p className="mt-1 text-xs text-gray-400">{video.channelTitle}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
          <span>👁 {formatCount(video.viewCount)}</span>
          <span>👍 {formatCount(video.likeCount)}</span>
          <span>💬 {formatCount(video.commentCount)}</span>
        </div>
        {/* Country flags for global view */}
        {countries && countries.length > 0 && (
          <div className="mt-1.5 flex items-center gap-0.5">
            {countries.slice(0, 6).map((c) => (
              <span key={c} className="text-xs" title={c}>
                {COUNTRY_FLAGS[c] ?? c}
              </span>
            ))}
            {countries.length > 6 && (
              <span className="ml-0.5 text-xs text-gray-600">
                +{countries.length - 6}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
