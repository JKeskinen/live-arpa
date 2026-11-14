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
import { useWinners } from "./hooks/useWinners";
import { useIsMobile } from "./hooks/useIsMobile";
import { useHeading, headingTexts } from "./hooks/useHeading";
import { Settings2 } from "lucide-react";
import { PLATFORM_NAME, platformOf } from "./components/PlatformLogo";
import { time } from "./utils/format";

import BrandingBar from "./components/BrandingBar";
import Settings from "./components/Settings";
import UrlPanel from "./components/UrlPanel";
import StatsGrid from "./components/StatsGrid";
import RafflePanel from "./components/RafflePanel";
import CommentsPanel from "./components/CommentsPanel";

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // tallennus epäonnistui
  }
}

export default function App() {
  // Viimeksi käytetty video tai kanava muistetaan.
  const [url, setUrl] = useState(() => readStored("raffle-source", ""));
  const [twitchUrl, setTwitchUrl] = useState(() =>
    readStored("raffle-twitch-source", ""),
  );
  const [autoStart, setAutoStart] = useState(
    () => readStored("raffle-autostart", "false") === "true",
  );
  const [error, setError] = useState("");
  const [rolling, setRolling] = useState(false);
  const [winner, setWinner] = useState(null);
  const [displayed, setDisplayed] = useState(null);
  const [drawCountdown, setDrawCountdown] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Näkymä: "normal" | "compact" (tiivistetty) | "stream" (vain arvonta).
  // Vanha STREAM MODE -valinta (raffle-stream-mode=true) = tiivistetty.
  const [viewMode, setViewMode] = useState(() => {
    const stored = readStored("raffle-view-mode", "");
    if (["normal", "compact", "stream"].includes(stored)) return stored;
    return readStored("raffle-stream-mode", "false") === "true"
      ? "compact"
      : "normal";
  });

  useEffect(() => writeStored("raffle-view-mode", viewMode), [viewMode]);

  // Stream modessa ei vierityspalkkia (näkyisi lähetyskuvassa).
  useEffect(() => {
    document.documentElement.style.overflow =
      viewMode === "stream" ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [viewMode]);

  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const { heading, updateHeading, resetHeading } = useHeading();
  const visibleHeadings = useMemo(() => headingTexts(heading), [heading]);
  const {
    branding,
    updateBranding,
    selectBrandingImage,
    hostName,
    setHostName,
  } = useBranding(setError);

  const {
    state,
    busy,
    configNotice,
    apiKeyConfigured,
    notice,
    nextPollIn,
    loadStream,
    stopStream,
    saveApiKey,
    exportData,
    importData,
    configLoaded,
  } = useRaffleAPI(setError);

  useEffect(() => writeStored("raffle-source", url), [url]);
  useEffect(() => writeStored("raffle-twitch-source", twitchUrl), [twitchUrl]);
  const hasSource = Boolean(url.trim() || twitchUrl.trim());
  useEffect(() => writeStored("raffle-autostart", String(autoStart)), [autoStart]);

  // Automaattinen haku kerran sivun avautuessa (asetuksista päälle).
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || !configLoaded) return;
    autoStarted.current = true;
    // YouTube tarvitsee API-avaimen; pelkkä Twitch toimii ilman.
    const youtubeReady = !url.trim() || apiKeyConfigured;
    if (autoStart && hasSource && youtubeReady) {
      handleLoad();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configLoaded]);

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

  // Useampi voittaja: aiemmat voittajat (kaikki heidän kommenttinsa)
  // poistetaan seuraavista arvonnoista.
  const { winners, winnerKeys, addWinner, clearWinners } = useWinners(
    state.raffleKey ?? state.videoId,
  );
  const pool = useMemo(
    () => entries.filter((entry) => !winnerKeys.has(entry.authorKey)),
    [entries, winnerKeys],
  );

  const isLive = state.streamMode === "live";
  const isNormal = state.streamMode === "normal";
  const hasTwitch = Boolean(state.twitch);

  // Pyörivä arvonta – näyttää satunnaisia kommentteja
  useEffect(() => {
    if (!rolling || drawCountdown !== null || pool.length === 0)
      return undefined;

    rollTimer.current = setInterval(() => {
      setDisplayed(pool[Math.floor(Math.random() * pool.length)]);
    }, 90);

    return () => clearInterval(rollTimer.current);
  }, [rolling, drawCountdown, pool]);

  // Automaattinen käynnistys kun video on ladattu ja kommentteja on
  useEffect(() => {
    if (
      (isLive || isNormal || hasTwitch) &&
      pool.length > 0 &&
      !rolling &&
      !winner
    ) {
      startRaffle();
    }
  }, [isLive, isNormal, hasTwitch, pool.length, rolling, winner]);

  async function handleLoad(event) {
    event?.preventDefault();
    setWinner(null);
    setDisplayed(null);
    setRolling(false);
    setDrawCountdown(null);
    await loadStream({ youtube: url, twitch: twitchUrl });
  }

  async function handleStop() {
    setRolling(false);
    setDrawCountdown(null);
    await stopStream();
  }

  function noEntriesMessage() {
    return entries.length
      ? "Kaikki osallistujat ovat jo voittaneet. Tyhjennä voittajalista arpoaksesi uudelleen."
      : "Arvontaan ei ole vielä hyväksyttyjä kommentteja.";
  }

  function startRaffle() {
    if (!pool.length) {
      setError(noEntriesMessage());
      return;
    }
    setError("");
    setWinner(null);
    setDrawCountdown(null);
    setRolling(true);
    setDisplayed(pool[Math.floor(Math.random() * pool.length)]);
  }

  // Arpoo voittajan jäljellä olevista. Toimii sekä pyörivästä rullasta
  // että suoraan edellisen voittajan jälkeen (= seuraava voittaja).
  function drawWinner() {
    if (drawCountdown !== null) return;
    if (!pool.length) {
      setError(noEntriesMessage());
      return;
    }

    clearInterval(rollTimer.current);
    clearTimeout(winnerTimer.current);
    setError("");
    setWinner(null);
    setRolling(true);

    const candidates = pool;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
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
        addWinner(chosen);
        setRolling(false);
        setDrawCountdown(null);
        return;
      }

      setDisplayed(candidates[Math.floor(Math.random() * candidates.length)]);
      winnerTimer.current = setTimeout(
        slowDown,
        80 + Math.pow(elapsed / 6000, 2) * 500,
      );
    }

    slowDown();
  }

  const contactInfo = `Sähköpostin otsikkoon: Podcast-voittaja
Viestiin: nimi, osoite, puhelinnumero`;

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      setError("Kopiointi leikepöydälle epäonnistui.");
      return false;
    }
  }

  function copyWinner(target = winner) {
    if (!target) return false;
    return copyText(
      `ONNITTELUT VOITOSTA: ${target.name} (${PLATFORM_NAME[platformOf(target)]}), ${target.text}\n\n${contactInfo}`,
    );
  }

  function copyAllWinners() {
    if (!winners.length) return false;
    const list = winners
      .map(
        (w, i) =>
          `${i + 1}. ${w.name} (${PLATFORM_NAME[platformOf(w)]}): ${w.text}`,
      )
      .join("\n");
    return copyText(`ONNITTELUT VOITTAJILLE!\n${list}\n\n${contactInfo}`);
  }

  function handleClearWinners() {
    if (
      window.confirm(
        "Tyhjennetäänkö voittajalista? Aiemmat voittajat voivat tämän jälkeen voittaa uudelleen.",
      )
    ) {
      clearWinners();
      setWinner(null);
    }
  }

  return (
    <main className={`app-shell view-${viewMode} ${isMobile ? "is-mobile" : ""}`}>
      {viewMode === "stream" && (
        <button
          type="button"
          className="stream-settings-button"
          onClick={() => setSettingsOpen((open) => !open)}
          aria-label="Asetukset"
          title="Asetukset"
        >
          <Settings2 size={16} />
        </button>
      )}

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
          viewMode={viewMode}
          setViewMode={setViewMode}
          heading={heading}
          updateHeading={updateHeading}
          resetHeading={resetHeading}
          url={url}
          setUrl={setUrl}
          twitchUrl={twitchUrl}
          setTwitchUrl={setTwitchUrl}
          onLoad={handleLoad}
          busy={busy}
          autoStart={autoStart}
          setAutoStart={setAutoStart}
          apiKeyConfigured={apiKeyConfigured}
          onSaveApiKey={saveApiKey}
          onExport={exportData}
          onImport={importData}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <UrlPanel
        url={url}
        setUrl={setUrl}
        twitchUrl={twitchUrl}
        setTwitchUrl={setTwitchUrl}
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
      {notice && (
        <div className="notice">
          <span>{notice}</span>
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
          entries={pool}
          totalEntries={entries.length}
          displayed={displayed}
          rolling={rolling}
          winner={winner}
          winners={winners}
          drawCountdown={drawCountdown}
          branding={branding}
          headingTexts={visibleHeadings}
          headingInterval={heading.intervalSec}
          subtitle={heading.subtitle}
          streamTitle={
            heading.showStreamTitle && state.videoId ? state.streamTitle : ""
          }
          onStart={startRaffle}
          onDraw={drawWinner}
          onCopyWinner={copyWinner}
          onCopyAll={copyAllWinners}
          onClearWinners={handleClearWinners}
        />
        <CommentsPanel
          comments={state.comments}
          isLive={isLive || hasTwitch}
          totalComments={state.totalComments}
        />
      </section>

      <footer>
        <span>
          LIVE RAFFLERI <b>•</b> YOUTUBE + TWITCH
        </span>
        <span>
          <span className="footer-dot" />
          {time(state.updatedAt)}
        </span>
      </footer>
    </main>
  );
}
