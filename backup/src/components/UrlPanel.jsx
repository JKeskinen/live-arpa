/**
 * UrlPanel – URL-syöttö ja live-tila
 * -----------------------------------
 * Näyttää syöttökentän, videon tiedot ja poll-laskurin.
 */

import { Radio, Link2, Database } from "lucide-react";

export default function UrlPanel({
  url,
  setUrl,
  state,
  busy,
  nextPollIn,
  onLoad,
  onStop,
}) {
  const isLive = state.streamMode === "live";

  return (
    <section className="url-panel panel">
      <div className="section-label">
        <Link2 size={15} />
        LÄHETYKSEN OSOITE
      </div>
      <form className="url-form" onSubmit={onLoad}>
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
          <button type="button" className="copy-btn" onClick={onStop}>
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
  );
}
