/**
 * useBranding – Brändäyksen ja isännän nimen hallinta
 * ---------------------------------------------------
 * Asetukset (animaatio ym.) ja isännän nimi tallennetaan localStorageen.
 * Tunnuskuva tallennetaan IndexedDB:hen, koska localStoragen ~5 Mt:n raja
 * täyttyy helposti kuvalla.
 */

import { useEffect, useState } from "react";
import { kvGet, kvSet } from "../web/db";

const DEFAULT_BRANDING = {
  image: "",
  animation: "pulse",
  showWordmark: true,
};

const SETTINGS_KEY = "raffle-branding";
const IMAGE_KEY = "branding-image";

function readSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    return stored ? { ...DEFAULT_BRANDING, ...stored } : DEFAULT_BRANDING;
  } catch {
    return DEFAULT_BRANDING;
  }
}

function writeSettings(branding) {
  // eslint-disable-next-line no-unused-vars
  const { image, ...settings } = branding;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function useBranding(setError) {
  const [branding, setBranding] = useState(readSettings);

  const [hostName, setHostName] = useState(() => {
    try {
      return localStorage.getItem("raffle-host") || "prodiscus_official";
    } catch {
      return "prodiscus_official";
    }
  });

  // Lataa kuva IndexedDB:stä. Siirrä vanha localStoragessa ollut kuva.
  useEffect(() => {
    let cancelled = false;
    const legacyImage = readSettings().image;

    (async () => {
      try {
        if (legacyImage) {
          await kvSet(IMAGE_KEY, legacyImage);
          writeSettings(readSettings());
        }
        const image = legacyImage || (await kvGet(IMAGE_KEY)) || "";
        if (!cancelled) setBranding((previous) => ({ ...previous, image }));
      } catch {
        // Kuvaa ei saatu ladattua; käytetään oletustekstiä.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("raffle-host", hostName);
    } catch {
      // tallennus epäonnistui
    }
  }, [hostName]);

  function updateBranding(next) {
    if ("image" in next) {
      kvSet(IMAGE_KEY, next.image).catch(() =>
        setError?.("Kuvan tallennus epäonnistui. Valitse pienempi kuvatiedosto."),
      );
    }
    setBranding((previous) => {
      const updated = { ...previous, ...next };
      try {
        writeSettings(updated);
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
