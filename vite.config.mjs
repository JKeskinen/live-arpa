import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Suhteelliset polut toimivat sekä Electronissa (file://) että
  // Firebase Hostingissa (sivuston juuri).
  base: "./",
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  // Sama portti kuin dev-palvelimella, jotta API-avaimen osoiterajaus
  // (localhost:5173 / 127.0.0.1:5173) toimii myös esikatselussa.
  preview: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
});
