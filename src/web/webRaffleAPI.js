/**
 * webRaffleAPI – kommenttien haku ja tallennus
 * --------------------------------------------
 * Hakee kommentit YouTubesta ja Twitchistä ja tallentaa ne selaimen
 * IndexedDB:hen. Käyttöliittymä käyttää tätä useRaffleAPI-hookin kautta.
 *
 * Lähteet (YouTube ja Twitch voivat olla käynnissä yhtä aikaa):
 * - Twitch-kanava → chat luetaan reaaliajassa (ei API-avainta, ei kiintiötä).
 * - Videon tai livelähetyksen osoite → haku alkaa heti.
 * - Kanava (@kahva tai kanavan osoite) → kanavan käynnissä oleva live
 *   etsitään KERRAN (3 kiintiöyksikköä) ja kommenttien haku alkaa siitä.
 *   Jos liveä ei ole, kerrotaan se; jatkuvaa tarkistusta ei ole.
 *
 * Suojaukset:
 * - API-avain tallennetaan vain tämän selaimen localStorageen
 *   (ei julkaistussa sivussa).
 * - Vain yksi välilehti kerrallaan voi hakea kommentteja (Web Locks).
 * - Selainta pyydetään säilyttämään data pysyvästi (storage.persist).
 * - Jos välilehti on ollut taustalla ja haku on viivästynyt,
 *   haetaan heti kun välilehti palaa näkyviin.
 * - Jokainen lataus on oma sessionsa; vanhentunut haku lopettaa itsensä,
 *   joten rinnakkaisia hakusilmukoita (tuplakiintiö) ei synny.
 */

import {
  CHANNEL_RECENT_VIDEOS,
  LIVE_CHAT_ENDED_REASONS,
  LIVE_POLL_INTERVAL_MS,
  LIVE_RETRY_INTERVAL_MS,
  buildSnapshot,
  liveItemToComment,
  normalItemToComment,
  parseChannelInput,
  parseVideoId,
  pickLiveVideo,
  pickUpcomingVideo,
  sortComments,
  youtubeRequest,
} from "../../shared/raffleCore.mjs";
import {
  exportAll,
  getComments,
  importAll,
  saveComments,
  saveVideo,
} from "./db.js";
import { connectTwitchChat, parseTwitchChannel } from "./twitchChat.js";

const API_KEY_STORAGE = "raffleri-youtube-api-key";
const LOCK_NAME = "raffleri-comment-polling";

let polling = false;
let pollTimer = null;
let nextPageToken = "";
let liveChatId = "";
let videoId = "";
let streamTitle = "";
let streamMode = ""; // '' | 'offline' | 'live' | 'normal'
let sessionId = 0;
let comments = [];
let lastPollAt = 0;
let releaseLock = null;
let channel = null; // { id, title, handle, uploadsPlaylistId }
let upcoming = null; // { videoId, title, scheduledStartTime }

// Twitch (rinnakkain YouTuben kanssa)
const TWITCH_SESSION_STORAGE = "raffleri-twitch-session";
const TWITCH_SESSION_REUSE_MS = 12 * 60 * 60 * 1000; // sama arvonta 12 h
let twitchClient = null;
let twitch = { channel: "", key: "", status: "", comments: [] };
let twitchQueue = [];
let twitchFlushing = false;

const listeners = {
  update: new Set(),
  error: new Set(),
  poll: new Set(),
  notice: new Set(),
};

function emit(eventName, payload) {
  for (const callback of listeners[eventName]) {
    try {
      callback(payload);
    } catch (error) {
      console.error(error);
    }
  }
}

function subscribe(eventName, callback) {
  listeners[eventName].add(callback);
  return () => listeners[eventName].delete(callback);
}

// ------------------------------------------------------------
// API-avain
// ------------------------------------------------------------

function getApiKey() {
  try {
    return localStorage.getItem(API_KEY_STORAGE) || "";
  } catch {
    return "";
  }
}

function setApiKey(key) {
  const value = String(key || "").trim();
  try {
    if (value) localStorage.setItem(API_KEY_STORAGE, value);
    else localStorage.removeItem(API_KEY_STORAGE);
  } catch {
    throw new Error("API-avaimen tallennus selaimeen epäonnistui.");
  }
  return { configured: Boolean(value) };
}

function youtube(endpoint, params) {
  const key = getApiKey();
  if (!key) {
    throw new Error(
      "YouTube API -avain puuttuu. Lisää se asetuksista (rataskuvake).",
    );
  }
  return youtubeRequest(key, endpoint, params);
}

