/**
 * BrandingBar – Yläosan brändäyspalkki
 * -------------------------------------
 * Näyttää logon, asetukset-napin ja seuraavan haun laskurin.
 */

import { Settings2 } from "lucide-react";
import BrandMark from "./BrandMark";

export default function BrandingBar({
  branding,
  profile,
  onSettingsToggle,
  nextPollIn,
}) {
  return (
    <section className="branding-panel panel">
      <BrandMark branding={branding} profile={profile} />
      <div className="branding-copy">
        <strong>{profile.brandName}</strong>
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
