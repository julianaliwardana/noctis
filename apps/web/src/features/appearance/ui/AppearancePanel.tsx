"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import { motion } from "motion/react";
import { Check, RotateCcw } from "lucide-react";
import { ACCENT_SWATCH, APPEARANCE_OPTIONS, DEFAULT_APPEARANCE, type Appearance } from "@/lib/appearance";
import { resetAppearance, setAppearance, useAppearance } from "@/lib/appearanceStore";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Segmented, type SegmentedOption } from "@/shared/components/Segmented";
import { ThemeToggle } from "@/shared/components/ThemeToggle";
import { cn } from "@/lib/utils";

function SettingRow({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <div className="grid gap-2.5 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] sm:items-center sm:gap-6">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-text)]">{title}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-1 text-xs font-medium tracking-wider text-[var(--color-text-muted)] uppercase">{children}</h3>
  );
}

const ACCENT_LABEL: Record<Appearance["accent"], string> = {
  cobalt: "Cobalt",
  violet: "Violet",
  emerald: "Emerald",
  crimson: "Crimson",
  amber: "Amber",
  teal: "Teal",
  onyx: "Onyx (monochrome)",
};

function AccentPicker({ value }: { value: Appearance["accent"] }) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label="Accent colour" className="flex flex-wrap gap-2">
      {APPEARANCE_OPTIONS.accent.map((accent) => {
        const selected = accent === value;
        const swatch = ACCENT_SWATCH[accent];
        return (
          <button
            key={accent}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={ACCENT_LABEL[accent]}
            title={ACCENT_LABEL[accent]}
            onClick={() => setAppearance("accent", accent)}
            className="press relative flex size-9 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] active:scale-90"
          >
            {selected && (
              <motion.span
                layoutId={`${id}-ring`}
                aria-hidden
                className="absolute inset-0 rounded-full ring-2 ring-[var(--color-text)]"
              />
            )}
            <span
              aria-hidden
              className={cn(
                "size-6 rounded-full shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_1px_2px_rgb(0_0_0/0.2)] transition-[scale] duration-500 ease-spring",
                accent === "onyx" && "ring-1 ring-[var(--color-text-muted)]/40",
                selected ? "scale-100" : "scale-90",
              )}
              style={{ background: accent === "onyx" ? "linear-gradient(135deg, #0e0f12 50%, #f1efea 50%)" : swatch }}
            />
            {selected && (
              <Check
                aria-hidden
                className="absolute size-3.5"
                strokeWidth={3}
                style={{ color: accent === "onyx" ? "#f1efea" : "#ffffff", mixBlendMode: accent === "onyx" ? "difference" : undefined }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

const BASE_DOT: Record<Appearance["base"], string> = { warm: "#e9e4d8", neutral: "#e4e4e7", cool: "#d9e2f0" };

const CARD_LABEL: Record<Appearance["card"], string> = {
  flat: "Flat",
  elevated: "Elevated",
  outlined: "Outlined",
  glass: "Glass",
};

/** Hand-drawn miniature of each card style — the real rules are global, so these are inline. */
const CARD_PREVIEW: Record<Appearance["card"], CSSProperties> = {
  flat: { background: "var(--color-surface)", boxShadow: "0 0 0 1px color-mix(in srgb, var(--color-text) 10%, transparent)" },
  elevated: {
    background: "var(--color-surface)",
    boxShadow: "0 0 0 1px color-mix(in srgb, var(--color-text) 6%, transparent), 0 8px 18px -8px rgb(0 0 0 / 0.35)",
  },
  outlined: { background: "transparent", boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--color-text) 22%, transparent)" },
  glass: {
    background: "color-mix(in srgb, var(--color-surface) 55%, transparent)",
    backdropFilter: "blur(6px)",
    boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.35), 0 0 0 1px color-mix(in srgb, var(--color-text) 8%, transparent)",
  },
};

function CardStylePicker({ value }: { value: Appearance["card"] }) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label="Card style" className="grid grid-cols-4 gap-2">
      {APPEARANCE_OPTIONS.card.map((card) => {
        const selected = card === value;
        return (
          <button
            key={card}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setAppearance("card", card)}
            className={cn(
              "press relative flex flex-col items-center gap-1.5 rounded-[var(--radius)] p-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] active:scale-[0.96]",
              selected ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            )}
          >
            {selected && (
              <motion.span
                layoutId={`${id}-sel`}
                aria-hidden
                className="absolute inset-0 rounded-[inherit] ring-2 ring-[var(--color-primary)]"
              />
            )}
            <span
              aria-hidden
              className="relative flex h-12 w-full items-center justify-center overflow-hidden rounded-[calc(var(--radius)-2px)]"
              style={{
                background:
                  "radial-gradient(circle at 20% 10%, color-mix(in srgb, var(--color-primary) 30%, transparent), transparent 60%), var(--color-bg)",
              }}
            >
              <span className="flex h-7 w-4/5 flex-col justify-center gap-1 rounded-md px-2" style={CARD_PREVIEW[card]}>
                <span className="h-1 w-1/2 rounded-full bg-[var(--color-text)]/50" />
                <span className="h-1 w-3/4 rounded-full bg-[var(--color-text-muted)]/40" />
              </span>
            </span>
            <span className="relative">{CARD_LABEL[card]}</span>
          </button>
        );
      })}
    </div>
  );
}

function opts<T extends string>(entries: [T, string, ReactNode?][]): SegmentedOption<T>[] {
  return entries.map(([value, label, render]) => ({ value, label, render }));
}

const textOptions = opts<Appearance["text"]>([
  ["sm", "Small", <span key="s" className="text-[11px] leading-none">Aa</span>],
  ["md", "Default", <span key="m" className="text-[13px] leading-none">Aa</span>],
  ["lg", "Large", <span key="l" className="text-[15px] leading-none">Aa</span>],
]);

const radiusOptions = opts<Appearance["radius"]>(
  (
    [
      ["sharp", "Sharp", "2px"],
      ["soft", "Soft", "5px"],
      ["round", "Round", "8px"],
    ] as const
  ).map(([value, label, r]) => [
    value,
    label,
    <span key={value} className="flex items-center gap-1.5">
      <span aria-hidden className="size-3 border-[1.5px] border-current" style={{ borderRadius: r }} />
      {label}
    </span>,
  ]),
);

const baseOptions = opts<Appearance["base"]>(
  (["warm", "neutral", "cool"] as const).map((value) => [
    value,
    value[0]!.toUpperCase() + value.slice(1),
    <span key={value} className="flex items-center gap-1.5">
      <span aria-hidden className="size-2.5 rounded-full ring-1 ring-black/10" style={{ background: BASE_DOT[value] }} />
      {value[0]!.toUpperCase() + value.slice(1)}
    </span>,
  ]),
);

export function AppearancePanel() {
  const a = useAppearance();
  const isDefault = (Object.keys(DEFAULT_APPEARANCE) as (keyof Appearance)[]).every(
    (key) => a[key] === DEFAULT_APPEARANCE[key],
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-medium text-[var(--color-text)]">Appearance</h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Changes apply instantly and are saved on this device.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" disabled={isDefault} onClick={resetAppearance}>
            <RotateCcw />
            Reset
          </Button>
        </div>

        <section>
          <SectionTitle>Colour</SectionTitle>
          <div className="divide-y divide-[var(--color-border)]">
            <SettingRow title="Theme" hint="Light, dark, or follow this device.">
              <ThemeToggle showLabels />
            </SettingRow>
            <SettingRow title="Accent" hint="Buttons, links, focus and highlights — the ten.">
              <AccentPicker value={a.accent} />
            </SettingRow>
            <SettingRow title="Base tone" hint="The temperature of the background and panels.">
              <Segmented label="Base tone" value={a.base} options={baseOptions} onChange={(v) => setAppearance("base", v)} />
            </SettingRow>
          </div>
        </section>

        <section>
          <SectionTitle>Size</SectionTitle>
          <div className="divide-y divide-[var(--color-border)]">
            <SettingRow title="Density" hint="Padding, gaps and control heights, all together.">
              <Segmented
                label="Density"
                value={a.density}
                options={opts<Appearance["density"]>([
                  ["compact", "Compact"],
                  ["comfortable", "Comfortable"],
                  ["spacious", "Spacious"],
                ])}
                onChange={(v) => setAppearance("density", v)}
              />
            </SettingRow>
            <SettingRow title="Text size" hint="Scales type across the app.">
              <Segmented label="Text size" value={a.text} options={textOptions} onChange={(v) => setAppearance("text", v)} />
            </SettingRow>
            <SettingRow title="Corners" hint="Roundness of cards, buttons and fields.">
              <Segmented label="Corners" value={a.radius} options={radiusOptions} onChange={(v) => setAppearance("radius", v)} />
            </SettingRow>
          </div>
        </section>

        <section>
          <SectionTitle>Surfaces</SectionTitle>
          <div className="divide-y divide-[var(--color-border)]">
            <SettingRow title="Card style" hint="How panels sit on the page.">
              <CardStylePicker value={a.card} />
            </SettingRow>
            <SettingRow title="Spotlight" hint="A glow that follows your pointer across cards.">
              <Segmented
                label="Spotlight"
                value={a.spotlight}
                options={opts<Appearance["spotlight"]>([
                  ["on", "On"],
                  ["off", "Off"],
                ])}
                onChange={(v) => setAppearance("spotlight", v)}
              />
            </SettingRow>
          </div>
        </section>

        <section>
          <SectionTitle>Data &amp; forms</SectionTitle>
          <div className="divide-y divide-[var(--color-border)]">
            <SettingRow title="Table style" hint="Row lines, stripes, nothing but hover, or a boxed grid.">
              <Segmented
                label="Table style"
                value={a.table}
                options={opts<Appearance["table"]>([
                  ["lined", "Lined"],
                  ["striped", "Striped"],
                  ["minimal", "Minimal"],
                  ["boxed", "Boxed"],
                ])}
                onChange={(v) => setAppearance("table", v)}
              />
            </SettingRow>
            <SettingRow title="Rows per page" hint="How many rows a table shows at once.">
              <Segmented
                label="Rows per page"
                value={a.pageSize}
                options={opts<Appearance["pageSize"]>([
                  ["10", "10"],
                  ["20", "20"],
                  ["50", "50"],
                ])}
                onChange={(v) => setAppearance("pageSize", v)}
              />
            </SettingRow>
            <SettingRow title="Pagination" hint="Page numbers, Previous / Next, or just arrows.">
              <Segmented
                label="Pagination"
                value={a.pagination}
                options={opts<Appearance["pagination"]>([
                  ["numbered", "Numbered"],
                  ["simple", "Simple"],
                  ["compact", "Compact"],
                ])}
                onChange={(v) => setAppearance("pagination", v)}
              />
            </SettingRow>
            <SettingRow title="Field style" hint="Inputs and selects: outlined, filled, or a single underline.">
              <Segmented
                label="Field style"
                value={a.field}
                options={opts<Appearance["field"]>([
                  ["outline", "Outline"],
                  ["filled", "Filled"],
                  ["underline", "Underline"],
                ])}
                onChange={(v) => setAppearance("field", v)}
              />
            </SettingRow>
            <SettingRow title="Select menus" hint="Drop down below the field, or open over it on the chosen item.">
              <Segmented
                label="Select menus"
                value={a.menu}
                options={opts<Appearance["menu"]>([
                  ["dropdown", "Dropdown"],
                  ["overlay", "Overlay"],
                ])}
                onChange={(v) => setAppearance("menu", v)}
              />
            </SettingRow>
          </div>
        </section>

        <section>
          <SectionTitle>Layout</SectionTitle>
          <div className="divide-y divide-[var(--color-border)]">
            <SettingRow title="Sidebar" hint="Full labels, or an icon rail. Desktop only.">
              <Segmented
                label="Sidebar"
                value={a.sidebar}
                options={opts<Appearance["sidebar"]>([
                  ["expanded", "Expanded"],
                  ["rail", "Icon rail"],
                ])}
                onChange={(v) => setAppearance("sidebar", v)}
              />
            </SettingRow>
            <SettingRow title="Content width" hint="Use the whole window, or keep pages centred.">
              <Segmented
                label="Content width"
                value={a.width}
                options={opts<Appearance["width"]>([
                  ["full", "Full"],
                  ["contained", "Centred"],
                ])}
                onChange={(v) => setAppearance("width", v)}
              />
            </SettingRow>
            <SettingRow title="Motion" hint="Springy animations, or keep everything still.">
              <Segmented
                label="Motion"
                value={a.motion}
                options={opts<Appearance["motion"]>([
                  ["full", "Full"],
                  ["reduced", "Reduced"],
                ])}
                onChange={(v) => setAppearance("motion", v)}
              />
            </SettingRow>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
