/**
 * Electron Main Process – Prodiscus Raffleri
 * ------------------------------------------
 * Vastaa:
 * - YouTube API -kutsuista (kiintiön hallinta)
 * - SQLite-tietokannasta
 * - Live-chat-pollauksesta (kiinteä 30 s väli)
 * - IPC-viestinnästä renderer-prosessin kanssa
 *
 * Kiintiö (oletus 10 000 yksikköä / päivä):
 * - liveChat/messages = 5 yksikköä / kutsu
 * - 30 s väli ≈ 120 kutsua / tunti ≈ 600 yksikköä / tunti
 */

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");

// Yhteinen logiikka (sama kuin selainversiossa). ESM-moduuli ladataan
// dynaamisesti ja odotetaan valmiiksi ennen ikkunan avaamista.
const corePromise = import("../shared/raffleCore.mjs");
let core;

let win;
let db;

let polling = false;
let pollTimer = null;
let nextPageToken = "";
let liveChatId = "";
let videoId = "";
let apiKey = "";
let streamTitle = "";
let streamMode = "normal"; // 'live' | 'normal'
let sessionId = 0;

// Karkea kiintiöseuranta
let estimatedQuotaUsed = 0;

// ------------------------------------------------------------
// 1. CONFIGURATION
// ------------------------------------------------------------

function configPath() {
  return path.join(app.getPath("userData"), "config.json");
}

function readConfig() {
  const configPath = path.join(app.getPath("userData"), "config.json");
  if (!fs.existsSync(configPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    throw new Error(`Asetustiedoston lukeminen epäonnistui: ${configPath}`);
  }
}

// ------------------------------------------------------------
// 2. SQLITE DATABASE
// ------------------------------------------------------------

function openDatabase() {
  if (db) return;

  const databasePath = path.join(app.getPath("userData"), "raffleri.sqlite");
  db = new DatabaseSync(databasePath);

  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS videos (
      video_id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('live', 'normal')),
      first_seen_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const existingColumns = db.prepare("PRAGMA table_info(comments)").all();
  const hasCommentsTable = existingColumns.length > 0;
  const hasSourceColumn = existingColumns.some((c) => c.name === "source");

  if (hasCommentsTable && !hasSourceColumn) {
    let legacyTable = "comments_legacy";
    let suffix = 1;
    while (
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
        )
        .get(legacyTable)
    ) {
      legacyTable = `comments_legacy_${suffix++}`;
    }
    db.exec(`ALTER TABLE comments RENAME TO ${legacyTable}`);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      video_id TEXT NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('live', 'normal')),
      comment_id TEXT NOT NULL,
      author_key TEXT NOT NULL,
      author_name TEXT NOT NULL DEFAULT '',
      author_id TEXT NOT NULL DEFAULT '',
      text TEXT NOT NULL DEFAULT '',
      published_at TEXT NOT NULL DEFAULT '',
      received_at TEXT NOT NULL,
      accepted INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (video_id, source, comment_id),
      FOREIGN KEY (video_id) REFERENCES videos(video_id)
    );

    CREATE INDEX IF NOT EXISTS idx_comments_video_published ON comments(video_id, published_at);
    CREATE INDEX IF NOT EXISTS idx_comments_video_accepted ON comments(video_id, accepted);
  `);

  migrateLegacyComments();
}

function migrateLegacyComments() {
  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'comments_legacy%'",
    )
    .all();

  for (const table of tables) {
    const safeName = `"${table.name.replaceAll('"', '""')}"`;
    const rows = db.prepare(`SELECT * FROM ${safeName}`).all();

    for (const row of rows) {
      const oldVideoId = String(row.video_id || "");
      const oldCommentId = String(row.id || row.comment_id || "");
      if (!oldVideoId || !oldCommentId) continue;

      const now = new Date().toISOString();
      const authorName = String(
        row.name || row.author_name || row.author || "Tuntematon",
      );
      const authorKey = String(row.author || row.author_key || authorName);
      const accepted = Number(row.accepted) === 1 ? 1 : 0;

      db.prepare(
        `
        INSERT OR IGNORE INTO videos (video_id, title, status, first_seen_at, updated_at)
        VALUES (?, '', 'live', ?, ?)
      `,
      ).run(oldVideoId, now, now);

      db.prepare(
        `
        INSERT OR IGNORE INTO comments
          (video_id, source, comment_id, author_key, author_name, author_id, text, published_at, received_at, accepted)
        VALUES (?, 'live', ?, ?, ?, '', ?, ?, ?, ?)
      `,
      ).run(
        oldVideoId,
        oldCommentId,
        authorKey,
        authorName,
        String(row.text || ""),
        String(row.published_at || ""),
        String(row.received_at || now),
        accepted,
      );
    }
  }
}

// ------------------------------------------------------------
// 3. YOUTUBE API
// ------------------------------------------------------------

async function youtube(endpoint, params = {}) {
  if (!apiKey) {
    const config = readConfig();
    apiKey = config.youtubeApiKey || "";
  }
  if (!apiKey) {
    throw new Error(
      `YouTube API -avain puuttuu. Lisää se tiedostoon ${configPath()}`,
    );
  }
  const data = await core.youtubeRequest(apiKey, endpoint, params);
  estimatedQuotaUsed += core.QUOTA_COST[endpoint] || 1;
  return data;
}

