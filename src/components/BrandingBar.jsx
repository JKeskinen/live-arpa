/**
 * BrandingBar – Yläosan brändäyspalkki
 * -------------------------------------
 * Näyttää logon, asetukset-napin ja seuraavan haun laskurin.
 */

import { Settings2 } from "lucide-react";

export default function BrandingBar({
  branding,
  onSettingsToggle,
  nextPollIn,
}) {
  return (
    <section className="branding-panel panel">
      <div className="branding-preview">
        {branding.image ? (
          <img
            className={`brand-custom-image animation-${branding.animation}`}
            src={branding.image}
            alt="Valittu tunnus"
          />
        ) : (
          <div className="prodiscus-wordmark">
            <span className="prodiscus-disc">P</span>
            <span>PRODISCUS</span>
          </div>
        )}
      </div>
      <div className="branding-copy">
        <strong>PRODISCUS</strong>
        <span>RAFFLERI</span>
      </div>

      {nextPollIn !== null && (
        <div style={{ fontSize: 12, color: "var(--muted)", marginRight: 8 }}>
          Seuraava haku:{" "}
          <strong style={{ color: "var(--cyan)" }}>{nextPollIn}s</strong>
        </div>
      )}

      <button
        type="button"
        className="settings-button"
        onClick={onSettingsToggle}
      >
        <Settings2 size={17} />
      </button>
    </section>
  );
}
