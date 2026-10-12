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

let comments = [];
let acceptedByAuthor = new Map();

function getDb() {
  if (db) return db;

  const file = path.join(app.getPath("userData"), "comments.sqlite");
  db = new DatabaseSync(file);

  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      video_id TEXT NOT NULL,
      author TEXT NOT NULL,
      name TEXT NOT NULL,
      text TEXT NOT NULL,
      published_at TEXT NOT NULL,
      received_at TEXT NOT NULL,
      accepted INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_comments_video
      ON comments(video_id);

    CREATE INDEX IF NOT EXISTS idx_comments_author
      ON comments(video_id, author);
  `);

  return db;
}

function readConfig() {
  const file = path.join(app.getPath("userData"), "config.json");

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({ youtubeApiKey: "" }, null, 2));
  }

  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function parseVideoId(input) {
  try {
    const u = new URL(input);

    if (u.hostname.includes("youtu.be")) {
      return u.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (u.searchParams.get("v")) {
      return u.searchParams.get("v");
    }

    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => ["live", "shorts", "embed"].includes(p));

    return idx >= 0 ? parts[idx + 1] || "" : "";
  } catch {
    return "";
  }
}

async function youtube(endpoint, params = {}) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);

  Object.entries({ ...params, key: apiKey }).forEach(([k, v]) =>
    url.searchParams.set(k, String(v)),
  );

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message || `YouTube API -virhe (${response.status})`,
    );
  }

  return data;
}

function loadSavedComments(id) {
  const database = getDb();

  const rows = database
    .prepare(
      `
      SELECT id, author, name, text, published_at, accepted
      FROM comments
      WHERE video_id = ?
      ORDER BY published_at ASC, rowid ASC
    `,
    )
    .all(id);

  comments = rows.map((row) => ({
    id: row.id,
    author: row.author,
    name: row.name,
    text: row.text,
    publishedAt: row.published_at,
    accepted: Boolean(row.accepted),
  }));

  acceptedByAuthor = new Map();

  for (const comment of comments) {
    if (!comment.accepted) continue;

    const existing = acceptedByAuthor.get(comment.author) || [];
    existing.push(comment);
    acceptedByAuthor.set(comment.author, existing);
  }
}

function snapshot() {
  const acceptedComments = comments.filter((comment) => comment.accepted);

  return {
    videoId,
    streamTitle,
    comments,
    totalComments: acceptedComments.length,
    uniqueCommenters: acceptedByAuthor.size,
    acceptedEntries: acceptedComments.length,
    updatedAt: new Date().toISOString(),
    polling,
  };
}

function publish() {
  if (win && !win.isDestroyed()) {
    win.webContents.send("state:update", snapshot());
  }
}

async function pollOnce() {
  if (!polling || !liveChatId) return;

  try {
    const params = {
      liveChatId,
      part: "snippet,authorDetails",
      maxResults: 200,
    };

    if (nextPageToken) {
      params.pageToken = nextPageToken;
    }

    const data = await youtube("liveChat/messages", params);
    nextPageToken = data.nextPageToken || nextPageToken;

    const database = getDb();

    const findComment = database.prepare("SELECT 1 FROM comments WHERE id = ?");

    const countAccepted = database.prepare(`
      SELECT COUNT(*) AS total
      FROM comments
      WHERE video_id = ? AND author = ? AND accepted = 1
    `);

    const insertComment = database.prepare(`
      INSERT OR IGNORE INTO comments (
        id,
        video_id,
        author,
        name,
        text,
        published_at,
        received_at,
        accepted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of data.items || []) {
      if (!item.id || findComment.get(item.id)) {
        continue;
      }

      const author =
        item.authorDetails?.channelId ||
        item.authorDetails?.displayName ||
        "Tuntematon";

      const name = item.authorDetails?.displayName || "Tuntematon";

      const text = item.snippet?.displayMessage || "";
      const publishedAt = item.snippet?.publishedAt || new Date().toISOString();

      const acceptedCount = countAccepted.get(videoId, author)?.total || 0;

      const accepted = acceptedCount < 3 ? 1 : 0;

      insertComment.run(
        item.id,
        videoId,
        author,
        name,
        text,
        publishedAt,
        new Date().toISOString(),
        accepted,
      );
    }

    // Ladataan koko kyseisen videon kommenttilista tietokannasta.
    loadSavedComments(videoId);
    publish();

    const delay = Math.max(Number(data.pollingIntervalMillis) || 10000, 5000);

    clearTimeout(pollTimer);
    pollTimer = setTimeout(pollOnce, delay);
  } catch (err) {
    if (win && !win.isDestroyed()) {
      win.webContents.send("state:error", err.message);
    }

    clearTimeout(pollTimer);
    pollTimer = setTimeout(pollOnce, 10000);
  }
}

ipcMain.handle("config:get", () => {
  const config = readConfig();
  apiKey = config.youtubeApiKey || "";

  return { configured: Boolean(apiKey) };
});

ipcMain.handle("stream:load", async (_event, input) => {
  const config = readConfig();
  apiKey = config.youtubeApiKey || "";

  if (!apiKey) {
    throw new Error(
      `YouTube API -avain puuttuu. Lisää se asetustiedostoon: ${path.join(app.getPath("userData"), "config.json")}`,
    );
  }

  const id = parseVideoId(input);

  if (!id) {
    throw new Error("URL-osoitteesta ei löytynyt YouTube-videon tunnistetta.");
  }

  polling = false;
  clearTimeout(pollTimer);

  liveChatId = "";
  nextPageToken = "";
  videoId = id;
  streamTitle = "";

  const video = await youtube("videos", {
    part: "snippet,liveStreamingDetails",
    id,
  });

  const item = video.items?.[0];

  if (!item) {
    throw new Error("Videota ei löytynyt tai se ei ole käytettävissä.");
  }

  streamTitle = item.snippet?.title || "Nimetön lähetys";
  liveChatId = item.liveStreamingDetails?.activeLiveChatId || "";

  // Palautetaan tallennetut kommentit myös silloin,
  // kun sama video avataan uudelleen.
  loadSavedComments(videoId);
  publish();

  if (!liveChatId) {
    throw new Error(
      "Videolla ei ole aktiivista live-chatia. Tarkista, että lähetys on käynnissä ja chat käytössä. Aiemmin tallennetut kommentit säilyvät tietokannassa.",
    );
  }

  polling = true;
  publish();
  pollOnce();

  return snapshot();
});

ipcMain.handle("stream:stop", () => {
  polling = false;
  clearTimeout(pollTimer);
  publish();

  return snapshot();
});

ipcMain.handle("stream:state", () => snapshot());

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1100,
    minHeight: 760,
    backgroundColor: "#090b14",
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
  getDb();
  console.log("Asetustiedoston kansio:", app.getPath("userData"));
  console.log(
    "Kommenttitietokanta:",
    path.join(app.getPath("userData"), "comments.sqlite"),
  );
  createWindow();
});

app.on("window-all-closed", () => {
  polling = false;
  clearTimeout(pollTimer);

  if (db) {
    db.close();
    db = null;
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});