// ------------------------------------------------------------
// Välilehtilukitus ja pysyvä tallennus
// ------------------------------------------------------------

function acquireLock() {
  if (releaseLock) return Promise.resolve(true);
  if (!navigator.locks?.request) return Promise.resolve(true);

  return new Promise((resolve, reject) => {
    navigator.locks
      .request(LOCK_NAME, { ifAvailable: true }, (lock) => {
        if (!lock) {
          resolve(false);
          return undefined;
        }
        resolve(true);
        // Lukko pysyy, kunnes releaseLock() kutsutaan.
        return new Promise((release) => {
          releaseLock = () => {
            releaseLock = null;
            release();
          };
        });
      })
      .catch(reject);
  });
}

function releaseTabLock() {
  releaseLock?.();
}

/** Vapauttaa välilehtilukon, jos YouTube- eikä Twitch-haku ole käynnissä. */
function releaseLockIfIdle() {
  if (!polling && !twitchActive()) releaseTabLock();
}

let persistRequested = false;
async function requestPersistentStorage() {
  if (persistRequested) return;
  persistRequested = true;
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // Ei kriittinen: data tallentuu silti.
  }
}

// ------------------------------------------------------------
// Tila
// ------------------------------------------------------------

function twitchActive() {
  return Boolean(twitchClient);
}

function allComments() {
  return twitch.comments.length
    ? sortComments([...comments, ...twitch.comments])
    : comments;
}

function snapshot() {
  const snap = buildSnapshot({
    videoId,
    streamTitle,
    streamMode,
    polling: polling || twitchActive(),
    comments: allComments(),
    channel: channel ? { title: channel.title, handle: channel.handle } : null,
    upcoming,
  });
  snap.youtubePolling = polling;
  snap.twitch = twitch.channel
    ? {
        channel: twitch.channel,
        status: twitch.status,
        comments: twitch.comments.length,
      }
    : null;
  // Arvonnan tunniste (voittajalista): kaikki aktiiviset lähteet yhdessä.
  snap.raffleKey = [videoId, twitch.key].filter(Boolean).join("+");
  return snap;
}

function publishState() {
  emit("update", snapshot());
}

function publishError(error) {
  emit("error", error instanceof Error ? error.message : String(error));
}

function addComments(added) {
  if (added.length) comments = sortComments([...comments, ...added]);
}

function stopCurrentWork() {
  polling = false;
  sessionId++;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

function resetSource() {
  videoId = "";
  streamTitle = "";
  streamMode = "";
  liveChatId = "";
  nextPageToken = "";
  comments = [];
  channel = null;
  upcoming = null;
}

/** Ajastaa seuraavan haun; vanhentunut sessio ei ajasta mitään. */
function scheduleNext(session, delay, task) {
  if (!polling || session !== sessionId) return;
  pollTimer = setTimeout(() => task(session), delay);
  emit("poll", { nextPollAt: Date.now() + delay, intervalMs: delay });
}

/** Lopettaa haun, mutta säilyttää kerätyt kommentit ja arvonnan. */
function finishPolling(message) {
  polling = false;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  releaseLockIfIdle();
  if (message) emit("notice", message);
  publishState();
}

// ------------------------------------------------------------
// Videon avaus (suoraan osoitteesta tai kanavan livestä)
// ------------------------------------------------------------

async function openVideo(video, session) {
  const id = video.id;
  const title = video.snippet?.title || "Nimetön video";
  const chatId = video.liveStreamingDetails?.activeLiveChatId || "";
  const mode = chatId ? "live" : "normal";

  await saveVideo(id, title, mode);
  const stored = sortComments(await getComments(id));
  if (session !== sessionId) return;

  videoId = id;
  streamTitle = title;
  liveChatId = chatId;
  streamMode = mode;
  nextPageToken = "";
  comments = stored;
  upcoming = null;
  polling = true;
  publishState();

  if (mode === "live") {
    emit("poll", {
      nextPollAt: Date.now() + 1000,
      intervalMs: LIVE_POLL_INTERVAL_MS,
    });
    pollLiveChat(session);
  } else {
    fetchAllNormalComments(session);
  }
}

// ------------------------------------------------------------
// YouTube-kanavan live (etsitään kerran, 3 yksikköä)
// ------------------------------------------------------------

async function resolveChannel(parsed) {
  const params = { part: "snippet,contentDetails" };
  if (parsed.id) params.id = parsed.id;
  else params.forHandle = parsed.handle;

  const result = await youtube("channels", params);
  const item = result.items?.[0];
  if (!item) {
    throw new Error(
      `Kanavaa ${parsed.handle || parsed.id} ei löytynyt. Tarkista kirjoitusasu.`,
    );
  }
  const uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    throw new Error("Kanavan videolistaa ei saatu haettua.");
  }
  return {
    id: item.id,
    title: item.snippet?.title || parsed.handle || item.id,
    handle: item.snippet?.customUrl || parsed.handle || "",
    uploadsPlaylistId,
  };
}

