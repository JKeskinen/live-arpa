/**
 * useBranding – Brändäyksen ja isännän nimen hallinta
 * ---------------------------------------------------
 * Tallentaa branding-asetukset ja isännän nimen localStorageen.
 */

import { useEffect, useState } from "react";

const DEFAULT_BRANDING = {
  image: "",
  animation: "pulse",
  showWordmark: true,
};

export function useBranding(setError) {
  const [branding, setBranding] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("raffle-branding")) || DEFAULT_BRANDING
      );
    } catch {
      return DEFAULT_BRANDING;
    }
  });

  const [hostName, setHostName] = useState(() => {
    try {
      return localStorage.getItem("raffle-host") || "prodiscus_official";
    } catch {
      return "prodiscus_official";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("raffle-host", hostName);
    } catch {
      // tallennus epäonnistui
    }
  }, [hostName]);

  function updateBranding(next) {
    setBranding((previous) => {
      const updated = { ...previous, ...next };
      try {
        localStorage.setItem("raffle-branding", JSON.stringify(updated));
      } catch {
        setError?.("Kuvan tallennus epäonnistui. Valitse pienempi kuvatiedosto.");
        return previous;
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
