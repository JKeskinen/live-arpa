# Mac-ohjeistus – Prodiscus Raffleri

Tämä ohje on tehty niin, että mac-käyttäjä voi rakentaa ja ajaa ohjelman omalla Macillaan **pelkästään Terminalilla**. Ei tarvitse Visual Studio Codea tai muuta editoria.

---

## 1. Asenna tarvittavat työkalut

Avaa **Terminal** ja aja nämä komennot yksi kerrallaan:

```bash
# Asenna Homebrew (jos ei ole vielä)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Asenna Node.js (LTS-versio)
brew install node

# Asenna Xcode Command Line Tools (tarvitaan natiivien moduulien kääntämiseen)
xcode-select --install
```

Tarkista, että Node ja npm toimivat:

```bash
node -v
npm -v
```

---

## 2. Lataa projekti

```bash
# Korvaa alla oleva osoite oman repon osoitteella
git clone https://github.com/KÄYTTÄJÄNIMI/prodiscus-raffleri.git
cd prodiscus-raffleri
```

---

## 3. Asenna riippuvuudet

```bash
npm install
```

---

## 4. Aja ohjelma kehitystilassa (nopein tapa testata)

```bash
npm start
```

Jos `npm start` ei ole määritetty, kokeile:

```bash
npx electron .
```

---

## 5. Rakenna asennettava .dmg-tiedosto

```bash
npm run build:mac
```

Jos yllä oleva komento ei toimi, lisää ensin `package.json`-tiedostoon build-asetukset (katso alla) ja aja sitten:

```bash
npx electron-builder --mac
```

Valmis `.dmg` löytyy kansiosta `dist/`.

---

## 6. Asenna ohjelma

1. Avaa `dist/`-kansio Finderissa.
2. Tuplaklikkaa `.dmg`-tiedostoa.
3. Vedä ohjelma **Applications**-kansioon.
4. Ensimmäisellä käynnistyksellä Mac saattaa varoittaa. Tee näin:
   - Mene **System Settings → Privacy & Security**
   - Selaa alas ja paina **Open Anyway**

---

# Siirry projektikansioon (jos et ole jo siellä)

cd prodiscus-raffleri

# Avaa package.json nano-editorissa

nano package.json

## package.json – lisää nämä (jos puuttuvat)

```json
{
  "scripts": {
    "start": "electron .",
    "build:mac": "electron-builder --mac"
  },
  "build": {
    "appId": "fi.prodiscus.raffleri",
    "productName": "Prodiscus Raffleri",
    "mac": {
      "category": "public.app-category.entertainment",
      "target": ["dmg", "zip"]
    }
  }
}
```

Asenna electron-builder tarvittaessa:

```bash
npm install --save-dev electron-builder
```

---

## Ongelmatilanteet

| Ongelma                      | Ratkaisu                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| `electron` ei löydy          | Aja `npm install` uudelleen                                                             |
| `gyp` / native module -virhe | Aja `xcode-select --install`                                                            |
| Gatekeeper estää avaamisen   | System Settings → Privacy & Security → Open Anyway                                      |
| API-avain puuttuu            | Luo `config.json` käyttäjädatakansioon (katso ohjelman README)                          |
| `npm run build:mac` ei toimi | Tarkista, että `package.json` sisältää `build`-osion ja `electron-builder` on asennettu |

---

## Huomioita

- Buildaus vaatii Macin. Windowsilla ei voi tehdä toimivaa `.dmg`-tiedostoa.
- Ensimmäinen build voi kestää muutaman minuutin, koska Electron ja riippuvuudet ladataan.
- Jos ohjelma ei käynnisty ensimmäisellä kerralla, kokeile oikeaa klikkausta → **Open**.
