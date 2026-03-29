import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import webExtension, { readJsonFile } from "vite-plugin-web-extension";

function generateManifest() {
  const manifest = readJsonFile("src/manifest.json");
  const pkg = readJsonFile("package.json");
  return {
    name: pkg.name ?? manifest.name,
    description: pkg.description ?? manifest.description,
    version: pkg.version,
    ...manifest,
  };
}

export default defineConfig({
  plugins: [
    react(),
    webExtension({
      manifest: generateManifest,
    }),
  ],
});