/**
 * Etsii kanavan käynnissä olevan livelähetyksen KERRAN (ei toistuvaa
 * tarkistusta). Löytyy → kommenttien haku alkaa. Ei löydy → kerrotaan
 * käyttäjälle, joka voi yrittää uudelleen LATAA-painikkeella.
 */
async function findChannelLive(session) {
  const playlist = await youtube("playlistItems", {
    part: "contentDetails",
    playlistId: channel.uploadsPlaylistId,
    maxResults: CHANNEL_RECENT_VIDEOS,
  });
  if (session !== sessionId) return;

  const ids = (playlist.items || [])
    .map((item) => item.contentDetails?.videoId)
    .filter(Boolean);

  let videos = [];
  if (ids.length) {
    const result = await youtube("videos", {
      part: "snippet,liveStreamingDetails",
      id: ids.join(","),
    });
    if (session !== sessionId) return;
    videos = result.items || [];
  }

  const live = pickLiveVideo(videos);
  if (live) {
    emit(
      "notice",
      `Kanavan ${channel.title} livelähetys löytyi: ${live.snippet?.title || "nimetön"}.`,
    );
    await openVideo(live, session);
    return;
  }

  const next = pickUpcomingVideo(videos);
  upcoming = next
    ? {
        videoId: next.id,
        title: next.snippet?.title || "",
        scheduledStartTime: next.liveStreamingDetails.scheduledStartTime,
      }
    : null;
  streamMode = "offline";
  finishPolling();
}

// ------------------------------------------------------------
// Live chat (30 s väli)
// ------------------------------------------------------------

async function pollLiveChat(session = sessionId) {
  pollTimer = null;
  if (session !== sessionId) return;
  if (!polling || streamMode !== "live" || !liveChatId) return;
  const currentVideo = videoId;

  try {
    lastPollAt = Date.now();
    const params = {
      liveChatId,
      part: "snippet,authorDetails",
      maxResults: 2000, // maksimi; sama kiintiöhinta kuin pienemmällä
    };
    if (nextPageToken) params.pageToken = nextPageToken;

    const result = await youtube("liveChat/messages", params);
    if (session !== sessionId) return;

    // Kommentit tallennetaan heti IndexedDB:hen, joten ne säilyvät
    // vaikka välilehti kaatuisi tai sivu ladattaisiin uudelleen.
    const added = await saveComments(
      currentVideo,
      "live",
      (result.items || []).map(liveItemToComment),
    );
    if (session !== sessionId) return;
    addComments(added);

    nextPageToken = result.nextPageToken || "";

    if (result.offlineAt) {
      finishPolling(
        "Livelähetys päättyi. Kommenttien haku pysäytettiin – kerätyt kommentit ovat tallessa.",
      );
      return;
    }

    publishState();
    scheduleNext(session, LIVE_POLL_INTERVAL_MS, pollLiveChat);
  } catch (error) {
    if (session !== sessionId) return;
    if (LIVE_CHAT_ENDED_REASONS.includes(error?.reason)) {
      finishPolling(
        "Livelähetyksen chat on päättynyt. Kommenttien haku pysäytettiin – kerätyt kommentit ovat tallessa.",
      );
      return;
    }
    publishError(error);
    scheduleNext(session, LIVE_RETRY_INTERVAL_MS, pollLiveChat);
  }
}

// Selain hidastaa taustavälilehden ajastimia. Kun välilehti palaa
// näkyviin ja haku on myöhässä, haetaan heti.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (!polling || streamMode !== "live") return;

    if (document.visibilityState === "hidden") {
      emit(
        "notice",
        "Raffleri on taustalla – selain voi hidastaa kommenttien hakua. Pidä välilehti näkyvissä lähetyksen aikana.",
      );
      return;
    }

    const overdue = Date.now() - lastPollAt > LIVE_POLL_INTERVAL_MS + 5000;
    if (overdue && pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
      emit(
        "notice",
        "Haku hidastui, kun välilehti oli taustalla. Uudet kommentit haettiin heti.",
      );
      pollLiveChat(sessionId);
    } else {
      emit("notice", "");
    }
  });
}

