/**
 * Build-asetukset
 * ---------------
 * Demotila (simuloitu lähetys) on vain kehittäjän testikäyttöön:
 * - käytössä paikallisesti (`npm run dev`) ja testibuildissa
 *   (`npm run deploy:test`, Viten tila "test")
 * - pois päältä oikealla sivulla (`npm run deploy`, tila "production")
 *
 * Demo käynnistetään osoitteella `?demo`. Käyttöliittymässä ei ole
 * demopainikkeita, joten demo ei näy tavallisille käyttäjille.
 */

export const DEMO_ENABLED = import.meta.env.MODE !== "production";
