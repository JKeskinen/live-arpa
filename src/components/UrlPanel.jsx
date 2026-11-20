/**
 * UrlPanel – Lähteet (YouTube ja Twitch) ja niiden tila
 * -----------------------------------------------------
 * YouTube: video tai kanava. Twitch: kanava.
 * Molemmat voivat olla käynnissä yhtä aikaa; kommentit menevät samaan
 * arvontaan.
 */

import {
  Radio,
  Link2,
  Database,
  MessageCircle as Twitch,
  FlaskConical,
} from "lucide-react";

const TWITCH_STATUS = {
  connecting: "Yhdistetään…",
  connected: "Yhdistetty – viestit tulevat reaaliajassa",
  reconnecting: "Yhteys katkesi – yhdistetään uudelleen…",
  error: "Kanavaa ei voi lukea",
};

export default function UrlPanel({
  url,
  setUrl,
  twitchUrl,
  setTwitchUrl,
  state,
  busy,
  nextPollIn,
  onLoad,
  onStartDemo,
  onStop,
}) {
  const isLive = state.streamMode === "live";
  const isOffline = state.streamMode === "offline";
  const youtubePolling = state.youtubePolling ?? state.polling;
  const hasInput = Boolean(url.trim() || twitchUrl.trim());
  const twitch = state.twitch;
  const upcomingStart = state.upcoming?.scheduledStartTime
    ? new Date(state.upcoming.scheduledStartTime).toLocaleString("fi-FI", {
        weekday: "short",
        day: "numeric",
        month: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <section className="url-panel panel">
      <div className="section-label">
        <Link2 size={15} />
        LÄHTEET
      </div>
      <form className="url-form" onSubmit={onLoad}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="YouTube: @kanava tai videon osoite"
          aria-label="YouTube-kanava tai video"
        />
        <input
          className="twitch-input"
          value={twitchUrl}
          onChange={(e) => setTwitchUrl(e.target.value)}
          placeholder="Twitch: twitch.tv/kanava"
          aria-label="Twitch-kanava"
        />
        <button
          className="primary-btn"
          disabled={busy || !hasInput}
          type="submit"
        >
          <Radio size={17} />
          {busy ? "LADATAAN…" : "LATAA"}
        </button>
      </form>

      <div className="demo-launch">
        <button
          type="button"
          className="copy-btn"
          onClick={onStartDemo}
          disabled={busy}
        >
          <FlaskConical size={13} />
          {state.demo ? "Aloita demo alusta" : "Kokeile demolla (simuloitu lähetys)"}
        </button>
      </div>

      {state.demo && (
        <div className="stream-row demo-row">
          <div className="youtube-icon demo-icon">
            <FlaskConical size={22} />
          </div>
          <div className="stream-copy">
            <div className="stream-title">Demolähetys (simuloitu)</div>
            <div className="stream-url">
              {state.demo.active ? "Simuloituja kommentteja tulee" : "Pysäytetty"} •{" "}
              {state.demo.comments} kommenttia • YouTube + Twitch
            </div>
          </div>
          <div className="live-logo demo-badge">DEMO</div>
        </div>
      )}

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

      {twitch && (
        <div className="stream-row twitch-row">
          <div className="youtube-icon twitch-icon">
            <Twitch size={22} />
          </div>
          <div className="stream-copy">
            <div className="stream-title">Twitch #{twitch.channel}</div>
            <div className="stream-url">
              {TWITCH_STATUS[twitch.status] || "Pysäytetty"} •{" "}
              {twitch.comments} kommenttia
            </div>
          </div>
          {twitch.status === "connected" && (
            <div className="live-logo twitch-live">
              <Twitch size={15} />
              LIVE
            </div>
          )}
        </div>
      )}

      {isOffline && state.channel && (
        <div className="notice" style={{ marginTop: 12, marginBottom: 0 }}>
          <span>
            YouTube-kanavalla <strong>{state.channel.title}</strong> ei ole
            livelähetystä käynnissä.
            {state.upcoming && (
              <>
                {" "}
                Seuraava ajastettu lähetys: <strong>{state.upcoming.title}</strong>{" "}
                ({upcomingStart}).
              </>
            )}{" "}
            Paina <strong>LATAA</strong> uudelleen, kun lähetys on alkanut.
          </span>
        </div>
      )}

      {state.polling && (
        <div style={{ marginTop: 12, textAlign: "right" }}>
          <button type="button" className="copy-btn" onClick={onStop}>
            Pysäytä kommenttien haku
          </button>
        </div>
      )}

      {isLive && youtubePolling && nextPollIn !== null && (
        <div
          className="poll-countdown"
          style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}
        >
          Seuraava YouTube-haku: <strong>{nextPollIn} s</strong>
        </div>
      )}
    </section>
  );
}
