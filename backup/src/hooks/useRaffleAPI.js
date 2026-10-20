/**
 * useRaffleAPI – Electron IPC -yhteys
 * ------------------------------------
 * Kuuntelee main-prosessin viestejä ja tarjoaa lataus/pysäytys-funktiot.
 */

import { useEffect, useState } from "react";

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

export function useRaffleAPI(setError) {
  const [state, setState] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [configNotice, setConfigNotice] = useState("");
  const [nextPollIn, setNextPollIn] = useState(null);

  useEffect(() => {
    if (!window.raffleAPI) {
      setError(
        "YouTube-kommenttien haku ei ole käytettävissä selainversiossa. Käytä Windows- tai Mac-sovellusta."
      );
      return;
    }

    window.raffleAPI.getConfig().then((config) => {
      if (!config.configured) {
        setConfigNotice(
          "YouTube API -avain puuttuu. Tarkista README.md ja config.json."
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
          Math.ceil((nextPollAt - Date.now()) / 1000)
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
    };
  }, [setError]);

  async function loadStream(url) {
    if (!window.raffleAPI) {
      setError("YouTube-kommenttien haku ei ole käytettävissä selainversiossa.");
      return;
    }
    setBusy(true);
    setError("");
    setNextPollIn(null);
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
    setNextPollIn(null);
    try {
      setState(await window.raffleAPI.stopStream());
    } catch (err) {
      setError(err.message || "Keräystä ei voitu pysäyttää.");
    }
  }

  return {
    state,
    setState,
    busy,
    configNotice,
    nextPollIn,
    loadStream,
    stopStream,
  };
}
