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

  const rollTimer = useRef(null);
  const winnerTimer = useRef(null);

  // Only accepted comments participate in the raffle.
  const entries = useMemo(
    () => state.comments.filter((comment) => comment.accepted),
    [state.comments],
  );

  // The comment panel displays the latest 20 stored comments.
  const latestComments = useMemo(
    () => [...state.comments].reverse().slice(0, 20),
    [state.comments],
  );

  const isLive = state.streamMode === "live";
  const isNormal = state.streamMode === "normal";

  useEffect(() => {
    if (!window.raffleAPI) {
      setError("Käynnistä tämä sovellus Electronissa, ei selaimessa.");
      return;
    }

    window.raffleAPI.getConfig().then((config) => {
      if (!config.configured) {
        setConfigNotice(
          "YouTube API -avain puuttuu. Tarkista README.md ja config.json.",
        );
      }
    });

    const offUpdate = window.raffleAPI.onUpdate((data) => {
      setState(data);
    });

    const offError = window.raffleAPI.onError((message) => {
      setError(message);
    });

    window.raffleAPI.getState().then(setState);

    return () => {
      offUpdate();
      offError();
      clearInterval(rollTimer.current);
      clearTimeout(winnerTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!rolling || entries.length === 0) return undefined;

    rollTimer.current = setInterval(() => {
      setDisplayed(entries[Math.floor(Math.random() * entries.length)]);
    }, 90);

    return () => clearInterval(rollTimer.current);
  }, [rolling, entries]);

  async function loadStream(event) {
    event?.preventDefault();

    setBusy(true);
    setError("");
    setWinner(null);
    setDisplayed(null);
    setRolling(false);

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
    setRolling(true);
    setDisplayed(entries[Math.floor(Math.random() * entries.length)]);
  }

  function drawWinner() {
    if (!rolling || !entries.length) {
      if (!rolling) startRaffle();
      return;
    }

    clearInterval(rollTimer.current);
    clearTimeout(winnerTimer.current);

    const chosen = entries[Math.floor(Math.random() * entries.length)];
    const started = Date.now();

    function slowDown() {
      const elapsed = Date.now() - started;

      if (elapsed >= 5000) {
        setDisplayed(chosen);
        setWinner(chosen);
        setRolling(false);
        return;
      }

      setDisplayed(entries[Math.floor(Math.random() * entries.length)]);

      winnerTimer.current = setTimeout(
        slowDown,
        70 + Math.pow(elapsed / 5000, 2) * 480,
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
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={23} />
          </div>

          <div>
            <div className="brand-title">
              LIVE <span>ARPAKONE</span>
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
            onChange={(event) => setUrl(event.target.value)}
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
              <div
                className="live-logo"
                aria-label="Video tunnistettu live-lähetykseksi"
                title="Video on tunnistettu live-lähetykseksi"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 12px",
                  borderRadius: 7,
                  background: "#dc2626",
                  color: "#ffffff",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 1,
                }}
              >
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
          label="HYVÄKSYTTYJÄ KOMMENTTEJA"
          value={state.acceptedEntries}
          tone="cyan"
        />

        <Stat
          icon={<Users size={18} />}
          label="YKSITTÄISIÄ OSALLISTUJIA"
          value={state.uniqueCommenters}
          tone="purple"
        />

        <Stat
          icon={<Trophy size={18} />}
          label="ARVONTAOSALLISTUMISIA"
          value={entries.length}
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
                ARPAKONE
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
            className={`reel-stage ${rolling ? "is-rolling" : ""} ${
              winner ? "has-winner" : ""
            }`}
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
                <div className="reel-avatar">
                  {winner ? (
                    <Trophy size={29} />
                  ) : (
                    <span>
                      {(displayed?.name || "—").slice(0, 1).toUpperCase()}
                    </span>
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
              KÄYNNISTÄ ARPAKONE
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
            Voittajan hidastus 5 sekuntia
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

                  {!comment.accepted && (
                    <div
                      style={{
                        marginTop: 5,
                        fontSize: 11,
                        opacity: 0.65,
                      }}
                    >
                      Ei mukana arvonnassa (käyttäjän 3 kommenttia täynnä)
                    </div>
                  )}
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
          LIVE ARPAKONE <b>•</b> DESKTOP STUDIO
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
