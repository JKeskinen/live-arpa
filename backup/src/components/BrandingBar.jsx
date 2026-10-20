/**
 * BrandingBar – Yläosan brändäyspalkki
 * -------------------------------------
 * Näyttää logon / kuvan ja ASETUKSET-napin.
 */

import { Settings2 } from "lucide-react";

export default function BrandingBar({ branding, onSettingsToggle }) {
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
      <button
        type="button"
        className="settings-button"
        onClick={onSettingsToggle}
      >
        <Settings2 size={17} />
        ASETUKSET
      </button>
    </section>
  );
}
