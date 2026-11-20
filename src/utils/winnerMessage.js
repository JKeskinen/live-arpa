/**
 * Voittajaviestit
 * ---------------
 * winnerChatMessage: yksi rivi chattiin (YouTube / Twitch).
 *   YouTuben ja Twitchin viestikenttä on yksirivinen: liitetyn tekstin
 *   rivinvaihdot poistetaan ilman välilyöntiä, joten viestissä ei saa olla
 *   rivinvaihtoja. YouTuben livechatin enimmäispituus on 200 merkkiä.
 * winnersListMessage: monirivinen lista muistiinpanoihin / sähköpostiin.
 *
 * Voittajan ohje (contactInfo) tulee teemasta (src/themes.js) ja on
 * muokattavissa asetuksista.
 */

export const CHAT_MAX_LENGTH = 200; // YouTube livechat (Twitch: 500)
/** Ohjeen enimmäispituus, jotta viestiin jää tilaa nimelle. */
export const CONTACT_INFO_MAX_LENGTH = 140;

function oneLine(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

/** Yksirivinen onnitteluviesti chattiin, aina enintään 200 merkkiä. */
export function winnerChatMessage(name, contactInfo) {
  // YouTube antaa nimen usein valmiiksi @-kahvana ("@kiekkokari"):
  // poistetaan alusta, ettei viestiin tule "@@".
  const cleanName = oneLine(name).replace(/^@+/, "") || "voittaja";
  const info = oneLine(contactInfo);
  const build = (n) => `🎉 Onnittelut voitosta @${n}!${info ? ` ${info}` : ""}`;

  // Pituus lasketaan UTF-16-yksikköinä (emoji = 2), jotta raja pitää
  // riippumatta siitä, miten palvelu merkit laskee.
  let message = build(cleanName);
  if (message.length <= CHAT_MAX_LENGTH) return message;

  // Liian pitkä: lyhennetään ensin nimeä (vähintään 12 merkkiä jää),
  // sitten tarvittaessa ohjetta.
  const chars = [...cleanName];
  const overflow = message.length - CHAT_MAX_LENGTH + 1; // +1 = "…"
  const keep = Math.max(12, chars.length - overflow);
  const shortName = keep < chars.length ? chars.slice(0, keep).join("") + "…" : cleanName;
  message = build(shortName);
  if (message.length <= CHAT_MAX_LENGTH) return message;

  // Ohje itsessään liian pitkä: katkaistaan koko viesti merkkirajaan.
  const parts = [...message];
  while (parts.join("").length > CHAT_MAX_LENGTH - 1) parts.pop();
  return parts.join("") + "…";
}

/** Monirivinen voittajalista (Kopioi kaikki). */
export function winnersListMessage(winners, platformName, contactInfo) {
  const list = winners
    .map((w, i) => `${i + 1}. ${w.name} (${platformName(w)}): ${w.text}`)
    .join("\n");
  const info = oneLine(contactInfo);
  return `ONNITTELUT VOITTAJILLE!\n${list}${info ? `\n\n${info}` : ""}`;
}
