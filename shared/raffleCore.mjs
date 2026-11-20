/**
 * raffleCore – yhteinen arvontalogiikka
 * -------------------------------------
 * Arvonnan säännöt ja YouTube-rajapinnan apufunktiot. Käytetään
 * kommenttien haussa (src/web/webRaffleAPI.js) ja tallennuksessa
 * (src/web/db.js).
 *
 * Kiintiö (oletus 10 000 yksikköä / päivä):
 * - liveChat/messages = 5 yksikköä / kutsu
 * - 30 s väli ≈ 120 kutsua / tunti ≈ 600 yksikköä / tunti
 */

/** Montako kommenttia per henkilö osallistuu arvontaan (= arpaa). */
export const MAX_ACCEPTED_PER_AUTHOR = 5;
export const LIVE_POLL_INTERVAL_MS = 30000;
export const LIVE_RETRY_INTERVAL_MS = 45000;
/** Montako kanavan uusinta videota tarkistetaan, kun livea etsitään
 *  (sama kiintiöhinta 1–50 videolla). */
export const CHANNEL_RECENT_VIDEOS = 15;

export const QUOTA_COST = {
  videos: 1,
  channels: 1,
  playlistItems: 1,
  "liveChat/messages": 5,
  commentThreads: 1,
  comments: 1,
};

/** YouTuben virhesyyt, joiden jälkeen live chatia ei kannata enää hakea. */
export const LIVE_CHAT_ENDED_REASONS = [
  "liveChatEnded",
  "liveChatNotFound",
  "liveChatDisabled",
];

/**
 * Tunnistaa kanavan: "@kahva", kanavan URL (myös .../@kahva/live)
 * tai kanava-ID (UC…). Palauttaa { handle } tai { id }, muuten null.
 */
export function parseChannelInput(input) {
  const value = String(input || "").trim();
  if (!value) return null;

  if (/^@[\w.-]{3,100}$/.test(value)) return { handle: value };
  if (/^UC[\w-]{22}$/.test(value)) return { id: value };

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    if (!["youtube.com", "m.youtube.com"].includes(host)) return null;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0]?.startsWith("@") && parts[0].length > 1)
      return { handle: decodeURIComponent(parts[0]) };
    if (parts[0] === "channel" && /^UC[\w-]{22}$/.test(parts[1] || ""))
      return { id: parts[1] };
  } catch {
    // Ei URL
  }
  return null;
}

/** Palauttaa videoista sen, jonka livelähetys on parhaillaan käynnissä. */
export function pickLiveVideo(videos) {
  return (
    (videos || []).find((v) => {
      const live = v?.liveStreamingDetails;
      return (
        live?.actualStartTime && !live.actualEndTime && live.activeLiveChatId
      );
    }) || null
  );
}

/** Palauttaa seuraavan ajastetun (ei vielä alkaneen) livelähetyksen. */
export function pickUpcomingVideo(videos) {
  const upcoming = (videos || [])
    .filter(
      (v) =>
        v?.snippet?.liveBroadcastContent === "upcoming" &&
        v.liveStreamingDetails?.scheduledStartTime &&
        !v.liveStreamingDetails.actualStartTime,
    )
    .sort((a, b) =>
      a.liveStreamingDetails.scheduledStartTime <
      b.liveStreamingDetails.scheduledStartTime
        ? -1
        : 1,
    );
  return upcoming[0] || null;
}

/** Poimii YouTube-videon ID:n URL:sta tai palauttaa ID:n sellaisenaan. */
export function parseVideoId(input) {
  const value = String(input || "").trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be")
      return url.pathname.split("/").filter(Boolean)[0] || "";

    if (["youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
      const queryId = url.searchParams.get("v");
      if (queryId) return queryId;

      const parts = url.pathname.split("/").filter(Boolean);
      if (["live", "shorts", "embed", "v"].includes(parts[0]))
        return parts[1] || "";
    }
  } catch {
    // Ei URL
  }
  return "";
}

/** Kutsuu YouTube Data API v3:a. Heittää virheen suomeksi. */
export async function youtubeRequest(apiKey, endpoint, params = {}) {
  if (!apiKey) {
    throw new Error("YouTube API -avain puuttuu.");
  }

  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  for (const [key, value] of Object.entries({ ...params, key: apiKey })) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error("Yhteys YouTubeen epäonnistui. Tarkista verkkoyhteys.");
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    // tyhjä tai ei-JSON vastaus
  }

  if (!response.ok) {
    const reason = data?.error?.errors?.[0]?.reason;
    const message =
      data?.error?.message || `YouTube API -virhe ${response.status}`;
    const error = new Error(reason ? `${message} (${reason})` : message);
    error.reason = reason || "";
    error.status = response.status;
    throw error;
  }
  return data;
}

/** Live chat -viesti → kommentti, tai null jos tekstiä ei ole. */
export function liveItemToComment(item) {
  const snippet = item?.snippet || {};
  const author = item?.authorDetails || {};

  const text =
    snippet.textMessageDetails?.messageText ||
    snippet.superChatDetails?.userComment ||
    snippet.membershipGiftingDetails?.gifterChannelName ||
    "";

  if (!item?.id || !text.trim()) return null;

  return {
    id: String(item.id),
    authorId: author.channelId || "",
    authorName: author.displayName || "Tuntematon",
    text,
    publishedAt: snippet.publishedAt || "",
  };
}

/** Tavallisen videon kommentti → kommentti, tai null jos tekstiä ei ole. */
export function normalItemToComment(item) {
  const snippet = item?.snippet || {};
  const text = snippet.textDisplay || snippet.textOriginal || "";

  if (!item?.id || !String(text).trim()) return null;

  return {
    id: String(item.id),
    authorId: snippet.authorChannelId?.value || "",
    authorName: snippet.authorDisplayName || "Tuntematon",
    text,
    publishedAt: snippet.publishedAt || "",
  };
}

/** Sama kirjoittaja tunnistetaan kanava-ID:llä, muuten nimellä. */
export function authorKeyFor(authorId, authorName) {
  const id = String(authorId || "");
  return id || String(authorName || "Tuntematon").toLocaleLowerCase("fi-FI");
}

/** Hyväksytäänkö uusi kommentti, kun kirjoittajalla on jo n hyväksyttyä. */
export function isAccepted(acceptedCountForAuthor) {
  return acceptedCountForAuthor < MAX_ACCEPTED_PER_AUTHOR;
}

/** Järjestää kommentit julkaisuajan mukaan (tyhjä aika viimeiseksi). */
export function sortComments(comments) {
  return [...comments].sort((a, b) => {
    const aEmpty = a.publishedAt ? 0 : 1;
    const bEmpty = b.publishedAt ? 0 : 1;
    if (aEmpty !== bEmpty) return aEmpty - bEmpty;
    if (a.publishedAt !== b.publishedAt)
      return a.publishedAt < b.publishedAt ? -1 : 1;
    if (a.receivedAt !== b.receivedAt)
      return a.receivedAt < b.receivedAt ? -1 : 1;
    return 0;
  });
}

/** Käyttöliittymälle lähetettävä tila. */
export function buildSnapshot({
  videoId,
  streamTitle,
  streamMode,
  polling,
  comments,
  channel = null,
  upcoming = null,
}) {
  const acceptedComments = comments.filter((c) => c.accepted);
  const acceptedAuthors = new Set(acceptedComments.map((c) => c.authorKey));

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
    channel,
    upcoming,
  };
}
