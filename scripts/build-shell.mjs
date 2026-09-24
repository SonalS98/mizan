/**
 * Generate the Vite entry page from the shell.
 *
 * index.html and src/web/shell.html used to be two hand-kept copies of the
 * same markup, which drifted: the dev server served a page missing a whole
 * section that the built page had. There is now one source, and this writes
 * the entry from it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const shell = readFileSync(resolve(root, "src/web/shell.html"), "utf8");

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Mizan — UAE renewable energy screening</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
  :root { color-scheme: dark; }
  html, body { height: 100%; margin: 0; }
  body { background: #080c11; }
  img { max-width: 100%; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<!-- Generated from src/web/shell.html by scripts/build-shell.mjs. Do not edit. -->
${shell}
<script type="module" src="/src/web/main.ts"></script>
</body>
</html>
`;

writeFileSync(resolve(root, "index.html"), page);
console.log("index.html regenerated from src/web/shell.html");
