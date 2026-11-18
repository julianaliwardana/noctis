/** Per-device appearance as data attributes on <html>, styled in globals.css. Server-safe: no hooks. */

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

/** Runs in <head> before first paint; mirrors sanitizeAppearance() + applyAppearance(). */
export const appearanceInitScript = `(function(){try{var o=${JSON.stringify(APPEARANCE_OPTIONS)},d=${JSON.stringify(DEFAULT_APPEARANCE)},a={};try{a=JSON.parse(localStorage.getItem("${APPEARANCE_STORAGE_KEY}")||"{}")||{}}catch(e){}var r=document.documentElement;for(var k in o){r.setAttribute("data-"+k,o[k].indexOf(a[k])>-1?a[k]:d[k])}}catch(e){}})()`;
