# Raffleri – YouTube- ja Twitch-arvontakone

Raffleri kerää livelähetyksen kommentit YouTubesta ja Twitchistä ja arpoo niistä voittajat.
Se on web-sovellus, joka toimii selaimessa ilman asennusta:

**https://raffleri-c6128.web.app**

- YouTube API -avain syötetään asetuksiin ja tallentuu vain käyttäjän selaimeen.
- Kommentit tallentuvat selaimen IndexedDB:hen sillä laitteella, jolla arvonta pidetään.

## Ominaisuudet

- **YouTube:** kanava (esim. `@prodiscus_official`) tai yksittäinen video / livelähetys.
- **Twitch:** kanavan chat reaaliajassa (esim. `twitch.tv/kuidemaen`), ei API-avainta.
- **Useampi voittaja:** sama henkilö voi voittaa vain kerran. Voittajan palvelu (YouTube / Twitch) näkyy logona.
- **Näkymät:** Normaali, Tiivistetty ja Stream mode (vain arvontaikkuna lähetykseen).
- **Teemat:** Prodiscus ja Kuidemaen (Twitch, Counter-Strike 2 -henkinen). Teema vaihtaa värit, logon ja tekstit.
- **Tekstit:** vaihtuvat sloganit tai kiinteä otsikko, alarivi ja voittajan ohje – teemakohtaisesti muokattavissa.
- **Brändäys:** oma tunnuskuva ja animaatio teemakohtaisesti.
- **Demotila:** simuloitu lähetys testaukseen (`?demo`).
- **Mobiili:** näkymä mukautuu puhelimeen automaattisesti.
- **Varmuuskopio:** kommentit JSON-tiedostoksi ja takaisin.

## Arvonnan säännöt

- Viisi ensimmäistä kommenttia per henkilö osallistuu (= 5 arpaa). Kuudetta ja sitä seuraavia ei lisätä. Raja on vakio `MAX_ACCEPTED_PER_AUTHOR` tiedostossa [shared/raffleCore.mjs](shared/raffleCore.mjs).
- Sääntö pätee YouTubessa ja Twitchissä erikseen. Samaa ihmistä ei voi tunnistaa palveluiden välillä.
- Henkilö tunnistetaan palvelun käyttäjä-ID:llä (YouTube: kanava-ID, Twitch: user-id), sen puuttuessa nimellä.
- Voittaja arvotaan tasaisesti hyväksyttyjen kommenttien joukosta.
- Sama henkilö voi voittaa vain kerran saman arvonnan aikana. Voittajalistan voi tyhjentää asetuksista.
- Isännän käyttäjänimi (asetuksissa) ja Twitch-kanavan omistaja eivät osallistu.
- Säännöt ovat tiedostossa [shared/raffleCore.mjs](shared/raffleCore.mjs).

## Käyttö

1. Avaa https://raffleri-c6128.web.app
2. Paina oikean yläkulman rataskuvaketta ⚙️. Asetukset avautuvat omaan ikkunaansa (sulkeutuu Esc-näppäimellä tai klikkaamalla ikkunan ulkopuolelle). Liitä YouTube API -avain tabiin **API-avain** (ks. alla). Pelkkä Twitch toimii ilman avainta.
3. Kirjoita lähteet ja paina **LATAA**:
   - **YouTube-kanava tai video**, esim. `@prodiscus_official`
   - **Twitch-kanava**, esim. `twitch.tv/kuidemaen`

   Jätä kenttä tyhjäksi, jos et käytä kyseistä palvelua. Molemmat kentät muistetaan seuraavaa kertaa varten.
4. Arvo voittajat painikkeella **ARVO VOITTAJA**. Seuraavat voittajat arvotaan samasta painikkeesta.

**Automaattinen haku:** asetuksissa (Lähetys) voi valita, että lähteet haetaan heti sivun avautuessa. Livelähetyksen pitäjän tarvitsee silloin vain avata sivu lähetyksen alettua.

### YouTube