// ------------------------------------------------------------
// Twitch-chat (reaaliaikainen)
// ------------------------------------------------------------

/**
 * Saman kanavan kommentit kuuluvat samaan arvontaan, jos kanavalla on
 * ollut toimintaa 12 tunnin sisällä. Uudelleenlataus kesken lähetyksen
 * palauttaa siis kommentit; ensi viikon lähetys alkaa puhtaalta pöydältä.
 */
function twitchSessionKey(name) {
  const now = Date.now();
  try {
    const stored = JSON.parse(localStorage.getItem(TWITCH_SESSION_STORAGE));
    if (
      stored?.channel === name &&
      now - Number(stored.lastActivity) < TWITCH_SESSION_REUSE_MS &&
      stored.key
    ) {
      return stored.key;
    }
  } catch {
    // ei aiempaa sessiota
  }
  return `twitch:${name}:${new Date(now).toISOString()}`;
}

function touchTwitchSession() {
  try {
    localStorage.setItem(
      TWITCH_SESSION_STORAGE,
      JSON.stringify({
        channel: twitch.channel,
        key: twitch.key,
        lastActivity: Date.now(),
      }),
    );
  } catch {
    // ei kriittinen
  }
}

/** Tallentaa jonossa olevat viestit. Ei ajastimia → ei taustahidastusta. */
async function flushTwitchQueue() {
  if (twitchFlushing) return;
  twitchFlushing = true;
  try {
    while (twitchQueue.length) {
      const batch = twitchQueue;
      twitchQueue = [];
      const key = twitch.key;
      const added = await saveComments(key, "twitch", batch);
      if (key !== twitch.key) continue; // lähde vaihtui välissä
      if (added.length) {
        twitch.comments = sortComments([...twitch.comments, ...added]);
        touchTwitchSession();
        publishState();
      }
    }
  } catch (error) {
    publishError(error);
  } finally {
    twitchFlushing = false;
  }
}

const TWITCH_STATUS_TEXT = {
  error: "Twitch-kanavaa ei voi lukea",
};

async function startTwitch(name) {
  const key = twitchSessionKey(name);
  await saveVideo(key, `Twitch #${name}`, "live");
  const stored = sortComments(await getComments(key));

  twitch = { channel: name, key, status: "connecting", comments: stored };
  twitchQueue = [];
  touchTwitchSession();

  twitchClient = connectTwitchChat(name, {
    onMessage: (comment) => {
      if (comment.isBroadcaster) return; // kanavan omistaja ei osallistu
      twitchQueue.push(comment);
      flushTwitchQueue();
    },
    onStatus: (status, detail) => {
      if (!twitchClient && status) return;
      twitch.status = status;
      if (status === "error") {
        publishError(`${TWITCH_STATUS_TEXT.error} #${name}: ${detail}`);
      }
      publishState();
    },
  });
}

function stopTwitch() {
  const client = twitchClient;
  twitchClient = null;
  client?.stop();
  twitchQueue = [];
  if (twitch.channel) twitch = { ...twitch, status: "" };
}

function clearTwitch() {
  stopTwitch();
  twitch = { channel: "", key: "", status: "", comments: [] };
}

// ------------------------------------------------------------
// Normaali video
// ------------------------------------------------------------

async function fetchAllNormalComments(session) {
  const currentVideo = videoId;
  const replyParents = new Set();
  let pageToken = "";
  const isCurrent = () => polling && session === sessionId;

  try {
    do {
      if (!isCurrent()) return;

      const params = {
        part: "snippet,replies",
        videoId: currentVideo,
        maxResults: 100,
        textFormat: "plainText",
      };
      if (pageToken) params.pageToken = pageToken;

      const result = await youtube("commentThreads", params);
      if (!isCurrent()) return;

      const batch = [];
      for (const thread of result.items || []) {
        const topLevel = thread.snippet?.topLevelComment;
        if (!topLevel) continue;

        batch.push(normalItemToComment(topLevel));
        const inlineReplies = thread.replies?.comments || [];
        for (const reply of inlineReplies) {
          batch.push(normalItemToComment(reply));
        }

        const totalReplies = Number(thread.snippet?.totalReplyCount || 0);
        if (totalReplies > inlineReplies.length) {
          replyParents.add(topLevel.id);
        }
      }

      addComments(await saveComments(currentVideo, "normal", batch));
      pageToken = result.nextPageToken || "";
      publishState();
    } while (pageToken);

    for (const parentId of replyParents) {
      let replyPageToken = "";
      do {
        if (!isCurrent()) return;

        const params = {
          part: "snippet",
          parentId,
          maxResults: 100,
          textFormat: "plainText",
        };
        if (replyPageToken) params.pageToken = replyPageToken;

        const result = await youtube("comments", params);
        if (!isCurrent()) return;

        addComments(
          await saveComments(
            currentVideo,
            "normal",
            (result.items || []).map(normalItemToComment),
          ),
        );
        replyPageToken = result.nextPageToken || "";
        publishState();
      } while (replyPageToken);
    }

    if (session === sessionId) finishPolling();
  } catch (error) {
    if (session === sessionId) {
      finishPolling();
      publishError(error);
    }
  }
}

