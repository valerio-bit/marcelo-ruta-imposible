import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", host: "localhost" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

function normalize(html) {
  return html.replace(/<!-- -->/g, "");
}

async function source(file) {
  return readFile(new URL(`../app/${file}`, import.meta.url), "utf8");
}

test("renders the finished playable CV shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = normalize(await response.text());
  assert.match(html, /<html lang="es">/);
  assert.match(html, /Marcelo: La Ruta Imposible/);
  assert.match(html, /UN CV QUE NO/);
  assert.match(html, /Mapping public policy and business ecosystems/);
  assert.match(html, /Multidisciplinary Reviews/);
  assert.match(html, /Hackatón Nacional Transformagob 2026/);
  assert.match(html, /Overall Strategy/);
  assert.match(html, /Le Wagon/);
  assert.match(html, /EDICIÓN 2026/);
  assert.match(html, /ACTUALIZACIÓN JULIO DE 2026/);
  assert.match(html, /Nintendo/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("ships keyboard and touch controls with the E charge counter", async () => {
  const html = normalize(await (await render()).text());
  assert.match(html, /Mover a la izquierda/);
  assert.match(html, /Mover a la derecha/);
  assert.match(html, /aria-label="Saltar"/);
  assert.match(html, /Activar poder E\. Cargas disponibles: 3/);
  assert.match(html, /Cambiar poder equipado/);
  assert.match(html, /PODER ×3/);
  assert.match(html, /ESPACIO/);
  assert.match(html, /PAUSA/);
});

test("exposes ARIA state for level, energy, charges, documents and boss", async () => {
  const html = normalize(await (await render()).text());
  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /Cargas de E/);
  assert.match(html, /Energía/);
  assert.match(html, /Documentos/);
  assert.match(html, /Poder equipado/);
  assert.match(html, /aria-pressed=/);
});

test("keeps no secrets or external calls in the frontend", async () => {
  const html = normalize(await (await render()).text());
  assert.doesNotMatch(html, /api[_-]?key|sk-[a-z0-9]{10,}|bearer\s+[a-z0-9]{12,}/i);
  const game = await source("GameCV.tsx");
  const engine = await source("engine.ts");
  for (const code of [game, engine]) {
    assert.doesNotMatch(code, /api\.anthropic\.com|api\.openai\.com|process\.env\./);
  }
});

test("keeps original systems and adds the new ones in source", async () => {
  const engine = await source("engine.ts");
  const data = await source("cv-data.ts");
  const render_ = await source("render.ts");
  const audio = await source("audio.ts");
  const game = await source("GameCV.tsx");

  // Enemigos: los originales más los tres arquetipos nuevos.
  for (const kind of ["walker", "flyer", "ranged", "summoner", "spawnling", "zombie"]) {
    assert.match(engine, new RegExp(`"${kind}"`), `falta el enemigo ${kind}`);
  }
  assert.match(engine, /ZOMBIE_WARNING = 2/);
  assert.match(engine, /MAX_SPAWNLINGS/);

  // Bloques y su ruptura por golpe y por pulso.
  assert.match(engine, /hitBlock/);
  assert.match(engine, /breakable/);
  assert.match(engine, /"bump" \| "smash" \| "pulse"/);
  assert.match(render_, /grietas progresivas/i);

  // Jefes con fases y telegrafía.
  assert.match(data, /phases:/);
  assert.match(engine, /telegraph/);
  assert.match(render_, /boss\.hp \/ boss\.maxHp/);
  assert.match(render_, /drawLevelMotif/);
  assert.match(render_, /drawAmbient/);

  // Cargas de E y persistencia.
  assert.match(engine, /world\.charges -= 1/);
  const store = await source("client-state.ts");
  assert.match(store, /marcelo-route-save-v2/);
  assert.match(store, /marcelo-route-save-v1/);
  assert.match(store, /charges/);
  assert.match(store, /localStorage/);

  // Panel contextual del CV y panel de poderes.
  assert.match(game, /cv-dock/);
  assert.match(game, /power-dock/);
  assert.match(game, /VER EXPEDIENTE COMPLETO/);

  // Sonidos originales para cada situación pedida.
  for (const sound of [
    "blockBreak",
    "hurt",
    "enemyHit",
    "enemyDown",
    "shoot",
    "zombieRise",
    "summon",
    "bossDash",
    "bossDown",
    "pulse",
    "recharge",
    "document",
    "win",
    "lose",
  ]) {
    assert.match(audio, new RegExp(`case "${sound}"`), `falta el sonido ${sound}`);
  }
  assert.doesNotMatch(audio, /\.mp3|\.ogg|\.wav|fetch\(/);

  // Efectos y accesibilidad.
  assert.match(engine, /reducedMotion/);
  assert.match(engine, /shake/);
  assert.match(store, /prefers-reduced-motion/);
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);

  // Identidad original: se conserva la aclaración y no hay recursos ajenos.
  assert.match(game, /Sin personajes, niveles, sonidos ni recursos de Nintendo/);
  for (const code of [engine, data, render_, audio, game]) {
    assert.doesNotMatch(code, /mario|goomba|koopa|mushroom|bowser|luigi/i);
  }
});

test("keeps the promotional key art wired as Open Graph image", async () => {
  const layout = await source("layout.tsx");
  assert.match(layout, /og\.png/);
  assert.match(layout, /summary_large_image/);
});


test("los datos del CV coinciden con los certificados revisados", async () => {
  const data = await source("cv-data.ts");
  // Fechas e instituciones tomadas del documento, no de memoria.
  assert.match(data, /Overall Strategy S\.A\.C/);
  assert.match(data, /22 sep — 21 oct 2026/);
  assert.match(data, /PCM-SGTD-2026-38-LEJQ4Y/);
  assert.match(data, /Multidisciplinary Reviews — Malque Publishing/);
  assert.match(data, /IRF26-MOQUEGUA-001/);
  assert.match(data, /259 créditos/);
  assert.match(data, /CLAD N\.° 58365/);
  // Correcciones verificadas.
  assert.match(data, /24 set — 25 nov 2024/);
  assert.doesNotMatch(data, /«En Órbita» \(40 h\)",\s*issuer: "ProInnovate"/);
});

test("el retrato viaja incrustado, sin peticiones externas", async () => {
  const portrait = await source("portrait.ts");
  assert.match(portrait, /^\/\*\*/);
  assert.match(portrait, /data:image\/jpeg;base64,/);
  const game = await source("GameCV.tsx");
  assert.match(game, /PORTRAIT/);
});
