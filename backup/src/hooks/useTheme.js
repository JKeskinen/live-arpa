/**
 * useTheme – Teeman hallinta
 * ---------------------------
 * Tallentaa teeman localStorageen ja asettaa sen documentElementille.
 */

import { useEffect, useState } from "react";

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("raffle-theme") === "midnight"
        ? "midnight"
        : "prodiscus";
    } catch {
      return "prodiscus";
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

  return { theme, setTheme };
}
