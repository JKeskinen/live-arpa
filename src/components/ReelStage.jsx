/**
 * ReelStage – Pyörivä arvontarulla + elokuvamainen countdown
 * -----------------------------------------------------------
 * Näyttää nimet, kommentit ja ison countdown-numeron (5→0).
 */

import { Trophy } from "lucide-react";

export default function ReelStage({
  entries,
  displayed,
  rolling,
  winner,
  drawCountdown,
  branding,
}) {
  return (
    <div
      className={`reel-stage ${rolling ? "is-rolling" : ""} ${
        winner ? "has-winner" : ""
      }`}
    >
      <div className="reel-glow" />
      <div className="reel-pointer top" />
      <div className="reel-window">
        <div className="reel-side left">
          {entries.length
            ? entries[
                (Math.max(0, entries.indexOf(displayed) - 1) +
                  entries.length) %
                  entries.length
              ]?.name
            : "ODOTTAA"}
        </div>

        <div className="reel-center">
          <div
            className={`reel-avatar ${
              rolling && !winner && drawCountdown === null ? "logo-rolling" : ""
            }`}
          >
            {winner ? (
              <Trophy size={29} />
            ) : branding.image ? (
              <img
                src={branding.image}
                alt="Logo"
                className="reel-brand-logo"
              />
            ) : (
              <span className="reel-brand-letter">P</span>
            )}
          </div>

          <div className="reel-name">
            {displayed?.name || "VALMIS ARVONTAAN"}
          </div>
          <div className="reel-comment">
            {displayed?.text || "Lataa video aloittaaksesi"}
          </div>

          {winner && (
            <div className="winner-label">
              <Trophy size={14} />
              VOITTAJA
            </div>
          )}

          {drawCountdown !== null && (
            <div className="cinematic-countdown" key={drawCountdown}>
              {drawCountdown}
            </div>
          )}
        </div>

        <div className="reel-side right">
          {entries.length
            ? entries[
                Math.max(0, entries.indexOf(displayed) + 1) % entries.length
              ]?.name
            : "LIVE"}
        </div>
      </div>
      <div className="reel-pointer bottom" />
      <div className="reel-scanline" />
    </div>
  );
}
