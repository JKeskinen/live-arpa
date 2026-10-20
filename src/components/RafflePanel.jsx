/**
 * RafflePanel – Arvontapaneeli
 * ----------------------------
 * Sisältää reel-stagen, napin ja voittajan näytön.
 */

import { useState } from "react";
import { Sparkles, Trophy } from "lucide-react";
import ReelStage from "./ReelStage";

export default function RafflePanel({
  entries,
  displayed,
  rolling,
  winner,
  drawCountdown,
  branding,
  onStart,
  onDraw,
  onCopyWinner,
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await onCopyWinner();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="raffle-panel panel">
      <div className="panel-heading">
        <div>
          <div className="section-label">
            <Sparkles size={15} />
            RAFFLERI
          </div>
          <h1>Kuka on viikon onnekkain?</h1>
          <p>Voiton osuessa kohdalle, ota yhteyttä order@prodiscus.fi</p>
        </div>
      </div>

      <ReelStage
        entries={entries}
        displayed={displayed}
        rolling={rolling}
        winner={winner}
        drawCountdown={drawCountdown}
        branding={branding}
      />

      <div className="raffle-actions">
        <button
          className="start-btn"
          disabled={!entries.length || !rolling}
          onClick={onDraw}
        >
          <Trophy size={17} />
          ARVO VOITTAJA
        </button>
      </div>

      <div className="raffle-hint">
        <span className="hint-dot" />
        Kiekot ja tarvikkeet: Prodiscus.fi
        <span className="hint-separator">•</span>
        Muista myös Prodiscus-Patreon.
      </div>

      {winner && (
        <div className="winner-result">
          <div className="winner-cup">
            <Trophy size={23} />
          </div>
          <div>
            <div className="winner-overline">ONNEA VOITTAJALLE!</div>
            <strong>{winner.name}</strong>
            <p>{winner.text}</p>
            <p style={{ fontSize: 9, marginTop: 6, color: "var(--muted)" }}>
              Sähköpostin otsikkoon: Podcast-voittaja
              <br />
              Viestiin: nimi, osoite, puhelinnumero
            </p>
          </div>
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? "Kopioitu!" : "Kopioi"}
          </button>
        </div>
      )}
    </div>
  );
}
