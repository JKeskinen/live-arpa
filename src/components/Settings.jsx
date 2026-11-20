/**
 * Settings – Asetukset (modaalinen dialogi)
 * -----------------------------------------
 * Avautuu koko sovelluksen päälle: tausta himmennetään ja sumennetaan, ja
 * näkyvissä on vain asetusikkuna. Esc ja taustan klikkaus sulkevat.
 *
 * Asetukset on jaettu tabeihin (yksi osio kerrallaan) käyttötiheyden mukaan:
 * Lähetys → Näkymä → Tekstit → Arvonta → Teema ja ulkoasu → API-avain →
 * Varmuuskopio. Jokainen tab koostuu korteista, joissa toisiinsa liittyvät
 * kentät ovat yhdessä. Viimeksi avattu tab muistetaan; puuttuva API-avain
 * näkyy merkkinä API-avain-tabissa.
 */

import { useEffect, useRef, useState } from "react";
import { THEMES } from "../themes";
import { CONTACT_INFO_MAX_LENGTH } from "../utils/winnerMessage";
import { MAX_ACCEPTED_PER_AUTHOR } from "../../shared/raffleCore.mjs";
import {
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
  RotateCcw,
} from "lucide-react";

const VIEW_MODES = {
  normal: {
    label: "Normaali",
    summary: "Kaikki tiedot näkyvissä. Sopii arvonnan valmisteluun.",
    elements: [
      "Logo ja seuraavan kommenttihaun laskuri",
      "Lähdekentät (YouTube ja Twitch)",
      "Tilastot",
      "Arvontaikkuna ja voittajalista",
      "Kommenttivirta",
    ],
  },
  compact: {
    label: "Tiivistetty",
    summary: "Arvonta ja kommentit mahtuvat yhdelle ruudulle.",
    elements: [
      "Logo ja seuraavan kommenttihaun laskuri",
      "Tilastot",
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
    note: "Asetukset avautuvat oikean yläkulman lähes näkymättömästä rattaasta.",
  },
};

// Asetusten tabit. Vain valitun tabin sisältö näytetään.
const SETTINGS_TABS = [
  { id: "lahetys", label: "Lähetys", icon: Radio },
  { id: "nakyma", label: "Näkymä", icon: Monitor },
  { id: "tekstit", label: "Tekstit", icon: Type },
  { id: "arvonta", label: "Arvonta", icon: Trophy },
  { id: "teema", label: "Ulkoasu", icon: Palette },
  { id: "api", label: "API-avain", icon: KeyRound },
  { id: "varmuuskopio", label: "Varmuuskopio", icon: Database },
];
const TAB_STORAGE_KEY = "raffle-settings-tab";

function readStoredTab() {
  try {
    const stored = localStorage.getItem(TAB_STORAGE_KEY);
    return SETTINGS_TABS.some((t) => t.id === stored) ? stored : "lahetys";
  } catch {
    return "lahetys";
  }
}

/** Kelluva kortti: pieni otsikko, valinnainen kuvaus ja sisältö. */
function Card({ title, description, tone = "", children }) {
  return (
    <section className={`settings-card ${tone ? `is-${tone}` : ""}`}>
      {(title || description) && (
        <header className="settings-card-head">
          {title && <h3>{title}</h3>}
          {description && <p>{description}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

function Intro({ children }) {
  return <p className="settings-intro">{children}</p>;
}

// ------------------------------------------------------------
// Tabien sisällöt
// ------------------------------------------------------------

function SourcesTab({
  url,
  setUrl,
  twitchUrl,
  setTwitchUrl,
  onLoad,
  busy,
  autoStart,
  setAutoStart,
}) {
  return (
    <>
      <Intro>
        Mistä kommentit haetaan. YouTube ja Twitch voivat olla käytössä yhtä
        aikaa – kommentit menevät samaan arvontaan.
      </Intro>

      <Card title="Lähteet">
        <form onSubmit={onLoad} className="source-form">
          <div className="source-fields">
            <div className="setting-item">
              <label htmlFor="video-url">YouTube-kanava tai video</label>
              <input
                id="video-url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Esim. @kanava tai videon osoite"
              />
              <small>Live etsitään kerran, kun painat LATAA. Vaatii API-avaimen.</small>
            </div>
            <div className="setting-item">
              <label htmlFor="twitch-url">Twitch-kanava</label>
              <input
                id="twitch-url"
                type="text"
                value={twitchUrl}
                onChange={(e) => setTwitchUrl(e.target.value)}
                placeholder="Esim. twitch.tv/kuidemaen"
              />
              <small>Reaaliajassa, ei API-avainta. Avaa ennen arvonnan alkua.</small>
            </div>
          </div>
          <div className="settings-actions">
            <small className="setting-help">
              Jätä kenttä tyhjäksi, jos et käytä palvelua.
            </small>
            <button
              type="submit"
              className="primary-btn"
              disabled={busy || !(url.trim() || twitchUrl.trim())}
            >
              <Radio size={14} aria-hidden="true" />
              {busy ? "LADATAAN…" : "LATAA"}
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <label className="setting-check">
          <input
            type="checkbox"
            checked={autoStart}
            onChange={(e) => setAutoStart(e.target.checked)}
          />
          <span>
            <strong>Hae automaattisesti, kun sivu avataan</strong>
            <small>
              Kun sivu avataan livelähetyksen alettua, haku käynnistyy ilman
              painalluksia.
            </small>
          </span>
        </label>
      </Card>

    </>
  );
}

function ViewTab({ viewMode, setViewMode }) {
  const view = VIEW_MODES[viewMode] || VIEW_MODES.normal;

  return (
    <>
      <Intro>Mitä ruudulla näytetään arvonnan aikana.</Intro>

      <Card title="Näkymä">
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
          <ul className="check-list">
            {view.elements.map((element) => (
              <li key={element}>
                <Check size={14} aria-hidden="true" />
                {element}
              </li>
            ))}
          </ul>
          {view.note && <small className="setting-help">{view.note}</small>}
        </div>
      </Card>

      <Card title="OBS-lähetys">
        <details className="obs-guide" open={viewMode === "stream"}>
          <summary>Näin näytät arvonnan OBS-lähetyksessä</summary>
          <ol>
            <li>
              Valitse yllä <strong>Stream mode</strong>.
            </li>
            <li>
              OBS: <strong>Lähteet → + → Ikkunakaappaus</strong> (Window
              Capture) ja valitse selainikkuna, jossa Raffleri on auki.
            </li>
            <li>
              Piilota selaimen yläpalkki painamalla <strong>F11</strong> tai
              rajaa se pois OBS:ssä (<strong>Alt</strong> + vedä reunaa).
            </li>
            <li>Arvo voittajat selaimessa. Katsojat näkevät vain arvontaikkunan.</li>
          </ol>
          <small className="setting-help">
            Älä käytä OBS:n <strong>Selainlähdettä</strong>: se on erillinen
            selain, jossa ei ole API-avaintasi eikä kerättyjä kommentteja.
          </small>
        </details>
      </Card>
    </>
  );
}

function TextsTab({ heading, updateHeading, resetHeading, profile }) {
  const rotating = heading.mode === "rotate";
  const defaults = profile.defaults.heading;

  return (
    <>
      <Intro>
        Arvontaikkunan tekstit teemalle <strong>{profile.label}</strong>.
        Jokaisella teemalla on omat tekstinsä.
      </Intro>

      <Card title="Otsikko">
        <div
          className="view-mode-options is-two"
          role="radiogroup"
          aria-label="Otsikon tyyppi"
        >
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
          <div className="settings-split">
            <div className="setting-item">
              <label htmlFor="heading-texts">Tekstit (yksi per rivi)</label>
              <textarea
                id="heading-texts"
                rows={4}
                value={heading.rotatingTexts.join("\n")}
                onChange={(e) =>
                  updateHeading({ rotatingTexts: e.target.value.split("\n") })
                }
                placeholder={defaults.rotatingTexts.join("\n")}
              />
              <small>Vaihtuvat järjestyksessä pehmeällä häivytyksellä.</small>
            </div>
            <div className="setting-item">
              <label htmlFor="heading-interval">Vaihtumisväli</label>
              <select
                id="heading-interval"
                value={heading.intervalSec}
                onChange={(e) =>
                  updateHeading({ intervalSec: Number(e.target.value) })
                }
              >
                <option value={4}>4 sekuntia</option>
                <option value={6}>6 sekuntia</option>
                <option value={8}>8 sekuntia</option>
                <option value={12}>12 sekuntia</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="setting-item">
            <label htmlFor="heading-fixed">Teksti</label>
            <input
              id="heading-fixed"
              type="text"
              value={heading.fixedText}
              onChange={(e) => updateHeading({ fixedText: e.target.value })}
              placeholder={defaults.fixedText}
            />
          </div>
        )}

        <label className="setting-check">
          <input
            type="checkbox"
            checked={heading.showStreamTitle}
            onChange={(e) => updateHeading({ showStreamTitle: e.target.checked })}
          />
          <span>
            <strong>Näytä lähetyksen otsikko</strong>
            <small>YouTube-lähetyksen nimi pienellä otsikon yläpuolella.</small>
          </span>
        </label>
      </Card>

      <Card title="Alarivi ja voittajan ohje">
        <div className="setting-item">
          <label htmlFor="heading-subtitle">Alarivi</label>
          <input
            id="heading-subtitle"
            type="text"
            value={heading.subtitle}
            onChange={(e) => updateHeading({ subtitle: e.target.value })}
            placeholder={`Esim. ${defaults.subtitle}`}
          />
          <small>Pieni teksti otsikon alla. Tyhjä = ei alariviä.</small>
        </div>

        <div className="setting-item">
          <label htmlFor="heading-contact">Voittajan ohje</label>
          <textarea
            id="heading-contact"
            rows={3}
            maxLength={CONTACT_INFO_MAX_LENGTH}
            value={heading.contactInfo}
            onChange={(e) =>
              updateHeading({
                contactInfo: e.target.value.replace(/[\r\n]+/g, " "),
              })
            }
            placeholder={defaults.contactInfo}
          />
          <small>
            Näkyy voittajakortissa ja chat-viestissä. Yksi rivi, enintään{" "}
            {CONTACT_INFO_MAX_LENGTH} merkkiä. Tyhjä = teeman oletus.
          </small>
        </div>
      </Card>

      <div className="settings-footer-row">
        <button type="button" className="text-btn" onClick={resetHeading}>
          <RotateCcw size={13} aria-hidden="true" />
          Palauta teeman oletustekstit
        </button>
      </div>
    </>
  );
}

function RaffleTab({ hostName, setHostName, profile }) {
  return (
    <>
      <Intro>Kuka voi osallistua ja voittaa.</Intro>

      <Card title="Isäntä">
        <div className="setting-item">
          <label htmlFor="host-name">Isännän käyttäjänimi</label>
          <input
            id="host-name"
            type="text"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            placeholder={profile.defaults.hostName}
          />
          <small>Isännän kommentit eivät osallistu arvontaan.</small>
        </div>
      </Card>

      <Card title="Säännöt">
        <ul className="check-list">
          <li>
            <Check size={14} aria-hidden="true" />
            Enintään {MAX_ACCEPTED_PER_AUTHOR} kommenttia per henkilö (={" "}
            {MAX_ACCEPTED_PER_AUTHOR} arpaa), YouTubessa ja Twitchissä erikseen
          </li>
          <li>
            <Check size={14} aria-hidden="true" />
            Twitch-kanavan omistajan viestit eivät osallistu
          </li>
          <li>
            <Check size={14} aria-hidden="true" />
            Sama henkilö voi voittaa vain kerran saman arvonnan aikana
          </li>
        </ul>
      </Card>
    </>
  );
}

function ThemeTab({
  theme,
  setTheme,
  profile,
  branding,
  updateBranding,
  selectBrandingImage,
}) {
  return (
    <>
      <Intro>Teema vaihtaa värit, logon ja tekstit kerralla.</Intro>

      <Card title="Teema">
        <div className="theme-choices" role="radiogroup" aria-label="Teema">
          {Object.values(THEMES).map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={theme === option.id}
              className={`theme-choice is-${option.id} ${theme === option.id ? "is-active" : ""}`}
              onClick={() => setTheme(option.id)}
            >
              <img
                src={option.logo}
                alt=""
                className={`theme-choice-logo logo-fit-${option.logoFit}`}
              />
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
              {theme === option.id && (
                <Check size={16} className="theme-choice-check" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      </Card>

      <Card
        title="Tunnus"
        description={`Koskee vain teemaa ${profile.label}.`}
      >
        <div className="settings-split">
          <div className="setting-item">
            <label htmlFor="branding-image">Oma tunnuskuva</label>
            <input
              id="branding-image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={selectBrandingImage}
            />
            <small>
              Korvaa teeman logon. PNG, JPG tai WebP, enintään 2 Mt.
            </small>
            {branding.image && (
              <button
                type="button"
                className="text-btn"
                onClick={() => updateBranding({ image: "" })}
              >
                <RotateCcw size={13} aria-hidden="true" />
                Palauta {profile.label}-logo
              </button>
            )}
          </div>
          <div className="setting-item">
            <label htmlFor="branding-animation">Animaatio</label>
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
        </div>
      </Card>
    </>
  );
}

function ApiKeyTab({ configured, onSave }) {
  const [value, setValue] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    if (!value.trim()) return;
    onSave(value);
    setValue("");
  }

  return (
    <>
      <Intro>
        Tarvitaan YouTube-kommenttien hakuun. Twitch toimii ilman.
      </Intro>

      <Card title="YouTube API -avain">
        <div className="setting-item">
          <label htmlFor="api-key">
            Avain{" "}
            <span className={`setting-status ${configured ? "is-ok" : "is-missing"}`}>
              {configured ? (
                <>
                  <Check size={11} aria-hidden="true" /> tallennettu
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
          </form>
          <small>Avain tallentuu vain tähän selaimeen, ei julkiselle sivulle.</small>
        </div>
        {configured && (
          <button type="button" className="text-btn is-danger" onClick={() => onSave("")}>
            Poista tallennettu avain
          </button>
        )}
      </Card>
    </>
  );
}

function BackupTab({ onExport, onImport }) {
  return (
    <>
      <Intro>
        Kommentit tallentuvat tähän selaimeen. Ota kopio arvonnan jälkeen.
      </Intro>

      <Card title="Varmuuskopio">
        <div className="setting-row">
          <button type="button" className="copy-btn" onClick={onExport}>
            <Download size={13} aria-hidden="true" /> Lataa varmuuskopio
          </button>
          <label className="copy-btn">
            <Upload size={13} aria-hidden="true" /> Palauta varmuuskopio
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
      </Card>
    </>
  );
}

// ------------------------------------------------------------
// Dialogi
// ------------------------------------------------------------

export default function Settings(props) {
  const { apiKeyConfigured, onClose } = props;
  const dialogRef = useRef(null);

  // Viimeksi avattu tab muistetaan.
  const [tab, setTab] = useState(readStoredTab);
  function selectTab(id) {
    setTab(id);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, id);
    } catch {
      // ei kriittinen
    }
    document
      .getElementById(`settings-tab-${id}`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
    dialogRef.current?.querySelector(".settings-body")?.scrollTo({ top: 0 });
  }

  // Nuolinäppäimet siirtävät tabista toiseen (saavutettavuus).
  function handleTabKeyDown(event) {
    const index = SETTINGS_TABS.findIndex((t) => t.id === tab);
    let next = null;
    if (event.key === "ArrowRight") next = (index + 1) % SETTINGS_TABS.length;
    if (event.key === "ArrowLeft")
      next = (index - 1 + SETTINGS_TABS.length) % SETTINGS_TABS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = SETTINGS_TABS.length - 1;
    if (next === null) return;
    event.preventDefault();
    const id = SETTINGS_TABS[next].id;
    selectTab(id);
    document.getElementById(`settings-tab-${id}`)?.focus();
  }

  // onClose talteen refiin: App antaa uuden funktion joka renderöinnillä,
  // eikä modaalin efekti saa ajautua uudelleen (kohdistus hyppäisi).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Modaalinen käytös: Esc sulkee, tausta ei vieri, kohdistus dialogiin ja
  // takaisin avaavaan painikkeeseen suljettaessa. Ajetaan vain avattaessa.
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  function handleBackdropMouseDown(event) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div className="settings-overlay" onMouseDown={handleBackdropMouseDown}>
      <div
        ref={dialogRef}
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
      >
        <header className="settings-dialog-head">
          <div>
            <h2 id="settings-title">Asetukset</h2>
            <p>Teema {props.profile.label}</p>
          </div>
          <button
            type="button"
            className="settings-close"
            onClick={onClose}
            aria-label="Sulje asetukset"
          >
            <X size={18} />
          </button>
        </header>

        <div
          className="settings-tabs"
          role="tablist"
          aria-label="Asetusten osiot"
          onKeyDown={handleTabKeyDown}
        >
          {SETTINGS_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`settings-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls="settings-tabpanel"
              tabIndex={tab === id ? 0 : -1}
              className={`settings-tab ${tab === id ? "is-active" : ""}`}
              onClick={() => selectTab(id)}
            >
              <Icon size={15} aria-hidden="true" />
              {label}
              {id === "api" && !apiKeyConfigured && (
                <span className="settings-tab-badge">puuttuu</span>
              )}
            </button>
          ))}
        </div>

        <div
          className="settings-body"
          role="tabpanel"
          id="settings-tabpanel"
          aria-labelledby={`settings-tab-${tab}`}
        >
          {tab === "lahetys" && <SourcesTab {...props} />}
          {tab === "nakyma" && <ViewTab {...props} />}
          {tab === "tekstit" && <TextsTab {...props} />}
          {tab === "arvonta" && <RaffleTab {...props} />}
          {tab === "teema" && <ThemeTab {...props} />}
          {tab === "api" && (
            <ApiKeyTab configured={apiKeyConfigured} onSave={props.onSaveApiKey} />
          )}
          {tab === "varmuuskopio" && <BackupTab {...props} />}
        </div>
      </div>
    </div>
  );
}
