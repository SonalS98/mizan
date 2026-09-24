/**
 * Bundle the engine and the web app into one self-contained page.
 *
 *   node scripts/build-page.mjs           -> dist/page.html  (for publishing)
 *   node scripts/build-page.mjs --local   -> also dist/local.html with the
 *                                            doctype wrapper, for opening from
 *                                            a file:// URL
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const esbuild = resolve(
  "/home/claude",
  ".npm-global/lib/node_modules/tsx/node_modules/esbuild/bin/esbuild",
);

mkdirSync(resolve(root, "dist"), { recursive: true });
const bundlePath = resolve(root, "dist/app.js");

execFileSync(
  esbuild,
  [
    resolve(root, "src/web/main.ts"),
    "--bundle",
    "--format=iife",
    "--target=es2020",
    "--minify",
    `--outfile=${bundlePath}`,
  ],
  { stdio: "inherit" },
);

const shell = readFileSync(resolve(root, "src/web/shell.html"), "utf8");
const bundle = readFileSync(bundlePath, "utf8");
const page = `${shell}\n<script>\n${bundle}\n</script>\n`;

writeFileSync(resolve(root, "dist/page.html"), page);

if (process.argv.includes("--local")) {
  writeFileSync(
    resolve(root, "dist/local.html"),
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` +
      `<title>Mizan — UAE rooftop solar screening</title>` +
      `<link rel="preconnect" href="https://fonts.googleapis.com">` +
      `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` +
      `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">` +
      `<style>:root{color-scheme:dark}html,body{height:100%;margin:0;background:#080c11}img{max-width:100%}[hidden]{display:none!important}</style>` +
      `</head><body>${page}</body></html>`,
  );
}

rmSync(bundlePath);
const kb = (page.length / 1024).toFixed(0);
console.log(`dist/page.html written, ${kb} kB`);
