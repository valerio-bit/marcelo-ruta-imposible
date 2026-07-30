/**
 * Genera un artefacto de producción autónomo: un solo archivo HTML con el CSS
 * compilado y el juego empaquetado desde `app/`. Sirve para publicarlo en
 * cualquier hosting estático y para abrirlo sin servidor.
 *
 * Uso: node scripts/build-standalone.mjs   (requiere `npm run build` antes)
 */

import { build } from "esbuild";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(root, "dist", "standalone");
const outputFile = resolve(outputDirectory, "marcelo-ruta-imposible.html");

/**
 * Recupera el CSS de Geist que vinext auto-hospeda, se queda con los
 * subconjuntos latinos y los incrusta como data URI. Así el artefacto conserva
 * la tipografía original del proyecto sin pedir ningún archivo externo.
 */
async function inlineFonts() {
  let bundle = "";
  try {
    bundle = await readFile(resolve(root, "dist", "server", "index.js"), "utf8");
  } catch {
    return "";
  }
  const declarations = [...bundle.matchAll(/_selfHostedCSS:\s*("(?:[^"\\]|\\.)*")/g)];
  const kept = [];
  for (const [, literal] of declarations) {
    let fontCss = "";
    try {
      fontCss = JSON.parse(literal);
    } catch {
      continue;
    }
    // Cada bloque va precedido por un comentario con el nombre del subconjunto.
    const parts = fontCss.split(/\/\*\s*([a-z-]+)\s*\*\//i).slice(1);
    for (let i = 0; i < parts.length; i += 2) {
      const subset = parts[i];
      const block = parts[i + 1] ?? "";
      if (subset !== "latin" && subset !== "latin-ext") continue;
      const url = block.match(/url\(([^)]+)\)/)?.[1]?.replace(/["']/g, "");
      if (!url) continue;
      const candidates = [url, resolve(root, "dist", "client", "assets", "_vinext_fonts", url.split(/[\\/]/).slice(-2).join("/"))];
      for (const candidate of candidates) {
        try {
          const data = await readFile(candidate);
          kept.push(
            block
              .trim()
              .replace(/url\([^)]+\)/, `url(data:font/woff2;base64,${data.toString("base64")})`),
          );
          break;
        } catch {
          // Se intenta la siguiente ruta.
        }
      }
    }
  }
  return kept.join("\n");
}

async function readBuiltCss() {
  const assets = resolve(root, "dist", "client", "assets");
  const files = await readdir(assets);
  const cssFile = files.find((file) => file.startsWith("index-") && file.endsWith(".css"));
  if (!cssFile) {
    throw new Error("No se encontró el CSS compilado. Ejecuta `npm run build` primero.");
  }
  const css = await readFile(resolve(assets, cssFile), "utf8");
  const fonts = await inlineFonts();
  return `${fonts}\n${css.replace(/@font-face\s*\{[^}]*\}/g, "").trim()}`;
}

async function bundleGame() {
  const result = await build({
    absWorkingDir: root,
    entryPoints: [resolve(root, "app", "standalone.tsx")],
    bundle: true,
    minify: true,
    format: "iife",
    platform: "browser",
    target: ["es2020"],
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "silent",
    write: false,
    legalComments: "none",
  });
  const [file] = result.outputFiles;
  return file.text;
}

/**
 * El juego se compromete deliberadamente con un único mundo visual oscuro
 * (gótico-tecnológico con energía turquesa y violeta), así que se fija
 * `color-scheme: dark` en lugar de inventar una variante clara.
 */
function body(css, script) {
  return `<title>Marcelo: La Ruta Imposible | CV jugable</title>
<style>
:root {
  color-scheme: dark;
  --font-geist-sans: "Geist", "Segoe UI", system-ui, -apple-system, sans-serif;
  --font-geist-mono: "Geist Mono", ui-monospace, "Cascadia Mono", Consolas, monospace;
}
html, body { margin: 0; background: #05060b; color: #eff5ff; }
#root { min-height: 100vh; }
</style>
<style>${css}</style>
<div id="root"></div>
<script>${script}</script>
`;
}

/**
 * Con `PUBLIC_BASE_URL` se añaden la URL canónica y la imagen promocional
 * absoluta, necesarias para que el enlace se vea bien al compartirlo.
 */
function socialTags() {
  const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!base) return "";
  return `<link rel="canonical" href="${base}/" />
<meta property="og:url" content="${base}/" />
<meta property="og:image" content="${base}/og.png" />
<meta property="og:image:width" content="1536" />
<meta property="og:image:height" content="1024" />
<meta property="og:image:alt" content="Marcelo frente a los villanos de su ruta profesional" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Marcelo: La Ruta Imposible" />
<meta name="twitter:description" content="Un CV que no se lee: se supera." />
<meta name="twitter:image" content="${base}/og.png" />
<link rel="icon" href="${base}/favicon.png" />
`;
}

function page(inner) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="description" content="CV interactivo de Marcelo Valeri Quispe Cruz: siete niveles, siete jefes y su trayectoria real en gestión pública, datos, derecho digital e IA. Edición 2026." />
<meta property="og:title" content="Marcelo: La Ruta Imposible" />
<meta property="og:description" content="Un CV que no se lee: se supera." />
<meta property="og:type" content="website" />
<meta property="og:locale" content="es_PE" />
${socialTags()}${inner}</head>
</html>
`.replace("</head>\n</html>", "</html>");
}

const css = await readBuiltCss();
const script = await bundleGame();
const inner = body(css, script);
await mkdir(outputDirectory, { recursive: true });
await writeFile(outputFile, page(inner), "utf8");
await writeFile(resolve(outputDirectory, "index.html"), page(inner), "utf8");
// Versión sin envoltorio para publicadores que aportan <head> y <body>.
await writeFile(resolve(outputDirectory, "artifact-body.html"), inner, "utf8");

console.log(
  `Artefacto autónomo listo: dist/standalone/marcelo-ruta-imposible.html (${(
    page(inner).length / 1024
  ).toFixed(0)} kB) + index.html + artifact-body.html`,
);
