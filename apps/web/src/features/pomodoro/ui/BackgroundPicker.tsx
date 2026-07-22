"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

export interface Scene {
  key: string;
  label: string;
  css: string;
}

export const SCENES: Scene[] = [
  { key: "rain", label: "Rain", css: "linear-gradient(160deg, #2b3a4a, #1b2733 55%, #0f171f)" },
  { key: "forest", label: "Forest", css: "linear-gradient(160deg, #24402f, #16281d)" },
  { key: "cafe", label: "Café", css: "linear-gradient(160deg, #4a3527, #2a1d14)" },
  { key: "sunset", label: "Sunset", css: "linear-gradient(160deg, #c76b4a, #7a3b5a 55%, #3a2440)" },
  { key: "midnight", label: "Midnight", css: "linear-gradient(160deg, #1a2038, #0c0f1c)" },
];

const CDN = process.env.NEXT_PUBLIC_CDN_URL;

export const TEMPLATES: { key: string; label: string; url: string }[] = [
  { key: "taki-tachibana-lofi", label: "Taki & Tachibana", url: `${CDN}/taki-tachibana-lofi.jpg` },
  { key: "surreal-cherry", label: "Surreal Cherry", url: `${CDN}/surreal-cherry.jpg` },
  { key: "monkey-d-luffy", label: "Luffy", url: `${CDN}/monkey-d-luffy.jpg` },
  { key: "lofi-girl-listening", label: "Lofi Girl", url: `${CDN}/lofi-girl-listening.jpg` },
  { key: "lofi-bedroom-night", label: "Bedroom Night", url: `${CDN}/lofi-bedroom-night.jpg` },
  { key: "japan-artistic", label: "Japan Artistic", url: `${CDN}/japan-artistic.jpg` },
  { key: "goku-perfected", label: "Goku", url: `${CDN}/goku-perfected.jpg` },
  { key: "anime-girl-working", label: "Anime Girl Working", url: `${CDN}/anime-girl-working.jpeg` },
];

function imageCss(url: string): string {
  return `url("${url}") center/cover`;
}

export interface BackgroundPickerProps {
  value: string;
  onChange: (css: string) => void;
}

export function BackgroundPicker({ value, onChange }: BackgroundPickerProps) {
  const [customUrl, setCustomUrl] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/50">Ambient</p>
        <div className="flex flex-wrap gap-2">
          {SCENES.map((scene) => (
            <button
              key={scene.key}
              type="button"
              onClick={() => onChange(scene.css)}
              title={scene.label}
              aria-label={scene.label}
              className={`h-9 w-9 rounded-lg ring-2 transition-transform hover:scale-105 ${
                value === scene.css ? "ring-[var(--color-primary)]" : "ring-transparent"
              }`}
              style={{ background: scene.css }}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/50">Templates</p>
        <div className="grid grid-cols-4 gap-2">
          {TEMPLATES.map((template) => {
            const css = imageCss(template.url);
            return (
              <button
                key={template.key}
                type="button"
                onClick={() => onChange(css)}
                title={template.label}
                aria-label={template.label}
                className={`aspect-video rounded-md bg-cover bg-center ring-2 transition-transform hover:scale-105 ${
                  value === css ? "ring-[var(--color-primary)]" : "ring-transparent"
                }`}
                style={{ backgroundImage: `url("${template.url}")` }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          value={customUrl}
          onChange={(e) => setCustomUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && customUrl && onChange(`url("${customUrl}") center/cover`)}
          placeholder="Or paste an image URL…"
          className="border-white/20 text-white placeholder:text-white/40"
        />
        <Button
          type="button"
          onClick={() => customUrl && onChange(`url("${customUrl}") center/cover`)}
        >
          Set
        </Button>
      </div>
    </div>
  );
}
