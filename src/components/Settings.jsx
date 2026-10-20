/**
 * Settings – Asetukset-paneeli
 * ----------------------------
 * Sisältää myös URL-syötön.
 */

import { Settings2, X, Radio } from "lucide-react";

export default function Settings({
  theme,
  setTheme,
  branding,
  updateBranding,
  selectBrandingImage,
  hostName,
  setHostName,
  streamMode,
  setStreamMode,
  url,
  setUrl,
  onLoad,
  busy,
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
        <div className="setting-item" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="video-url">YouTube-videon URL</label>
          <form
            onSubmit={onLoad}
            style={{ display: "flex", gap: 8, width: "100%" }}
          >
            <input
              id="video-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Liitä YouTube-videon tai livelähetyksen URL..."
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              className="primary-btn"
              disabled={busy || !url.trim()}
              style={{ height: 40, padding: "0 14px" }}
            >
              <Radio size={14} />
              {busy ? "LADATAAN…" : "LATAA"}
            </button>
          </form>
          <small>Voit vaihtaa videon myös STREAM MODE -tilassa.</small>
        </div>

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
          <small>Ei hyväksytä voittajaksi.</small>
        </div>

        <div className="setting-item">
          <label htmlFor="stream-mode">STREAM MODE</label>
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              id="stream-mode"
              type="checkbox"
              checked={streamMode}
              onChange={(e) => setStreamMode(e.target.checked)}
            />
            <span>Tiivistetty näkymä</span>
          </label>
        </div>
      </div>
    </section>
  );
}