- Kanavalta etsitään käynnissä oleva livelähetys **kerran**, kun painat LATAA (3 kiintiöyksikköä). Jos liveä ei ole, sivu kertoo sen ja näyttää seuraavan ajastetun lähetyksen.
- Livechat haetaan 30 sekunnin välein (5 kiintiöyksikköä / haku ≈ 600 / tunti; päiväkiintiö 10 000 riittää noin 16 tunnin lähetykseen).
- Tavallisen videon kaikki kommentit ja vastaukset haetaan kerralla.
- Haku pysähtyy itsestään, kun lähetys päättyy. Kerätyt kommentit jäävät talteen.

### Twitch

- Chat luetaan reaaliajassa Twitchin virallisen chat-rajapinnan kautta ilman kirjautumista. Ei API-avainta eikä kiintiötä.
- **Twitch ei anna vanhoja viestejä:** vain sivun ollessa auki kirjoitetut viestit tallentuvat. Avaa Raffleri ennen kuin kerrot katsojille arvonnasta.
- Jos yhteys katkeaa, se yhdistetään automaattisesti uudelleen.
- Saman kanavan kommentit kuuluvat samaan arvontaan, jos kanavalla on ollut toimintaa viimeisen 12 tunnin aikana. Ensi viikon lähetys alkaa puhtaalta pöydältä.

### Demotila (testaus ilman livelähetystä)

Simuloitu lähetys tuottaa YouTube- ja Twitch-kommentteja, joten arvontaa, näkymiä ja sääntöjä voi kokeilla ilman livelähetystä ja ilman API-avainta.

- Käynnistys: **Asetukset → Lähetys → Käynnistä demolähetys**, painike **Kokeile demolla** lähdepaneelissa, tai osoite `?demo` sivun osoitteen perässä (esim. `https://raffleri-c6128.web.app/?demo`).
- Yksi simuloitu käyttäjä ("Innokas Ilkka") kirjoittaa paljon, joten max 5 -säännön näkee toiminnassa.
- Demolla on oma tallennus ja voittajalista, jotka nollautuvat joka käynnistyksellä. Oikeisiin arvontoihin se ei koske.
- Arvontaikkunassa näkyy **DEMO**-merkki. Demo päättyy, kun pysäytät haun tai lataat oikean lähteen.

Testiversio julkaistaan erilliseen osoitteeseen komennolla `npm run deploy:test` (oikea sivu ei muutu).

### Teemat

Teeman logo tulee `media`-kansiosta: Prodiscus `media/prodiscus-logo.png`, Kuidemaen `media/kuidemaen-profile-pic-300x300.png`. Oma tunnuskuva asetuksista korvaa teeman logon.

Teema valitaan asetuksista (**Ulkoasu**-tabi). Kummallakin teemalla on omat tallennetut tekstit, voittajan ohje, tunnuskuva, animaatio ja isäntä, joten teemat eivät sekoitu keskenään.

| | Prodiscus | Kuidemaen |
|---|---|---|
| Tyyli | musta ja oranssi | Twitch-violetti, Counter-Strike 2 -henkinen (harvinaisuusvärit, kultainen voittaja) |
| Logo | P + PRODISCUS | K + KUIDEMAEN |
| Voittajan ohje | sähköposti order@prodiscus.fi | kuiskaus @kuidemaen Twitchissä |
| Isäntä | prodiscus_official | kuidemaen |

Oletustekstit ovat tiedostossa [src/themes.js](src/themes.js). Uuden teeman voi lisätä sinne ja sen värit tiedostoon `src/App.css` (`:root[data-theme="…"]`). Kuidemaen-teema ei käytä Counter-Striken logoja, fontteja tai pelin kuvia.

### Näkymät ja OBS

Näkymä valitaan asetuksista (**Näkymä**-tabi):

| Näkymä | Näkyvissä |
|---|---|
| Normaali | logo, lähteet, tilastot, arvontaikkuna, voittajalista, kommenttivirta |
| Tiivistetty | logo, tilastot, arvontaikkuna, voittajalista, kommenttivirta yhdellä ruudulla |
| Stream mode | vain arvontaikkuna ja voittajalista; asetukset oikean yläkulman rattaasta |

