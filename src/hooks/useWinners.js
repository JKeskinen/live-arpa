/**
 * useWinners – Arvonnan voittajat (useampi voittaja)
 * ---------------------------------------------------
 * Voittajat tallennetaan videokohtaisesti localStorageen, joten ne säilyvät
 * vaikka sivu ladattaisiin uudelleen kesken arvontojen. Voittajan
 * authorKey-tunnisteella estetään saman henkilön uusi voitto.
 */

import { useEffect, useMemo, useState } from "react";

const storageKey = (videoId) => `raffle-winners:${videoId}`;

function readWinners(videoId) {
  if (!videoId) return [];
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey(videoId)));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function writeWinners(videoId, winners) {
  if (!videoId) return;
  try {
    if (winners.length) {
      localStorage.setItem(storageKey(videoId), JSON.stringify(winners));
    } else {
      localStorage.removeItem(storageKey(videoId));
    }
  } catch {
    // tallennus epäonnistui – lista säilyy silti tämän istunnon ajan
  }
}

export function useWinners(videoId) {
  const [winners, setWinners] = useState(() => readWinners(videoId));

  // Vaihda lista, kun video vaihtuu.
  useEffect(() => {
    setWinners(readWinners(videoId));
  }, [videoId]);

  const winnerKeys = useMemo(
    () => new Set(winners.map((w) => w.authorKey)),
    [winners],
  );

  function addWinner(comment) {
    setWinners((previous) => {
      const next = [
        ...previous,
        {
          id: comment.id,
          authorKey: comment.authorKey,
          source: comment.source, // "live" | "normal" (YouTube) | "twitch"
          name: comment.name,
          text: comment.text,
          drawnAt: new Date().toISOString(),
        },
      ];
      writeWinners(videoId, next);
      return next;
    });
  }

  function clearWinners() {
    writeWinners(videoId, []);
    setWinners([]);
  }

  return { winners, winnerKeys, addWinner, clearWinners };
}
