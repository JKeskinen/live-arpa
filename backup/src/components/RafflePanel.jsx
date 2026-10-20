/**
 * RafflePanel – Arvontapaneeli
 * ----------------------------
 * Sisältää reel-stagen, napit ja voittajan näytön.
 */

import { Sparkles, Play, Trophy } from "lucide-react";
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
  return (
    <div className="raffle-panel panel">
      <div className="panel-heading">
        <div>
          <div className="section-label">
            <Sparkles size={15} />
            RAFFLERI
          </div>
          <h1>Kenelle onni osuu?</h1>
          <p>Arvontaan hyväksytään enintään kolme kommenttia käyttäjää kohti.</p>
        </div>
        <div className="entry-pill">
          <span />
          {entries.length} osallistumista
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
          disabled={!entries.length || rolling}
          onClick={onStart}
        >
          <Play size={17} fill="currentColor" />
          KÄYNNISTÄ RAFFLERI
        </button>
        <button
          className="draw-btn"
          disabled={!entries.length || !rolling}
          onClick={onDraw}
        >
          <Trophy size={17} />
          ARVO VOITTAJA
        </button>
      </div>

      <div className="raffle-hint">
        <span className="hint-dot" />
        Rulla pyörii jatkuvasti
        <span className="hint-separator">•</span>
        Voittajan hidastus 6 sekuntia
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
          </div>
          <button className="copy-btn" onClick={onCopyWinner}>
            Kopioi
          </button>
        </div>
      )}
    </div>
  );
}
