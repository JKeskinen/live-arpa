/**
 * ReelStage – Pyörivä arvontarulla + elokuvamainen countdown
 * -----------------------------------------------------------
 * Näyttää nimet, kommentit ja ison countdown-numeron (5→0).
 */

import { Trophy } from "lucide-react";
import PlatformLogo, { PLATFORM_NAME, platformOf } from "./PlatformLogo";

// Harvinaisuustasot (CS2-henkinen Kuidemaen-teema). Taso lasketaan nimestä,
// joten sama nimi saa aina saman värin. Prodiscus-teema ei käytä näitä.
const RARITIES = ["milspec", "restricted", "classified", "covert", "gold"];

function rarityOf(name) {
  let hash = 0;
  for (const char of String(name || "")) hash = (hash * 31 + char.codePointAt(0)) | 0;
  return RARITIES[Math.abs(hash) % RARITIES.length];
}

export default function ReelStage({
  entries,
  displayed,
  rolling,
  winner,
  drawCountdown,
  branding,
  profile,
}) {
  const index = entries.indexOf(displayed);
  const leftName = entries.length
    ? entries[(Math.max(0, index - 1) + entries.length) % entries.length]?.name
    : "";
  const rightName = entries.length
    ? entries[Math.max(0, index + 1) % entries.length]?.name
    : "";

  return (
    <div
      data-rarity={displayed && !winner ? rarityOf(displayed.name) : undefined}
      className={`reel-stage ${rolling ? "is-rolling" : ""} ${
        winner ? "has-winner" : ""
      }`}
    >
      <div className="reel-glow" />
      <div className="reel-pointer top" />
      <div className="reel-window">
        <div className="reel-side left" data-rarity={leftName ? rarityOf(leftName) : undefined}>
          {leftName || "ODOTTAA"}
        </div>

        <div className="reel-center">
          <div
            className={`reel-avatar ${
              rolling && !winner && drawCountdown === null ? "logo-rolling" : ""
            }`}
          >
            {winner ? (
              <Trophy size={29} />
            ) : (
              <img
                src={branding.image || profile.logo}
                alt={`${profile.label}-tunnus`}
                className={`reel-brand-logo ${branding.image ? "" : `logo-fit-${profile.logoFit}`}`}
                draggable={false}
              />
            )}
          </div>

          <div className="reel-name">
            {winner && (
              <PlatformLogo comment={winner} size={28} className="reel-name-logo" />
            )}
            {displayed?.name || "VALMIS ARVONTAAN"}
          </div>
          <div className="reel-comment">
            {displayed?.text || "Lataa video aloittaaksesi"}
          </div>

          {winner && (
            <div className="winner-label">
              <Trophy size={14} />
              VOITTAJA
              <span className="winner-platform">
                <PlatformLogo comment={winner} size={16} />
                {PLATFORM_NAME[platformOf(winner)]}
              </span>
            </div>
          )}

          {drawCountdown !== null && (
            <div className="cinematic-countdown" key={drawCountdown}>
              {drawCountdown}
            </div>
          )}
        </div>

        <div className="reel-side right" data-rarity={rightName ? rarityOf(rightName) : undefined}>
          {rightName || "LIVE"}
        </div>
      </div>
      <div className="reel-pointer bottom" />
      <div className="reel-scanline" />
    </div>
  );
}
