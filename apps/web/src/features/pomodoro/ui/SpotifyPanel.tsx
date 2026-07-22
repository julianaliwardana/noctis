"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { parseSpotifyEmbed } from "../lib/youtube";

export function SpotifyPanel() {
  const [input, setInput] = useState("");
  const [embed, setEmbed] = useState<string | null>(null);
  const [error, setError] = useState(false);

  function load(): void {
    const url = parseSpotifyEmbed(input);
    setEmbed(url);
    setError(!url);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Paste a Spotify link…"
          className="border-white/20 text-white placeholder:text-white/40"
        />
        <Button type="button" onClick={load}>
          Load
        </Button>
      </div>
      {error && <p className="text-xs text-[var(--color-passwords)]">Couldn&apos;t read that Spotify link.</p>}
      {embed ? (
        <iframe
          title="Spotify player"
          src={embed}
          className="w-full rounded-xl"
          height={152}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      ) : (
        <p className="text-xs text-white/50">Use Spotify&apos;s own controls — playback can&apos;t be driven from here without a Premium login.</p>
      )}
    </div>
  );
}