// ------------------------------------------------------------
// 4. DATABASE HELPERS
// ------------------------------------------------------------

function saveVideo(id, title, status) {
  const now = new Date().toISOString();
  db.prepare(
    `
    INSERT INTO videos (video_id, title, status, first_seen_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(video_id) DO UPDATE SET
      title = excluded.title,
      status = excluded.status,
      updated_at = excluded.updated_at
  `,
  ).run(id, title || "", status, now, now);
}

function getComments(id = videoId) {
  if (!id) return [];
  return db
    .prepare(
      `
      SELECT
        comment_id AS id,
        author_key AS authorKey,
        author_name AS name,
        author_id AS authorId,
        text,
        published_at AS publishedAt,
        received_at AS receivedAt,
        accepted
      FROM comments
      WHERE video_id = ?
      ORDER BY
        CASE WHEN published_at = '' THEN 1 ELSE 0 END,
        published_at ASC,
        received_at ASC
    `,
    )
    .all(id)
    .map((c) => ({ ...c, accepted: Number(c.accepted) === 1 }));
}

function saveComment(source, comment) {
  if (!videoId || !comment) return false;
  const { id, authorId, authorName, text, publishedAt } = comment;

  const commentId = String(id);
  const alreadyExists = db
    .prepare(
      "SELECT 1 FROM comments WHERE video_id = ? AND source = ? AND comment_id = ?",
    )
    .get(videoId, source, commentId);
  if (alreadyExists) return false;

  const safeAuthorName = String(authorName || "Tuntematon");
  const safeAuthorId = String(authorId || "");
  const authorKey = core.authorKeyFor(safeAuthorId, safeAuthorName);

  const acceptedCount = db
    .prepare(
      "SELECT COUNT(*) AS count FROM comments WHERE video_id = ? AND accepted = 1 AND author_key = ?",
    )
    .get(videoId, authorKey).count;

  const accepted = core.isAccepted(acceptedCount) ? 1 : 0;
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT OR IGNORE INTO comments
      (video_id, source, comment_id, author_key, author_name, author_id, text, published_at, received_at, accepted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    videoId,
    source,
    commentId,
    authorKey,
    safeAuthorName,
    safeAuthorId,
    String(text),
    String(publishedAt || ""),
    now,
    accepted,
  );

  return true;
}

function snapshot() {
  return core.buildSnapshot({
    videoId,
    streamTitle,
    streamMode,
    polling,
    comments: getComments(),
  });
}

function publishState() {
  if (win && !win.isDestroyed()) {
    win.webContents.send("state:update", snapshot());
  }
}

function publishError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (win && !win.isDestroyed()) {
    win.webContents.send("state:error", message);
  }
}

