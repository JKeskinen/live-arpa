/**
 * useRaffleAPI – yhteys kommenttien hakuun
 * ----------------------------------------
 * React-hook webRaffleAPI:n päälle: tila, virheet, ilmoitukset, API-avain
 * ja varmuuskopio käyttöliittymää varten.
 */

import { useEffect, useState } from "react";
import { webRaffleAPI } from "../web/webRaffleAPI";

const api = webRaffleAPI;

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

function missingKeyNotice(config) {
  if (config.configured) return "";
  return "YouTube API -avain puuttuu. Lisää se asetuksista (rataskuvake oikealla ylhäällä). Pelkkä Twitch toimii ilman avainta.";
}

export function useRaffleAPI(setError) {
  const [state, setState] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [configNotice, setConfigNotice] = useState("");
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const [nextPollIn, setNextPollIn] = useState(null);

  useEffect(() => {
    api
      .getConfig()
      .then((config) => {
        setApiKeyConfigured(Boolean(config.configured));
        setConfigNotice(missingKeyNotice(config));
      })
      .catch(() => {})
      .finally(() => setConfigLoaded(true));

    const offUpdate = api.onUpdate((data) => setState(data));
    const offError = api.onError((message) => setError(message));
    const offNotice = api.onNotice?.((message) => setNotice(message || ""));

    let countdownInterval = null;
    const offPoll = api.onPollNext?.(({ nextPollAt }) => {
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

    api
      .getState()
      .then(setState)
      .catch((err) => {
        setError(err.message || "Tilan lukeminen epäonnistui.");
      });

    return () => {
      offUpdate();
      offError();
      offNotice?.();
      offPoll?.();
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [setError]);

  /** sources = { youtube, twitch } – kumpi tahansa voi olla tyhjä. */
  async function loadStream(sources) {
    setBusy(true);
    setError("");
    setNextPollIn(null);
    try {
      const data = await api.loadStream(
        sources.demo
          ? { demo: true }
          : { youtube: sources.youtube.trim(), twitch: sources.twitch.trim() },
      );
      setState(data);
    } catch (err) {
      setError(err.message || "Videota ei voitu ladata.");
    } finally {
      setBusy(false);
    }
  }

  async function stopStream() {
    setNextPollIn(null);
    try {
      setState(await api.stopStream());
    } catch (err) {
      setError(err.message || "Keräystä ei voitu pysäyttää.");
    }
  }

  async function saveApiKey(key) {
    if (!api.setApiKey) return;
    try {
      const config = await api.setApiKey(key);
      setApiKeyConfigured(Boolean(config.configured));
      setConfigNotice(missingKeyNotice(config));
      setError("");
    } catch (err) {
      setError(err.message || "API-avaimen tallennus epäonnistui.");
    }
  }

  async function exportData() {
    if (!api.exportData) return;
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const link = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      link.href = URL.createObjectURL(blob);
      link.download = `raffleri-varmuuskopio-${stamp}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      setNotice(
        `Varmuuskopio ladattu: ${data.comments.length} kommenttia, ${data.videos.length} videota.`,
      );
    } catch (err) {
      setError(err.message || "Varmuuskopion teko epäonnistui.");
    }
  }

  async function importData(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !api.importData) return;
    try {
      const data = JSON.parse(await file.text());
      const counts = await api.importData(data);
      setNotice(
        `Varmuuskopio palautettu: ${counts.comments} kommenttia, ${counts.videos} videota.`,
      );
      setError("");
    } catch (err) {
      setError(
        err instanceof SyntaxError
          ? "Tiedosto ei ole kelvollista JSONia."
          : err.message || "Varmuuskopion palautus epäonnistui.",
      );
    }
  }

  return {
    state,
    setState,
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
  };
}
