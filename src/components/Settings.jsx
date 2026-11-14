/**
 * Settings – Asetukset-paneeli
 * ----------------------------
 * Asetukset on jaettu lokeroihin käyttötiheyden mukaan:
 * Lähetys → Näkymä → Otsikko → Arvonta → Ulkoasu → YouTube API -avain →
 * Varmuuskopio.
 * Jos API-avain puuttuu, sen lokero näytetään ensimmäisenä.
 */

import { useState } from "react";
import {
  Settings2,
  X,
  Radio,
  KeyRound,
  Download,
  Upload,
  Monitor,
  Trophy,
  Palette,
  Database,
  Check,
  Type,
} from "lucide-react";

const VIEW_MODES = {
  normal: {
    label: "Normaali",
    summary: "Kaikki tiedot näkyvissä. Sopii arvonnan valmisteluun.",
    elements: [
      "Logo ja seuraavan kommenttihaun laskuri",
      "Kanava- ja videokenttä",
      "Tilastot (kommentit, osallistujat, arvat)",
      "Arvontaikkuna ja voittajalista",
      "Kommenttivirta",
    ],
  },
  compact: {
    label: "Tiivistetty",
    summary: "Arvonta ja kommentit mahtuvat yhdelle ruudulle.",
    elements: [
      "Logo ja seuraavan kommenttihaun laskuri",
      "Tilastot (kommentit ja osallistujat)",
      "Arvontaikkuna ja voittajalista",
      "Kommenttivirta",
    ],
  },
  stream: {
    label: "Stream mode",
    summary: "Vain arvontaikkuna koko ruudulla – katsojille näytettävä näkymä.",
    elements: [
      "Otsikko ja arvontarulla",
      "Arvontapainike",
      "Voittajalista",
      "Virheilmoitukset (jotta ongelmat huomataan)",
    ],
    note: "Asetukset avautuvat oikean yläkulman lähes näkymättömästä rattaasta (tulee esiin hiirellä osoitettaessa).",
  },
};

function Section({ icon: Icon, title, description, wide, children }) {
  return (
    <section className={`settings-section ${wide ? "is-wide" : ""}`}>
      <header className="settings-section-head">
        <Icon size={16} />
        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
      </header>
      <div className="settings-section-body">{children}</div>
    </section>
  );
}

function ApiKeySection({ configured, onSave }) {
  const [value, setValue] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    if (!value.trim()) return;
    onSave(value);
    setValue("");
  }

  return (
    <Section
      icon={KeyRound}
      title="YouTube API -avain"
      description="Tarvitaan kommenttien hakuun. Syötetään kerran tälle selaimelle."
      wide={!configured}
    >
      <div className="setting-item">
        <label htmlFor="api-key">
          Avain{" "}
          <span className={`setting-status ${configured ? "is-ok" : "is-missing"}`}>
            {configured ? (
              <>
                <Check size={11} /> tallennettu
              </>
            ) : (
              "puuttuu"
            )}
          </span>
        </label>
        <form onSubmit={handleSubmit} className="setting-row">
          <input
            id="api-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={configured ? "Vaihda avain…" : "Liitä API-avain tähän…"}
          />
          <button type="submit" className="primary-btn" disabled={!value.trim()}>
            TALLENNA
          </button>
          {configured && (
            <button type="button" className="copy-btn" onClick={() => onSave("")}>
              Poista
            </button>
          )}
        </form>
        <small>
          Avain tallentuu vain tähän selaimeen tällä laitteella, ei julkiselle
          sivulle.
        </small>
      </div>
    </Section>
  );
}

function BackupSection({ onExport, onImport }) {
  return (
    <Section
      icon={Database}
      title="Varmuuskopio"
      description="Kommentit tallentuvat tähän selaimeen. Ota kopio arvonnan jälkeen."
    >
      <div className="setting-row">
        <button type="button" className="copy-btn" onClick={onExport}>
          <Download size={13} /> Lataa varmuuskopio
        </button>
        <label className="copy-btn">
          <Upload size={13} /> Palauta varmuuskopio
          <input
            type="file"
            accept="application/json,.json"
            onChange={onImport}
            hidden
          />
        </label>
      </div>
      <small className="setting-help">
        Palautuksella kommentit siirtyvät toiselle koneelle tai selaimelle.
      </small>
    </Section>
  );
}

