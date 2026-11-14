/**
 * RafflePanel – Arvontapaneeli
 * ----------------------------
 * Sisältää reel-stagen, arvontanapin, viimeisimmän voittajan ja
 * voittajalistan (useampi voittaja).
 */

import { useState } from "react";
import { Trophy, Copy, Trash2 } from "lucide-react";
import ReelStage from "./ReelStage";
import BrandMark from "./BrandMark";
import PlatformLogo from "./PlatformLogo";
import RotatingHeading from "./RotatingHeading";

function useCopiedFlag() {
  const [copied, setCopied] = useState(null);
  async function run(key, action) {
    const ok = await action();
    if (ok === false) return;
    setCopied(key);
    setTimeout(() => setCopied((current) => (current === key ? null : current)), 2000);
  }
  return [copied, run];
}

export default function RafflePanel({
  entries,
  totalEntries,
  displayed,
  rolling,
  winner,
  winners,
  drawCountdown,
  branding,
  headingTexts,
  headingInterval,
  subtitle,
  streamTitle,
  onDraw,
  onCopyWinner,
  onCopyAll,
  onClearWinners,
}) {
  const [copied, runCopy] = useCopiedFlag();
  const drawing = drawCountdown !== null;
  const hasWinners = winners.length > 0;
  const excluded = totalEntries - entries.length;

  let buttonLabel = "ARVO VOITTAJA";
  if (drawing) buttonLabel = "ARVOTAAN…";
  else if (hasWinners && !entries.length) buttonLabel = "KAIKKI OSALLISTUJAT OVAT VOITTANEET";
  else if (hasWinners) buttonLabel = `ARVO ${winners.length + 1}. VOITTAJA`;

  return (
    <div className="raffle-panel panel">
      <div className="panel-heading raffle-heading">
        <BrandMark branding={branding} className="raffle-brand-mark" />
        <div className="raffle-heading-text">
          <div className="section-label raffle-brand-label">
            <span className="raffle-brand-name">PRODISCUS</span>
            <span className="raffle-brand-product">RAFFLERI</span>
            {streamTitle && (
              <span className="raffle-stream-title" title={streamTitle}>
                {streamTitle}
              </span>
            )}
          </div>
          <RotatingHeading texts={headingTexts} intervalSec={headingInterval} />
          {subtitle?.trim() && <p>{subtitle}</p>}
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
          disabled={!entries.length || drawing}
          onClick={onDraw}
        >
          <Trophy size={17} />
          {buttonLabel}
        </button>
      </div>

      <div className="raffle-hint">
        <span className="hint-dot" />
        {hasWinners ? (
          <>
            Arvonnassa mukana {entries.length} kommenttia
            {excluded > 0 && <> • voittajien {excluded} kommenttia poistettu</>}
          </>
        ) : (
          <>
            Kiekot ja tarvikkeet: Prodiscus.fi
            <span className="hint-separator">•</span>
            Muista myös Prodiscus-Patreon.
          </>
        )}
      </div>

      {winner && (
        <div className="winner-result">
          <div className="winner-cup">
            <Trophy size={23} />
          </div>
          <div>
            <div className="winner-overline">
              ONNEA {winners.length > 1 ? `${winners.length}. ` : ""}VOITTAJALLE!
            </div>
            <strong className="winner-name-row">
              <PlatformLogo comment={winner} size={18} />
              {winner.name}
            </strong>
            <p>{winner.text}</p>
            <p style={{ fontSize: 9, marginTop: 6, color: "var(--muted)" }}>
              Sähköpostin otsikkoon: Podcast-voittaja
              <br />
              Viestiin: nimi, osoite, puhelinnumero
            </p>
          </div>
          <button
            className="copy-btn"
            onClick={() => runCopy("current", () => onCopyWinner(winner))}
          >
            {copied === "current" ? "Kopioitu!" : "Kopioi"}
          </button>
        </div>
      )}

      {hasWinners && (
        <div className="today-winners" style={{ marginTop: 14, padding: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 13 }}>
              Voittajat ({winners.length})
            </h2>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                className="copy-btn"
                onClick={() => runCopy("all", onCopyAll)}
              >
                <Copy size={11} style={{ verticalAlign: "-1px", marginRight: 4 }} />
                {copied === "all" ? "Kopioitu!" : "Kopioi kaikki"}
              </button>
              <button
                type="button"
                className="copy-btn"
                onClick={onClearWinners}
                disabled={drawing}
                title="Tyhjennä voittajalista"
              >
                <Trash2 size={11} style={{ verticalAlign: "-1px" }} />
              </button>
            </div>
          </div>
          <ol style={{ fontSize: 11 }}>
            {winners.map((w, index) => (
              <li key={`${w.authorKey}-${w.drawnAt}`}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong className="winner-name-row">
                      <PlatformLogo comment={w} size={14} />
                      {w.name}
                    </strong>
                    <p
                      style={{
                        fontSize: 10,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {w.text}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="copy-btn"
                    style={{ padding: "4px 8px", flexShrink: 0 }}
                    onClick={() => runCopy(`w${index}`, () => onCopyWinner(w))}
                  >
                    {copied === `w${index}` ? "Kopioitu!" : "Kopioi"}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
