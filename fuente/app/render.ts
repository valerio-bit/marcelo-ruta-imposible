/**
 * Capa de dibujo en canvas. Mantiene la identidad del proyecto: tecnológica,
 * oscura, épica y fantástico-gótica, con energía turquesa y violeta.
 * Arte, siluetas y efectos son originales.
 *
 * Reglas de rendimiento (para sostener 60 fps en celular):
 *  - `shadowBlur` solo en elementos únicos, nunca dentro de un bucle.
 *  - Los degradados se cachean por clave; no se crean por fotograma.
 *  - Un solo reloj `t` por fotograma en lugar de muchos `Date.now()`.
 */

import { LEVELS, POWER_BY_ID, type LevelDef } from "./cv-data.ts";
import {
  ARENA_GATE_X,
  ARENA_X,
  GATE_X,
  GROUND_Y,
  PLAYER_H,
  PLAYER_W,
  VIEW_H,
  VIEW_W,
  requiredDocuments,
  type Enemy,
  type Particle,
  type Projectile,
  type WorldState,
} from "./engine.ts";

/** Reloj del fotograma, fijado una vez en drawWorld. */
let t = 0;
/** Cuando el jugador pide menos movimiento, las animaciones se congelan. */
let calm = false;

type Gradientish = { addColorStop: (offset: number, color: string) => void };
const gradientCache = new Map<string, Gradientish>();

function cachedLinear(
  ctx: CanvasRenderingContext2D,
  key: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stops: [number, string][],
) {
  const existing = gradientCache.get(key);
  if (existing) return existing as CanvasGradient;
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  gradientCache.set(key, gradient);
  return gradient;
}

/**
 * Capas que no dependen de la cámara se dibujan una sola vez en un lienzo
 * aparte y luego se vuelcan de golpe. En Node (pruebas) no hay `document`,
 * así que se devuelve null y se dibuja de la forma directa.
 */
type Baked = { width: number; height: number } | null;
const bakedLayers = new Map<string, Baked>();

function bake(key: string, paint: (target: CanvasRenderingContext2D) => void): Baked {
  if (bakedLayers.has(key)) return bakedLayers.get(key) ?? null;
  if (typeof document === "undefined") {
    bakedLayers.set(key, null);
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const target = canvas.getContext("2d");
  if (!target) {
    bakedLayers.set(key, null);
    return null;
  }
  paint(target);
  bakedLayers.set(key, canvas);
  return canvas;
}

let vignetteCache: CanvasGradient | null = null;
function cachedVignette(ctx: CanvasRenderingContext2D) {
  if (vignetteCache && typeof document === "undefined") return vignetteCache;
  const gradient = ctx.createRadialGradient(480, 270, 290, 480, 270, 620);
  gradient.addColorStop(0, "#02030a00");
  gradient.addColorStop(1, "#02030a");
  vignetteCache = gradient;
  return gradient;
}

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

/** Resplandor barato: un disco difuminado en vez de `shadowBlur`. */
function glow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha = 0.3,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Texto con contorno oscuro: legible sobre cualquier fondo. */
function haloText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width = 3,
) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineWidth = width;
  ctx.strokeStyle = "#02030a";
  ctx.strokeText(text, x, y);
  ctx.restore();
  ctx.fillText(text, x, y);
}

/* ───────────────────────── FONDO ───────────────────────── */

function paintSky(target: CanvasRenderingContext2D, level: LevelDef, inArena: boolean) {
  const gradient = target.createLinearGradient(0, 0, 0, VIEW_H);
  gradient.addColorStop(0, inArena ? "#04030a" : level.palette[0]);
  gradient.addColorStop(0.62, inArena ? level.palette[0] : level.palette[1]);
  gradient.addColorStop(1, "#05060c");
  target.fillStyle = gradient;
  target.fillRect(0, 0, VIEW_W, VIEW_H);
  // Aurora: dos manchas de energía, la firma de color del juego.
  glow(target, 760, 150, 300, "#8d64ff", 0.13);
  glow(target, 190, 320, 240, level.palette[2], 0.09);
}

function drawSky(ctx: CanvasRenderingContext2D, level: LevelDef, inArena: boolean) {
  const key = `sky-${level.id}-${inArena ? "arena" : "ruta"}`;
  const layer = bake(key, (target) => paintSky(target, level, inArena));
  if (layer) {
    ctx.drawImage(layer as CanvasImageSource, 0, 0);
    return;
  }
  paintSky(ctx, level, inArena);
}

