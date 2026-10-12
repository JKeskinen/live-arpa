# Live Arpakone (Windows / React + Electron)

## 1. Vaatimukset
- Windows 10/11
- Node.js LTS: https://nodejs.org/
- Google Cloud -projekti ja YouTube Data API v3 käytössä

## 2. YouTube API -avain
1. Avaa https://console.cloud.google.com/
2. Luo projekti tai valitse olemassa oleva projekti.
3. Ota käyttöön **YouTube Data API v3**.
4. Luo API key kohdasta APIs & Services → Credentials.
5. Käynnistä ohjelma kerran komennolla `npm run dev`. Ohjelma luo asetustiedoston käyttäjän AppData-kansioon.
6. Avaa Windowsin Resurssienhallinnassa `%APPDATA%\live-arpakone\config.json` tai tarkista polku ohjelman virheilmoituksesta. Lisää avain:

```json
{
  "youtubeApiKey": "LIITÄ_OMA_API_AVAIN_TÄHÄN"
}
```

Sulje ohjelma ja käynnistä uudelleen. Älä jaa API-avainta tai julkaise sitä GitHubissa. Rajoita avain Google Cloudissa YouTube Data API v3:een ja aseta tarvittaessa käyttörajoitukset.

## 3. Käynnistä kehitystilassa
Avaa PowerShell tässä kansiossa:

```powershell
npm install
npm run dev
```

## 4. Rakenna Windows-asennusohjelma

```powershell
npm install
npm run dist
```

Valmis asennusohjelma tulee `release`-kansioon.

## Huomioita
- Lähetyksen pitää olla käynnissä ja sen live chatin käytössä.
- Ohjelma hakee kommentteja YouTube Data API v3:n `liveChatMessages.list`-rajapinnalla. Se noudattaa API:n palauttamaa polling-väliä (vähintään 5 sekuntia tässä toteutuksessa); YouTube voi vaatia 10 sekunnin tai pidemmän välin.
- Kolme ensimmäistä vastaanotettua kommenttia per käyttäjä hyväksytään. Neljättä ja sitä seuraavia ei lisätä osallistumisiin.
- Kommenttilaskuri tarkoittaa hyväksyttyjä kommentteja, ei YouTuben koko chatin kaikkien aikojen viestimäärää.
- Voittaja arvotaan tasaisesti hyväksyttyjen kommenttien joukosta. Siksi käyttäjä, jolla on kolme hyväksyttyä kommenttia, saa kolme osallistumismahdollisuutta.
- YouTuben API:n kiintiöt ja ehdot koskevat käyttöä. API-avaimen käyttöä ei voi taata ilman Google Cloud -projektin asetuksia.
- Ulkoasun logoa, taustaa ja värejä voi muokata tiedostosta `src/style.css` ja `src/App.jsx`. Tämä perusversio ei vielä sisällä erillistä graafisten asetusten editoria.
