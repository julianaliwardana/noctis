"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import ElasticSlider from "@/shared/components/ElasticSlider";
import { searchYouTube } from "../api/pomodoro.api";

// Default: Lofi Girl 24/7 radio stream.
const DEFAULT_LOFI = "jfKfPfyJRdk";

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  nextVideo(): void;
  previousVideo(): void;
  mute(): void;
  unMute(): void;
  setVolume(v: number): void;
  loadVideoById(id: string): void;
  loadPlaylist(arg: { listType: string; list: string; index?: number } | string[], index?: number): void;
  getPlaylist(): string[] | null;
  getPlaylistIndex(): number;
  playVideoAt(index: number): void;
}

interface TrackMeta {
  title: string;
  thumb: string;
}

// CORS-enabled, keyless — gives us a title + thumbnail for a video id.
async function fetchTrackMeta(id: string): Promise<TrackMeta | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { title: string; thumbnail_url: string };
    return { title: data.title, thumb: data.thumbnail_url };
  } catch {
    return null;
  }
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

function loadYouTubeApi(): Promise<void> {
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

function parseYouTube(url: string): { videoId: string | null; list: string | null } {
  const trimmed = url.trim();
  const list = trimmed.match(/[?&]list=([\w-]+)/)?.[1] ?? null;
  const videoId = /^[\w-]{11}$/.test(trimmed)
    ? trimmed
    : (trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/|v\/))([\w-]{11})/)?.[1] ?? null);
  return { videoId, list };
}

