/**
 * Settings – Asetukset-paneeli
 * ----------------------------
 * Teema, branding-kuva, animaatio ja isännän nimi.
 */

import { Settings2, X } from "lucide-react";

export default function Settings({
  theme,
  setTheme,
  branding,
  updateBranding,
  selectBrandingImage,
  hostName,
  setHostName,
  onClose,
}) {
  return (
    <section className="settings-panel panel">
      <div className="settings-heading">
        <div>
          <div className="section-label">
            <Settings2 size={15} />
            ULKOASU JA BRÄNDÄYS
          </div>
          <h2>Arvontakoneen asetukset</h2>
        </div>
        <button
          type="button"
          className="settings-close"
          onClick={onClose}
          aria-label="Sulje asetukset"
        >
          <X size={18} />
        </button>
      </div>
      <div className="settings-grid">
        <div className="setting-item">
          <label htmlFor="branding-image">Oma tunnuskuva</label>
          <input
            id="branding-image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={selectBrandingImage}
          />
          <small>PNG, JPG tai WebP, enintään 2 Mt.</small>
          {branding.image && (
            <button
              type="button"
              className="copy-btn"
              onClick={() => updateBranding({ image: "" })}
            >
              Palauta Prodiscus-teksti
            </button>
          )}
        </div>

        <div className="setting-item">
          <label htmlFor="branding-animation">Kuvan animaatio</label>
          <select
            id="branding-animation"
            value={branding.animation}
            onChange={(e) => updateBranding({ animation: e.target.value })}
          >
            <option value="none">Ei animaatiota</option>
            <option value="spin">Pyörii</option>
            <option value="pulse">Sykkii</option>
            <option value="float">Kelluu</option>
          </select>
          <small>Valinta näkyy heti kuvan esikatselussa.</small>
        </div>

        <div className="setting-item">
          <label htmlFor="app-theme">Väriteema</label>
          <select
            id="app-theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          >
            <option value="prodiscus">Prodiscus – musta ja oranssi</option>
            <option value="midnight">Tumma – sininen ja violetti</option>
          </select>
          <small>Teema vaihtuu heti ja tallennetaan automaattisesti.</small>
        </div>

        <div className="setting-item">
          <label htmlFor="host-name">Isännän käyttäjänimi</label>
          <input
            id="host-name"
            type="text"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            placeholder="prodiscus_official"
          />
          <small>
            Tätä nimeä ei hyväksytä arvonnan voittajaksi. Vertailu on
            kirjainkoosta riippumaton.
          </small>
        </div>
      </div>
    </section>
  );
}
