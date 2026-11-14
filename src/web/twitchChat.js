/**
 * twitchChat – Twitch-chatin lukeminen selaimessa
 * -----------------------------------------------
 * Twitchin chat luetaan virallisen IRC-WebSocket-rajapinnan kautta
 * anonyymisti (justinfan-käyttäjä): ei kirjautumista, ei API-avainta,
 * ei kiintiötä. Viestit tulevat reaaliajassa.
 *
 * Rajoitus: Twitch ei anna vanhoja viestejä. Vain yhteyden ollessa auki
 * kirjoitetut viestit saadaan talteen.
 */

const TWITCH_IRC_URL = "wss://irc-ws.chat.twitch.tv:443";
const RECONNECT_DELAYS_MS = [1000, 3000, 5000, 10000, 20000, 30000];

/** "kanava", "#kanava", "twitch.tv/kanava" tai koko URL → "kanava". */
export function parseTwitchChannel(input) {
  let value = String(input || "").trim();
  if (!value) return "";

  if (/twitch\.tv/i.test(value)) {
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      const host = url.hostname.replace(/^(www|m)\./, "");
      if (host !== "twitch.tv") return "";
      value = url.pathname.split("/").filter(Boolean)[0] || "";
    } catch {
      return "";
    }
  }

  value = value.replace(/^#/, "").toLowerCase();
  return /^[a-z0-9_]{2,25}$/.test(value) ? value : "";
}

function unescapeTag(value) {
  return value.replace(/\\(.)/g, (_, c) =>
    c === "s" ? " " : c === ":" ? ";" : c === "r" ? "\r" : c === "n" ? "\n" : c,
  );
}

/** Jäsentää yhden IRC-rivin: { tags, prefix, command, params } */
export function parseIrcLine(line) {
  let rest = line;
  const tags = {};

  if (rest.startsWith("@")) {
    const end = rest.indexOf(" ");
    for (const pair of rest.slice(1, end).split(";")) {
      const eq = pair.indexOf("=");
      if (eq === -1) tags[pair] = "";
      else tags[pair.slice(0, eq)] = unescapeTag(pair.slice(eq + 1));
    }
    rest = rest.slice(end + 1);
  }

  let prefix = "";
  if (rest.startsWith(":")) {
    const end = rest.indexOf(" ");
    prefix = rest.slice(1, end);
    rest = rest.slice(end + 1);
  }

  const trailingAt = rest.indexOf(" :");
  const trailing = trailingAt === -1 ? null : rest.slice(trailingAt + 2);
  const head = trailingAt === -1 ? rest : rest.slice(0, trailingAt);
  const params = head.split(" ").filter(Boolean);
  const command = params.shift() || "";
  if (trailing !== null) params.push(trailing);

  return { tags, prefix, command, params };
}

/** PRIVMSG → kommentti samassa muodossa kuin YouTube-kommentit. */
export function privmsgToComment(message) {
  const { tags, prefix, params } = message;
  let text = params[1] || "";

  // /me-viestit: "\u0001ACTION teksti\u0001"
  const action = /^\u0001ACTION (.*)\u0001$/.exec(text);
  if (action) text = action[1];
  if (!text.trim()) return null;

  const login = prefix.split("!")[0] || "";
  const userId = tags["user-id"] || "";
  const sentAt = Number(tags["tmi-sent-ts"]);

  return {
    id: tags.id || `${login}-${tags["tmi-sent-ts"] || Date.now()}`,
    authorId: userId ? `twitch:${userId}` : "",
    authorName: tags["display-name"] || login || "Tuntematon",
    text,
    publishedAt: Number.isFinite(sentAt) ? new Date(sentAt).toISOString() : "",
    isBroadcaster: /(^|,)broadcaster\//.test(tags.badges || ""),
  };
}

/**
 * Avaa yhteyden ja pitää sen auki (automaattinen uudelleenyhdistys).
 * @returns {{ stop: () => void }}
 */
export function connectTwitchChat(channel, { onMessage, onStatus }) {
  let socket = null;
  let stopped = false;
  let attempt = 0;
  let reconnectTimer = null;

  function setStatus(status, detail = "") {
    onStatus?.(status, detail);
  }

  function scheduleReconnect() {
    if (stopped) return;
    const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
    attempt++;
    setStatus("reconnecting");
    reconnectTimer = setTimeout(open, delay);
  }

  function open() {
    if (stopped) return;
    setStatus(attempt === 0 ? "connecting" : "reconnecting");

    try {
      socket = new WebSocket(TWITCH_IRC_URL);
    } catch {
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      const nick = `justinfan${Math.floor(10000 + Math.random() * 80000)}`;
      socket.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
      socket.send("PASS SCHMOOPIIE");
      socket.send(`NICK ${nick}`);
      socket.send(`JOIN #${channel}`);
    };

    socket.onmessage = (event) => {
      for (const line of String(event.data).split("\r\n")) {
        if (!line) continue;
        if (line.startsWith("PING")) {
          socket.send(line.replace("PING", "PONG"));
          continue;
        }
        const message = parseIrcLine(line);
        switch (message.command) {
          case "PRIVMSG": {
            const comment = privmsgToComment(message);
            if (comment) onMessage(comment);
            break;
          }
          case "ROOMSTATE":
          case "366": // JOIN valmis
            attempt = 0;
            setStatus("connected");
            break;
          case "NOTICE":
            if (/suspended|banned|does not exist/i.test(message.params[1] || "")) {
              setStatus("error", message.params[1]);
            }
            break;
          case "RECONNECT":
            socket.close();
            break;
          default:
            break;
        }
      }
    };

    socket.onclose = () => {
      socket = null;
      scheduleReconnect();
    };
    socket.onerror = () => {
      // onclose hoitaa uudelleenyhdistyksen
    };
  }

  open();

  return {
    stop() {
      stopped = true;
      clearTimeout(reconnectTimer);
      if (socket) {
        socket.onclose = null;
        socket.close();
        socket = null;
      }
      setStatus("");
    },
  };
}
