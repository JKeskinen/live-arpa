/**
 * Sovelluksen sisääntulopiste
 * ---------------------------
 * Renderöi App-komponentin Reactin StrictMode-tilassa.
 * Ei sisällä liiketoimintalogiikkaa.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./style.css";
import "./App.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
