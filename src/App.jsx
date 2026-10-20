/**
 * Prodiscus Raffleri – Pääkomponentti
 * ------------------------------------
 * STREAM MODE: tiivistetty näkymä.
 * Rulla pyörii automaattisesti kun live alkaa.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import { useTheme } from "./hooks/useTheme";
import { useBranding } from "./hooks/useBranding";
import { useRaffleAPI } from "./hooks/useRaffleAPI";
import { time } from "./utils/format";

import BrandingBar from "./components/BrandingBar";
import Settings from "./components/Settings";
import UrlPanel from "./components/UrlPanel";
import StatsGrid from "./components/StatsGrid";
import RafflePanel from "./components/RafflePanel";
import CommentsPanel from "./components/CommentsPanel";

export default function App() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [rolling, setRolling] = useState(false);
  const [winner, setWinner] = useState(null);
  const [displayed, setDisplayed] = useState(null);
  const [drawCountdown, setDrawCountdown] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [streamMode, setStreamMode] = useState(() => {
    try {
      return localStorage.getItem("raffle-stream-mode") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("raffle-stream-mode", String(streamMode));
    } catch {}
  }, [streamMode]);

  const { theme, setTheme } = useTheme();
  const {
    branding,
    updateBranding,
    selectBrandingImage,
    hostName,
    setHostName,
  } = useBranding(setError);

  const { state, busy, configNotice, nextPollIn, loadStream, stopStream } =
    useRaffleAPI(setError);

  const rollTimer = useRef(null);
  const winnerTimer = useRef(null);

  const entries = useMemo(() => {
    const host = hostName.trim().toLocaleLowerCase("fi-FI");
    return state.comments.filter((comment) => {
      if (!comment.accepted) return false;
      if (!host) return true;
      const name = (comment.name || "").trim().toLocaleLowerCase("fi-FI");
      return name !== host;
    });
  }, [state.comments, hostName]);

  const isLive = state.streamMode === "live";
  const isNormal = state.streamMode === "normal";

  // Pyörivä arvonta – näyttää satunnaisia kommentteja
  useEffect(() => {
    if (!rolling || entries.length === 0) return undefined;

    rollTimer.current = setInterval(() => {
      setDisplayed(entries[Math.floor(Math.random() * entries.length)]);
    }, 90);

    return () => clearInterval(rollTimer.current);
  }, [rolling, entries]);

  // Automaattinen käynnistys kun live alkaa
  // Automaattinen käynnistys kun video on ladattu ja kommentteja on
  useEffect(() => {
    if ((isLive || isNormal) && entries.length > 0 && !rolling && !winner) {
      startRaffle();
    }
  }, [isLive, isNormal, entries.length, rolling, winner]);

  async function handleLoad(event) {
    event?.preventDefault();
    setWinner(null);
    setDisplayed(null);
    setRolling(false);
    setDrawCountdown(null);
    await loadStream(url);
  }

  async function handleStop() {
    setRolling(false);
    setDrawCountdown(null);
    await stopStream();
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

  function drawWinner() {
    if (!rolling || !entries.length) {
      if (!rolling) startRaffle();
      return;
    }

    clearInterval(rollTimer.current);
    clearTimeout(winnerTimer.current);

    const chosen = entries[Math.floor(Math.random() * entries.length)];
    const started = Date.now();
    setDrawCountdown(5);

    function slowDown() {
      const elapsed = Date.now() - started;
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
    const text = `ONNITTELUT VOITOSTA: ${winner.name}, ${winner.text}

Sähköpostin otsikkoon: Podcast-voittaja
Viestiin: nimi, osoite, puhelinnumero`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError("Voittajan kopiointi leikepöydälle epäonnistui.");
    }
  }

  return (
    <main className={`app-shell ${streamMode ? "stream-mode" : ""}`}>
      <BrandingBar
        branding={branding}
        onSettingsToggle={() => setSettingsOpen((open) => !open)}
        nextPollIn={nextPollIn}
      />

      {settingsOpen && (
        <Settings
          theme={theme}
          setTheme={setTheme}
          branding={branding}
          updateBranding={updateBranding}
          selectBrandingImage={selectBrandingImage}
          hostName={hostName}
          setHostName={setHostName}
          streamMode={streamMode}
          setStreamMode={setStreamMode}
          url={url}
          setUrl={setUrl}
          onLoad={handleLoad}
          busy={busy}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <UrlPanel
        url={url}
        setUrl={setUrl}
        state={state}
        busy={busy}
        nextPollIn={nextPollIn}
        onLoad={handleLoad}
        onStop={handleStop}
      />

      {configNotice && (
        <div className="notice">
          <span>{configNotice}</span>
        </div>
      )}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      <StatsGrid state={state} />

      <section className="content-grid">
        <RafflePanel
          entries={entries}
          displayed={displayed}
          rolling={rolling}
          winner={winner}
          drawCountdown={drawCountdown}
          branding={branding}
          onStart={startRaffle}
          onDraw={drawWinner}
          onCopyWinner={copyWinner}
        />
        <CommentsPanel
          comments={state.comments}
          isLive={isLive}
          totalComments={state.totalComments}
        />
      </section>

      <footer>
        <span>
          LIVE RAFFLERI <b>•</b> DESKTOP STUDIO
        </span>
        <span>
          <span className="footer-dot" />
          {time(state.updatedAt)}
        </span>
      </footer>
    </main>
  );
}
