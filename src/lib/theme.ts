/**
 * Appearance setting (Profile > Appearance, design 19): "Match phone" by default.
 * Tokens switch on [data-theme="dark"], so we set that attribute on <html>.
 */
export type ThemePref = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "korope-theme";

export const THEME_BOOT_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}')||'system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){document.documentElement.dataset.theme='light';}})();`;

export function applyTheme(pref: ThemePref) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // Private mode or blocked storage: still apply for this session.
  }
  const dark =
    pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}
