const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");

let win;
let db;

let polling = false;
let pollTimer = null;
let nextPageToken = "";
let liveChatId = "";
let videoId = "";
let apiKey = "";
let streamTitle = "";
let streamMode = "normal";
let normalFetchId = 0;

const MAX_ACCEPTED_PER_AUTHOR = 3;

// ------------------------------------------------------------
// 1. CONFIGURATION
// ------------------------------------------------------------

function readConfig() {
  const configPath = path.join(app.getPath("userData"), "config.json");

  if (!fs.existsSync(configPath)) {
    return {};
  }

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

  const databasePath = path.join(app.getPath("userData"), "live-arpa.sqlite");
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

  // Migrate the earlier comments table, if one exists.
  const existingColumns = db.prepare("PRAGMA table_info(comments)").all();
  const hasCommentsTable = existingColumns.length > 0;
  const hasSourceColumn = existingColumns.some(
    (column) => column.name === "source",
  );

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

    CREATE INDEX IF NOT EXISTS idx_comments_video_published
      ON comments(video_id, published_at);

    CREATE INDEX IF NOT EXISTS idx_comments_video_accepted
      ON comments(video_id, accepted);
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
    const tableName = table.name;

    // The name originates from sqlite_master, but quote it for SQL safety.
    const safeName = `"${tableName.replaceAll('"', '""')}"`;
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
        INSERT OR IGNORE INTO videos
          (video_id, title, status, first_seen_at, updated_at)
        VALUES (?, '', 'live', ?, ?)
      `,
      ).run(oldVideoId, now, now);

      db.prepare(
        `
        INSERT OR IGNORE INTO comments
          (video_id, source, comment_id, author_key, author_name,
           author_id, text, published_at, received_at, accepted)
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

function parseVideoId(input) {
  const value = String(input || "").trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) {
    return value;
  }

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com"
    ) {
      const queryId = url.searchParams.get("v");
      if (queryId) return queryId;

      const parts = url.pathname.split("/").filter(Boolean);

      if (["live", "shorts", "embed", "v"].includes(parts[0])) {
        return parts[1] || "";
      }
    }
  } catch {
    // A non-URL input is handled by the ID check above.
  }

  return "";
}

async function youtube(endpoint, params = {}) {
  if (!apiKey) {
    const config = readConfig();
    apiKey = config.youtubeApiKey || "";
  }

  if (!apiKey) {
    throw new Error(
      "YouTube API -avain puuttuu. Tarkista config.json sovelluksen käyttäjädatakansiosta.",
    );
  }

  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);

  for (const [key, value] of Object.entries({
    ...params,
    key: apiKey,
  })) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    const reason = data?.error?.errors?.[0]?.reason;
    const message =
      data?.error?.message || `YouTube API -virhe ${response.status}`;

    throw new Error(reason ? `${message} (${reason})` : message);
  }

  return data;
}

// ------------------------------------------------------------
// 4. VIDEO AND COMMENT DATABASE HELPERS
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
    .map((comment) => ({
      ...comment,
      accepted: Number(comment.accepted) === 1,
    }));
}

