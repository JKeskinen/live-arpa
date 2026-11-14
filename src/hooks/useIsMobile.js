/**
 * useIsMobile – Puhelimen / kapean näytön tunnistus
 * -------------------------------------------------
 * Mobiili = näyttö alle 700 px leveä TAI kosketusnäyttö, joka on enintään
 * tabletin kokoinen (1024 px). Päivittyy, kun puhelinta käännetään tai
 * ikkunan kokoa muutetaan.
 */

import { useEffect, useState } from "react";

const MOBILE_QUERY =
  "(max-width: 700px), ((pointer: coarse) and (max-width: 1024px))";

function matches() {
  try {
    return window.matchMedia(MOBILE_QUERY).matches;
  } catch {
    return false;
  }
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(matches);

  useEffect(() => {
    let media;
    try {
      media = window.matchMedia(MOBILE_QUERY);
    } catch {
      return undefined;
    }
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  return isMobile;
}
