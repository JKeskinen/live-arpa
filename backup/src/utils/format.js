/**
 * Ajan muotoilufunktiot
 */

export const time = (value) =>
  value ? new Date(value).toLocaleTimeString("fi-FI") : "—";

export const dateTime = (value) =>
  value ? new Date(value).toLocaleString("fi-FI") : "Ei vielä päivitetty";