function saveComment({
  source,
  id,
  authorId = "",
  authorName = "Tuntematon",
  text = "",
  publishedAt = "",
}) {
  if (!videoId || !id || !String(text).trim()) {
    return false;
  }

  const commentId = String(id);

  const alreadyExists = db
    .prepare(
      `
    SELECT 1
    FROM comments
    WHERE video_id = ? AND source = ? AND comment_id = ?
  `,
    )
    .get(videoId, source, commentId);

  if (alreadyExists) return false;

  const safeAuthorName = String(authorName || "Tuntematon");
  const safeAuthorId = String(authorId || "");
  const authorKey = safeAuthorId || safeAuthorName.toLocaleLowerCase("fi-FI");

  const acceptedCount = db
    .prepare(
      `
    SELECT COUNT(*) AS count
    FROM comments
    WHERE video_id = ? AND accepted = 1 AND author_key = ?
  `,
    )
    .get(videoId, authorKey).count;

  const accepted = acceptedCount < MAX_ACCEPTED_PER_AUTHOR ? 1 : 0;
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT OR IGNORE INTO comments
      (video_id, source, comment_id, author_key, author_name,
       author_id, text, published_at, received_at, accepted)
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
  const comments = getComments();
  const acceptedComments = comments.filter((comment) => comment.accepted);
  const acceptedAuthors = new Set(
    acceptedComments.map((comment) => comment.authorKey),
  );

  return {
    videoId,
    streamTitle,
    streamMode,
    status: streamMode,
    comments,
    totalComments: comments.length,
    uniqueCommenters: acceptedAuthors.size,
    acceptedEntries: acceptedComments.length,
    updatedAt: new Date().toISOString(),
    polling,
  };
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
  normalFetchId++;

  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

// ------------------------------------------------------------
// 5. LIVE CHAT COLLECTION
// ------------------------------------------------------------

async function pollLiveChat() {
  if (!polling || streamMode !== "live" || !liveChatId) return;

  try {
    const params = {
      liveChatId,
      part: "snippet,authorDetails",
      maxResults: 200,
    };

    if (nextPageToken) {
      params.pageToken = nextPageToken;
    }

    const result = await youtube("liveChat/messages", params);

    for (const item of result.items || []) {
      const snippet = item.snippet || {};
      const author = item.authorDetails || {};

      const messageText =
        snippet.textMessageDetails?.messageText ||
        snippet.superChatDetails?.userComment ||
        snippet.membershipGiftingDetails?.gifterChannelName ||
        "";

      if (!messageText.trim()) continue;

      saveComment({
        source: "live",
        id: item.id,
        authorId: author.channelId || "",
        authorName: author.displayName || "Tuntematon",
        text: messageText,
        publishedAt: snippet.publishedAt || "",
      });
    }

    nextPageToken = result.nextPageToken || "";
    publishState();

    const delay = Math.max(1000, Number(result.pollingIntervalMillis || 5000));

    if (polling) {
      pollTimer = setTimeout(pollLiveChat, delay);
    }
  } catch (error) {
    publishError(error);

    if (polling) {
      pollTimer = setTimeout(pollLiveChat, 15000);
    }
  }
}

// ------------------------------------------------------------
// 6. NORMAL VIDEO COMMENT COLLECTION
// ------------------------------------------------------------

function saveNormalComment(item) {
  const snippet = item.snippet || {};

  saveComment({
    source: "normal",
    id: item.id,
    authorId: snippet.authorChannelId?.value || "",
    authorName: snippet.authorDisplayName || "Tuntematon",
    text: snippet.textDisplay || snippet.textOriginal || "",
    publishedAt: snippet.publishedAt || "",
  });
}

async function fetchAllNormalComments(fetchId) {
  const replyParents = new Set();
  let pageToken = "";
  let fetchedThreads = 0;
  let expectedReplies = 0;
  let fetchedReplies = 0;

  try {
    // Fetch every page of top-level comments.
    do {
      if (!polling || fetchId !== normalFetchId) return;

      const params = {
        part: "snippet,replies",
        videoId,
        maxResults: 100,
        textFormat: "plainText",
      };

      if (pageToken) params.pageToken = pageToken;

      const result = await youtube("commentThreads", params);

      for (const thread of result.items || []) {
        fetchedThreads++;

        expectedReplies += Number(thread.snippet?.totalReplyCount || 0);

        const topLevel = thread.snippet?.topLevelComment;

        if (topLevel) {
          saveNormalComment(topLevel);

          const replyCount = Number(thread.snippet?.totalReplyCount || 0);
          if (replyCount > 0) replyParents.add(topLevel.id);

          for (const reply of thread.replies?.comments || []) {
            saveNormalComment(reply);
          }
        }
      }

      pageToken = result.nextPageToken || "";
      publishState();
    } while (pageToken);

    // Fetch replies for each top-level comment. The inline replies above
    // are safe to process again because comment IDs are unique in SQLite.
    for (const parentId of replyParents) {
      let replyPageToken = "";

      do {
        if (!polling || fetchId !== normalFetchId) return;

        const params = {
          part: "snippet",
          parentId,
          maxResults: 100,
          textFormat: "plainText",
        };

        if (replyPageToken) params.pageToken = replyPageToken;

        const result = await youtube("comments", params);

        for (const reply of result.items || []) {
          fetchedReplies++;
          saveNormalComment(reply);
        }

        replyPageToken = result.nextPageToken || "";
        publishState();
      } while (replyPageToken);
    }
    console.log("=== YOUTUBE-KOMMENTTIEN TARKISTUS ===");
    console.log("Pääkommenttiketjuja:", fetchedThreads);
    console.log("YouTuben ilmoittamat vastaukset:", expectedReplies);
    console.log("API:sta haetut vastaukset:", fetchedReplies);
    console.log("Tietokantaan tallennetut kommentit:", getComments().length);
    console.log("====================================");

    if (fetchId === normalFetchId) {
      polling = false;
      publishState();
    }
  } catch (error) {
    if (fetchId === normalFetchId) {
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

  return {
    configured: Boolean(apiKey),
  };
});

ipcMain.handle("stream:load", async (_event, input) => {
  stopCurrentWork();

  const config = readConfig();
  apiKey = config.youtubeApiKey || "";

  if (!apiKey) {
    throw new Error(
      "YouTube API -avain puuttuu. Tarkista config.json sovelluksen käyttäjädatakansiosta.",
    );
  }

  const parsedId = parseVideoId(input);

  if (!parsedId) {
    throw new Error("YouTube-videon URL-osoitetta ei tunnistettu.");
  }

  const videoResult = await youtube("videos", {
    part: "snippet,liveStreamingDetails",
    id: parsedId,
  });

  const video = videoResult.items?.[0];

  if (!video) {
    throw new Error(
      "Videota ei löytynyt. Tarkista URL-osoite ja videon saatavuus.",
    );
  }

  videoId = video.id;
  streamTitle = video.snippet?.title || "Nimetön video";

  liveChatId = video.liveStreamingDetails?.activeLiveChatId || "";

  // An active chat ID is the strongest indication of an active live chat.
  // The broadcastContent value also identifies a live broadcast when chat
  // is disabled or unavailable.
  const broadcastState = video.snippet?.liveBroadcastContent || "none";

  streamMode =
    liveChatId && broadcastState === "live"
      ? "live"
      : liveChatId
        ? "live"
        : "normal";

  saveVideo(videoId, streamTitle, streamMode);

  nextPageToken = "";
  polling = true;
  publishState();

  if (streamMode === "live") {
    if (!liveChatId) {
      polling = false;
      publishState();
      throw new Error(
        "Video tunnistettiin live-lähetykseksi, mutta aktiivista live-chatia ei saatu. Chat voi olla pois käytöstä tai lähetys ei ole vielä alkanut.",
      );
    }

    pollLiveChat();
  } else {
    const fetchId = normalFetchId;
    fetchAllNormalComments(fetchId);
    let fetchedThreads = 0;
    let expectedReplies = 0;
    let fetchedReplies = 0;
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
// 8. ELECTRON WINDOW
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

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  openDatabase();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
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
  if (process.platform !== "darwin") {
    app.quit();
  }
});
