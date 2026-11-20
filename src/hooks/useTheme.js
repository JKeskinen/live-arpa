/**
 * useTheme – Teeman hallinta
 * ---------------------------
 * Tallentaa teeman localStorageen ja asettaa sen documentElementille
 * (data-theme). Teemat: ks. src/themes.js. Vanha "midnight" → prodiscus.
 */

import { useEffect, useState } from "react";
import { normalizeTheme, DEFAULT_THEME } from "../themes";

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    try {
      return normalizeTheme(localStorage.getItem("raffle-theme"));
    } catch {
      return DEFAULT_THEME;
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("raffle-theme", theme);
    } catch {
      // Teema vaihtuu myös tallennuksen epäonnistuessa
    }
  }, [theme]);

  const setTheme = (next) => setThemeState(normalizeTheme(next));

  return { theme, setTheme };
}
