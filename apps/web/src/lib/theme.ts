export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "noctis-theme";

export const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Runs in <head> before first paint (no theme flash); mirrors resolveIsDark(). Server-safe. */
export const themeInitScript = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=p==="dark"||(p!=="light"&&window.matchMedia("${DARK_QUERY}").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
