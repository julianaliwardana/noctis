// YouTube IFrame player plumbing + track-metadata helpers for the music panel.
// Kept out of the component so MusicPanel is only state + render.

export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  setVolume(v: number): void;
  loadVideoById(id: string): void;
  cuePlaylist(arg: { listType: string; list: string; index?: number }): void;
  getPlaylist(): string[] | null;
}

interface YTNamespace {
  Player: new (
    el: string | HTMLElement,
    opts: {
      videoId?: string;
      playerVars?: Record<string, number>;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number }) => void;
        onError?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

// Inject the IFrame API script once; resolve when YT.Player is available.
export function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.getElementById("yt-iframe-api")) {
      const script = document.createElement("script");
      script.id = "yt-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
    }
  });
}

export interface TrackMeta {
  title: string;
  thumb: string;
  subtitle?: string;
  artist?: string;
  album?: string;
  durationSec?: number;
}

export function parseYouTube(url: string): { videoId: string | null; list: string | null } {
  const trimmed = url.trim();
  const list = trimmed.match(/[?&]list=([\w-]+)/)?.[1] ?? null;
  const videoId = /^[\w-]{11}$/.test(trimmed)
    ? trimmed
    : (trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/|v\/))([\w-]{11})/)?.[1] ?? null);
  return { videoId, list };
}

export function parseSpotifyEmbed(url: string): string | null {
  const match = url
    .trim()
    .match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/);
  return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}` : null;
}

// "3:20" / "1:02:05" → seconds.
export function toSeconds(d?: string): number | undefined {
  if (!d) return undefined;
  const parts = d.split(":").map(Number);
  if (parts.some(Number.isNaN)) return undefined;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

// seconds → "1h 41m" / "41m".
export function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Summary line for the queue, e.g. "12 tracks · 5 artists · 3 albums · 47m".
// Artist/album/time only fill in for tracks that carry that metadata.
export function queueStats(queue: string[], meta: Record<string, TrackMeta>): string {
  const artists = new Set<string>();
  const albums = new Set<string>();
  let totalSec = 0;
  for (const id of queue) {
    const m = meta[id];
    if (m?.artist) artists.add(m.artist);
    if (m?.album) albums.add(m.album);
    totalSec += m?.durationSec ?? 0;
  }
  const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;
  const parts = [plural(queue.length, "track")];
  if (artists.size) parts.push(plural(artists.size, "artist"));
  if (albums.size) parts.push(plural(albums.size, "album"));
  if (totalSec) parts.push(formatTime(totalSec));
  return parts.join(" · ");
}

// CORS-enabled, keyless — title + thumbnail + uploader for a video id.
export async function fetchTrackMeta(id: string): Promise<TrackMeta | null> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
    if (!res.ok) return null;
    const data = (await res.json()) as { title: string; thumbnail_url: string; author_name?: string };
    return { title: data.title, thumb: data.thumbnail_url, subtitle: data.author_name, artist: data.author_name };
  } catch {
    return null;
  }
}