function parseSpotifyEmbed(url: string): string | null {
  const match = url
    .trim()
    .match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/);
  return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}` : null;
}

export function MusicPanel() {
  const [mode, setMode] = useState<"youtube" | "spotify">("youtube");
  const [ytInput, setYtInput] = useState("");
  const [ytError, setYtError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [spotifyInput, setSpotifyInput] = useState("");
  const [spotifyEmbed, setSpotifyEmbed] = useState<string | null>(null);
  const [spotifyError, setSpotifyError] = useState(false);

  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(50);

  const [queue, setQueue] = useState<string[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [meta, setMeta] = useState<Record<string, TrackMeta>>({});

  const playerRef = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);

  // Re-read the player's queue on every state change (assigned fresh each render
  // so the event handler never closes over stale state).
  const refreshQueueRef = useRef<() => void>(() => {});
  refreshQueueRef.current = () => {
    const player = playerRef.current;
    if (!player) return;
    setQueue(player.getPlaylist() ?? []);
    setQueueIndex(player.getPlaylistIndex() ?? 0);
  };

  useEffect(() => {
    let cancelled = false;
    void loadYouTubeApi().then(() => {
      if (cancelled || playerRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player("yt-player", {
        videoId: DEFAULT_LOFI,
        playerVars: { autoplay: 0, playsinline: 1 },
        events: {
          onReady: (e) => {
            e.target.setVolume(volume);
            setReady(true);
          },
          onStateChange: (e) => {
            setPlaying(e.data === 1);
            refreshQueueRef.current();
          },
        },
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Backfill titles/thumbnails for any queued videos we haven't fetched yet.
  useEffect(() => {
    const missing = queue.filter((id) => !meta[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    void Promise.all(missing.map(async (id) => [id, await fetchTrackMeta(id)] as const)).then((results) => {
      if (cancelled) return;
      setMeta((prev) => {
        const next = { ...prev };
        for (const [id, m] of results) if (m) next[id] = m;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [queue, meta]);

  async function loadYouTube(): Promise<void> {
    const query = ytInput.trim();
    if (!query || searching) return;
    setYtError(null);
    const { videoId, list } = parseYouTube(query);

    if (list) {
      // A playlist/radio (…&list=RD…) auto-advances to the next track.
      playerRef.current?.loadPlaylist({ listType: "playlist", list, index: 0 });
    } else if (videoId) {
      playerRef.current?.loadVideoById(videoId);
    } else {
      setSearching(true);
      try {
        const results = await searchYouTube(query);
        if (results.length === 0) {
          setYtError("No results found.");
          return;
        }
        setMeta((prev) => {
          const next = { ...prev };
          for (const r of results) next[r.videoId] = { title: r.title, thumb: r.thumbnail };
          return next;
        });
        playerRef.current?.loadPlaylist(results.map((r) => r.videoId));
      } catch {
        setYtError("Search failed. Try again.");
        return;
      } finally {
        setSearching(false);
      }
    }

    playerRef.current?.setVolume(volume);
    setPlaying(true);
    window.setTimeout(() => refreshQueueRef.current(), 800);
  }

  function resetPlayer(): void {
    playerRef.current?.loadVideoById(DEFAULT_LOFI);
    setYtInput("");
    setYtError(null);
    setQueue([]);
    setQueueIndex(0);
    setPlaying(true);
  }

  function playAt(index: number): void {
    playerRef.current?.playVideoAt(index);
    setQueueIndex(index);
    setPlaying(true);
  }

  function togglePlay(): void {
    if (!playerRef.current) return;
    if (playing) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  }

  function changeVolume(next: number): void {
    const clamped = Math.max(0, Math.min(100, next));
    setVolume(clamped);
    playerRef.current?.setVolume(clamped);
  }

  function loadSpotify(): void {
    const embed = parseSpotifyEmbed(spotifyInput);
    setSpotifyEmbed(embed);
    setSpotifyError(!embed);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 p-1">
        {(["youtube", "spotify"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              mode === m ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]" : "text-white/60 hover:text-white"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* YouTube player stays mounted so playback persists; hidden in Spotify mode. */}
      <div className={mode === "youtube" ? "flex flex-col gap-3" : "hidden"}>
        <div className="aspect-video overflow-hidden rounded-xl bg-black shadow-lg ring-1 ring-white/10">
          <div id="yt-player" className="h-full w-full" />
        </div>

        <div className="flex gap-2">
          <Input
            value={ytInput}
            onChange={(e) => setYtInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void loadYouTube()}
            placeholder="Search a song or paste a link…"
            className="border-white/20 text-white placeholder:text-white/40"
          />
          <Button type="button" onClick={() => void loadYouTube()} disabled={!ready || searching}>
            {searching ? "…" : "Search"}
          </Button>
        </div>
        {ytError && <p className="text-xs text-[var(--color-passwords)]">{ytError}</p>}
        {!ytInput && <p className="text-xs text-white/50">Type a song name to search, or paste a video/playlist link.</p>}

        {/* Transport — prev/next step through the playlist queue in order. */}
        <div className="flex items-center justify-center gap-2">
          <Button type="button" variant="ghost" size="icon" onClick={() => playerRef.current?.previousVideo()} disabled={!ready} aria-label="Previous track" className="text-white/80 hover:text-white">
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={togglePlay} disabled={!ready} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => playerRef.current?.nextVideo()} disabled={!ready} aria-label="Next track" className="text-white/80 hover:text-white">
            <SkipForward className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={resetPlayer} disabled={!ready} aria-label="Clear queue" className="text-white/80 hover:text-white">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <ElasticSlider
            className="!w-[80%] flex-1"
            defaultValue={volume}
            startingValue={0}
            maxValue={100}
            isStepped
            stepSize={1}
            onChange={changeVolume}
            leftIcon={<VolumeX className="h-4 w-4 text-white/70" />}
            rightIcon={<Volume2 className="h-4 w-4 text-white/70" />}
          />
          <span className="w-6 shrink-0 text-right text-xs tabular-nums text-white/60">{volume}</span>
        </div>

        {queue.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-white/50">
              Queue · {queue.length}
            </p>
            <div className="thin-scroll flex max-h-44 flex-col gap-1 overflow-y-auto pr-1">
              {queue.map((id, i) => (
                <button
                  key={`${id}-${i}`}
                  type="button"
                  onClick={() => playAt(i)}
                  className={`flex items-center gap-2 rounded-lg p-1 text-left transition-colors ${
                    i === queueIndex ? "bg-white/15" : "hover:bg-white/10"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={meta[id]?.thumb ?? `https://i.ytimg.com/vi/${id}/default.jpg`}
                    alt=""
                    className="h-8 w-12 shrink-0 rounded object-cover"
                  />
                  <span className={`truncate text-xs ${i === queueIndex ? "text-white" : "text-white/70"}`}>
                    {meta[id]?.title ?? "Loading…"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={mode === "spotify" ? "flex flex-col gap-3" : "hidden"}>
        <div className="flex gap-2">
          <Input
            value={spotifyInput}
            onChange={(e) => setSpotifyInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadSpotify()}
            placeholder="Paste a Spotify link…"
            className="border-white/20 text-white placeholder:text-white/40"
          />
          <Button type="button" onClick={loadSpotify}>
            Load
          </Button>
        </div>
        {spotifyError && <p className="text-xs text-[var(--color-passwords)]">Couldn&apos;t read that Spotify link.</p>}
        {spotifyEmbed ? (
          <iframe
            title="Spotify player"
            src={spotifyEmbed}
            className="w-full rounded-xl"
            height={152}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        ) : (
          <p className="text-xs text-white/50">Use Spotify&apos;s own controls — playback can&apos;t be driven from here without a Premium login.</p>
        )}
      </div>
    </div>
  );
}
