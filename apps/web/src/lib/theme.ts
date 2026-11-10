export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "noctis-theme";

export const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Runs in <head> before first paint, so the page never flashes the wrong theme. Kept as a string
 * because it has to execute before React does; it mirrors resolveIsDark() in themePreference.ts.
 * Server-safe: this file must stay free of hooks, the root layout imports it.
 */
export const themeInitScript = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=p==="dark"||(p!=="light"&&window.matchMedia("${DARK_QUERY}").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