// ------------------------------------------------------------
// Julkinen rajapinta
// ------------------------------------------------------------

/**
 * Käynnistää haun. input on joko merkkijono (YouTube) tai
 * { youtube, twitch } – kumpi tahansa voi olla tyhjä.
 */
async function loadStream(input) {
  const sources =
    typeof input === "string" ? { youtube: input, twitch: "" } : input || {};
  const youtubeInput = String(sources.youtube || "").trim();
  const twitchInput = String(sources.twitch || "").trim();

  stopCurrentWork();
  stopTwitch();
  const session = sessionId;
  emit("notice", "");

  const parsedVideoId = youtubeInput ? parseVideoId(youtubeInput) : "";
  const parsedChannel =
    youtubeInput && !parsedVideoId ? parseChannelInput(youtubeInput) : null;
  if (youtubeInput && !parsedVideoId && !parsedChannel) {
    throw new Error(
      "YouTube-osoitetta ei tunnistettu. Anna videon osoite tai kanava, esim. @prodiscus_official.",
    );
  }

  const twitchChannel = twitchInput ? parseTwitchChannel(twitchInput) : "";
  if (twitchInput && !twitchChannel) {
    throw new Error(
      "Twitch-kanavaa ei tunnistettu. Anna kanavan nimi tai osoite, esim. twitch.tv/kanava.",
    );
  }

  if (!youtubeInput && !twitchChannel) {
    throw new Error("Anna YouTube-kanava tai -video ja/tai Twitch-kanava.");
  }

  if (youtubeInput && !getApiKey()) {
    throw new Error(
      "YouTube API -avain puuttuu. Lisää se asetuksista (rataskuvake). Twitch ei tarvitse avainta.",
    );
  }

  const gotLock = await acquireLock();
  if (!gotLock) {
    throw new Error(
      "Kommenttien haku on jo käynnissä toisessa Raffleri-välilehdessä. Käytä sitä tai sulje se ensin.",
    );
  }
  requestPersistentStorage();

  // Twitch ensin: se ei voi epäonnistua YouTube-virheen takia.
  if (twitchChannel) {
    await startTwitch(twitchChannel);
  } else {
    clearTwitch();
  }

  if (!youtubeInput) {
    resetSource();
    publishState();
    return snapshot();
  }

  try {
    if (parsedVideoId) {
      const videoResult = await youtube("videos", {
        part: "snippet,liveStreamingDetails",
        id: parsedVideoId,
      });
      const video = videoResult.items?.[0];
      if (!video) throw new Error("YouTube-videota ei löytynyt.");
      if (session !== sessionId) return snapshot();

      resetSource();
      await openVideo(video, session);
    } else {
      const resolved = await resolveChannel(parsedChannel);
      if (session !== sessionId) return snapshot();

      resetSource();
      channel = resolved;
      await findChannelLive(session);
    }
  } catch (error) {
    if (session === sessionId) {
      polling = false;
      releaseLockIfIdle();
      publishState();
    }
    throw error;
  }

  return snapshot();
}

async function stopStream() {
  stopCurrentWork();
  stopTwitch();
  releaseTabLock();
  emit("notice", "");
  publishState();
  return snapshot();
}

async function exportData() {
  return exportAll();
}

async function importData(data) {
  const counts = await importAll(data);
  if (videoId) comments = sortComments(await getComments(videoId));
  if (twitch.key) twitch.comments = sortComments(await getComments(twitch.key));
  publishState();
  return counts;
}

export const webRaffleAPI = {
  getConfig: async () => ({ configured: Boolean(getApiKey()) }),
  setApiKey: async (key) => setApiKey(key),
  loadStream,
  stopStream,
  getState: async () => snapshot(),
  onUpdate: (callback) => subscribe("update", callback),
  onError: (callback) => subscribe("error", callback),
  onPollNext: (callback) => subscribe("poll", callback),
  onNotice: (callback) => subscribe("notice", callback),
  exportData,
  importData,
};
