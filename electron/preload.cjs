/**
 * Preload-skripti
 * ---------------
 * Turvallinen silta renderer-prosessin (React) ja main-prosessin (Electron) välillä.
 * contextIsolation on päällä, joten renderer ei pääse suoraan Node.js-ympäristöön.
 *
 * Kaikki YouTube API -kutsut tehdään main-prosessissa kiintiön hallinnan takia.
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("raffleAPI", {
  /** Hakee asetukset (onko API-avain määritetty) */
  getConfig: () => ipcRenderer.invoke("config:get"),

  /** Lataa video/live ja aloittaa kommenttien haun */
  loadStream: (url) => ipcRenderer.invoke("stream:load", url),

  /** Pysäyttää kommenttien haun */
  stopStream: () => ipcRenderer.invoke("stream:stop"),

  /** Hakee nykyisen tilan (kommentit, tilastot jne.) */
  getState: () => ipcRenderer.invoke("stream:state"),

  /**
   * Kuuntelee tilapäivityksiä main-prosessista.
   * Palauttaa funktion, jolla kuuntelija poistetaan.
   */
  onUpdate: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("state:update", listener);
    return () => ipcRenderer.removeListener("state:update", listener);
  },

  /** Kuuntelee virheilmoituksia */
  onError: (callback) => {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on("state:error", listener);
    return () => ipcRenderer.removeListener("state:error", listener);
  },

  /**
   * Kuuntelee seuraavan live-pollauksen ajankohtaa.
   * Käytetään laskurin näyttämiseen käyttöliittymässä.
   */
  onPollNext: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("poll:next", listener);
    return () => ipcRenderer.removeListener("poll:next", listener);
  },
});
