/**
 * IndexedDB-tallennus selainversiolle
 * -----------------------------------
 * Data säilyy vain tässä selaimessa tällä laitteella.
 *
 * Storet:
 * - videos:   { videoId, title, status, firstSeenAt, updatedAt }
 * - comments: { videoId, source, id, authorKey, name, authorId, text,
 *               publishedAt, receivedAt, accepted }
 * - kv:       vapaat avain–arvo-parit (esim. brändäyskuva)
 */

import { authorKeyFor, isAccepted } from "../../shared/raffleCore.mjs";

const DB_NAME = "raffleri";
const DB_VERSION = 1;

let dbPromise = null;

export function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Selain ei tue IndexedDB-tallennusta."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("videos")) {
        db.createObjectStore("videos", { keyPath: "videoId" });
      }
      if (!db.objectStoreNames.contains("comments")) {
        const comments = db.createObjectStore("comments", {
          keyPath: ["videoId", "source", "id"],
        });
        comments.createIndex("byVideo", "videoId");
      }
      if (!db.objectStoreNames.contains("kv")) {
        db.createObjectStore("kv");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("Tietokannan avaaminen epäonnistui."));
    request.onblocked = () =>
      reject(
        new Error(
          "Tietokanta on lukittu toisessa välilehdessä. Sulje muut Raffleri-välilehdet.",
        ),
      );
  }).catch((error) => {
    dbPromise = null;
    throw error;
  });

  return dbPromise;
}

function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () =>
      reject(tx.error || new Error("Tallennus keskeytyi (tila täynnä?)."));
  });
}

function result(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ------------------------------------------------------------
// Videot ja kommentit
// ------------------------------------------------------------

export async function saveVideo(videoId, title, status) {
  const db = await openDb();
  const tx = db.transaction("videos", "readwrite");
  const store = tx.objectStore("videos");
  const now = new Date().toISOString();

  store.get(videoId).onsuccess = (event) => {
    const existing = event.target.result;
    store.put({
      videoId,
      title: title || "",
      status,
      firstSeenAt: existing?.firstSeenAt || now,
      updatedAt: now,
    });
  };

  await done(tx);
}

export async function getComments(videoId) {
  if (!videoId) return [];
  const db = await openDb();
  const tx = db.transaction("comments", "readonly");
  return result(tx.objectStore("comments").index("byVideo").getAll(videoId));
}

/**
 * Tallentaa kommentit yhdessä transaktiossa ja soveltaa
 * "max 3 hyväksyttyä per kirjoittaja" -säännön. Lukeminen ja kirjoitus
 * tehdään samassa transaktiossa, jotta sääntö ei voi pettää.
 *
 * @param {string} videoId
 * @param {"live"|"normal"} source
 * @param {Array<{id, authorId, authorName, text, publishedAt}|null>} items
 * @returns {Promise<Array>} uudet tallennetut kommentit
 */
export async function saveComments(videoId, source, items) {
  const incoming = items.filter(Boolean);
  if (!videoId || incoming.length === 0) return [];

  const db = await openDb();
  const tx = db.transaction("comments", "readwrite");
  const store = tx.objectStore("comments");
  const added = [];

  store.index("byVideo").getAll(videoId).onsuccess = (event) => {
    const existing = event.target.result || [];
    const seen = new Set(existing.map((c) => `${c.source}\u0000${c.id}`));
    const acceptedByAuthor = new Map();
    for (const c of existing) {
      if (c.accepted) {
        acceptedByAuthor.set(
          c.authorKey,
          (acceptedByAuthor.get(c.authorKey) || 0) + 1,
        );
      }
    }

    for (const item of incoming) {
      const key = `${source}\u0000${item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const name = String(item.authorName || "Tuntematon");
      const authorId = String(item.authorId || "");
      const authorKey = authorKeyFor(authorId, name);
      const count = acceptedByAuthor.get(authorKey) || 0;
      const accepted = isAccepted(count);
      if (accepted) acceptedByAuthor.set(authorKey, count + 1);

      const comment = {
        videoId,
        source,
        id: String(item.id),
        authorKey,
        name,
        authorId,
        text: String(item.text),
        publishedAt: String(item.publishedAt || ""),
        receivedAt: new Date().toISOString(),
        accepted,
      };
      store.put(comment);
      added.push(comment);
    }
  };

  await done(tx);
  return added;
}

// ------------------------------------------------------------
// Vienti ja tuonti (varmuuskopio)
// ------------------------------------------------------------

export async function exportAll() {
  const db = await openDb();
  const tx = db.transaction(["videos", "comments"], "readonly");
  const [videos, comments] = await Promise.all([
    result(tx.objectStore("videos").getAll()),
    result(tx.objectStore("comments").getAll()),
  ]);
  return {
    app: "raffleri",
    format: 1,
    exportedAt: new Date().toISOString(),
    videos,
    comments,
  };
}

export async function importAll(data) {
  if (
    !data ||
    data.app !== "raffleri" ||
    !Array.isArray(data.videos) ||
    !Array.isArray(data.comments)
  ) {
    throw new Error("Tiedosto ei ole Rafflerin varmuuskopio.");
  }

  const videos = data.videos.filter(
    (v) => v && typeof v.videoId === "string" && v.videoId,
  );
  const comments = data.comments.filter(
    (c) =>
      c &&
      typeof c.videoId === "string" &&
      ["live", "normal", "twitch"].includes(c.source) &&
      c.id !== undefined &&
      c.id !== null,
  );

  const db = await openDb();
  const tx = db.transaction(["videos", "comments"], "readwrite");
  const videoStore = tx.objectStore("videos");
  const commentStore = tx.objectStore("comments");

  for (const v of videos) {
    videoStore.put({
      videoId: v.videoId,
      title: String(v.title || ""),
      status: v.status === "live" ? "live" : "normal",
      firstSeenAt: String(v.firstSeenAt || new Date().toISOString()),
      updatedAt: String(v.updatedAt || new Date().toISOString()),
    });
  }
  for (const c of comments) {
    commentStore.put({
      videoId: c.videoId,
      source: c.source,
      id: String(c.id),
      authorKey: String(c.authorKey || ""),
      name: String(c.name || "Tuntematon"),
      authorId: String(c.authorId || ""),
      text: String(c.text || ""),
      publishedAt: String(c.publishedAt || ""),
      receivedAt: String(c.receivedAt || ""),
      accepted: Boolean(c.accepted),
    });
  }

  await done(tx);
  return { videos: videos.length, comments: comments.length };
}

// ------------------------------------------------------------
// Avain–arvo (brändäyskuva ym.)
// ------------------------------------------------------------

export async function kvGet(key) {
  const db = await openDb();
  const tx = db.transaction("kv", "readonly");
  return result(tx.objectStore("kv").get(key));
}

export async function kvSet(key, value) {
  const db = await openDb();
  const tx = db.transaction("kv", "readwrite");
  if (value === undefined || value === null || value === "") {
    tx.objectStore("kv").delete(key);
  } else {
    tx.objectStore("kv").put(value, key);
  }
  await done(tx);
}
