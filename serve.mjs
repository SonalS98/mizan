/**
 * Run Mizan locally with nothing installed.
 *
 *   node serve.mjs        then open http://localhost:4173
 *
 * `npm install` is blocked on some managed networks, which would otherwise
 * mean no local run at all, and a published static page cannot do the three
 * things that make the local build worth demonstrating. So this server uses
 * only what ships with Node: no dependencies, no install, no build step.
 *
 * What running locally unlocks:
 *
 *  - Map tiles. The browser fetches them straight from OpenStreetMap.
 *  - Address search and live buildings. Nominatim and Overpass both allow
 *    browser calls, and are proxied here anyway so a blocked CORS preflight
 *    or a busy mirror does not take the demo down.
 *  - Measured sunlight. PVGIS states plainly that browser calls to its API
 *    are not allowed, so the page asks this server instead and it forwards
 *    the request. This is the only one that genuinely cannot work without a
 *    server of some kind, and it is why the source chip can say "PVGIS
 *    SARAH3" rather than "Modelled".
 */

import { createServer } from "node:http";
import { request as httpsRequest } from "node:https";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 4173);
const PAGE = resolve(root, "dist/local.html");

/** Where each proxied path really goes. */
const ROUTES = [
  {
    prefix: "/api/pvgis",
    host: "re.jrc.ec.europa.eu",
    path: (url) => `/api/v5_3${url.pathname.slice("/api/pvgis".length)}${url.search}`,
  },
  {
    prefix: "/api/overpass",
    host: "overpass-api.de",
    path: () => "/api/interpreter",
  },
  {
    prefix: "/api/geocode",
    host: "nominatim.openstreetmap.org",
    path: (url) => `/search${url.search}`,
  },
];

const readBody = (req) =>
  new Promise((done, fail) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => done(Buffer.concat(chunks)));
    req.on("error", fail);
  });

const proxy = (route, url, req, res, body) =>
  new Promise((done) => {
    const upstream = httpsRequest(
      {
        host: route.host,
        path: route.path(url),
        method: req.method,
        headers: {
          // A plain, honest user agent. Nominatim asks for one and will
          // refuse anonymous traffic.
          "user-agent": "mizan-site-screening/0.5 (hackathon prototype)",
          accept: req.headers.accept ?? "*/*",
          ...(req.method === "POST"
            ? {
                "content-type": req.headers["content-type"] ?? "application/x-www-form-urlencoded",
                "content-length": Buffer.byteLength(body),
              }
            : {}),
        },
      },
      (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode ?? 502, {
          "content-type": upstreamRes.headers["content-type"] ?? "application/json",
          "access-control-allow-origin": "*",
          "cache-control": "no-store",
        });
        upstreamRes.pipe(res);
        upstreamRes.on("end", done);
      },
    );
    upstream.on("error", (error) => {
      // A dead upstream must not take the page with it: the app already falls
      // back to its modelled year and its baked areas, and says which it used.
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: `${route.host} unreachable: ${error.message}` }));
      console.warn(`  ! ${route.host} ${error.message}`);
      done();
    });
    if (req.method === "POST") upstream.write(body);
    upstream.end();
  });

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const route = ROUTES.find((item) => url.pathname.startsWith(item.prefix));

  if (route) {
    const body = req.method === "POST" ? await readBody(req) : Buffer.alloc(0);
    console.log(`  → ${route.host}${route.path(url).slice(0, 70)}`);
    await proxy(route, url, req, res, body);
    return;
  }

  if (url.pathname === "/" || url.pathname === "/index.html") {
    try {
      const page = await readFile(PAGE);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(page);
    } catch {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end(
        `Could not read ${PAGE}.\n\nThat file is the built app. Rebuild it with:\n  npm run page\n`,
      );
    }
    return;
  }

  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("Not found. The app is at /");
});

server.listen(PORT, () => {
  console.log(`\n  Mizan is running.\n`);
  console.log(`    http://localhost:${PORT}\n`);
  console.log(`  Live map tiles, address search and PVGIS sunlight are all on.`);
  console.log(`  Stop it with Ctrl+C.\n`);
});
