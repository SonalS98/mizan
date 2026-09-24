import { defineConfig } from "vite";

/**
 * The dev server doubles as the proxy the browser needs.
 *
 * PVGIS states that browser requests to its API are not allowed, so the page
 * calls /api/pvgis/... and this forwards it. That is the whole reason the
 * local build can use measured sunlight while a static page cannot.
 */
export default defineConfig({
  server: {
    port: 4173,
    open: true,
    proxy: {
      "/api/pvgis": {
        target: "https://re.jrc.ec.europa.eu",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pvgis/, "/api/v5_3"),
      },
      "/api/overpass": {
        target: "https://overpass-api.de",
        changeOrigin: true,
        rewrite: () => "/api/interpreter",
      },
      "/api/geocode": {
        target: "https://nominatim.openstreetmap.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/geocode/, "/search"),
      },
    },
  },
  preview: { port: 4173 },
  build: { target: "es2022" },
});
