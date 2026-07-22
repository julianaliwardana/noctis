import { apiFetch } from "@/lib/api";

export type PomodoroPhase = "focus" | "short" | "long";

export function recordSession(
  phase: PomodoroPhase,
  startedAt: string,
  endedAt: string,
): Promise<void> {
  return apiFetch<void>("/pomodoro", {
    method: "POST",
    body: JSON.stringify({ phase, startedAt, endedAt }),
  });
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
  return apiFetch<YouTubeResult[]>(
    `/youtube/search?q=${encodeURIComponent(query)}&source=${source}`,
  );
}
