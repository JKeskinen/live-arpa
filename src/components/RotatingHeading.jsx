/**
 * RotatingHeading – Vaihtuva otsikko pehmeällä häivytyksellä
 * ----------------------------------------------------------
 * Yksi teksti → näytetään sellaisenaan. Useampi → vaihtuu
 * intervalSec välein: häivytys pois (0,6 s), teksti vaihtuu, häivytys sisään.
 */

import { useEffect, useState } from "react";

const FADE_MS = 600;

export default function RotatingHeading({ texts, intervalSec = 6 }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const count = texts.length;
  const key = texts.join("\u0000");

  // Aloita alusta, kun tekstit muuttuvat.
  useEffect(() => {
    setIndex(0);
    setVisible(true);
  }, [key]);

  useEffect(() => {
    if (count < 2) return undefined;
    let fadeTimer;
    const interval = setInterval(() => {
      setVisible(false);
      fadeTimer = setTimeout(() => {
        setIndex((i) => (i + 1) % count);
        setVisible(true);
      }, FADE_MS);
    }, Math.max(2, intervalSec) * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimer);
    };
  }, [count, intervalSec, key]);

  return (
    <h1
      className={`rotating-heading ${visible ? "" : "is-hidden"}`}
      aria-live="off"
    >
      {texts[index % count] || ""}
    </h1>
  );
}
