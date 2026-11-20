/**
 * useBranding – Tunnuskuva, animaatio ja isäntä (teemakohtaiset)
 * ---------------------------------------------------------------
 * Asetukset ja isännän nimi tallennetaan localStorageen, tunnuskuva
 * IndexedDB:hen (localStoragen ~5 Mt:n raja täyttyy kuvalla helposti).
 * Jokaisella teemalla on oma kuva, animaatio ja isäntä.
 * Ennen teemoja tallennetut arvot kuuluvat Prodiscus-teemalle.
 */

import { useEffect, useState } from "react";
import { kvGet, kvSet } from "../web/db";
import { themeProfile } from "../themes";

const DEFAULT_BRANDING = {
  image: "",
  animation: "pulse",
  showWordmark: true,
};

const settingsKey = (theme) => `raffle-branding:${theme}`;
const imageKey = (theme) => `branding-image:${theme}`;
const hostKey = (theme) => `raffle-host:${theme}`;

// Ennen teemoja käytetyt avaimet (→ Prodiscus)
const LEGACY_SETTINGS = "raffle-branding";
const LEGACY_IMAGE = "branding-image";
const LEGACY_HOST = "raffle-host";

function readLocal(key, legacyKey, theme) {
  try {
    const value = localStorage.getItem(key);
    if (value === null && theme === "prodiscus") {
      return localStorage.getItem(legacyKey);
    }
    return value;
  } catch {
    return null;
  }
}

function readSettings(theme) {
  try {
    const stored = JSON.parse(readLocal(settingsKey(theme), LEGACY_SETTINGS, theme));
    return stored ? { ...DEFAULT_BRANDING, ...stored } : DEFAULT_BRANDING;
  } catch {
    return DEFAULT_BRANDING;
  }
}

function writeSettings(theme, branding) {
  // eslint-disable-next-line no-unused-vars
  const { image, ...settings } = branding;
  localStorage.setItem(settingsKey(theme), JSON.stringify(settings));
}

function readHost(theme) {
  const stored = readLocal(hostKey(theme), LEGACY_HOST, theme);
  // Tyhjä = teeman oletus, ettei isäntä voi vahingossa osallistua arvontaan.
  return stored?.trim() ? stored : themeProfile(theme).defaults.hostName;
}

export function useBranding(setError, theme) {
  const [branding, setBranding] = useState(() => readSettings(theme));
  const [hostName, setHostNameState] = useState(() => readHost(theme));

  // Teema vaihtui → lataa sen teeman asetukset ja kuva.
  useEffect(() => {
    let cancelled = false;
    const settings = readSettings(theme);
    setBranding({ ...settings, image: "" });
    setHostNameState(readHost(theme));

    (async () => {
      try {
        let image = (await kvGet(imageKey(theme))) || "";

        // Kertasiirto ennen teemoja tallennetusta kuvasta (Prodiscus).
        // Vanha kuva oli joko localStoragessa asetusten seassa (hyvin vanha
        // muoto) tai IndexedDB-avaimessa "branding-image". Vanhat kopiot
        // poistetaan siirron jälkeen, jotta "Palauta logo" pysyy voimassa
        // eikä vanha kuva palaa seuraavalla latauksella.
        const legacyInline = settings.image;
        if (!image && theme === "prodiscus") {
          const legacy = legacyInline || (await kvGet(LEGACY_IMAGE)) || "";
          if (legacy) {
            await kvSet(imageKey(theme), legacy);
            image = legacy;
          }
          await kvSet(LEGACY_IMAGE, ""); // tyhjä = poisto
        }
        if (legacyInline) writeSettings(theme, settings); // kuva pois asetuksista

        if (!cancelled) setBranding((previous) => ({ ...previous, image }));
      } catch {
        // Kuvaa ei saatu ladattua; käytetään teeman oletustunnusta.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [theme]);

  function setHostName(value) {
    setHostNameState(value);
    try {
      localStorage.setItem(hostKey(theme), value);
    } catch {
      // tallennus epäonnistui
    }
  }

  function updateBranding(next) {
    if ("image" in next) {
      kvSet(imageKey(theme), next.image).catch(() =>
        setError?.("Kuvan tallennus epäonnistui. Valitse pienempi kuvatiedosto."),
      );
    }
    setBranding((previous) => {
      const updated = { ...previous, ...next };
      try {
        writeSettings(theme, updated);
      } catch {
        setError?.("Asetusten tallennus epäonnistui.");
      }
      return updated;
    });
  }

  function selectBrandingImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError?.("Valitse PNG-, JPG- tai WebP-kuva.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError?.("Kuvan enimmäiskoko on 2 Mt.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () =>
      updateBranding({ image: String(reader.result || "") });
    reader.onerror = () => setError?.("Kuvan lukeminen epäonnistui.");
    reader.readAsDataURL(file);
  }

  return {
    branding,
    updateBranding,
    selectBrandingImage,
    hostName,
    setHostName,
  };
}
