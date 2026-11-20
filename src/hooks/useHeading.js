/**
 * useHeading – Arvontaikkunan tekstit (teemakohtaiset)
 * ----------------------------------------------------
 * Otsikko (kiinteä tai vaihtuvat tekstit), alarivi ja voittajan ohje.
 * Jokaisella teemalla on omat tallennetut tekstit; oletukset ovat
 * src/themes.js-tiedostossa.
 */

import { useEffect, useState } from "react";
import { themeProfile } from "../themes";

const storageKey = (theme) => `raffle-heading:${theme}`;
const LEGACY_KEY = "raffle-heading"; // ennen teemoja → Prodiscus

function defaultsFor(theme) {
  return themeProfile(theme).defaults.heading;
}

function readHeading(theme) {
  const defaults = defaultsFor(theme);
  try {
    let raw = localStorage.getItem(storageKey(theme));
    if (raw === null && theme === "prodiscus") {
      raw = localStorage.getItem(LEGACY_KEY);
    }
    const stored = JSON.parse(raw);
    if (!stored || typeof stored !== "object") return defaults;
    return {
      ...defaults,
      ...stored,
      rotatingTexts: Array.isArray(stored.rotatingTexts)
        ? stored.rotatingTexts.filter((t) => typeof t === "string")
        : defaults.rotatingTexts,
    };
  } catch {
    return defaults;
  }
}

export function useHeading(theme) {
  const [heading, setHeading] = useState(() => readHeading(theme));

  // Teema vaihtui → lataa sen teeman tekstit.
  useEffect(() => {
    setHeading(readHeading(theme));
  }, [theme]);

  function updateHeading(next) {
    setHeading((previous) => {
      const updated = { ...previous, ...next };
      try {
        localStorage.setItem(storageKey(theme), JSON.stringify(updated));
      } catch {
        // tallennus epäonnistui – asetus säilyy tämän istunnon ajan
      }
      return updated;
    });
  }

  function resetHeading() {
    updateHeading(defaultsFor(theme));
  }

  return { heading, updateHeading, resetHeading };
}

/** Näytettävät otsikot: tyhjät rivit pois, varalla kiinteä teksti. */
export function headingTexts(heading, theme) {
  if (heading.mode === "rotate") {
    const texts = heading.rotatingTexts.map((t) => t.trim()).filter(Boolean);
    if (texts.length) return texts;
  }
  return [heading.fixedText.trim() || defaultsFor(theme).fixedText];
}

/** Voittajan ohje: tyhjä → teeman oletus. */
export function contactInfoOf(heading, theme) {
  return (heading.contactInfo || "").trim() || defaultsFor(theme).contactInfo;
}
