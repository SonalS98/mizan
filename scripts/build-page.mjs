/**
 * Bundle the engine and the web app into one self-contained page.
 *
 *   node scripts/build-page.mjs           -> dist/page.html  (for publishing)
 *   node scripts/build-page.mjs --local   -> also dist/local.html with the
 *                                            doctype wrapper, for opening from
 *                                            a file:// URL
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
mkdirSync(resolve(root, "dist"), { recursive: true });
const result = await build({
  configFile: false,
  logLevel: "warn",
  build: {
    write: false,
    target: "es2020",
    minify: "esbuild",
    lib: { entry: resolve(root, "src/web/main.ts"), name: "Mizan", formats: ["iife"] },
  },
});

const shell = readFileSync(resolve(root, "src/web/shell.html"), "utf8");
const output = Array.isArray(result) ? result[0].output : result.output;
const bundle = output.find(chunk => chunk.type === "chunk" && chunk.isEntry)?.code;
if (!bundle) throw new Error("No application bundle produced");
const page = `${shell}\n<script>\n${bundle}\n</script>\n`;

writeFileSync(resolve(root, "dist/page.html"), page);

if (process.argv.includes("--local")) {
  writeFileSync(
    resolve(root, "dist/local.html"),
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` +
      `<title>Mizan — UAE renewable energy screening</title>` +
      `<link rel="preconnect" href="https://fonts.googleapis.com">` +
      `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` +
      `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">` +
      `<style>:root{color-scheme:dark}html,body{height:100%;margin:0;background:#080c11}img{max-width:100%}[hidden]{display:none!important}</style>` +
      `</head><body>${page}</body></html>`,
  );
}

const kb = (page.length / 1024).toFixed(0);
console.log(`dist/page.html written, ${kb} kB`);