function ViewSection({ viewMode, setViewMode }) {
  const view = VIEW_MODES[viewMode] || VIEW_MODES.normal;

  return (
    <Section
      icon={Monitor}
      title="Näkymä"
      description="Valitse, mitä ruudulla näytetään."
    >
      <div className="view-mode-options" role="radiogroup" aria-label="Näkymä">
        {Object.entries(VIEW_MODES).map(([key, option]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={viewMode === key}
            className={`view-mode-option ${viewMode === key ? "is-active" : ""}`}
            onClick={() => setViewMode(key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="view-mode-info">
        <p>{view.summary}</p>
        <strong>Tässä näkymässä on näkyvissä nämä elementit:</strong>
        <ul>
          {view.elements.map((element) => (
            <li key={element}>{element}</li>
          ))}
        </ul>
        {view.note && <small className="setting-help">{view.note}</small>}
      </div>

      <details className="obs-guide" open={viewMode === "stream"}>
        <summary>Näin näytät arvonnan OBS-lähetyksessä</summary>
        <ol>
          <li>
            Valitse yllä <strong>Stream mode</strong>.
          </li>
          <li>
            Lisää OBS:ssä lähde: <strong>Lähteet → + → Ikkunakaappaus</strong>{" "}
            (Window Capture) ja valitse selainikkuna, jossa Raffleri on auki.
          </li>
          <li>
            Piilota selaimen yläpalkki painamalla selaimessa <strong>F11</strong>{" "}
            (koko näyttö) tai rajaa se pois OBS:ssä vetämällä lähteen reunaa{" "}
            <strong>Alt</strong>-näppäin pohjassa.
          </li>
          <li>
            Arvo voittajat selaimessa hiirellä. Katsojat näkevät vain
            arvontaikkunan.
          </li>
        </ol>
        <small className="setting-help">
          Älä käytä OBS:n <strong>Selainlähdettä</strong> (Browser Source): se on
          erillinen selain, jossa ei ole API-avaintasi eikä kerättyjä
          kommentteja.
        </small>
      </details>
    </Section>
  );
}

function HeadingSection({ heading, updateHeading, resetHeading }) {
  const rotating = heading.mode === "rotate";

  return (
    <Section
      icon={Type}
      title="Otsikko"
      description="Arvontaikkunan iso otsikko. Näkyy kaikissa näkymissä."
    >
      <div className="view-mode-options is-two" role="radiogroup" aria-label="Otsikon tyyppi">
        {[
          ["rotate", "Vaihtuvat tekstit"],
          ["fixed", "Kiinteä teksti"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={heading.mode === key}
            className={`view-mode-option ${heading.mode === key ? "is-active" : ""}`}
            onClick={() => updateHeading({ mode: key })}
          >
            {label}
          </button>
        ))}
      </div>

      {rotating ? (
        <>
          <div className="setting-item">
            <label htmlFor="heading-texts">Tekstit (yksi per rivi)</label>
            <textarea
              id="heading-texts"
              rows={4}
              value={heading.rotatingTexts.join("\n")}
              onChange={(e) =>
                updateHeading({ rotatingTexts: e.target.value.split("\n") })
              }
              placeholder={"Prodiscus – The First Finnish Disc Golf Brand\nProdiscus – Pro Discs For Sport"}
            />
            <small>Tekstit vaihtuvat järjestyksessä pehmeällä häivytyksellä.</small>
          </div>
          <div className="setting-item">
            <label htmlFor="heading-interval">Vaihtumisväli</label>
            <select
              id="heading-interval"
              value={heading.intervalSec}
              onChange={(e) => updateHeading({ intervalSec: Number(e.target.value) })}
            >
              <option value={4}>4 sekuntia</option>
              <option value={6}>6 sekuntia</option>
              <option value={8}>8 sekuntia</option>
              <option value={12}>12 sekuntia</option>
            </select>
          </div>
        </>
      ) : (
        <div className="setting-item">
          <label htmlFor="heading-fixed">Teksti</label>
          <input
            id="heading-fixed"
            type="text"
            value={heading.fixedText}
            onChange={(e) => updateHeading({ fixedText: e.target.value })}
            placeholder="Kuka on viikon onnekkain?"
          />
        </div>
      )}

      <div className="setting-item">
        <label htmlFor="heading-subtitle">Alarivi</label>
        <input
          id="heading-subtitle"
          type="text"
          value={heading.subtitle}
          onChange={(e) => updateHeading({ subtitle: e.target.value })}
          placeholder="Esim. Voiton osuessa kohdalle, ota yhteyttä order@prodiscus.fi"
        />
        <small>Pieni teksti otsikon alla. Jätä tyhjäksi, jos et halua alariviä.</small>
      </div>

      <label className="setting-check">
        <input
          type="checkbox"
          checked={heading.showStreamTitle}
          onChange={(e) => updateHeading({ showStreamTitle: e.target.checked })}
        />
        <span>
          <strong>Näytä lähetyksen otsikko</strong>
          <small>
            YouTube-lähetyksen nimi näkyy pienellä otsikon yläpuolella, myös
            Stream modessa.
          </small>
        </span>
      </label>

      <button type="button" className="copy-btn setting-reset" onClick={resetHeading}>
        Palauta oletustekstit (otsikko ja alarivi)
      </button>
    </Section>
  );
}

export default function Settings({
  theme,
  setTheme,
  branding,
  updateBranding,
  selectBrandingImage,
  hostName,
  setHostName,
  viewMode,
  setViewMode,
  heading,
  updateHeading,
  resetHeading,
  url,
  setUrl,
  twitchUrl,
  setTwitchUrl,
  supportsTwitch,
  onLoad,
  busy,
  isWeb,
  supportsChannels,
  autoStart,
  setAutoStart,
  apiKeyConfigured,
  onSaveApiKey,
  onExport,
  onImport,
  onClose,
}) {
  const apiKeySection = isWeb && (
    <ApiKeySection configured={apiKeyConfigured} onSave={onSaveApiKey} />
  );

  return (
    <section className="settings-panel panel">
      <div className="settings-heading">
        <div>
          <div className="section-label">
            <Settings2 size={15} />
            ASETUKSET
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

      <div className="settings-sections">
        {!apiKeyConfigured && apiKeySection}

        {/* 1. Lähetys */}
        <Section
          icon={Radio}
          title="Lähetys"
          description={
            supportsTwitch
              ? "Mistä kommentit haetaan. YouTube ja Twitch voivat olla käytössä yhtä aikaa – kommentit menevät samaan arvontaan."
              : "Mistä kommentit haetaan."
          }
          wide
        >
          <form onSubmit={onLoad} className="source-form">
            <div className="source-fields">
              <div className="setting-item">
                <label htmlFor="video-url">
                  {supportsChannels ? "YouTube-kanava tai video" : "YouTube-videon osoite"}
                </label>
                <input
                  id="video-url"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={
                    supportsChannels
                      ? "Esim. @prodiscus_official tai videon osoite"
                      : "Liitä YouTube-videon tai livelähetyksen osoite"
                  }
                />
                <small>
                  {supportsChannels
                    ? "Kanavalta etsitään käynnissä oleva live kerran, kun painat LATAA. Vaatii API-avaimen."
                    : "Liitä videon tai livelähetyksen osoite."}
                </small>
              </div>

              {supportsTwitch && (
                <div className="setting-item">
                  <label htmlFor="twitch-url">Twitch-kanava</label>
                  <input
                    id="twitch-url"
                    type="text"
                    value={twitchUrl}
                    onChange={(e) => setTwitchUrl(e.target.value)}
                    placeholder="Esim. twitch.tv/kuidemaen"
                  />
                  <small>
                    Chat luetaan reaaliajassa, ei tarvitse API-avainta. Vain
                    sivun ollessa auki kirjoitetut viestit tallentuvat.
                  </small>
                </div>
              )}
            </div>
            <button
              type="submit"
              className="primary-btn"
              disabled={busy || !(url.trim() || (supportsTwitch && twitchUrl.trim()))}
            >
              <Radio size={14} />
              {busy ? "LADATAAN…" : "LATAA"}
            </button>
          </form>
          {supportsTwitch && (
            <small className="setting-help">
              Jätä kenttä tyhjäksi, jos et käytä kyseistä palvelua. Sama 3
              kommenttia per henkilö pätee kummassakin palvelussa.
            </small>
          )}

          {supportsChannels && (
            <label className="setting-check">
              <input
                type="checkbox"
                checked={autoStart}
                onChange={(e) => setAutoStart(e.target.checked)}
              />
              <span>
                <strong>Hae automaattisesti, kun sivu avataan</strong>
                <small>
                  Kun sivu avataan livelähetyksen alettua, kommenttien haku
                  käynnistyy ilman painalluksia.
                </small>
              </span>
            </label>
          )}
        </Section>

        {/* 2. Näkymä */}
        <ViewSection viewMode={viewMode} setViewMode={setViewMode} />

        {/* 3. Otsikko */}
        <HeadingSection
          heading={heading}
          updateHeading={updateHeading}
          resetHeading={resetHeading}
        />

        {/* 4. Arvonta */}
        <Section
          icon={Trophy}
          title="Arvonta"
          description="Kuka voi osallistua ja voittaa."
        >
          <div className="setting-item">
            <label htmlFor="host-name">Isännän käyttäjänimi</label>
            <input
              id="host-name"
              type="text"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="prodiscus_official"
            />
            <small>Isännän kommentit eivät osallistu arvontaan.</small>
          </div>
          <ul className="setting-rules">
            <li>
              Enintään 3 kommenttia per henkilö osallistuu (= 3 arpaa)
              {supportsTwitch ? " – YouTubessa ja Twitchissä erikseen" : ""}.
            </li>
            {supportsTwitch && (
              <li>Twitch-kanavan omistajan omat viestit eivät osallistu.</li>
            )}
            <li>Sama henkilö voi voittaa vain kerran saman videon arvonnoissa.</li>
          </ul>
        </Section>

        {/* 5. Ulkoasu */}
        <Section
          icon={Palette}
          title="Ulkoasu"
          description="Värit ja oma tunnus."
        >
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
                Palauta Prodiscus-tunnus
              </button>
            )}
          </div>

          <div className="setting-item">
            <label htmlFor="branding-animation">Tunnuksen animaatio</label>
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
        </Section>

        {apiKeyConfigured && apiKeySection}

        {isWeb && <BackupSection onExport={onExport} onImport={onImport} />}
      </div>
    </section>
  );
}
