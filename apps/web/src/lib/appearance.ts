/**
 * Appearance — the user's own layout, colour and sizing choices, kept per device in localStorage.
 *
 * Every setting is a data attribute on <html> (data-accent="violet", data-density="compact", …) and
 * all of the styling lives in globals.css. Nothing in React branches on these values, so the server
 * render never disagrees with the client and the init script below can apply them before first
 * paint. Server-safe: no hooks here, the root layout imports it.
 */

export const APPEARANCE_OPTIONS = {
  accent: ["cobalt", "violet", "emerald", "crimson", "amber", "teal", "onyx"],
  base: ["warm", "neutral", "cool"],
  density: ["compact", "comfortable", "spacious"],
  text: ["sm", "md", "lg"],
  radius: ["sharp", "soft", "round"],
  card: ["flat", "elevated", "outlined", "glass"],
  sidebar: ["expanded", "rail"],
  width: ["full", "contained"],
  motion: ["full", "reduced"],
  spotlight: ["on", "off"],
  table: ["lined", "striped", "minimal", "boxed"],
  field: ["outline", "filled", "underline"],
  menu: ["dropdown", "overlay"],
  pagination: ["numbered", "simple", "compact"],
  pageSize: ["10", "20", "50"],
} as const;

export type AppearanceKey = keyof typeof APPEARANCE_OPTIONS;
export type Appearance = { [K in AppearanceKey]: (typeof APPEARANCE_OPTIONS)[K][number] };

export const DEFAULT_APPEARANCE: Appearance = {
  accent: "cobalt",
  base: "warm",
  density: "comfortable",
  text: "md",
  radius: "soft",
  card: "flat",
  sidebar: "expanded",
  width: "full",
  motion: "full",
  spotlight: "on",
  table: "lined",
  field: "outline",
  menu: "dropdown",
  pagination: "numbered",
  pageSize: "10",
};

export const APPEARANCE_STORAGE_KEY = "noctis-appearance";

/** Swatches for the picker. The real values, per theme, live in globals.css. */
export const ACCENT_SWATCH: Record<Appearance["accent"], string> = {
  cobalt: "#2f5bff",
  violet: "#6d3ff0",
  emerald: "#047a55",
  crimson: "#d1264a",
  amber: "#b45309",
  teal: "#0f766e",
  onyx: "#0e0f12",
};

/** Keeps only known keys with allowed values; anything else falls back to the default. */
export function sanitizeAppearance(raw: unknown): Appearance {
  const out: Appearance = { ...DEFAULT_APPEARANCE };
  if (!raw || typeof raw !== "object") return out;
  for (const key of Object.keys(APPEARANCE_OPTIONS) as AppearanceKey[]) {
    const value = (raw as Record<string, unknown>)[key];
    if ((APPEARANCE_OPTIONS[key] as readonly unknown[]).includes(value)) {
      (out as Record<AppearanceKey, string>)[key] = value as string;
    }
  }
  return out;
}

/**
 * Runs in <head> before first paint. Mirrors sanitizeAppearance() + applyAppearance(): read,
 * validate against the same option lists, write one data attribute per key.
 */
export const appearanceInitScript = `(function(){try{var o=${JSON.stringify(APPEARANCE_OPTIONS)},d=${JSON.stringify(DEFAULT_APPEARANCE)},a={};try{a=JSON.parse(localStorage.getItem("${APPEARANCE_STORAGE_KEY}")||"{}")||{}}catch(e){}var r=document.documentElement;for(var k in o){r.setAttribute("data-"+k,o[k].indexOf(a[k])>-1?a[k]:d[k])}}catch(e){}})()`;
