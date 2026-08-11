import { api } from "@/lib/api";

export type PomodoroPhase = "focus" | "short" | "long";

export function recordSession(
  phase: PomodoroPhase,
  startedAt: string,
  endedAt: string,
): Promise<void> {
  return api.post<void>("/pomodoro", { phase, startedAt, endedAt });
}

export interface YouTubeResult {
  videoId: string;
  title: string;
  thumbnail: string;
  artist?: string;
  album?: string;
  duration?: string;
}

export type SearchSource = "video" | "music";

export function searchYouTube(query: string, source: SearchSource = "video"): Promise<YouTubeResult[]> {
  return api.get<YouTubeResult[]>("/youtube/search", { params: { q: query, source } });
}
