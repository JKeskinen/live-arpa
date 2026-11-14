/**
 * useHeading – Arvontaikkunan otsikon asetukset
 * ---------------------------------------------
 * Otsikko voi olla kiinteä teksti tai vaihtuvat tekstit (fade).
 * Asetukset tallennetaan localStorageen.
 */

import { useState } from "react";

export const DEFAULT_HEADING = {
  mode: "rotate", // "rotate" | "fixed"
  fixedText: "Kuka on viikon onnekkain?",
  rotatingTexts: [
    "Prodiscus – The First Finnish Disc Golf Brand",
    "Prodiscus – Pro Discs For Sport",
    "Prodiscus – Podcast",
  ],
  intervalSec: 6,
  showStreamTitle: false,
  // Otsikon alla näkyvä rivi. Tyhjä = piilotettu.
  subtitle: "Voiton osuessa kohdalle, ota yhteyttä order@prodiscus.fi",
};

const STORAGE_KEY = "raffle-heading";

function readHeading() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored || typeof stored !== "object") return DEFAULT_HEADING;
    return {
      ...DEFAULT_HEADING,
      ...stored,
      rotatingTexts: Array.isArray(stored.rotatingTexts)
        ? stored.rotatingTexts.filter((t) => typeof t === "string")
        : DEFAULT_HEADING.rotatingTexts,
    };
  } catch {
    return DEFAULT_HEADING;
  }
}

export function useHeading() {
  const [heading, setHeading] = useState(readHeading);

  function updateHeading(next) {
    setHeading((previous) => {
      const updated = { ...previous, ...next };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // tallennus epäonnistui – asetus säilyy tämän istunnon ajan
      }
      return updated;
    });
  }

  function resetHeading() {
    updateHeading(DEFAULT_HEADING);
  }

  return { heading, updateHeading, resetHeading };
}

/** Näytettävät otsikot: tyhjät rivit pois, varalla kiinteä teksti. */
export function headingTexts(heading) {
  if (heading.mode === "rotate") {
    const texts = heading.rotatingTexts.map((t) => t.trim()).filter(Boolean);
    if (texts.length) return texts;
  }
  return [heading.fixedText.trim() || DEFAULT_HEADING.fixedText];
}
