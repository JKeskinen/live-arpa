/**
 * demoSource – Simuloitu livelähetys testaukseen
 * ----------------------------------------------
 * Tuottaa kommentteja kuin YouTube- ja Twitch-chateista tulisi. Ei verkkoa,
 * ei API-avainta. Käytetään demotilassa (asetukset tai osoite ?demo).
 *
 * Testattavat tilanteet:
 * - Kommentteja molemmista palveluista (palvelulogot)
 * - "Innokas Ilkka" kirjoittaa paljon → max 3 -sääntö
 * - Tasainen virta uusia kommentteja koko ajan
 */

const USERS = [
  // [nimi, palvelu]
  ["Kiekko-Kari", "youtube"],
  ["Puttimestari", "youtube"],
  ["Väyläveikko", "youtube"],
  ["DiscGolf Diana", "youtube"],
  ["Teepaikka Tiina", "youtube"],
  ["Ankkuri-Antti", "youtube"],
  ["Mando Maija", "youtube"],
  ["Hyzer Hanna", "youtube"],
  ["Innokas Ilkka", "youtube"],
  ["kiekkokingi", "twitch"],
  ["birdie_bonanza", "twitch"],
  ["ace_attack_fi", "twitch"],
  ["putt_or_bust", "twitch"],
  ["chainsrattle", "twitch"],
  ["eaglehunter99", "twitch"],
  ["roller_rolf", "twitch"],
];

const MESSAGES = [
  "Mukana arvonnassa! 🥏",
  "Moikka kaikille!",
  "Hyvä lähetys taas",
  "Osallistun!",
  "Toivottavasti voitan tällä kertaa",
  "Mikä on teidän suosikkikiekko?",
  "Terveisiä Tampereelta",
  "Paras podcast 🔥",
  "Arvonta!!",
  "Kiitos lähetyksestä",
  "Prodiscus ftw",
  "Ensimmäistä kertaa livessä",
  "Joko arvotaan?",
  "Birdie-putti oli kaunis",
  "💚🧡💜",
  "Heippa Helsingistä",
];

const EAGER_USER = "Innokas Ilkka";
const INITIAL_BURST = 18; // heti alussa, jotta arvonta voi alkaa
const TICK_MS = 2000;
const MAX_MESSAGES = 600;

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

let seq = 0;

function makeMessage() {
  // Innokas Ilkka kirjoittaa noin joka neljännen viestin.
  const [name, platform] =
    Math.random() < 0.25 ? USERS.find((u) => u[0] === EAGER_USER) : pick(USERS);
  seq++;
  return {
    platform,
    comment: {
      id: `demo-${Date.now()}-${seq}`,
      authorId: `${platform}:demo-${name.toLowerCase().replace(/\W+/g, "-")}`,
      authorName: name,
      text: pick(MESSAGES),
      publishedAt: new Date().toISOString(),
    },
  };
}

/**
 * Käynnistää simuloinnin. onMessages(batch) saa listan
 * { platform: "youtube"|"twitch", comment }.
 * @returns {{ stop: () => void }}
 */
export function startDemo(onMessages) {
  let sent = 0;
  let stopped = false;

  const initial = Array.from({ length: INITIAL_BURST }, makeMessage);
  sent += initial.length;
  onMessages(initial);

  const timer = setInterval(() => {
    if (stopped || sent >= MAX_MESSAGES) return;
    // 0–2 viestiä joka tikillä, keskimäärin noin viesti sekunnissa
    const count = Math.random() < 0.15 ? 0 : Math.random() < 0.5 ? 1 : 2;
    if (!count) return;
    const batch = Array.from({ length: count }, makeMessage);
    sent += batch.length;
    onMessages(batch);
  }, TICK_MS);

  return {
    stop() {
      stopped = true;
      clearInterval(timer);
    },
  };
}
