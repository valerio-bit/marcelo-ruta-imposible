/**
 * Capa de dibujo en canvas. Mantiene la identidad del proyecto: tecnológica,
 * oscura, épica y fantástico-gótica, con energía turquesa y violeta.
 * Arte, siluetas y efectos son originales.
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
  type Enemy,
  type Particle,
  type Projectile,
  type WorldState,
} from "./engine.ts";

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

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  level: LevelDef,
  cameraX: number,
  inArena: boolean,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, inArena ? "#04030a" : level.palette[0]);
  sky.addColorStop(0.62, inArena ? level.palette[0] : level.palette[1]);
  sky.addColorStop(1, "#05060c");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.globalAlpha = 0.38;
  for (let i = 0; i < 32; i += 1) {
    const x = ((i * 191 - cameraX * 0.08) % (VIEW_W + 80)) - 40;
    const y = 34 + ((i * 83) % 260);
    ctx.fillStyle = i % 5 === 0 ? level.palette[3] : "#ffffff";
    ctx.fillRect(x, y, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
  }
  ctx.globalAlpha = 1;

  const farOffset = cameraX * 0.16;
  ctx.fillStyle = `${level.palette[2]}28`;
  for (let i = -2; i < 12; i += 1) {
    const x = i * 170 - (farOffset % 170);
    const peak = 175 + ((i * 37 + 90) % 90);
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x + 85, peak);
    ctx.lineTo(x + 170, GROUND_Y);
    ctx.fill();
  }

  // Catedral tecnológica: más presente conforme avanza la ruta.
  if (inArena || ["gestion", "sistema", "jefe"].includes(level.id)) {
    const castleX = inArena
      ? 300 - ((cameraX - ARENA_X) * 0.24) % 1400
      : 540 - ((cameraX * 0.21) % 1020);
    ctx.fillStyle = level.id === "jefe" || inArena ? "#09060e" : "#0a1120";
    ctx.fillRect(castleX, 228, 580, 240);
    ctx.fillRect(castleX - 72, 162, 116, 306);
    ctx.fillRect(castleX + 536, 145, 122, 323);
    ctx.fillRect(castleX + 210, 190, 150, 278);
    for (const towerX of [castleX - 72, castleX + 210, castleX + 536]) {
      for (let tooth = 0; tooth < 4; tooth += 1) {
        ctx.fillRect(towerX + tooth * 30, towerX === castleX + 210 ? 166 : 122, 18, 48);
      }
    }
    // Aguja del algoritmo con ojo, como en el arte clave.
    if (inArena) {
      ctx.fillStyle = "#07050d";
      ctx.beginPath();
      ctx.moveTo(castleX + 285, 40);
      ctx.lineTo(castleX + 205, 232);
      ctx.lineTo(castleX + 365, 232);
      ctx.closePath();
      ctx.fill();
      const glow = 0.55 + Math.sin(Date.now() / 420) * 0.25;
      ctx.globalAlpha = glow;
      ctx.fillStyle = level.palette[3];
      ctx.beginPath();
      ctx.ellipse(castleX + 285, 150, 22, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = `${level.palette[3]}31`;
    for (let windowX = castleX - 40; windowX < castleX + 630; windowX += 92) {
      ctx.beginPath();
      ctx.arc(windowX, 292, 10, Math.PI, Math.PI * 2);
      ctx.fillRect(windowX - 10, 292, 20, 36);
      ctx.fill();
    }
    ctx.fillStyle = "#03050a";
    ctx.beginPath();
    ctx.arc(castleX + 285, 398, 40, Math.PI, Math.PI * 2);
    ctx.fillRect(castleX + 245, 398, 80, 70);
    ctx.fill();
  }

  const cityOffset = cameraX * 0.34;
  for (let i = -1; i < 16; i += 1) {
    const x = i * 90 - (cityOffset % 90);
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

function drawTerrain(ctx: CanvasRenderingContext2D, world: WorldState, level: LevelDef) {
  for (const platform of world.platforms) {
    const x = platform.x - world.cameraX;
    if (x > VIEW_W + 80 || x + platform.w < -80) continue;
    const tileGradient = ctx.createLinearGradient(0, platform.y, 0, platform.y + platform.h);
    tileGradient.addColorStop(0, level.palette[2]);
    tileGradient.addColorStop(0.08, level.palette[3]);
    tileGradient.addColorStop(0.12, "#172035");
    tileGradient.addColorStop(1, "#080b14");
    ctx.fillStyle = tileGradient;
    rounded(ctx, x, platform.y, platform.w, platform.h, 7);
    ctx.fill();
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
    const pit = ctx.createLinearGradient(0, GROUND_Y, 0, VIEW_H);
    pit.addColorStop(0, "#ff4e6b22");
    pit.addColorStop(1, "#000000");
    ctx.fillStyle = pit;
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
      const pulse = 0.5 + Math.sin(Date.now() / 340 + block.x) * 0.5;
      const gradient = ctx.createLinearGradient(x, y, x + block.w, y + block.h);
      gradient.addColorStop(0, "#ffd97a");
      gradient.addColorStop(0.55, "#f0a63c");
      gradient.addColorStop(1, "#a45a14");
      ctx.fillStyle = gradient;
      ctx.shadowColor = "#ffc65c";
      ctx.shadowBlur = 10 + pulse * 10;
      rounded(ctx, x, y, block.w, block.h, 7);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#fff0c0";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#6d3a0a55";
      for (let i = 0; i < 4; i += 1) {
        ctx.fillRect(x + 7 + i * 9, y + 7, 3, 3);
        ctx.fillRect(x + 7 + i * 9, y + block.h - 10, 3, 3);
      }
      // Grietas progresivas según los golpes recibidos.
      const cracks = Math.max(block.hits, 0);
      ctx.strokeStyle = "#5a2c05";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 8);
      ctx.lineTo(x + 22, y + 22);
      ctx.lineTo(x + 16, y + 38);
      ctx.moveTo(x + 22, y + 22);
      ctx.lineTo(x + 36, y + 15);
      ctx.stroke();
      if (cracks > 0) {
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 30);
        ctx.lineTo(x + 20, y + 26);
        ctx.lineTo(x + 30, y + 42);
        ctx.moveTo(x + 30, y + 6);
        ctx.lineTo(x + 34, y + 24);
        ctx.stroke();
      }
    } else {
      // Bloque indestructible: acero frío, remaches y sin brillo cálido.
      const gradient = ctx.createLinearGradient(x, y, x + block.w, y + block.h);
      gradient.addColorStop(0, "#8f9db6");
      gradient.addColorStop(1, "#222c40");
      ctx.fillStyle = gradient;
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
    const pulse = 1 + Math.sin(Date.now() / 240 + item.index) * 0.08;
    ctx.save();
    ctx.translate(x, item.y);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = level.palette[3];
    ctx.shadowBlur = 26;
    ctx.fillStyle = `${level.palette[3]}e0`;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(18, -6);
    ctx.lineTo(18, 14);
    ctx.lineTo(0, 24);
    ctx.lineTo(-18, 14);
    ctx.lineTo(-18, -6);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
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
    ctx.fillText(level.documents[item.index].icon, 0, 13);
    ctx.restore();
  }
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
  ctx.save();
  ctx.translate(x, enemy.y);
  if (enemy.hurt > 0) {
    ctx.globalAlpha = 0.55 + Math.sin(enemy.hurt * 60) * 0.35;
  }

  switch (enemy.kind) {
    case "flyer": {
      // Dron hexagonal con aspas, como el del arte clave.
      const spin = Date.now() / 90;
      ctx.strokeStyle = `${level.palette[3]}cc`;
      ctx.lineWidth = 3;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(enemy.w / 2, enemy.h / 2);
        ctx.lineTo(enemy.w / 2 + side * 30, enemy.h / 2 - 14 + Math.sin(spin) * 5);
        ctx.stroke();
      }
      const body = ctx.createLinearGradient(0, 0, enemy.w, enemy.h);
      body.addColorStop(0, "#2b3450");
      body.addColorStop(1, "#0b0f1a");
      ctx.fillStyle = body;
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = enemy.w / 2 + Math.cos(angle) * (enemy.w / 2);
        const py = enemy.h / 2 + Math.sin(angle) * (enemy.h / 2);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = level.palette[2];
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = level.palette[3];
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(enemy.w / 2, enemy.h / 2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
    }
    case "ranged": {
      // Torreta de expedientes: el aviso de disparo es visible y sonoro.
      const charge = enemy.aim > 0 ? 1 - enemy.aim / 0.7 : 0;
      ctx.fillStyle = "#141a2b";
      rounded(ctx, 2, 8, enemy.w - 4, enemy.h - 8, 8);
      ctx.fill();
      ctx.strokeStyle = "#ff9d6c";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#0a0e18";
      ctx.fillRect(enemy.facing > 0 ? enemy.w - 6 : -12, 16, 18, 10);
      if (enemy.aim > 0) {
        ctx.globalAlpha = 0.35 + charge * 0.65;
        ctx.fillStyle = "#ffb15c";
        ctx.beginPath();
        ctx.arc(enemy.w / 2 + enemy.facing * 20, 21, 5 + charge * 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = `#ffb15c${charge > 0.5 ? "aa" : "55"}`;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(enemy.w / 2 + enemy.facing * 24, 21);
        ctx.lineTo(enemy.w / 2 + enemy.facing * (60 + charge * 90), 21);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = "#ffd9a8";
      ctx.fillRect(enemy.w * 0.24, enemy.h * 0.42, 7, 5);
      ctx.fillRect(enemy.w * 0.6, enemy.h * 0.42, 7, 5);
      break;
    }
    case "summoner": {
      // Invocador aéreo: colmena flotante que suelta criaturas.
      ctx.fillStyle = "#1a1030";
      ctx.beginPath();
      ctx.ellipse(enemy.w / 2, enemy.h / 2, enemy.w / 2, enemy.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#c9b6ff";
      ctx.lineWidth = 2;
      ctx.stroke();
      const open = enemy.aim > 0 ? 1 - enemy.aim / 0.65 : 0;
      ctx.fillStyle = "#08050f";
      ctx.beginPath();
      ctx.ellipse(enemy.w / 2, enemy.h - 6, 12 + open * 10, 6 + open * 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e0d4ff";
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(14 + i * 17, enemy.h / 2 - 6, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (enemy.aim > 0) {
        ctx.globalAlpha = 0.4 + open * 0.5;
        ctx.strokeStyle = "#c9b6ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(enemy.w / 2, enemy.h - 4, 16 + open * 14, 0, Math.PI);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      break;
    }
    case "spawnling": {
      ctx.fillStyle = "#5b3f8f";
      ctx.beginPath();
      ctx.ellipse(enemy.w / 2, enemy.h / 2, enemy.w / 2, enemy.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#d8c7ff";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = "#1a1030";
      for (let i = 0; i < 4; i += 1) {
        ctx.fillRect(4 + i * 7, enemy.h - 4, 3, 5);
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(enemy.w * 0.24, enemy.h * 0.36, 5, 4);
      ctx.fillRect(enemy.w * 0.58, enemy.h * 0.36, 5, 4);
      break;
    }
    case "zombie": {
      if (enemy.state === "buried") {
        ctx.fillStyle = "#1a1a22";
        ctx.beginPath();
        ctx.ellipse(enemy.w / 2, enemy.h - 2, 20, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      if (enemy.state === "warning") {
        // Aviso: solo la mano, 2 s, sin daño.
        const grow = 1 - enemy.timer / 2;
        ctx.fillStyle = "#221c18";
        ctx.beginPath();
        ctx.ellipse(enemy.w / 2, enemy.h, 22, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#7f9a6f";
        const handH = 10 + grow * 26;
        rounded(ctx, enemy.w / 2 - 6, enemy.h - handH, 12, handH, 5);
        ctx.fill();
        for (let i = 0; i < 3; i += 1) {
          rounded(ctx, enemy.w / 2 - 7 + i * 6, enemy.h - handH - 7, 4, 9, 2);
          ctx.fill();
        }
        ctx.globalAlpha = 0.4 + Math.sin(Date.now() / 90) * 0.3;
        ctx.strokeStyle = "#ffe082";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(enemy.w / 2, enemy.h - 4, 20, Math.PI, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#ffe082";
        ctx.font = "700 10px Geist Mono, monospace";
        ctx.textAlign = "center";
        ctx.fillText("!", enemy.w / 2, enemy.h - handH - 12);
        break;
      }
      const rise = enemy.state === "rising" ? 1 - enemy.timer / 0.36 : 1;
      ctx.translate(0, (1 - rise) * enemy.h);
      ctx.fillStyle = "#3f4a35";
      rounded(ctx, 3, 6, enemy.w - 6, enemy.h - 6, 7);
      ctx.fill();
      ctx.strokeStyle = "#8fb27a";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = "#7f9a6f";
      rounded(ctx, enemy.facing > 0 ? enemy.w - 8 : -8, 12, 14, 8, 4);
      ctx.fill();
      ctx.fillStyle = "#d6ff9a";
      ctx.fillRect(enemy.w * 0.22, enemy.h * 0.34, 6, 5);
      ctx.fillRect(enemy.w * 0.6, enemy.h * 0.34, 6, 5);
      ctx.fillStyle = "#101408";
      ctx.fillRect(enemy.w * 0.3, enemy.h * 0.6, enemy.w * 0.4, 3);
      break;
    }
    default: {
      // Caminante: masa burocrática con sello, como en el arte clave.
      const gradient = ctx.createLinearGradient(0, 0, enemy.w, enemy.h);
      gradient.addColorStop(0, level.palette[2]);
      gradient.addColorStop(1, "#3a1140");
      ctx.fillStyle = gradient;
      ctx.shadowColor = level.palette[2];
      ctx.shadowBlur = 12;
      rounded(ctx, 2, 5, enemy.w - 4, enemy.h - 5, 14);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#05060a";
      ctx.beginPath();
      ctx.moveTo(11, 0);
      ctx.lineTo(18, 11);
      ctx.lineTo(3, 9);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(enemy.w - 11, 0);
      ctx.lineTo(enemy.w - 18, 11);
      ctx.lineTo(enemy.w - 3, 9);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(enemy.w * 0.23, enemy.h * 0.38, 7, 5);
      ctx.fillRect(enemy.w * 0.62, enemy.h * 0.38, 7, 5);
      ctx.fillStyle = "#08080e";
      ctx.fillRect(enemy.w * 0.29 + (enemy.facing > 0 ? 2 : 0), enemy.h * 0.38, 3, 5);
      ctx.fillRect(enemy.w * 0.68 + (enemy.facing > 0 ? 2 : 0), enemy.h * 0.38, 3, 5);
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

  ctx.save();
  ctx.translate(x, boss.y);

  // Aviso de ataque: halo creciente antes del golpe.
  if (boss.telegraph > 0 && boss.telegraphOf) {
    const ratio = 1 - boss.telegraph / boss.telegraphOf.telegraph;
    ctx.globalAlpha = 0.25 + ratio * 0.55;
    ctx.strokeStyle = "#ff5d6c";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(boss.w / 2, boss.h / 2, boss.w * (0.75 + ratio * 0.55), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ff5d6c";
    ctx.font = "800 12px Geist Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText(
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

  const body = ctx.createLinearGradient(0, 0, boss.w, boss.h);
  body.addColorStop(0, definition.color);
  body.addColorStop(0.55, "#1b0f2a");
  body.addColorStop(1, "#05040a");
  ctx.fillStyle = body;
  ctx.shadowColor = definition.color;
  ctx.shadowBlur = 30;
  rounded(ctx, 0, 0, boss.w, boss.h, 22);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = `${definition.color}dd`;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Identidad visual propia por jefe.
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${Math.round(boss.h * 0.34)}px Geist Mono, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(definition.glyph, boss.w / 2, boss.h * 0.44);

  ctx.fillStyle = "#ffffffee";
  const eye = 8 + Math.sin(Date.now() / 300) * 2;
  ctx.beginPath();
  ctx.ellipse(boss.w * 0.32, boss.h * 0.72, eye, eye * 0.6, 0, 0, Math.PI * 2);
  ctx.ellipse(boss.w * 0.68, boss.h * 0.72, eye, eye * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#12040f";
  ctx.beginPath();
  ctx.arc(boss.w * 0.32 + boss.facing * 2, boss.h * 0.72, 3, 0, Math.PI * 2);
  ctx.arc(boss.w * 0.68 + boss.facing * 2, boss.h * 0.72, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Barra de vida sobre el jefe.
  const barW = boss.w + 24;
  ctx.fillStyle = "#04060c";
  rounded(ctx, -12, -22, barW, 9, 4);
  ctx.fill();
  ctx.strokeStyle = "#ffffff33";
  ctx.lineWidth = 1;
  ctx.stroke();
  const life = Math.max(0, boss.hp / boss.maxHp);
  const lifeGradient = ctx.createLinearGradient(-12, 0, -12 + barW, 0);
  lifeGradient.addColorStop(0, "#ff5d6c");
  lifeGradient.addColorStop(1, definition.color);
  ctx.fillStyle = lifeGradient;
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
    ctx.globalAlpha = 0.35 + fade * 0.5;
    const gradient = ctx.createLinearGradient(x - projectile.r, 0, x + projectile.r, 0);
    gradient.addColorStop(0, "#ff5d6c00");
    gradient.addColorStop(0.5, "#ffd0ff");
    gradient.addColorStop(1, "#ff5d6c00");
    ctx.fillStyle = gradient;
    ctx.fillRect(x - projectile.r, 0, projectile.r * 2, VIEW_H);
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
    ctx.shadowColor = "#ff8fa3";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#ffd9e6";
    ctx.beginPath();
    ctx.arc(0, 0, projectile.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
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
) {
  if (invulnerable > 0 && Math.floor(invulnerable * 14) % 2 === 0) return;
  ctx.save();
  ctx.translate(x - 4, y - 2);
  if (facing < 0) {
    ctx.translate(48, 0);
    ctx.scale(-1, 1);
  }

  ctx.fillStyle = "#06070c";
  ctx.beginPath();
  ctx.ellipse(24, 62, 25, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Capa turquesa con trama, como el arte clave.
  ctx.fillStyle = "#0ee2c5";
  ctx.beginPath();
  ctx.moveTo(7, 22);
  ctx.lineTo(-9, 56);
  ctx.lineTo(16, 48);
  ctx.lineTo(22, 22);
  ctx.fill();
  ctx.strokeStyle = "#04413c66";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(4, 30);
  ctx.lineTo(15, 34);
  ctx.moveTo(1, 40);
  ctx.lineTo(14, 42);
  ctx.stroke();

  const coat = ctx.createLinearGradient(10, 20, 45, 60);
  coat.addColorStop(0, "#f4f7ff");
  coat.addColorStop(0.5, "#b8c8dc");
  coat.addColorStop(1, "#53677f");
  ctx.fillStyle = coat;
  rounded(ctx, 9, 19, 33, 38, 9);
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
    ctx.lineTo(side * 18, -8 + Math.sin(Date.now() / 60) * 4);
    ctx.stroke();
  }
  ctx.fillStyle = "#0b3a38";
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#12d9be";
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#12d9be";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGate(ctx: CanvasRenderingContext2D, world: WorldState, level: LevelDef) {
  const gateX = GATE_X - world.cameraX;
  const open = world.collectibles.filter((item) => item.taken).length >= 2 && !world.boss?.alive;
  if (gateX > -120 && gateX < VIEW_W + 120) {
    ctx.strokeStyle = open ? level.palette[3] : "#667085";
    ctx.lineWidth = 7;
    ctx.shadowColor = open ? level.palette[2] : "transparent";
    ctx.shadowBlur = open ? 24 : 0;
    ctx.beginPath();
    ctx.arc(gateX, 402, 45, Math.PI, Math.PI * 2);
    ctx.lineTo(gateX + 45, GROUND_Y);
    ctx.lineTo(gateX - 45, GROUND_Y);
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = open ? "#ffffff" : "#8792a5";
    ctx.font = "700 11px Geist Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText(open ? "SALIDA" : "CERRADA", gateX, 424);
  }

  // Barrera de la arena mientras el jefe vive.
  if (world.arenaLocked) {
    const barrier = ARENA_GATE_X - world.cameraX;
    if (barrier > -40 && barrier < VIEW_W + 40) {
      const pulse = 0.35 + Math.sin(Date.now() / 180) * 0.2;
      ctx.globalAlpha = pulse;
      const gradient = ctx.createLinearGradient(barrier - 8, 0, barrier + 8, 0);
      gradient.addColorStop(0, "#b743a700");
      gradient.addColorStop(0.5, level.palette[3]);
      gradient.addColorStop(1, "#b743a700");
      ctx.fillStyle = gradient;
      ctx.fillRect(barrier - 8, 0, 16, GROUND_Y);
      ctx.globalAlpha = 1;
    }
  }
}

function drawHud(ctx: CanvasRenderingContext2D, world: WorldState, level: LevelDef) {
  const taken = world.collectibles.filter((item) => item.taken).length;

  ctx.fillStyle = "#070a13cc";
  rounded(ctx, 24, 22, 330, 60, 14);
  ctx.fill();
  ctx.fillStyle = "#e9f2ff";
  ctx.font = "700 14px Geist Mono, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`${level.year} · ${level.title.toUpperCase()}`, 42, 46);
  ctx.fillStyle = "#91a0bc";
  ctx.font = "600 12px Geist Mono, monospace";
  ctx.fillText(`DOCUMENTOS ${taken}/3`, 42, 68);
  // Contador de cargas E: siempre visible y separado del sonido.
  ctx.fillStyle = world.charges > 0 ? "#12d9be" : "#ff746c";
  ctx.font = "800 12px Geist Mono, monospace";
  ctx.fillText(`E ×${world.charges}`, 176, 68);
  ctx.fillStyle = "#6f7d94";
  ctx.fillText("·", 224, 68);
  ctx.fillStyle = world.cooldown > 0 ? "#6f7d94" : "#cbbcff";
  const power = POWER_BY_ID.get(world.equipped);
  const label = world.charges > 0 ? (power?.name ?? "LISTO") : "SIN CARGAS · RECOGE UN DOCUMENTO";
  ctx.fillText(label.length > 30 ? `${label.slice(0, 29)}…` : label, 236, 68);

  ctx.fillStyle = "#070a13cc";
  rounded(ctx, 720, 22, 216, 60, 14);
  ctx.fill();
  ctx.fillStyle = world.time < 20 ? "#ff746c" : "#e9f2ff";
  ctx.font = "800 22px Geist Mono, monospace";
  ctx.textAlign = "right";
  ctx.fillText(`${Math.ceil(world.time).toString().padStart(2, "0")}s`, 916, 50);
  ctx.fillStyle = "#24324c";
  rounded(ctx, 745, 60, 171, 7, 4);
  ctx.fill();
  const energyGradient = ctx.createLinearGradient(745, 0, 916, 0);
  energyGradient.addColorStop(0, "#12d9be");
  energyGradient.addColorStop(1, "#8d64ff");
  ctx.fillStyle = energyGradient;
  rounded(ctx, 745, 60, 171 * Math.max(0, world.energy / world.maxEnergy), 7, 4);
  ctx.fill();

  // Radar de la salida (poder de datos / Power BI).
  if (world.radar) {
    const distance = Math.max(0, Math.round((GATE_X - world.x) / 10));
    ctx.fillStyle = "#0a1420cc";
    rounded(ctx, 396, 22, 150, 26, 8);
    ctx.fill();
    ctx.fillStyle = "#99f4ff";
    ctx.font = "700 10px Geist Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText(`RADAR · SALIDA ${distance} m`, 471, 39);
  }

  // Barra del jefe en cabecera cuando la arena está activa.
  const boss = world.boss;
  if (boss && boss.alive && world.arenaEntered) {
    const definition = level.boss;
    const phase = definition.phases[boss.phaseIndex];
    ctx.fillStyle = "#0a0410dd";
    rounded(ctx, 240, 92, 480, 40, 12);
    ctx.fill();
    ctx.strokeStyle = `${definition.color}88`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 11px Geist Mono, monospace";
    ctx.textAlign = "left";
    ctx.fillText(definition.name.toUpperCase(), 256, 108);
    ctx.fillStyle = definition.color;
    ctx.textAlign = "right";
    ctx.fillText(
      `FASE ${boss.phaseIndex + 1}/${definition.phases.length} · ${phase.label.toUpperCase()}`,
      704,
      108,
    );
    ctx.fillStyle = "#1b1024";
    rounded(ctx, 256, 114, 448, 8, 4);
    ctx.fill();
    const bossGradient = ctx.createLinearGradient(256, 0, 704, 0);
    bossGradient.addColorStop(0, "#ff5d6c");
    bossGradient.addColorStop(1, definition.color);
    ctx.fillStyle = bossGradient;
    rounded(ctx, 256, 114, 448 * Math.max(0, boss.hp / boss.maxHp), 8, 4);
    ctx.fill();
  }

  if (world.toastTime > 0 && world.toast) {
    ctx.fillStyle = "#050713ee";
    rounded(ctx, 170, 148, 620, 62, 16);
    ctx.fill();
    ctx.strokeStyle = `${level.palette[3]}90`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = level.palette[3];
    ctx.font = "800 11px Geist Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText("EXPEDIENTE EN CURSO", 480, 170);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 15px Geist, sans-serif";
    const text = world.toast.length > 74 ? `${world.toast.slice(0, 72)}…` : world.toast;
    ctx.fillText(text, 480, 194);
  }
}

export function drawWorld(ctx: CanvasRenderingContext2D, world: WorldState) {
  const level = LEVELS[world.levelIndex];
  const inArena = world.cameraX > ARENA_X - VIEW_W * 0.7;

  ctx.save();
  if (world.shake > 0.2) {
    ctx.translate(
      (Math.random() - 0.5) * world.shake,
      (Math.random() - 0.5) * world.shake,
    );
  }

  drawBackdrop(ctx, level, world.cameraX, inArena);
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
  drawPlayer(ctx, world.x - world.cameraX, world.y, world.facing, world.invulnerable);

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

  if (world.flash > 0.01) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.45, world.flash);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
  }

  drawHud(ctx, world, level);
}
