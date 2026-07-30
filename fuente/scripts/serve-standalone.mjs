/**
 * Servidor estático mínimo para revisar el artefacto autónomo tal como se verá
 * publicado. Uso: node scripts/serve-standalone.mjs [puerto]
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist", "standalone");
const port = Number(process.argv[2] ?? 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const relative = url.pathname === "/" ? "/index.html" : url.pathname;
  const target = join(root, normalize(relative).replace(/^(\.\.[/\\])+/, ""));
  try {
    const body = await readFile(target);
    response.writeHead(200, { "content-type": types[extname(target)] ?? "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("No encontrado");
  }
}).listen(port, () => {
  console.log(`Artefacto disponible en http://localhost:${port}/`);
});
