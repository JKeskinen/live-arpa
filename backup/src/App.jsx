/**
 * Prodiscus Raffleri – Käyttöliittymä
 * ------------------------------------
 * Näyttää live-/videokommentit, tilastot ja arvontalogiikan.
 *
 * Tärkeää:
 * - Ei tee suoria YouTube API -kutsuja.
 * - Kaikki data tulee Electron main-prosessista (window.raffleAPI).
 * - Live-tilassa näytetään laskuri seuraavaan kommenttihakuun (30 s väli).
 * - Arvonnan aikana elokuvamainen countdown (5→0) päälle.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Radio,
  Users,
  MessageSquare,
  Clock3,
  Trophy,
  Settings2,
  Play,
  Sparkles,
  ShieldCheck,
  Link2,
  Database,
  X,
} from "lucide-react";

const empty = {
  videoId: "",
  streamTitle: "",
  streamMode: "",
  comments: [],
  totalComments: 0,
  uniqueCommenters: 0,
  acceptedEntries: 0,
  updatedAt: null,
  polling: false,
};

const time = (value) =>
  value ? new Date(value).toLocaleTimeString("fi-FI") : "—";

const dateTime = (value) =>
  value ? new Date(value).toLocaleString("fi-FI") : "Ei vielä päivitetty";

export default function App() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rolling, setRolling] = useState(false);
  const [winner, setWinner] = useState(null);
  const [displayed, setDisplayed] = useState(null);
  const [configNotice, setConfigNotice] = useState("");

  // Elokuvamainen countdown (5…0)
  const [drawCountdown, setDrawCountdown] = useState(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("raffle-theme") === "midnight"
        ? "midnight"
        : "prodiscus";
    } catch {
      return "prodiscus";
    }
  });

  // Isännän nimi – ei voi voittaa arvontaa
  const [hostName, setHostName] = useState(() => {
    try {
      return localStorage.getItem("raffle-host") || "prodiscus_official";
    } catch {
      return "prodiscus_official";
    }
  });

  // Laskuri seuraavaan live-hakuun
  const [nextPollIn, setNextPollIn] = useState(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("raffle-theme", theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("raffle-host", hostName);
    } catch {}
  }, [hostName]);

  const [branding, setBranding] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("raffle-branding")) || {
          image: "",
          animation: "pulse",
          showWordmark: true,
        }
      );
    } catch {
      return { image: "", animation: "pulse", showWordmark: true };
    }
  });

  function updateBranding(next) {
    setBranding((previous) => {
      const updated = { ...previous, ...next };
      try {
        localStorage.setItem("raffle-branding", JSON.stringify(updated));
      } catch {
        setError("Kuvan tallennus epäonnistui. Valitse pienempi kuvatiedosto.");
        return previous;
      }
      return updated;
    });
  }

  function selectBrandingImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Valitse PNG-, JPG- tai WebP-kuva.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Kuvan enimmäiskoko on 2 Mt.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () =>
      updateBranding({ image: String(reader.result || "") });
    reader.onerror = () => setError("Kuvan lukeminen epäonnistui.");
    reader.readAsDataURL(file);
  }

  const rollTimer = useRef(null);
  const winnerTimer = useRef(null);

  // Arvontaan hyväksytyt kommentit (isäntä suodatettu pois)
  const entries = useMemo(() => {
    const host = hostName.trim().toLocaleLowerCase("fi-FI");
    return state.comments.filter((comment) => {
      if (!comment.accepted) return false;
      if (!host) return true;
      const name = (comment.name || "").trim().toLocaleLowerCase("fi-FI");
      return name !== host;
    });
  }, [state.comments, hostName]);

  const latestComments = useMemo(
    () => [...state.comments].reverse().slice(0, 20),
    [state.comments],
  );

  const isLive = state.streamMode === "live";
  const isNormal = state.streamMode === "normal";

  useEffect(() => {
    if (!window.raffleAPI) {
      setError(
        "YouTube-kommenttien haku ei ole käytettävissä selainversiossa. Käytä Windows- tai Mac-sovellusta.",
      );
      return () => {
        clearInterval(rollTimer.current);
        clearTimeout(winnerTimer.current);
      };
    }

    window.raffleAPI.getConfig().then((config) => {
      if (!config.configured) {
        setConfigNotice(
          "YouTube API -avain puuttuu. Tarkista README.md ja config.json.",
        );
      }
    });

    const offUpdate = window.raffleAPI.onUpdate((data) => setState(data));
    const offError = window.raffleAPI.onError((message) => setError(message));

    let countdownInterval = null;
    const offPoll = window.raffleAPI.onPollNext?.(({ nextPollAt }) => {
      if (countdownInterval) clearInterval(countdownInterval);
      const tick = () => {
        const remaining = Math.max(
          0,
          Math.ceil((nextPollAt - Date.now()) / 1000),
        );
        setNextPollIn(remaining);
      };
      tick();
      countdownInterval = setInterval(tick, 1000);
    });

    window.raffleAPI
      .getState()
      .then(setState)
      .catch((err) => {
        setError(err.message || "Tilan lukeminen epäonnistui.");
      });

    return () => {
      offUpdate();
      offError();
      offPoll?.();
      if (countdownInterval) clearInterval(countdownInterval);
      clearInterval(rollTimer.current);
      clearTimeout(winnerTimer.current);
    };
  }, []);

  // Pyörivä arvonta
  useEffect(() => {
    if (!rolling || entries.length === 0) return undefined;
    rollTimer.current = setInterval(() => {
      setDisplayed(entries[Math.floor(Math.random() * entries.length)]);
    }, 90);
    return () => clearInterval(rollTimer.current);
  }, [rolling, entries]);

  async function loadStream(event) {
    event?.preventDefault();
    if (!window.raffleAPI) {
      setError(
        "YouTube-kommenttien haku ei ole käytettävissä selainversiossa.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setWinner(null);
    setDisplayed(null);
    setRolling(false);
    setNextPollIn(null);
    setDrawCountdown(null);
    try {
      const data = await window.raffleAPI.loadStream(url.trim());
      setState(data);
    } catch (err) {
      setError(err.message || "Videota ei voitu ladata.");
    } finally {
      setBusy(false);
    }
  }

  async function stopStream() {
    setRolling(false);
    setNextPollIn(null);
    setDrawCountdown(null);
    try {
      setState(await window.raffleAPI.stopStream());
    } catch (err) {
      setError(err.message || "Keräystä ei voitu pysäyttää.");
    }
  }

  function startRaffle() {
    if (!entries.length) {
      setError("Arvontaan ei ole vielä hyväksyttyjä kommentteja.");
      return;
    }
    setError("");
    setWinner(null);
    setDrawCountdown(null);
    setRolling(true);
    setDisplayed(entries[Math.floor(Math.random() * entries.length)]);
  }

  /**
   * Elokuvamainen countdown 5 → 0.
   * Kommentit ja nimet pysyvät näkyvissä taustalla.
   */
  function drawWinner() {
    if (!rolling || !entries.length) {
      if (!rolling) startRaffle();
      return;
    }

    clearInterval(rollTimer.current);
    clearTimeout(winnerTimer.current);

    const chosen = entries[Math.floor(Math.random() * entries.length)];
    const started = Date.now();

    // Aloita suoraan 5:stä
    setDrawCountdown(5);

    function slowDown() {
      const elapsed = Date.now() - started;

      // 5 → 4 → 3 → 2 → 1 → 0 (yhteensä ~6 sekuntia)
      const step = Math.floor(elapsed / 1000);
      const current = Math.max(0, 5 - step);

      setDrawCountdown(current);

      if (elapsed >= 6000) {
        setDisplayed(chosen);
        setWinner(chosen);
        setRolling(false);
        setDrawCountdown(null);
        return;
      }

      setDisplayed(entries[Math.floor(Math.random() * entries.length)]);

      winnerTimer.current = setTimeout(
        slowDown,
        80 + Math.pow(elapsed / 6000, 2) * 500,
      );
    }

    slowDown();
  }

  async function copyWinner() {
    if (!winner) return;
    try {
      await navigator.clipboard.writeText(`${winner.name}: ${winner.text}`);
    } catch {
      setError("Voittajan kopiointi leikepöydälle epäonnistui.");
    }
  }

  return (
    <main className="app-shell">
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
          onClick={() => setSettingsOpen((open) => !open)}
        >
          <Settings2 size={17} />
          ASETUKSET
        </button>
      </section>

      {settingsOpen && (
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
              onClick={() => setSettingsOpen(false)}
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
      )}

      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={23} />
          </div>
          <div>
            <div className="brand-title">
              LIVE <span>RAFFLERI</span>
            </div>
            <div className="brand-sub">YOUTUBE LIVE GIVEAWAY STUDIO</div>
          </div>
        </div>
        <div className="live-state">
          <span
            className={isLive && state.polling ? "pulse-dot" : "status-dot"}
          />
          {isLive
            ? state.polling
              ? "LIVE-YHTEYS AKTIIVINEN"
              : "LIVE TUNNISTETTU"
            : isNormal
              ? state.polling
                ? "KOMMENTTEJA HAETAAN"
                : "NORMAALI VIDEO"
              : "EI VIDEOTA"}
        </div>
      </header>

      <section className="url-panel panel">
        <div className="section-label">
          <Link2 size={15} />
          LÄHETYKSEN OSOITE
        </div>
        <form className="url-form" onSubmit={loadStream}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Liitä YouTube-videon tai livelähetyksen URL-osoite tähän…"
            aria-label="YouTube-videon URL"
          />
          <button
            className="primary-btn"
            disabled={busy || !url.trim()}
            type="submit"
          >
            <Radio size={17} />
            {busy ? "LADATAAN…" : "LATAA VIDEO"}
          </button>
        </form>
        {state.videoId && (
          <div className="stream-row">
            <div className="youtube-icon">
              <Radio size={24} />
            </div>
            <div className="stream-copy">
              <div className="stream-title">{state.streamTitle}</div>
              <div className="stream-url">
                youtube.com/watch?v={state.videoId}
              </div>
            </div>
            {isLive ? (
              <div className="live-logo">
                <Radio size={15} />
                LIVE
              </div>
            ) : (
              <div className="stream-badge">
                <Database size={14} />
                NORMAL
              </div>
            )}
          </div>
        )}
        {state.videoId && state.polling && (
          <div style={{ marginTop: 12, textAlign: "right" }}>
            <button type="button" className="copy-btn" onClick={stopStream}>
              Pysäytä kommenttien haku
            </button>
          </div>
        )}
        {isLive && state.polling && nextPollIn !== null && (
          <div
            className="poll-countdown"
            style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}
          >
            Seuraava kommenttihaku: <strong>{nextPollIn} s</strong>
          </div>
        )}
      </section>

      {configNotice && (
        <div className="notice">
          <Settings2 size={16} />
          {configNotice}
        </div>
      )}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Sulje virhe">
            ×
          </button>
        </div>
      )}

      <section className="stats-grid">
        <Stat
          icon={<MessageSquare size={18} />}
          label="VIDEON KOMMENTIT"
          value={state.totalComments}
          tone="cyan"
        />
        <Stat
          icon={<ShieldCheck size={18} />}
          label="HYVÄKSYTTYJÄ KOMMENTTEJA"
          value={state.acceptedEntries}
          tone="purple"
        />
        <Stat
          icon={<Users size={18} />}
          label="YKSITTÄISIÄ OSALLISTUJIA"
          value={state.uniqueCommenters}
          tone="gold"
        />
        <div className="stat-card updated">
          <div className="stat-top">
            <span className="stat-icon">
              <Clock3 size={18} />
            </span>
            <span className="stat-label">VIIMEISIN PÄIVITYS</span>
          </div>
          <div className="updated-time">{time(state.updatedAt)}</div>
          <div className="stat-foot">{dateTime(state.updatedAt)}</div>
        </div>
      </section>

      <section className="content-grid">
        <div className="raffle-panel panel">
          <div className="panel-heading">
            <div>
              <div className="section-label">
                <Sparkles size={15} />
                RAFFLERI
              </div>
              <h1>Kenelle onni osuu?</h1>
              <p>
                Arvontaan hyväksytään enintään kolme kommenttia käyttäjää kohti.
              </p>
            </div>
            <div className="entry-pill">
              <span />
              {entries.length} osallistumista
            </div>
          </div>

          <div
            className={`reel-stage ${rolling ? "is-rolling" : ""} ${winner ? "has-winner" : ""}`}
          >
            <div className="reel-glow" />
            <div className="reel-pointer top" />
            <div className="reel-window">
              <div className="reel-side left">
                {entries.length
                  ? entries[
                      (Math.max(0, entries.indexOf(displayed) - 1) +
                        entries.length) %
                        entries.length
                    ]?.name
                  : "ODOTTAA"}
              </div>

              <div className="reel-center">
                <div
                  className={`reel-avatar ${rolling && !winner && drawCountdown === null ? "logo-rolling" : ""}`}
                >
                  {winner ? (
                    <Trophy size={29} />
                  ) : branding.image ? (
                    <img
                      src={branding.image}
                      alt="Logo"
                      className="reel-brand-logo"
                    />
                  ) : (
                    <span className="reel-brand-letter">P</span>
                  )}
                </div>

                <div className="reel-name">
                  {displayed?.name || "VALMIS ARVONTAAN"}
                </div>
                <div className="reel-comment">
                  {displayed?.text || "Lataa video aloittaaksesi"}
                </div>

                {winner && (
                  <div className="winner-label">
                    <Trophy size={14} />
                    VOITTAJA
                  </div>
                )}

                {/* Elokuvamainen countdown päälle */}
                {drawCountdown !== null && (
                  <div className="cinematic-countdown" key={drawCountdown}>
                    {drawCountdown}
                  </div>
                )}
              </div>

              <div className="reel-side right">
                {entries.length
                  ? entries[
                      Math.max(0, entries.indexOf(displayed) + 1) %
                        entries.length
                    ]?.name
                  : "LIVE"}
              </div>
            </div>
            <div className="reel-pointer bottom" />
            <div className="reel-scanline" />
          </div>

          <div className="raffle-actions">
            <button
              className="start-btn"
              disabled={!entries.length || rolling}
              onClick={startRaffle}
            >
              <Play size={17} fill="currentColor" />
              KÄYNNISTÄ RAFFLERI
            </button>
            <button
              className="draw-btn"
              disabled={!entries.length || !rolling}
              onClick={drawWinner}
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
              <button className="copy-btn" onClick={copyWinner}>
                Kopioi
              </button>
            </div>
          )}
        </div>

        <aside className="comments-panel panel">
          <div className="comments-head">
            <div>
              <div className="section-label">
                <Radio size={14} />
                {isLive ? "LIVE-VIRTA" : "KOMMENTTIVIRTA"}
              </div>
              <h2>Viimeisimmät kommentit</h2>
            </div>
            <span className="comment-count">{state.totalComments}</span>
          </div>
          <div className="comment-list">
            {latestComments.map((comment, index) => (
              <div className="comment-item" key={`${comment.id}-${index}`}>
                <div className={`comment-avatar avatar-${index % 5}`}>
                  {(comment.name || "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="comment-body">
                  <div className="comment-meta">
                    <strong>{comment.name}</strong>
                    <time>{time(comment.publishedAt)}</time>
                  </div>
                  <div className="comment-text">{comment.text}</div>
                </div>
              </div>
            ))}
            {!latestComments.length && (
              <div className="empty-comments">
                <MessageSquare size={28} />
                <strong>Kommentteja odotetaan</strong>
                <span>Lataa käynnissä oleva lähetys tai tavallinen video.</span>
              </div>
            )}
          </div>
          <div className="rules-card">
            <div className="rules-icon">
              <ShieldCheck size={17} />
            </div>
            <div>
              <strong>Osallistumissäännöt</strong>
              <p>
                Enintään 3 hyväksyttyä kommenttia käyttäjää kohti. Kaikki haetut
                kommentit tallennetaan tietokantaan.
              </p>
            </div>
          </div>
        </aside>
      </section>

      <footer>
        <span>
          LIVE RAFFLERI <b>•</b> DESKTOP STUDIO
        </span>
        <span>
          <span className="footer-dot" />
          Päivitetty: {time(state.updatedAt)}
        </span>
      </footer>
    </main>
  );
}

function Stat({ icon, label, value, tone }) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-top">
        <span className="stat-icon">{icon}</span>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">
        {Number(value || 0).toLocaleString("fi-FI")}
      </div>
      <div className="stat-foot">
        {tone === "gold"
          ? "Enintään 3 / käyttäjä"
          : tone === "purple"
            ? "Yksilölliset hyväksytyt käyttäjät"
            : "Videon kommentit"}
      </div>
    </div>
  );
}