function drawStars(ctx: CanvasRenderingContext2D, level: LevelDef, cameraX: number) {
  ctx.save();
  ctx.globalAlpha = 0.38;
  for (let i = 0; i < 34; i += 1) {
    const x = ((i * 191 - cameraX * 0.04) % (VIEW_W + 80)) - 40;
    const y = 28 + ((i * 83) % 250);
    const twinkle = calm ? 1 : 0.6 + Math.sin(t * 2 + i) * 0.4;
    ctx.globalAlpha = 0.2 + twinkle * 0.3;
    ctx.fillStyle = i % 5 === 0 ? level.palette[3] : "#ffffff";
    const size = i % 3 === 0 ? 2 : 1;
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();
}

/** Prismas de cristal suspendidos, como los del arte clave. */
function drawFloatingCrystals(
  ctx: CanvasRenderingContext2D,
  level: LevelDef,
  cameraX: number,
) {
  ctx.save();
  ctx.globalAlpha = 0.34;
  for (let i = 0; i < 5; i += 1) {
    const x = ((i * 268 - cameraX * 0.08) % (VIEW_W + 300)) - 150;
    const bob = calm ? 0 : Math.sin(t * 0.7 + i * 1.4) * 9;
    const y = 54 + ((i * 97) % 150) + bob;
    const h = 58 + (i % 3) * 22;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.18 + (i % 2) * 0.36);
    ctx.fillStyle = i % 2 === 0 ? "#5b3fd9" : level.palette[2];
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(17, -h / 6);
    ctx.lineTo(17, h / 6);
    ctx.lineTo(0, h / 2);
    ctx.lineTo(-17, h / 6);
    ctx.lineTo(-17, -h / 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `${level.palette[3]}66`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawMountains(ctx: CanvasRenderingContext2D, level: LevelDef, cameraX: number) {
  const offset = cameraX * 0.16;
  ctx.save();
  ctx.fillStyle = "#2a1a4a";
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(-40, GROUND_Y);
  for (let i = -1; i < 14; i += 1) {
    const x = i * 150 - (offset % 150);
    const peak = 196 + Math.sin(i * 1.7) * 46 + ((i * 37) % 40);
    ctx.lineTo(x, peak + 26);
    ctx.lineTo(x + 75, peak);
    ctx.lineTo(x + 150, peak + 34);
  }
  ctx.lineTo(VIEW_W + 60, GROUND_Y);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = "#8d64ff";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/** Catedral tecnológica: presente en toda la ruta, imponente en la arena. */
function drawCathedral(
  ctx: CanvasRenderingContext2D,
  level: LevelDef,
  cameraX: number,
  inArena: boolean,
) {
  const near = inArena || ["gestion", "sistema", "jefe"].includes(level.id);
  const speed = near ? 0.22 : 0.12;
  const scale = near ? 1 : 0.58;
  const baseX = inArena
    ? 300 - ((cameraX - ARENA_X) * 0.24) % 1400
    : 540 - ((cameraX * speed) % 1020);

  ctx.save();
  ctx.globalAlpha = near ? 1 : 0.5;
  ctx.translate(baseX, GROUND_Y);
  ctx.scale(scale, scale);
  ctx.translate(0, -GROUND_Y);

  ctx.fillStyle = level.id === "jefe" || inArena ? "#09060e" : "#0a1120";
  ctx.fillRect(0, 228, 580, 240);
  ctx.fillRect(-72, 162, 116, 306);
  ctx.fillRect(536, 145, 122, 323);
  ctx.fillRect(210, 190, 150, 278);
  for (const towerX of [-72, 210, 536]) {
    for (let tooth = 0; tooth < 4; tooth += 1) {
      ctx.fillRect(towerX + tooth * 30, towerX === 210 ? 166 : 122, 18, 48);
    }
  }
  // Agujas: el perfil gótico del arte clave.
  for (const [spireX, spireH] of [
    [-14, 92],
    [285, 150],
    [597, 108],
  ]) {
    ctx.beginPath();
    ctx.moveTo(spireX, 162 - spireH);
    ctx.lineTo(spireX - 26, 170);
    ctx.lineTo(spireX + 26, 170);
    ctx.closePath();
    ctx.fill();
  }

  // Ventanas ojivales iluminadas.
  ctx.fillStyle = `${level.palette[3]}3a`;
  for (let wx = -40; wx < 630; wx += 92) {
    ctx.beginPath();
    ctx.moveTo(wx - 10, 328);
    ctx.lineTo(wx - 10, 292);
    ctx.quadraticCurveTo(wx, 262, wx + 10, 292);
    ctx.lineTo(wx + 10, 328);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#03050a";
  ctx.beginPath();
  ctx.moveTo(245, GROUND_Y);
  ctx.lineTo(245, 398);
  ctx.quadraticCurveTo(285, 338, 325, 398);
  ctx.lineTo(325, GROUND_Y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // El ojo del algoritmo vigila la arena final.
  if (inArena) {
    const eyeX = baseX + 285 * scale;
    const eyeY = 150;
    ctx.save();
    ctx.fillStyle = "#07050d";
    ctx.beginPath();
    ctx.moveTo(eyeX, 34);
    ctx.lineTo(eyeX - 82, 232);
    ctx.lineTo(eyeX + 82, 232);
    ctx.closePath();
    ctx.fill();
    glow(ctx, eyeX, eyeY, 56, level.palette[2], calm ? 0.22 : 0.18 + Math.sin(t * 1.6) * 0.1);
    ctx.fillStyle = level.palette[3];
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a0620";
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, 7, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cejas oblicuas: la mirada del arte clave.
    ctx.fillStyle = "#07050d";
    ctx.beginPath();
    ctx.moveTo(eyeX - 34, eyeY - 20);
    ctx.lineTo(eyeX - 4, eyeY - 8);
    ctx.lineTo(eyeX - 34, eyeY - 4);
    ctx.closePath();
    ctx.moveTo(eyeX + 34, eyeY - 20);
    ctx.lineTo(eyeX + 4, eyeY - 8);
    ctx.lineTo(eyeX + 34, eyeY - 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawCity(ctx: CanvasRenderingContext2D, level: LevelDef, cameraX: number) {
  const offset = cameraX * 0.34;
  for (let i = -1; i < 16; i += 1) {
    const x = i * 90 - (offset % 90);
    const h = 60 + ((i * 47 + level.year.length * 15) % 150);
    ctx.fillStyle = i % 2 === 0 ? "#090d1d" : "#10152b";
    ctx.fillRect(x, GROUND_Y - h, 64, h);
    ctx.fillStyle = `${level.palette[3]}3c`;
    for (let yy = GROUND_Y - h + 16; yy < 450; yy += 22) {
      ctx.fillRect(x + 12, yy, 9, 5);
      ctx.fillRect(x + 38, yy, 9, 5);
    }
  }
}

/**
 * Motivo propio de cada etapa: la silueta cuenta de qué trata el nivel
 * sin una sola imagen externa.
 */
function drawLevelMotif(
  ctx: CanvasRenderingContext2D,
  level: LevelDef,
  levelIndex: number,
  cameraX: number,
) {
  const offset = cameraX * 0.26;
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = level.palette[3];
  ctx.fillStyle = level.palette[2];
  ctx.lineWidth = 2;

  switch (levelIndex) {
    case 0: {
      // Archivo: estanterías y pilas de expedientes.
      for (let i = -1; i < 9; i += 1) {
        const x = i * 150 - (offset % 150);
        ctx.fillRect(x, 336, 112, 5);
        ctx.fillRect(x, 392, 112, 5);
        ctx.fillRect(x + 4, 341, 5, 51);
        ctx.fillRect(x + 103, 341, 5, 51);
        ctx.globalAlpha = 0.22;
        for (let k = 0; k < 4; k += 1) ctx.fillRect(x + 16 + k * 22, 352, 14, 40);
        ctx.globalAlpha = 0.3;
      }
      break;
    }
    case 1: {
      // Ciudad suspendida: cableado colgante con nodos encendidos.
      for (let i = -1; i < 8; i += 1) {
        const x = i * 190 - (offset % 190);
        ctx.beginPath();
        ctx.moveTo(x, 268);
        ctx.quadraticCurveTo(x + 95, 348, x + 190, 268);
        ctx.stroke();
        const on = calm ? 0.5 : 0.5 + Math.sin(t * 2 + i) * 0.5;
        ctx.globalAlpha = 0.25 + on * 0.5;
        ctx.beginPath();
        ctx.arc(x + 95, 328, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.3;
      }
      break;
    }
    case 2: {
      // Fábrica: engranajes girando a dos escalas.
      for (let i = -1; i < 6; i += 1) {
        const x = i * 240 - (offset % 240);
        for (const [cx, cy, r, dir] of [
          [x, 300, 42, 1],
          [x + 64, 342, 26, -1],
        ]) {
          const spin = calm ? 0 : t * 0.5 * dir;
          ctx.beginPath();
          ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
          ctx.stroke();
          for (let k = 0; k < 10; k += 1) {
            const a = spin + (Math.PI * 2 * k) / 10;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62);
            ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
            ctx.stroke();
          }
        }
      }
      break;
    }
    case 3: {
      // Laberinto del papel: balanzas y columnas.
      for (let i = -1; i < 7; i += 1) {
        const x = i * 210 - (offset % 210);
        ctx.fillRect(x, 268, 7, 108);
        for (let k = 0; k < 5; k += 1) ctx.fillRect(x + 1, 274 + k * 20, 5, 12);
        ctx.beginPath();
        ctx.moveTo(x - 44, 272);
        ctx.lineTo(x + 52, 272);
        ctx.stroke();
        for (const plate of [x - 40, x + 48]) {
          ctx.beginPath();
          ctx.arc(plate, 290, 17, 0, Math.PI);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(plate, 272);
          ctx.lineTo(plate, 290);
          ctx.stroke();
        }
      }
      break;
    }
    case 4: {
      // Núcleo de datos: barras y línea de tendencia.
      ctx.beginPath();
      for (let i = -1; i < 24; i += 1) {
        const x = i * 54 - (offset % 54);
        const h = 34 + ((i * 53) % 96);
        ctx.fillRect(x, 376 - h, 26, h);
        if (i === -1) ctx.moveTo(x + 13, 366 - h);
        else ctx.lineTo(x + 13, 366 - h);
      }
      ctx.strokeStyle = "#99f4ff";
      ctx.stroke();
      break;
    }
    case 5: {
      // Frontera: malla de nodos con un pulso viajando.
      const nodes: [number, number][] = [];
      for (let i = -1; i < 10; i += 1) {
        const x = i * 128 - (offset % 128);
        nodes.push([x, 262 + ((i * 61) % 96)]);
      }
      for (let i = 0; i < nodes.length - 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(nodes[i][0], nodes[i][1]);
        ctx.lineTo(nodes[i + 1][0], nodes[i + 1][1]);
        ctx.stroke();
      }
      for (const [x, y] of nodes) {
        ctx.beginPath();
        for (let k = 0; k < 6; k += 1) {
          const a = (Math.PI / 3) * k;
          const px = x + Math.cos(a) * 9;
          const py = y + Math.sin(a) * 9;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    default: {
      // Cámara del algoritmo: haces de luz violeta cayendo del techo.
      for (let i = -1; i < 7; i += 1) {
        const x = i * 192 - (offset % 192);
        const sway = calm ? 0 : Math.sin(t * 0.4 + i) * 10;
        ctx.globalAlpha = 0.12 + (i % 3) * 0.05;
        ctx.fillStyle = "#8d64ff";
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 22, 0);
        ctx.lineTo(x + 46 + sway, GROUND_Y);
        ctx.lineTo(x - 2 + sway, GROUND_Y);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
  }
  ctx.restore();
}

/** Niebla en tres bandas: da profundidad sin coste real. */
function drawFog(ctx: CanvasRenderingContext2D, cameraX: number) {
  const bands: [number, number, number][] = [
    [336, 0.16, 0.22],
    [444, 0.4, 0.3],
  ];
  ctx.save();
  for (const [y, speed, alpha] of bands) {
    const shift = -((cameraX * speed + (calm ? 0 : t * 12)) % (VIEW_W + 200));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = cachedLinear(ctx, `fog-${y}`, 0, y - 36, 0, y + 36, [
      [0, "#0e0a2400"],
      [0.5, "#0e0a24"],
      [1, "#0e0a2400"],
    ]);
    ctx.fillRect(shift, y - 36, VIEW_W + 200, 72);
    ctx.fillRect(shift + VIEW_W + 200, y - 36, VIEW_W + 200, 72);
  }
  ctx.restore();
}

/** Motas de energía flotando: la atmósfera del arte clave. */
function drawAmbient(ctx: CanvasRenderingContext2D, cameraX: number) {
  if (calm) return;
  ctx.save();
  for (let i = 0; i < 22; i += 1) {
    const speed = 10 + (i % 5) * 4;
    const x = ((i * 137 - cameraX * 0.5) % (VIEW_W + 60)) - 30;
    const y = ((VIEW_H + 40 - ((t * speed + i * 67) % (VIEW_H + 80))) + VIEW_H) % VIEW_H;
    const drift = Math.sin(t * 0.9 + i) * 6;
    ctx.globalAlpha = i % 2 === 0 ? 0.45 : 0.55;
    ctx.fillStyle = i % 2 === 0 ? "#8d64ff" : "#12d9be";
    ctx.beginPath();
    ctx.arc(x + drift, y, 1.3 + (i % 3) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  level: LevelDef,
  levelIndex: number,
  cameraX: number,
  inArena: boolean,
) {
  drawSky(ctx, level, inArena);
  drawStars(ctx, level, cameraX);
  drawFloatingCrystals(ctx, level, cameraX);
  drawMountains(ctx, level, cameraX);
  drawCathedral(ctx, level, cameraX, inArena);
  drawCity(ctx, level, cameraX);
  drawLevelMotif(ctx, level, levelIndex, cameraX);
}

/* ───────────────────────── TERRENO ───────────────────────── */

function drawTerrain(ctx: CanvasRenderingContext2D, world: WorldState, level: LevelDef) {
  for (const platform of world.platforms) {
    const x = platform.x - world.cameraX;
    if (x > VIEW_W + 80 || x + platform.w < -80) continue;
    ctx.fillStyle = cachedLinear(
      ctx,
      `plat-${level.id}-${platform.y}-${platform.h}`,
      0,
      platform.y,
      0,
      platform.y + platform.h,
      [
        [0, level.palette[2]],
        [0.08, level.palette[3]],
        [0.12, "#172035"],
        [1, "#080b14"],
      ],
    );
    rounded(ctx, x, platform.y, platform.w, platform.h, 7);
    ctx.fill();
    // Veta luminosa en el borde superior: el cristal del arte clave.
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = level.palette[3];
    ctx.fillRect(x + 5, platform.y + 1, platform.w - 10, 2);
    ctx.restore();
    ctx.fillStyle = `${level.palette[3]}20`;
    for (let tx = x + 18; tx < x + platform.w - 8; tx += 42) {
      ctx.fillRect(tx, platform.y + 18, 2, Math.min(32, platform.h - 22));
    }
  }

  const ground = world.platforms
    .filter((platform) => platform.y === GROUND_Y && platform.h === 72)
    .sort((a, b) => a.x - b.x);
  for (let i = 0; i < ground.length - 1; i += 1) {
    const start = ground[i].x + ground[i].w - world.cameraX;
    const end = ground[i + 1].x - world.cameraX;
    if (end < 0 || start > VIEW_W || end <= start) continue;
    ctx.fillStyle = cachedLinear(ctx, "pit", 0, GROUND_Y, 0, VIEW_H, [
      [0, "#ff4e6b22"],
      [1, "#000000"],
    ]);
    ctx.fillRect(start, GROUND_Y, end - start, 72);
    ctx.fillStyle = "#ff6a704d";
    for (let spike = start + 8; spike < end - 4; spike += 18) {
      ctx.beginPath();
      ctx.moveTo(spike, 530);
      ctx.lineTo(spike + 7, 498);
      ctx.lineTo(spike + 14, 530);
      ctx.fill();
    }
  }
}

function drawBlocks(ctx: CanvasRenderingContext2D, world: WorldState, level: LevelDef) {
  for (const block of world.blocks) {
    if (block.broken) continue;
    const wobble = block.shake > 0 ? Math.sin(block.shake * 70) * 3 : 0;
    const x = block.x - world.cameraX + wobble;
    const y = block.y;
    if (x > VIEW_W + 60 || x + block.w < -60) continue;

    if (block.breakable) {
      // Bloque rompible: ámbar cálido, borde brillante y grietas visibles.
      ctx.fillStyle = cachedLinear(ctx, "block-break", 0, y, 0, y + block.h, [
        [0, "#ffd97a"],
        [0.55, "#f0a63c"],
        [1, "#a45a14"],
      ]);
      ctx.save();
      ctx.translate(x, 0);
      rounded(ctx, 0, y, block.w, block.h, 7);
      ctx.fill();
      ctx.strokeStyle = "#fff0c0";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#6d3a0a55";
      for (let i = 0; i < 4; i += 1) {
        ctx.fillRect(7 + i * 9, y + 7, 3, 3);
        ctx.fillRect(7 + i * 9, y + block.h - 10, 3, 3);
      }
      // Grietas progresivas según los golpes recibidos.
      ctx.strokeStyle = "#5a2c05";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(12, y + 8);
      ctx.lineTo(22, y + 22);
      ctx.lineTo(16, y + 38);
      ctx.moveTo(22, y + 22);
      ctx.lineTo(36, y + 15);
      ctx.stroke();
      if (block.hits > 0) {
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(4, y + 30);
        ctx.lineTo(20, y + 26);
        ctx.lineTo(30, y + 42);
        ctx.moveTo(30, y + 6);
        ctx.lineTo(34, y + 24);
        ctx.stroke();
      }
      ctx.restore();
      if (!calm && block.hits > 0) {
        glow(ctx, x + block.w / 2, y + block.h / 2, 26, "#ffc65c", 0.14);
      }
    } else {
      // Bloque indestructible: acero frío, remaches y sin brillo cálido.
      ctx.fillStyle = cachedLinear(ctx, "block-solid", 0, y, 0, y + block.h, [
        [0, "#8f9db6"],
        [1, "#222c40"],
      ]);
      rounded(ctx, x, y, block.w, block.h, 4);
      ctx.fill();
      ctx.strokeStyle = "#0d1422";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "#0b1220aa";
      ctx.fillRect(x + 6, y + 6, block.w - 12, 4);
      ctx.fillRect(x + 6, y + block.h - 10, block.w - 12, 4);
      ctx.fillStyle = "#c9d6ea";
      for (const [cx, cy] of [
        [x + 9, y + 9],
        [x + block.w - 9, y + 9],
        [x + 9, y + block.h - 9],
        [x + block.w - 9, y + block.h - 9],
      ]) {
        ctx.beginPath();
        ctx.arc(cx, cy, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = `${level.palette[2]}55`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 14, y + block.h / 2);
      ctx.lineTo(x + block.w - 14, y + block.h / 2);
      ctx.stroke();
    }
  }
}

function drawCollectibles(ctx: CanvasRenderingContext2D, world: WorldState, level: LevelDef) {
  for (const item of world.collectibles) {
    if (item.taken) continue;
    const x = item.x - world.cameraX;
    if (x < -60 || x > VIEW_W + 60) continue;
    const bob = calm ? 0 : Math.sin(t * 2 + item.index) * 5;
    const scale = calm ? 1 : 1 + Math.sin(t * 2.6 + item.index) * 0.07;
    glow(ctx, x, item.y + bob, 40, level.palette[3], 0.22);
    ctx.save();
    ctx.translate(x, item.y + bob);
    ctx.scale(scale, scale);
    ctx.fillStyle = `${level.palette[3]}e6`;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(18, -6);
    ctx.lineTo(18, 14);
    ctx.lineTo(0, 24);
    ctx.lineTo(-18, 14);
    ctx.lineTo(-18, -6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffffffcc";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = "#04121a";
    ctx.fillRect(-9, -12, 18, 3);
    ctx.fillRect(-9, -5, 18, 2);
    ctx.fillRect(-9, 1, 12, 2);
    ctx.fillStyle = level.palette[1];
    ctx.font = "700 10px Geist Mono, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(level.documents[item.index]?.icon ?? "◇", 0, 13);
    ctx.restore();
  }
}

/* ───────────────────────── ENTIDADES ───────────────────────── */

/**
 * Animación tipo stop motion: en vez de interpolar, el dibujo salta entre
 * poses discretas a 8 por segundo. Da el pulso entrecortado de la animación
 * cuadro a cuadro en lugar del deslizamiento habitual de una web.
 */
const STOP_FPS = 8;
// Tablas de poses: constantes de módulo para no asignar arrays por fotograma.
const BOB = [0, -3, 0, 3];
const SQUASH_SOFT = [0, 0.05, 0, -0.05];
const SQUASH_WALK = [0, 0.06, 0, -0.04];
const HOP_SQUASH = [0.18, -0.12, -0.04, 0.08];
const HOP_LIFT = [0, -5, -3, 0];
const SWAY = [-3, 0, 3, 0];
const TREMBLE = [0, 1, 0, -1];
const FLEX = [0, 2, 0, -2];
const LEAN = [-0.06, 0, 0.06, 0];
const ARM = [0, -2, 0, 2];
const STAMP = [0, -7, -3, 0];
const WARN_ALPHA = [0.3, 0.9, 0.4, 0.8];
const BOUNCE = [0, -1.5, 0, -1];
const BREATHE = [0, 0.03, 0, -0.02];
function pose(seed: number, frames = 4) {
  if (calm) return 0;
  return (Math.floor(t * STOP_FPS) + seed) % frames;
}

/** Mezcla un color hacia el blanco (k > 0) o hacia el negro (k < 0). */
function tint(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) =>
    Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k))
      .toString(16)
      .padStart(2, "0");
  return "#" + mix((n >> 16) & 255) + mix((n >> 8) & 255) + mix(n & 255);
}

type Mood = "calm" | "alert" | "angry" | "hurt";

function moodOf(enemy: Enemy): Mood {
  if (enemy.hurt > 0) return "hurt";
  if (enemy.aim > 0 || enemy.telegraph > 0) return "alert";
  if (enemy.kind === "zombie") return enemy.state === "active" ? "angry" : "calm";
  if (enemy.kind === "walker" || enemy.kind === "spawnling") return "angry";
  return "calm";
}

/** Sombra proyectada: se achica cuando la criatura está en el aire. */
function castShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  groundY: number,
  w: number,
  lift: number,
) {
  const k = Math.max(0.35, 1 - Math.abs(lift) / 160);
  ctx.save();
  ctx.globalAlpha = 0.34 * k;
  ctx.fillStyle = "#03040a";
  ctx.beginPath();
  ctx.ellipse(cx, groundY, (w / 2) * k, 5 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Ojos y boca según el estado. Es lo que convierte una mancha de color en un
 * personaje: el jugador lee la intención antes de mirar la barra de vida.
 */
function face(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spread: number,
  mood: Mood,
  facing: number,
  frame: number,
) {
  const blink = mood === "calm" && frame === 3;
  const eyeW = mood === "alert" ? 7 : 6;
  const eyeH = blink ? 1.5 : mood === "alert" ? 7 : mood === "angry" ? 4 : 5;

  for (const side of [-1, 1]) {
    const ex = cx + side * spread;
    if (mood === "hurt") {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex - 4, cy - 4);
      ctx.lineTo(ex + 4, cy + 4);
      ctx.moveTo(ex + 4, cy - 4);
      ctx.lineTo(ex - 4, cy + 4);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = "#f6fbff";
    ctx.beginPath();
    ctx.ellipse(ex, cy, eyeW / 2, eyeH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!blink) {
      ctx.fillStyle = "#0a0a14";
      ctx.beginPath();
      ctx.arc(ex + facing * 1.4, cy + (mood === "alert" ? -0.6 : 0.4), 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    if (mood === "angry" || mood === "alert") {
      ctx.strokeStyle = "#07070f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex - side * 5, cy - 7 + (mood === "angry" ? side * -1.5 : 0));
      ctx.lineTo(ex + side * 5, cy - 9 + (mood === "angry" ? side * 2.5 : 0));
      ctx.stroke();
    }
  }

  ctx.strokeStyle = "#07070f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (mood === "angry") {
    ctx.moveTo(cx - 7, cy + 10);
    ctx.lineTo(cx - 3, cy + 13);
    ctx.lineTo(cx + 1, cy + 10);
    ctx.lineTo(cx + 5, cy + 13);
    ctx.lineTo(cx + 8, cy + 10);
  } else if (mood === "alert") {
    ctx.ellipse(cx, cy + 11, 3.4, 4.2, 0, 0, Math.PI * 2);
  } else if (mood === "hurt") {
    ctx.moveTo(cx - 7, cy + 12);
    ctx.quadraticCurveTo(cx, cy + 7, cx + 7, cy + 12);
  } else {
    ctx.moveTo(cx - 6, cy + 11);
    ctx.lineTo(cx + 6, cy + 11);
  }
  ctx.stroke();
}

/** Cuerpo con volumen: base oscura, masa, luz superior y filo de contraluz. */
function volume(
  ctx: CanvasRenderingContext2D,
  draw: (target: CanvasRenderingContext2D) => void,
  base: string,
  rim: string,
) {
  ctx.save();
  ctx.translate(2.5, 3);
  ctx.fillStyle = tint(base, -0.62);
  draw(ctx);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = base;
  draw(ctx);
  ctx.fill();

  if (!calm) {
    ctx.save();
    draw(ctx);
    ctx.clip();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = tint(base, 0.42);
    ctx.beginPath();
    ctx.ellipse(-2, -8, 28, 17, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.strokeStyle = rim;
  ctx.lineWidth = 1.6;
  draw(ctx);
  ctx.stroke();
}

function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  level: LevelDef,
  cameraX: number,
) {
  if (!enemy.alive) return;
  const x = enemy.x - cameraX;
  if (x < -140 || x > VIEW_W + 140) return;
  const frame = pose(enemy.id);
  const mood = moodOf(enemy);
  const flash = enemy.hurt > 0 && Math.floor(enemy.hurt * 40) % 2 === 0;

  ctx.save();
  ctx.translate(x, enemy.y);

  switch (enemy.kind) {
    case "flyer": {
      // Dron: las aspas saltan entre cuatro posiciones fijas, no giran suave.
      const bob = BOB[frame];
      castShadow(ctx, enemy.w / 2, GROUND_Y - enemy.y, enemy.w, GROUND_Y - enemy.y);
      ctx.translate(0, bob);
      const blade = (frame * Math.PI) / 4;
      ctx.fillStyle = level.palette[3] + "cc";
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(enemy.w / 2, enemy.h / 2 - 10);
        ctx.rotate(side * 0.55 + blade);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(side * 34, -5);
        ctx.lineTo(side * 30, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      const hex = (c: CanvasRenderingContext2D) => {
        c.beginPath();
        for (let i = 0; i < 6; i += 1) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const px = enemy.w / 2 + Math.cos(angle) * (enemy.w / 2);
          const py = enemy.h / 2 + Math.sin(angle) * (enemy.h / 2);
          if (i === 0) c.moveTo(px, py);
          else c.lineTo(px, py);
        }
        c.closePath();
      };
      volume(ctx, hex, flash ? "#ffffff" : "#2b3450", level.palette[2]);
      face(ctx, enemy.w / 2, enemy.h / 2 - 2, 9, mood, enemy.facing, frame);
      ctx.restore();
      glow(ctx, x + enemy.w / 2, enemy.y + enemy.h / 2 + bob, 15, "#b57bff", 0.42);
      return;
    }

    case "ranged": {
      // Torreta: retrocede y se encoge al disparar.
      const charge = enemy.aim > 0 ? 1 - enemy.aim / 0.7 : 0;
      const recoil = enemy.aim > 0 && frame % 2 === 1 ? -2 : 0;
      castShadow(ctx, enemy.w / 2, enemy.h + 4, enemy.w, 0);
      ctx.translate(enemy.facing * recoil, 0);
      const body = (c: CanvasRenderingContext2D) => {
        c.beginPath();
        c.roundRect(2, 8, enemy.w - 4, enemy.h - 8, 9);
      };
      volume(ctx, body, flash ? "#ffffff" : "#243049", "#ff9d6c");
      ctx.fillStyle = "#0a0e18";
      ctx.fillRect(enemy.facing > 0 ? enemy.w - 6 : -12, 16, 18, 10);
      if (enemy.aim > 0) {
        ctx.globalAlpha = 0.35 + charge * 0.65;
        ctx.fillStyle = "#ffb15c";
        ctx.beginPath();
        ctx.arc(enemy.w / 2 + enemy.facing * 20, 21, 5 + charge * 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = charge > 0.5 ? "#ffb15ccc" : "#ffb15c66";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(enemy.w / 2 + enemy.facing * 24, 21);
        ctx.lineTo(enemy.w / 2 + enemy.facing * (60 + charge * 90), 21);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      face(ctx, enemy.w / 2, enemy.h * 0.48, 8, mood, enemy.facing, frame);
      break;
    }

    case "summoner": {
      // Colmena: late y abre la compuerta en dos cuadros.
      const squash = SQUASH_SOFT[frame];
      castShadow(ctx, enemy.w / 2, GROUND_Y - enemy.y, enemy.w, GROUND_Y - enemy.y);
      ctx.translate(enemy.w / 2, enemy.h / 2);
      ctx.scale(1 + squash, 1 - squash);
      ctx.translate(-enemy.w / 2, -enemy.h / 2);
      const shell = (c: CanvasRenderingContext2D) => {
        c.beginPath();
        c.ellipse(enemy.w / 2, enemy.h / 2, enemy.w / 2, enemy.h / 2, 0, 0, Math.PI * 2);
      };
      volume(ctx, shell, flash ? "#ffffff" : "#2a1750", "#c9b6ff");
      const open = enemy.aim > 0 ? 1 - enemy.aim / 0.65 : 0;
      ctx.fillStyle = "#08050f";
      ctx.beginPath();
      ctx.ellipse(enemy.w / 2, enemy.h - 6, 12 + open * 10, 6 + open * 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#c9b6ff99";
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i += 1) {
        const sway = SWAY[(frame + i) % 4];
        ctx.beginPath();
        ctx.moveTo(14 + i * 17, enemy.h - 4);
        ctx.quadraticCurveTo(
          14 + i * 17 + sway,
          enemy.h + 6,
          14 + i * 17 + sway * 2,
          enemy.h + 14,
        );
        ctx.stroke();
      }
      face(ctx, enemy.w / 2, enemy.h * 0.42, 11, mood, enemy.facing, frame);
      break;
    }

    case "spawnling": {
      // Criatura: ciclo de salto en cuatro poses (agacha, impulsa, estira, cae).
      const squash = HOP_SQUASH[frame];
      const lift = HOP_LIFT[frame];
      castShadow(ctx, enemy.w / 2, enemy.h + 3, enemy.w, lift * 4);
      ctx.translate(0, lift);
      ctx.translate(enemy.w / 2, enemy.h);
      ctx.scale(1 + squash, 1 - squash);
      ctx.translate(-enemy.w / 2, -enemy.h);
      const blob = (c: CanvasRenderingContext2D) => {
        c.beginPath();
        c.ellipse(enemy.w / 2, enemy.h / 2, enemy.w / 2, enemy.h / 2, 0, 0, Math.PI * 2);
      };
      volume(ctx, blob, flash ? "#ffffff" : "#6b49a8", "#d8c7ff");
      ctx.fillStyle = "#1a1030";
      for (let i = 0; i < 4; i += 1) {
        const paso = (frame + i) % 2 === 0 ? 0 : 2;
        ctx.fillRect(4 + i * 7, enemy.h - 4 + paso, 3, 5);
      }
      face(ctx, enemy.w / 2, enemy.h * 0.42, 6, mood, enemy.facing, frame);
      break;
    }

    case "zombie": {
      if (enemy.state === "buried") {
        ctx.fillStyle = "#15151c";
        ctx.beginPath();
        ctx.ellipse(enemy.w / 2, enemy.h - 2, 20, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Grietas en la tierra: se ve que algo hay antes de que salga la mano.
        ctx.strokeStyle = "#2f2f3c";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(enemy.w / 2 - 14, enemy.h - 2);
        ctx.lineTo(enemy.w / 2 - 4, enemy.h - 6);
        ctx.lineTo(enemy.w / 2 + 6, enemy.h - 1);
        ctx.stroke();
        break;
      }
      if (enemy.state === "warning") {
        // Aviso: solo la mano, 2 s, sin daño. Los dedos tiemblan por cuadros.
        const grow = 1 - enemy.timer / 2;
        ctx.fillStyle = "#221c18";
        ctx.beginPath();
        ctx.ellipse(enemy.w / 2, enemy.h, 22, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        const handH = 10 + grow * 26;
        const tremble = TREMBLE[frame];
        ctx.save();
        ctx.translate(tremble, 0);
        const hand = (c: CanvasRenderingContext2D) => {
          c.beginPath();
          c.roundRect(enemy.w / 2 - 6, enemy.h - handH, 12, handH, 5);
        };
        volume(ctx, hand, "#7f9a6f", "#c3e0ae");
        for (let i = 0; i < 3; i += 1) {
          const flex = FLEX[(frame + i) % 4];
          ctx.fillStyle = tint("#7f9a6f", 0.12);
          ctx.beginPath();
          ctx.roundRect(enemy.w / 2 - 7 + i * 6, enemy.h - handH - 7 + flex, 4, 9, 2);
          ctx.fill();
        }
        ctx.restore();
        ctx.globalAlpha = calm ? 0.65 : WARN_ALPHA[frame];
        ctx.strokeStyle = "#ffe082";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(enemy.w / 2, enemy.h - 4, 20, Math.PI, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#ffe082";
        ctx.font = "800 13px Geist Mono, monospace";
        ctx.textAlign = "center";
        haloText(ctx, "!", enemy.w / 2, enemy.h - handH - 14, 3);
        break;
      }
      const rise = enemy.state === "rising" ? 1 - enemy.timer / 0.36 : 1;
      ctx.translate(0, (1 - rise) * enemy.h);
      castShadow(ctx, enemy.w / 2, enemy.h + 2, enemy.w, 0);
      // Caminar a tirones: el cuerpo se inclina de lado a lado.
      const lean = LEAN[frame] * enemy.facing;
      ctx.translate(enemy.w / 2, enemy.h);
      ctx.rotate(lean);
      ctx.translate(-enemy.w / 2, -enemy.h);
      const torso = (c: CanvasRenderingContext2D) => {
        c.beginPath();
        c.roundRect(3, 6, enemy.w - 6, enemy.h - 6, 7);
      };
      volume(ctx, torso, flash ? "#ffffff" : "#44512f", "#9ec47c");
      ctx.fillStyle = tint("#7f9a6f", -0.1);
      ctx.beginPath();
      ctx.roundRect(
        enemy.facing > 0 ? enemy.w - 10 : -10,
        12 + ARM[frame],
        16,
        8,
        4,
      );
      ctx.fill();
      face(ctx, enemy.w / 2, enemy.h * 0.38, 7, mood, enemy.facing, frame);
      break;
    }

    default: {
      // Burócrata: masa con expediente y sello, que respira y golpea por cuadros.
      const squash = SQUASH_WALK[frame];
      castShadow(ctx, enemy.w / 2, enemy.h + 3, enemy.w, 0);
      ctx.translate(enemy.w / 2, enemy.h);
      ctx.scale(1 + squash, 1 - squash);
      ctx.translate(-enemy.w / 2, -enemy.h);
      const blob = (c: CanvasRenderingContext2D) => {
        c.beginPath();
        c.roundRect(2, 5, enemy.w - 4, enemy.h - 5, 14);
      };
      volume(ctx, blob, flash ? "#ffffff" : tint(level.palette[2], -0.25), level.palette[3]);
      ctx.fillStyle = "#05060a";
      ctx.beginPath();
      ctx.moveTo(11, 0);
      ctx.lineTo(18, 11);
      ctx.lineTo(3, 9);
      ctx.moveTo(enemy.w - 11, 0);
      ctx.lineTo(enemy.w - 18, 11);
      ctx.lineTo(enemy.w - 3, 9);
      ctx.fill();
      // Expediente que sostiene, y el sello que sube y baja.
      ctx.fillStyle = "#f2f5ff";
      ctx.fillRect(enemy.w * 0.16, enemy.h - 14, 20, 13);
      ctx.fillStyle = "#9aa7bf";
      for (let i = 0; i < 3; i += 1) {
        ctx.fillRect(enemy.w * 0.16 + 3, enemy.h - 11 + i * 3, 14, 1.5);
      }
      const stampLift = STAMP[frame];
      ctx.fillStyle = "#ff5d6c";
      ctx.beginPath();
      ctx.roundRect(enemy.w * 0.62, enemy.h - 18 + stampLift, 13, 8, 2);
      ctx.fill();
      ctx.fillStyle = "#8c2b36";
      ctx.fillRect(enemy.w * 0.66, enemy.h - 22 + stampLift, 5, 5);
      face(ctx, enemy.w / 2, enemy.h * 0.4, 9, mood, enemy.facing, frame);
      break;
    }
  }
  ctx.restore();
}

function drawBoss(ctx: CanvasRenderingContext2D, world: WorldState) {
  const boss = world.boss;
  if (!boss || !boss.alive) return;
  const definition = LEVELS[world.levelIndex].boss;
  const x = boss.x - world.cameraX;
  if (x < -260 || x > VIEW_W + 260) return;

  glow(ctx, x + boss.w / 2, boss.y + boss.h / 2, boss.w * 0.9, definition.color, 0.18);
  const frame = pose(5);
  castShadow(ctx, x + boss.w / 2, GROUND_Y + 2, boss.w, 0);
  ctx.save();
  ctx.translate(x, boss.y);
  // Anticipación: se encoge y se echa atrás justo antes de golpear.
  if (boss.telegraph > 0 && boss.telegraphOf) {
    const carga = 1 - boss.telegraph / boss.telegraphOf.telegraph;
    ctx.translate(-boss.facing * carga * 14, carga * 6);
    ctx.translate(boss.w / 2, boss.h);
    ctx.scale(1 + carga * 0.08, 1 - carga * 0.1);
    ctx.translate(-boss.w / 2, -boss.h);
  } else {
    const respira = BREATHE[frame];
    ctx.translate(boss.w / 2, boss.h);
    ctx.scale(1 + respira, 1 - respira);
    ctx.translate(-boss.w / 2, -boss.h);
  }

  // Aviso de ataque: halo creciente antes del golpe.
  if (boss.telegraph > 0 && boss.telegraphOf) {
    const ratio = 1 - boss.telegraph / boss.telegraphOf.telegraph;
    ctx.globalAlpha = 0.25 + ratio * 0.55;
    ctx.strokeStyle = "#ff8a96";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(boss.w / 2, boss.h / 2, boss.w * (0.75 + ratio * 0.55), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ff8a96";
    ctx.font = "800 13px Geist Mono, monospace";
    ctx.textAlign = "center";
    haloText(
      ctx,
      boss.telegraphOf.kind === "dash"
        ? "▶ EMBESTIDA"
        : boss.telegraphOf.kind === "slam"
          ? "▼ IMPACTO"
          : boss.telegraphOf.kind === "beam"
            ? "▮ HAZ"
            : boss.telegraphOf.kind === "summon"
              ? "✚ INVOCA"
              : boss.telegraphOf.kind === "split"
                ? "⧉ DUPLICA"
                : "✦ DESCARGA",
      boss.w / 2,
      -34,
    );
  }

  if (boss.hurt > 0) ctx.globalAlpha = 0.6 + Math.sin(boss.hurt * 70) * 0.3;

  ctx.fillStyle = cachedLinear(ctx, `boss-${definition.id}`, 0, 0, boss.w, boss.h, [
    [0, definition.color],
    [0.55, "#1b0f2a"],
    [1, "#05040a"],
  ]);
  rounded(ctx, 0, 0, boss.w, boss.h, 22);
  ctx.fill();
  ctx.strokeStyle = `${definition.color}dd`;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${Math.round(boss.h * 0.34)}px Geist Mono, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(definition.glyph, boss.w / 2, boss.h * 0.44);

  face(
    ctx,
    boss.w / 2,
    boss.h * 0.72,
    boss.w * 0.18,
    boss.hurt > 0 ? "hurt" : boss.telegraph > 0 ? "alert" : "angry",
    boss.facing,
    frame,
  );
  ctx.globalAlpha = 1;

  const barW = boss.w + 24;
  ctx.fillStyle = "#04060c";
  rounded(ctx, -12, -22, barW, 9, 4);
  ctx.fill();
  ctx.strokeStyle = "#ffffff33";
  ctx.lineWidth = 1;
  ctx.stroke();
  const life = Math.max(0, boss.hp / boss.maxHp);
  ctx.fillStyle = cachedLinear(ctx, `bosslife-${definition.id}`, -12, 0, -12 + barW, 0, [
    [0, "#ff5d6c"],
    [1, definition.color],
  ]);
  rounded(ctx, -12, -22, barW * life, 9, 4);
  ctx.fill();
  ctx.restore();
}

function drawProjectile(ctx: CanvasRenderingContext2D, projectile: Projectile, cameraX: number) {
  const x = projectile.x - cameraX;
  if (x < -80 || x > VIEW_W + 80) return;
  ctx.save();
  if (projectile.kind === "beam") {
    const fade = projectile.life / projectile.maxLife;
    // Mientras avisa es tenue; cuando quema, brilla.
    const live = projectile.life <= 0.55;
    ctx.globalAlpha = live ? 0.35 + fade * 0.5 : 0.2;
    ctx.fillStyle = cachedLinear(ctx, "beam", x - projectile.r, 0, x + projectile.r, 0, [
      [0, "#ff5d6c00"],
      [0.5, live ? "#ffd0ff" : "#ff8a96"],
      [1, "#ff5d6c00"],
    ]);
    ctx.fillRect(x - projectile.r, 0, projectile.r * 2, VIEW_H);
    if (!live) {
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = "#ff8a96";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, VIEW_H);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
    return;
  }
  ctx.translate(x, projectile.y);
  ctx.rotate(projectile.spin);
  if (projectile.kind === "paper") {
    ctx.fillStyle = "#f4f7ff";
    ctx.fillRect(-10, -13, 20, 26);
    ctx.fillStyle = "#96a4bd";
    for (let i = 0; i < 4; i += 1) ctx.fillRect(-6, -8 + i * 5, 12, 2);
    ctx.strokeStyle = "#ff5d6c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 4, 5, 0, Math.PI * 2);
    ctx.stroke();
  } else if (projectile.kind === "bit") {
    ctx.fillStyle = "#7dffe8";
    ctx.fillRect(-9, -9, 18, 18);
    ctx.fillStyle = "#04231f";
    ctx.font = "700 11px Geist Mono, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("01", 0, 1);
  } else if (projectile.kind === "shock") {
    ctx.fillStyle = "#ffd0a0cc";
    ctx.beginPath();
    ctx.moveTo(-projectile.r, 14);
    ctx.lineTo(0, -18);
    ctx.lineTo(projectile.r, 14);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = "#ffd9e6";
    ctx.beginPath();
    ctx.arc(0, 0, projectile.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b7327a";
    ctx.beginPath();
    ctx.arc(0, 0, projectile.r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, particle: Particle, cameraX: number) {
  const x = particle.x - cameraX;
  if (x < -80 || x > VIEW_W + 80) return;
  const fade = Math.max(0, particle.life / particle.maxLife);
  ctx.save();
  ctx.globalAlpha = fade;
  if (particle.kind === "ring") {
    const grow = 1 - fade;
    ctx.strokeStyle = particle.color;
    ctx.lineWidth = 3 * fade + 1;
    ctx.beginPath();
    ctx.arc(x, particle.y, particle.size * (0.3 + grow), 0, Math.PI * 2);
    ctx.stroke();
  } else if (particle.kind === "slash") {
    ctx.translate(x, particle.y);
    ctx.rotate(particle.spin);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.moveTo(-particle.size, 0);
    ctx.quadraticCurveTo(0, -10 * fade - 3, particle.size, 0);
    ctx.quadraticCurveTo(0, 10 * fade + 3, -particle.size, 0);
    ctx.fill();
  } else if (particle.kind === "smoke") {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = fade * 0.4;
    ctx.beginPath();
    ctx.arc(x, particle.y, particle.size * (2.4 - fade), 0, Math.PI * 2);
    ctx.fill();
  } else if (particle.kind === "glyph") {
    ctx.fillStyle = particle.color;
    ctx.font = `700 ${Math.round(9 + particle.size)}px Geist Mono, monospace`;
    ctx.textAlign = "center";
    ctx.fillText("◇◈⌁▤01✦"[Math.floor(particle.spin * 7) % 7], x, particle.y);
  } else if (particle.kind === "shard") {
    ctx.translate(x, particle.y);
    ctx.rotate(particle.spin + (1 - fade) * 6);
    ctx.fillStyle = particle.color;
    ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
  } else if (particle.kind === "after") {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = fade * 0.35;
    rounded(ctx, x - 12, particle.y - 12, 24, 24, 8);
    ctx.fill();
  } else {
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(x, particle.y, particle.size * fade, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: number,
  invulnerable: number,
  vy: number,
) {
  if (invulnerable > 0 && Math.floor(invulnerable * 14) % 2 === 0) return;
  glow(ctx, x + PLAYER_W / 2, y + PLAYER_H / 2, 46, "#12d9be", 0.16);
  const stride = pose(0);
  const bounce = Math.abs(vy) < 40 ? BOUNCE[stride] : 0;
  ctx.save();
  ctx.translate(x - 4, y - 2 + bounce);
  if (facing < 0) {
    ctx.translate(48, 0);
    ctx.scale(-1, 1);
  }

  ctx.fillStyle = "#06070c";
  ctx.beginPath();
  ctx.ellipse(24, 62, 25, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Capa turquesa ondulante con nervaduras, como en el arte clave.
  const flap = calm ? 0 : Math.sin(t * 4) * 6 + Math.min(14, Math.max(-14, vy * 0.02));
  ctx.fillStyle = cachedLinear(ctx, "cape", 0, 20, -14, 58, [
    [0, "#0ee2c5"],
    [1, "#12d9be22"],
  ]);
  ctx.beginPath();
  ctx.moveTo(8, 21);
  ctx.bezierCurveTo(-6, 32, -14 - flap, 44, -10 - flap, 58);
  ctx.bezierCurveTo(2, 54, 12, 50, 20, 44);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#b7fff180";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(4, 30);
  ctx.lineTo(-2 - flap * 0.5, 46);
  ctx.moveTo(10, 34);
  ctx.lineTo(4 - flap * 0.5, 50);
  ctx.stroke();

  // Gabardina larga con faldón.
  ctx.fillStyle = cachedLinear(ctx, "coat", 10, 20, 45, 60, [
    [0, "#f4f7ff"],
    [0.5, "#b8c8dc"],
    [1, "#53677f"],
  ]);
  rounded(ctx, 9, 19, 33, 38, 9);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(10, 50);
  ctx.lineTo(41, 50);
  ctx.lineTo(45, 66);
  ctx.lineTo(6, 66);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#10192b";
  ctx.fillRect(22, 22, 4, 32);
  ctx.fillStyle = "#12d9be";
  ctx.beginPath();
  ctx.moveTo(25, 25);
  ctx.lineTo(31, 31);
  ctx.lineTo(25, 38);
  ctx.lineTo(19, 31);
  ctx.fill();

  ctx.fillStyle = "#18243b";
  rounded(ctx, 11, 52, 12, 19, 4);
  ctx.fill();
  rounded(ctx, 30, 52, 12, 19, 4);
  ctx.fill();
  ctx.fillStyle = "#0ee2c5";
  ctx.fillRect(9, 67, 16, 5);
  ctx.fillRect(29, 67, 16, 5);

  ctx.fillStyle = "#bb7654";
  ctx.beginPath();
  ctx.arc(25, 13, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111526";
  ctx.beginPath();
  ctx.arc(25, 10, 13, Math.PI, Math.PI * 2);
  ctx.lineTo(38, 13);
  ctx.lineTo(35, 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#b9fff5";
  ctx.fillRect(16, 12, 8, 3);
  ctx.fillRect(27, 12, 8, 3);
  ctx.fillRect(24, 13, 3, 2);
  ctx.restore();
}

function drawAlly(ctx: CanvasRenderingContext2D, world: WorldState) {
  const ally = world.ally;
  if (!ally) return;
  const x = ally.x - world.cameraX;
  ctx.save();
  ctx.translate(x, ally.y);
  ctx.globalAlpha = Math.min(1, ally.life);
  ctx.strokeStyle = "#b7fff1";
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(side * 18, -8 + (calm ? 0 : Math.sin(t * 16) * 4));
    ctx.stroke();
  }
  ctx.fillStyle = "#0b3a38";
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#12d9be";
  ctx.stroke();
  ctx.restore();
  glow(ctx, x, ally.y, 11, "#12d9be", 0.5);
}

function drawGate(ctx: CanvasRenderingContext2D, world: WorldState, level: LevelDef) {
  const gateX = GATE_X - world.cameraX;
  const taken = world.collectibles.filter((item) => item.taken).length;
  const open =
    taken >= requiredDocuments(world.levelIndex, world.owned) && !world.boss?.alive;
  if (gateX > -120 && gateX < VIEW_W + 120) {
    if (open) glow(ctx, gateX, 430, 70, level.palette[2], 0.3);
    ctx.strokeStyle = open ? level.palette[3] : "#667085";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(gateX, 402, 45, Math.PI, Math.PI * 2);
    ctx.lineTo(gateX + 45, GROUND_Y);
    ctx.lineTo(gateX - 45, GROUND_Y);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = open ? "#ffffff" : "#8792a5";
    ctx.font = "700 11px Geist Mono, monospace";
    ctx.textAlign = "center";
    haloText(ctx, open ? "SALIDA" : "CERRADA", gateX, 424);
  }

  if (world.arenaLocked) {
    const barrier = ARENA_GATE_X - world.cameraX;
    if (barrier > -40 && barrier < VIEW_W + 40) {
      ctx.save();
      ctx.globalAlpha = calm ? 0.4 : 0.35 + Math.sin(t * 5) * 0.2;
      ctx.fillStyle = cachedLinear(ctx, "barrier", barrier - 8, 0, barrier + 8, 0, [
        [0, "#b743a700"],
        [0.5, level.palette[3]],
        [1, "#b743a700"],
      ]);
      ctx.fillRect(barrier - 8, 0, 16, GROUND_Y);
      ctx.restore();
    }
  }
}

/* ───────────────────────── HUD ───────────────────────── */

function drawHud(ctx: CanvasRenderingContext2D, world: WorldState, level: LevelDef) {
  const taken = world.collectibles.filter((item) => item.taken).length;
  const total = world.collectibles.length;

  ctx.fillStyle = "#05070ee6";
  rounded(ctx, 24, 22, 344, 60, 14);
  ctx.fill();
  ctx.strokeStyle = "#ffffff1f";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#eef4ff";
  ctx.font = "700 14px Geist Mono, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  haloText(ctx, `${level.year} · ${level.title.toUpperCase()}`, 42, 46);
  ctx.fillStyle = "#b4c1d8";
  ctx.font = "600 12px Geist Mono, monospace";
  ctx.fillText(`DOCUMENTOS ${taken}/${total}`, 42, 68);
  // Contador de cargas E: siempre visible y separado del sonido.
  ctx.fillStyle = world.charges > 0 ? "#12d9be" : "#ff8a96";
  ctx.font = "800 12px Geist Mono, monospace";
  ctx.fillText(`E ×${world.charges}`, 186, 68);
  ctx.fillStyle = "#8d9bb3";
  ctx.fillText("·", 234, 68);
  ctx.fillStyle = world.cooldown > 0 ? "#8d9bb3" : "#cbbcff";
  const power = POWER_BY_ID.get(world.equipped);
  const label = world.charges > 0 ? (power?.name ?? "LISTO") : "SIN CARGAS";
  ctx.fillText(label.length > 26 ? `${label.slice(0, 25)}…` : label, 246, 68);

  ctx.fillStyle = "#05070ee6";
  rounded(ctx, 714, 22, 222, 62, 14);
  ctx.fill();
  ctx.strokeStyle = "#ffffff1f";
  ctx.stroke();
  ctx.fillStyle = world.time < 20 ? "#ff8a96" : "#eef4ff";
  ctx.font = "800 22px Geist Mono, monospace";
  ctx.textAlign = "right";
  haloText(ctx, `${Math.ceil(world.time).toString().padStart(2, "0")}s`, 918, 50);
  ctx.fillStyle = "#1b2438";
  rounded(ctx, 740, 58, 178, 10, 5);
  ctx.fill();
  ctx.fillStyle = cachedLinear(ctx, "energy", 740, 0, 918, 0, [
    [0, "#12d9be"],
    [1, "#8d64ff"],
  ]);
  rounded(ctx, 740, 58, 178 * Math.max(0, world.energy / world.maxEnergy), 10, 5);
  ctx.fill();
  ctx.strokeStyle = "#ffffff26";
  ctx.lineWidth = 1;
  for (const mark of [1 / 3, 2 / 3]) {
    ctx.beginPath();
    ctx.moveTo(740 + 178 * mark, 58);
    ctx.lineTo(740 + 178 * mark, 68);
    ctx.stroke();
  }

  if (world.radar) {
    const distance = Math.max(0, Math.round((GATE_X - world.x) / 10));
    ctx.fillStyle = "#0a1420e6";
    rounded(ctx, 404, 22, 158, 26, 8);
    ctx.fill();
    ctx.fillStyle = "#99f4ff";
    ctx.font = "700 10px Geist Mono, monospace";
    ctx.textAlign = "center";
    haloText(ctx, `RADAR · SALIDA ${distance} m`, 483, 39);
  }

  const boss = world.boss;
  if (boss && boss.alive && world.arenaEntered) {
    const definition = level.boss;
    const phase = definition.phases[boss.phaseIndex];
    ctx.fillStyle = "#0a0410ee";
    rounded(ctx, 240, 92, 480, 40, 12);
    ctx.fill();
    ctx.strokeStyle = `${definition.color}88`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 11px Geist Mono, monospace";
    ctx.textAlign = "left";
    haloText(ctx, definition.name.toUpperCase(), 256, 108);
    ctx.fillStyle = definition.color;
    ctx.textAlign = "right";
    haloText(
      ctx,
      `FASE ${boss.phaseIndex + 1}/${definition.phases.length} · ${phase.label.toUpperCase()}`,
      704,
      108,
    );
    ctx.fillStyle = "#1b1024";
    rounded(ctx, 256, 114, 448, 8, 4);
    ctx.fill();
    ctx.fillStyle = cachedLinear(ctx, `bosshud-${definition.id}`, 256, 0, 704, 0, [
      [0, "#ff5d6c"],
      [1, definition.color],
    ]);
    rounded(ctx, 256, 114, 448 * Math.max(0, boss.hp / boss.maxHp), 8, 4);
    ctx.fill();
  }

  if (world.toastTime > 0 && world.toast) {
    ctx.fillStyle = "#050713f2";
    rounded(ctx, 170, 148, 620, 62, 16);
    ctx.fill();
    ctx.strokeStyle = `${level.palette[3]}90`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = level.palette[3];
    ctx.font = "800 11px Geist Mono, monospace";
    ctx.textAlign = "center";
    haloText(ctx, "EXPEDIENTE EN CURSO", 480, 170);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 15px Geist, sans-serif";
    const text = world.toast.length > 74 ? `${world.toast.slice(0, 72)}…` : world.toast;
    haloText(ctx, text, 480, 194);
  }
}

/* ───────────────────────── ORQUESTACIÓN ───────────────────────── */

export function drawWorld(ctx: CanvasRenderingContext2D, world: WorldState) {
  const level = LEVELS[world.levelIndex];
  const inArena = world.cameraX > ARENA_X - VIEW_W * 0.7;
  t = world.elapsed;
  calm = world.reducedMotion;

  ctx.save();
  if (world.shake > 0.2) {
    ctx.translate(
      (Math.random() - 0.5) * world.shake,
      (Math.random() - 0.5) * world.shake,
    );
  }

  drawBackdrop(ctx, level, world.levelIndex, world.cameraX, inArena);
  drawFog(ctx, world.cameraX);
  drawAmbient(ctx, world.cameraX);
  drawTerrain(ctx, world, level);
  drawBlocks(ctx, world, level);
  drawCollectibles(ctx, world, level);
  drawGate(ctx, world, level);

  for (const particle of world.particles) {
    if (particle.kind === "smoke" || particle.kind === "after") {
      drawParticle(ctx, particle, world.cameraX);
    }
  }

  for (const enemy of world.enemies) drawEnemy(ctx, enemy, level, world.cameraX);
  drawBoss(ctx, world);
  for (const projectile of world.projectiles) {
    drawProjectile(ctx, projectile, world.cameraX);
  }

  // Estelas del jugador (agilidad, sin copiar ninguna franquicia).
  for (const point of world.trail) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, point.life * 1.4);
    ctx.fillStyle = "#12d9be";
    rounded(ctx, point.x - world.cameraX + 6, point.y + 8, 28, 54, 12);
    ctx.fill();
    ctx.restore();
  }

  drawAlly(ctx, world);
  drawPlayer(
    ctx,
    world.x - world.cameraX,
    world.y,
    world.facing,
    world.invulnerable,
    world.vy,
  );

  if (world.pulseVisual > 0) {
    const ratio = 1 - world.pulseVisual / 0.45;
    ctx.save();
    ctx.globalAlpha = 1 - ratio;
    ctx.strokeStyle = "#b7fff1";
    ctx.lineWidth = 6 - ratio * 4;
    ctx.beginPath();
    ctx.arc(
      world.x - world.cameraX + PLAYER_W / 2,
      world.y + PLAYER_H / 2,
      world.pulseRadius * (0.25 + ratio),
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.restore();
  }

  for (const particle of world.particles) {
    if (particle.kind !== "smoke" && particle.kind !== "after") {
      drawParticle(ctx, particle, world.cameraX);
    }
  }

  ctx.restore();

  // Viñeta: concentra la mirada en el centro de la acción.
  const vignette = bake("vignette", (target) => {
    target.globalAlpha = 0.5;
    target.fillStyle = cachedVignette(target);
    target.fillRect(0, 0, VIEW_W, VIEW_H);
  });
  if (vignette) {
    ctx.drawImage(vignette as CanvasImageSource, 0, 0);
  } else {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = cachedVignette(ctx);
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
  }

  if (world.flash > 0.01) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.45, world.flash);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
  }

  drawHud(ctx, world, level);
}