Arvonta OBS-lähetykseen:
1. Valitse **Stream mode**.
2. OBS: **Lähteet → + → Ikkunakaappaus** (Window Capture) ja valitse selainikkuna, jossa Raffleri on auki.
3. Piilota selaimen yläpalkki painamalla **F11** tai rajaa se pois OBS:ssä (**Alt** + vedä lähteen reunaa).

Älä käytä OBS:n **Selainlähdettä** (Browser Source): se on erillinen selain, jossa ei ole API-avainta eikä kerättyjä kommentteja.

### Hyvä tietää

- **Pidä välilehti auki ja näkyvissä lähetyksen ajan**, ja estä koneen lepotila. Selain hidastaa taustavälilehtiä; Raffleri hakee myöhästyneet kommentit heti, kun välilehti palaa näkyviin.
- Vain yksi välilehti kerrallaan voi hakea kommentteja.
- Kommentit, voittajat ja asetukset tallentuvat **vain siihen selaimeen**, jossa sivua käytetään. API-avain ja lähteet pitää syöttää kerran myös arvontakoneen selaimeen.
- Ota arvonnan jälkeen varmuuskopio (**Asetukset → Varmuuskopio → Lataa varmuuskopio**). Selaimen tietojen tyhjennys poistaa kommentit. Voittajat saa talteen painikkeella **Kopioi kaikki**.

## YouTube API -avain

1. Avaa https://console.cloud.google.com/ ja valitse projekti `raffleri-c6128`.
2. Ota käyttöön **YouTube Data API v3** (APIs & Services → Library).
3. Luo avain: APIs & Services → Credentials → Create credentials → API key.
4. **API restrictions** → Restrict key → YouTube Data API v3.
5. **Application restrictions** → Websites, ja lisää
   `https://raffleri-c6128.web.app/*`, `https://raffleri-c6128.firebaseapp.com/*`,
   `http://localhost:5173/*` ja `http://127.0.0.1:5173/*`.

Älä julkaise avainta GitHubissa. Avain ei ole julkaistussa sivussa, vaan vain käyttäjän selaimessa.

## Kehitys ja julkaisu

```powershell
npm install
npm run dev            # kehityspalvelin osoitteessa http://127.0.0.1:5173
npm run build          # tuotantoversio dist-kansioon
npm run preview        # esikatsele buildia osoitteessa http://127.0.0.1:5173
npm run deploy         # build + julkaisu Firebase Hostingiin
npm run deploy:test    # build + testiversio erilliseen osoitteeseen (30 pv)
```

Firebase-julkaisu vaatii kerran: `npm install -g firebase-tools` ja `firebase login`.
Firebase-asetukset (tietoturvaotsakkeet, välimuisti) ovat tiedostossa [firebase.json](firebase.json).

## Projektin rakenne

| Kansio / tiedosto | Sisältö |
|---|---|
| `src/` | React-käyttöliittymä (komponentit, hookit, tyylit) |
| `src/web/` | Kommenttien haku: YouTube, Twitch-chat ja IndexedDB-tallennus |
| `shared/` | Arvonnan säännöt ja YouTube-apufunktiot |
| `src/themes.js` | Teemat: brändi, oletustekstit ja voittajan ohje |
| `media/` | Kuvat: teemojen logot `prodiscus-logo.png` ja `kuidemaen-profile-pic-300x300.png`, `youtube-logo.png` (palvelulogo), `youtube-logo-original.png` |
| `firebase.json`, `.firebaserc` | Firebase Hosting -asetukset |

Uudet kuvat ja logot lisätään `media/`-kansioon. Koodissa niihin viitataan importilla, esim. `import logo from "../../media/youtube-logo.png"`; Vite liittää ne julkaisuun.

## Huomioita

- YouTuben ja Twitchin käyttöehdot koskevat käyttöä.
- Twitch-logo on Simple Icons -kirjaston virallinen Twitch-merkki (CC0).
