"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import ElasticSlider from "@/shared/components/ElasticSlider";
import { searchYouTube, type SearchSource } from "../api/pomodoro.api";
import {
  fetchTrackMeta,
  loadYouTubeApi,
  parseYouTube,
  toSeconds,
  type TrackMeta,
  type YTPlayer,
} from "../lib/youtube";
import { NowPlayingCard } from "./NowPlayingCard";
import { PlayerControls } from "./PlayerControls";
import { QueueList } from "./QueueList";
import { SpotifyPanel } from "./SpotifyPanel";

// Default: Lofi Girl 24/7 radio stream.
const DEFAULT_LOFI = "jfKfPfyJRdk";

export function MusicPanel({ onNowPlaying }: { onNowPlaying?: (title: string | null) => void } = {}) {
  const [mode, setMode] = useState<"youtube" | "spotify">("youtube");
  const [source, setSource] = useState<SearchSource>("video");
  const [ytInput, setYtInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);

  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [ready, setReady] = useState(false);

  const [queue, setQueue] = useState<string[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [meta, setMeta] = useState<Record<string, TrackMeta>>({});

  const playerRef = useRef<YTPlayer | null>(null);

  // into refs the player's event handlers can read without stale closures.
  const queueRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  queueRef.current = queue;
  indexRef.current = queueIndex;

  const toastTimer = useRef<number | undefined>(undefined);
  function showToast(msg: string, kind: "ok" | "err"): void {
    setToast({ msg, kind });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2500);
  }

  function playIndex(i: number): void {
    const id = queueRef.current[i];
    if (!id) return;
    setQueueIndex(i);
    playerRef.current?.loadVideoById(id);
    setPlaying(true);
  }

  // Play the next queued track, if any (used on track-end and on playback error).
  function advance(): void {
    const next = indexRef.current + 1;
    if (next < queueRef.current.length) playIndex(next);
  }

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
            if (e.data === 0) advance();
            else setPlaying(e.data === 1);
          },
          onError: advance,
        },
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const currentId = queue[queueIndex];
  const currentMeta = currentId ? meta[currentId] : undefined;
  const currentArt = currentMeta?.thumb ?? (currentId ? `https://i.ytimg.com/vi/${currentId}/hqdefault.jpg` : null);

  // Report the current track title up so the collapsed panel can scroll it.
  const nowPlayingTitle = currentMeta?.title ?? null;
  useEffect(() => {
    onNowPlaying?.(nowPlayingTitle);
  }, [nowPlayingTitle, onNowPlaying]);

  // Append one track; start playing it if the queue was empty.
  function enqueue(id: string, m?: TrackMeta): void {
    if (m) setMeta((prev) => ({ ...prev, [id]: m }));
    const wasEmpty = queueRef.current.length === 0;
    setQueue((prev) => [...prev, id]);
    if (wasEmpty) {
      setQueueIndex(0);
      playerRef.current?.loadVideoById(id);
      playerRef.current?.setVolume(volume);
      setPlaying(true);
    }
    showToast(wasEmpty ? "Now playing" : "Added to queue", "ok");
  }

  // Cue a pasted playlist to read its video ids, then own playback ourselves so
  function startPlaylist(list: string): void {
    const player = playerRef.current;
    if (!player) return;
    player.cuePlaylist({ listType: "playlist", list, index: 0 });
    let tries = 0;
    const grab = () => {
      const ids = player.getPlaylist() ?? [];
      const first = ids[0];
      if (first) {
        setQueue(ids);
        setQueueIndex(0);
        player.setVolume(volume);
        player.loadVideoById(first);
        setPlaying(true);
        showToast(`Loaded ${ids.length} tracks`, "ok");
      } else if (tries++ < 20) {
        window.setTimeout(grab, 300);
      } else {
        showToast("Couldn't load that playlist.", "err");
      }
    };
    grab();
  }

  async function loadYouTube(): Promise<void> {
    const query = ytInput.trim();
    if (!query || searching) return;
    const { videoId, list } = parseYouTube(query);

    if (list) {
      startPlaylist(list);
      setYtInput("");
      return;
    }
    if (videoId) {
      enqueue(videoId);
      setYtInput("");
      return;
    }

    setSearching(true);
    try {
      const top = (await searchYouTube(query, source))[0];
      if (!top) {
        showToast("No results found.", "err");
        return;
      }
      const subtitle = [top.artist, top.album, top.duration].filter(Boolean).join(" · ") || undefined;
      enqueue(top.videoId, {
        title: top.title,
        thumb: top.thumbnail,
        subtitle,
        artist: top.artist,
        album: top.album,
        durationSec: toSeconds(top.duration),
      });
      setYtInput("");
    } catch {
      showToast("Search failed. Try again.", "err");
    } finally {
      setSearching(false);
    }
  }

  function resetPlayer(): void {
    playerRef.current?.loadVideoById(DEFAULT_LOFI);
    setYtInput("");
    setQueue([]);
    setQueueIndex(0);
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

  return (
    <div className="relative flex flex-col gap-3">
      {toast && (
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-2 z-20 mx-auto w-fit rounded-full px-3 py-1.5 text-xs font-medium text-white shadow-lg ${
            toast.kind === "ok" ? "bg-emerald-500/90" : "bg-red-500/90"
          }`}
        >
          {toast.msg}
        </div>
      )}

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

      <div className={mode === "youtube" ? "flex flex-col gap-3" : "hidden"}>
        {/* Music mode: a now-playing card in place of the (offscreen) video. */}
        {source === "music" && (
          <NowPlayingCard art={currentArt} title={currentMeta?.title} subtitle={currentMeta?.subtitle} />
        )}

        <div
          className={
            source === "music"
              ? "pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden"
              : "aspect-video overflow-hidden rounded-xl bg-black shadow-lg ring-1 ring-white/10"
          }
        >
          <div id="yt-player" className="h-full w-full" />
        </div>

        <div className="flex items-center gap-1.5 self-start rounded-full border border-white/15 bg-white/5 p-0.5 text-xs">
          {(["video", "music"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSource(s)}
              className={`rounded-full px-2.5 py-0.5 font-medium capitalize transition-colors ${
                source === s ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
              }`}
            >
              {s === "music" ? "YT Music" : "Videos"}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={ytInput}
            onChange={(e) => setYtInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void loadYouTube()}
            placeholder={source === "music" ? "Search a song or artist…" : "Search a video or paste a link…"}
            className="border-white/20 text-white placeholder:text-white/40"
          />
          <Button type="button" onClick={() => void loadYouTube()} disabled={!ready || searching}>
            {searching ? "…" : "Search"}
          </Button>
        </div>
        {!ytInput && <p className="text-xs text-white/50">Type a song name to search, or paste a video/playlist link.</p>}

        <PlayerControls
          playing={playing}
          ready={ready}
          canPrev={queueIndex > 0}
          canNext={queueIndex < queue.length - 1}
          onPrev={() => playIndex(queueIndex - 1)}
          onToggle={togglePlay}
          onNext={() => playIndex(queueIndex + 1)}
          onReset={resetPlayer}
        />

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

        <QueueList queue={queue} meta={meta} queueIndex={queueIndex} onPlay={playIndex} />
      </div>

      <div className={mode === "spotify" ? "flex flex-col gap-3" : "hidden"}>
        <SpotifyPanel />
      </div>
    </div>
  );
}
