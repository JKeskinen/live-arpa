/**
 * Teemat (brändiprofiilit)
 * ------------------------
 * Teema määrää värit (CSS: :root[data-theme="…"]) ja brändin sisällön:
 * logo (media-kansiosta), otsikot, alarivi, voittajan ohje, isäntä ja
 * vihjerivi.
 *
 * Käyttäjän muokkaukset (otsikot, ohje, tunnuskuva, isäntä) tallennetaan
 * teemakohtaisesti, joten teemat eivät sekoitu keskenään.
 * Oletustekstit ovat täällä – muokkaa niitä, jos haluat uudet oletukset.
 */

import prodiscusLogo from "../media/prodiscus-logo.png";
import kuidemaenLogo from "../media/kuidemaen-profile-pic-300x300.png";

export const THEMES = {
  prodiscus: {
    id: "prodiscus",
    label: "Prodiscus",
    description: "Musta ja oranssi – Prodiscus-brändi",
    brandName: "PRODISCUS",
    // Logo: media/prodiscus-logo.png – läpinäkyvä tunnus, näytetään kokonaisena.
    logo: prodiscusLogo,
    logoFit: "contain",
    hint: ["Kiekot ja tarvikkeet: Prodiscus.fi", "Muista myös Prodiscus-Patreon."],
    defaults: {
      hostName: "prodiscus_official",
      heading: {
        mode: "rotate",
        fixedText: "Kuka on viikon onnekkain?",
        rotatingTexts: [
          "Prodiscus – The First Finnish Disc Golf Brand",
          "Prodiscus – Pro Discs For Sport",
          "Prodiscus – Podcast",
        ],
        intervalSec: 6,
        showStreamTitle: false,
        subtitle: "Voiton osuessa kohdalle, ota yhteyttä order@prodiscus.fi",
        contactInfo:
          "Lähetä sähköposti osoitteeseen order@prodiscus.fi. Otsikko: Podcast-voittaja. Viestiin: nimi, osoite ja puhelinnumero.",
      },
    },
  },

  kuidemaen: {
    id: "kuidemaen",
    label: "Kuidemaen",
    description: "Twitch-violetti, Counter-Strike 2 -henkinen",
    brandName: "KUIDEMAEN",
    // Logo: media/kuidemaen-profile-pic-300x300.png – profiilikuva, täyttää laatikon.
    logo: kuidemaenLogo,
    logoFit: "cover",
    hint: ["twitch.tv/kuidemaen", "Counter-Strike 2 livenä"],
    defaults: {
      hostName: "kuidemaen",
      heading: {
        mode: "rotate",
        fixedText: "Kuka avaa tänään voittajalaatikon?",
        rotatingTexts: [
          "Kuidemaen – Counter-Strike 2 livenä",
          "Kuidemaen – Twitch-arvonta",
          "Kirjoita chattiin – olet mukana arvonnassa!",
        ],
        intervalSec: 6,
        showStreamTitle: false,
        subtitle: "Jokainen chat-viesti on arpa – enintään 3 per katsoja",
        contactInfo:
          "Lähetä kuiskaus (whisper) @kuidemaen Twitchissä 24 tunnin sisällä ja kerro, miten haluat palkinnon toimitettavan.",
      },
    },
  },
};

export const DEFAULT_THEME = "prodiscus";

export function themeProfile(id) {
  return THEMES[id] || THEMES[DEFAULT_THEME];
}

/** Vanhat teemat ja tuntemattomat arvot → oletusteema. */
export function normalizeTheme(id) {
  return THEMES[id] ? id : DEFAULT_THEME;
}