function stopCurrentWork() {
  polling = false;
  sessionId++;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

// ------------------------------------------------------------
// 5. LIVE CHAT (30 s väli)
// ------------------------------------------------------------

// Jokainen lataus aloittaa uuden session. Jos käyttäjä lataa videon
// uudelleen kesken haun, vanha haku huomaa session vaihtuneen ja lopettaa,
// jolloin rinnakkaisia hakusilmukoita (= tuplakiintiö) ei synny.
async function pollLiveChat(session = sessionId) {
  pollTimer = null;
  if (session !== sessionId) return;
  if (!polling || streamMode !== "live" || !liveChatId) return;

  try {
    const params = {
      liveChatId,
      part: "snippet,authorDetails",
      maxResults: 2000, // maksimi; sama kiintiöhinta kuin pienemmällä
    };
    if (nextPageToken) params.pageToken = nextPageToken;

    const result = await youtube("liveChat/messages", params);
    if (session !== sessionId) return;

    for (const item of result.items || []) {
      saveComment("live", core.liveItemToComment(item));
    }

    nextPageToken = result.nextPageToken || "";

    // Lähetys päättyi: lopetetaan haku, kommentit jäävät talteen.
    if (result.offlineAt) {
      polling = false;
      publishState();
      publishError("Livelähetys päättyi. Kommenttien haku pysäytettiin.");
      return;
    }

    publishState();

    // Ilmoita rendererille seuraava haku
    if (win && !win.isDestroyed()) {
      win.webContents.send("poll:next", {
        nextPollAt: Date.now() + core.LIVE_POLL_INTERVAL_MS,
        intervalMs: core.LIVE_POLL_INTERVAL_MS,
      });
    }

    console.log(
      `[Live] Seuraava haku ${core.LIVE_POLL_INTERVAL_MS / 1000} s kuluttua | Kiintiöarvio: ~${estimatedQuotaUsed}`,
    );

    if (polling) {
      pollTimer = setTimeout(
        () => pollLiveChat(session),
        core.LIVE_POLL_INTERVAL_MS,
      );
    }
  } catch (error) {
    if (session !== sessionId) return;
    if (core.LIVE_CHAT_ENDED_REASONS.includes(error?.reason)) {
      polling = false;
      publishState();
      publishError("Livelähetyksen chat on päättynyt. Kommenttien haku pysäytettiin.");
      return;
    }
    publishError(error);
    if (polling) {
      pollTimer = setTimeout(
        () => pollLiveChat(session),
        core.LIVE_RETRY_INTERVAL_MS,
      );
    }
  }
}

// ------------------------------------------------------------
// 6. NORMAALI VIDEO
// ------------------------------------------------------------

function saveNormalComment(item) {
  saveComment("normal", core.normalItemToComment(item));
}

async function fetchAllNormalComments(fetchId) {
  const replyParents = new Set();
  let pageToken = "";

  try {
    do {
      if (!polling || fetchId !== sessionId) return;

      const params = {
        part: "snippet,replies",
        videoId,
        maxResults: 100,
        textFormat: "plainText",
      };
      if (pageToken) params.pageToken = pageToken;

      const result = await youtube("commentThreads", params);

      for (const thread of result.items || []) {
        const topLevel = thread.snippet?.topLevelComment;
        if (!topLevel) continue;

        saveNormalComment(topLevel);

        const inlineReplies = thread.replies?.comments || [];
        for (const reply of inlineReplies) {
          saveNormalComment(reply);
        }

        const totalReplies = Number(thread.snippet?.totalReplyCount || 0);
        if (totalReplies > inlineReplies.length) {
          replyParents.add(topLevel.id);
        }
      }

      pageToken = result.nextPageToken || "";
      publishState();
    } while (pageToken);

    for (const parentId of replyParents) {
      let replyPageToken = "";
      do {
        if (!polling || fetchId !== sessionId) return;

        const params = {
          part: "snippet",
          parentId,
          maxResults: 100,
          textFormat: "plainText",
        };
        if (replyPageToken) params.pageToken = replyPageToken;

        const result = await youtube("comments", params);

        for (const reply of result.items || []) {
          saveNormalComment(reply);
        }

        replyPageToken = result.nextPageToken || "";
        publishState();
      } while (replyPageToken);
    }

    if (fetchId === sessionId) {
      polling = false;
      publishState();
    }
  } catch (error) {
    if (fetchId === sessionId) {
      polling = false;
      publishState();
      publishError(error);
    }
  }
}

// ------------------------------------------------------------
// 7. IPC HANDLERS
// ------------------------------------------------------------

ipcMain.handle("config:get", async () => {
  const config = readConfig();
  apiKey = config.youtubeApiKey || "";
  return { configured: Boolean(apiKey), configPath: configPath() };
});

ipcMain.handle("stream:load", async (_event, input) => {
  stopCurrentWork();
  estimatedQuotaUsed = 0;

  const config = readConfig();
  apiKey = config.youtubeApiKey || "";
  if (!apiKey) {
    throw new Error(
      `YouTube API -avain puuttuu. Lisää se tiedostoon ${configPath()}`,
    );
  }

  const parsedId = core.parseVideoId(input);
  if (!parsedId)
    throw new Error("YouTube-videon URL-osoitetta ei tunnistettu.");

  const videoResult = await youtube("videos", {
    part: "snippet,liveStreamingDetails",
    id: parsedId,
  });

  const video = videoResult.items?.[0];
  if (!video) throw new Error("Videota ei löytynyt.");

  videoId = video.id;
  streamTitle = video.snippet?.title || "Nimetön video";
  liveChatId = video.liveStreamingDetails?.activeLiveChatId || "";

  streamMode = liveChatId ? "live" : "normal";
  saveVideo(videoId, streamTitle, streamMode);

  nextPageToken = "";
  polling = true;
  publishState();

  if (streamMode === "live") {
    if (!liveChatId) {
      polling = false;
      publishState();
      throw new Error(
        "Live-lähetys tunnistettu, mutta aktiivista chatia ei saatu.",
      );
    }
    // Ilmoita heti ensimmäinen laskuri
    if (win && !win.isDestroyed()) {
      win.webContents.send("poll:next", {
        nextPollAt: Date.now() + 1000, // ensimmäinen haku melkein heti
        intervalMs: core.LIVE_POLL_INTERVAL_MS,
      });
    }
    pollLiveChat();
  } else {
    fetchAllNormalComments(sessionId);
  }

  return snapshot();
});

ipcMain.handle("stream:stop", async () => {
  stopCurrentWork();
  publishState();
  return snapshot();
});

ipcMain.handle("stream:state", async () => snapshot());

// ------------------------------------------------------------
// 8. WINDOW
// ------------------------------------------------------------

function createWindow() {
  win = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: "#0b1020",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // `npm run dev` käynnistää Electronin --dev-lipulla, jolloin käyttöliittymä
  // ladataan Viten dev-palvelimelta (muutokset näkyvät heti).
  const devServerUrl =
    process.env.VITE_DEV_SERVER_URL ||
    (process.argv.includes("--dev") ? "http://127.0.0.1:5173" : "");

  if (devServerUrl) {
    win.loadURL(devServerUrl);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(async () => {
  core = await corePromise;
  openDatabase();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  stopCurrentWork();
  if (db) {
    db.close();
    db = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
