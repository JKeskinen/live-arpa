/**
 * React-sovelluksen entry point
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./App.css"; // tai App.css – vaihda nimeä tarvittaessa

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
