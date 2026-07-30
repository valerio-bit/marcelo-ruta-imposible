/**
 * Pruebas de la capa de dibujo y de que cada nivel se puede recorrer.
 * Se usa un contexto 2D simulado: si `drawWorld` invoca algo que no existe o
 * lanza, la prueba falla. Así se detectan bloques invisibles o estados que
 * rompen el render antes de publicar.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { LEVELS } from "../app/cv-data.ts";
import {
  ARENA_X,
  GATE_X,
  GROUND_Y,
  PLAYER_H,
  PLAYER_W,
  createWorld,
  firePulse,
  jump,
  step,
} from "../app/engine.ts";
import { drawWorld } from "../app/render.ts";

function createContext() {
  const calls = [];
  const gradient = { addColorStop: () => {} };
  const methods = [
    "clearRect",
    "fillRect",
    "strokeRect",
    "beginPath",
    "closePath",
    "moveTo",
    "lineTo",
    "quadraticCurveTo",
    "bezierCurveTo",
    "arc",
    "arcTo",
    "ellipse",
    "rect",
    "roundRect",
    "fill",
    "stroke",
    "clip",
    "save",
    "restore",
    "translate",
    "rotate",
    "scale",
    "setTransform",
    "resetTransform",
    "setLineDash",
    "fillText",
    "strokeText",
    "drawImage",
  ];
  const context = {
    canvas: { width: 960, height: 540 },
    createLinearGradient: (...args) => {
      calls.push(["createLinearGradient", args]);
      return gradient;
    },
    createRadialGradient: () => gradient,
    createPattern: () => null,
    measureText: (text) => ({ width: String(text).length * 6 }),
    getCalls: () => calls,
  };
  for (const method of methods) {
    context[method] = (...args) => {
      for (const value of args) {
        if (typeof value === "number" && !Number.isFinite(value)) {
          throw new Error(`${method} recibió un valor no finito: ${value}`);
        }
      }
      calls.push([method, args]);
    };
  }
  return context;
}

function playable(levelIndex, options = {}) {
  const world = createWorld(levelIndex, "playing", options);
  world.reducedMotion = false;
  return world;
}

/** Devuelve true si hay suelo continuo en el tramo indicado. */
function groundAt(world, x) {
  return world.platforms.some(
    (platform) =>
      platform.y === GROUND_Y && x >= platform.x && x <= platform.x + platform.w,
  );
}

/**
 * Piloto sencillo: mantiene la derecha y salta cuando se acaba el suelo o
 * cuando algo le bloquea el paso. Sirve para comprobar que el nivel se puede
 * recorrer de principio a fin sin quedarse atascado.
 */
function runToArena(world, seconds = 60) {
  const dt = 1 / 60;
  let stuckFor = 0;
  let lastX = world.x;
  for (let i = 0; i < seconds / dt; i += 1) {
    const ahead = world.x + PLAYER_W + 24;
    const needsJump =
      world.grounded &&
      (!groundAt(world, ahead) || Math.abs(world.x - lastX) < 0.4);
    if (needsJump) jump(world);
    step(world, dt, { left: false, right: true });
    if (Math.abs(world.x - lastX) < 0.2) stuckFor += dt;
    else stuckFor = 0;
    lastX = world.x;
    if (stuckFor > 2.5 && world.charges > 0) firePulse(world);
    if (world.x > ARENA_X + 40) return { reached: true, seconds: i * dt };
    if (world.status !== "playing") {
      return { reached: false, seconds: i * dt, status: world.status };
    }
  }
  return { reached: false, seconds, status: world.status };
}

test("el dibujo de los siete niveles no lanza errores", () => {
  for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex += 1) {
    const world = playable(levelIndex, { owned: ["tablero", "datos"] });
    const context = createContext();
    drawWorld(context, world);
    assert.ok(context.getCalls().length > 100, "el nivel debe dibujar contenido");
  }
});

test("el dibujo aguanta la partida completa: enemigos, jefe, efectos y avisos", () => {
  const world = playable(6, { owned: ["sinergia", "tablero"], equipped: "sinergia" });
  const context = createContext();
  world.x = ARENA_X + 120;
  world.cameraX = ARENA_X - 200;
  step(world, 1 / 60, { left: false, right: true });
  firePulse(world);
  world.toast = "Prueba de aviso";
  world.toastTime = 2;
  world.shake = 9;
  world.flash = 0.3;
  for (let i = 0; i < 240; i += 1) {
    step(world, 1 / 60, { left: false, right: i % 2 === 0 });
    drawWorld(context, world);
  }
  assert.ok(world.particles.length >= 0);
});

test("se dibujan todos los estados del zombi sin fallos", () => {
  const world = playable(0);
  const zombie = world.enemies.find((enemy) => enemy.kind === "zombie");
  const context = createContext();
  for (const state of ["buried", "warning", "rising", "active"]) {
    zombie.state = state;
    zombie.timer = state === "warning" ? 1.2 : 0.2;
    drawWorld(context, world);
  }
  assert.ok(context.getCalls().length > 0);
});

test("se dibujan los avisos de ataque de cada tipo de jefe", () => {
  for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex += 1) {
    const world = playable(levelIndex);
    const context = createContext();
    world.arenaEntered = true;
    world.cameraX = ARENA_X - 200;
    const boss = world.boss;
    for (const phase of LEVELS[levelIndex].boss.phases) {
      for (const attack of phase.attacks) {
        boss.telegraph = attack.telegraph * 0.5;
        boss.telegraphOf = attack;
        drawWorld(context, world);
      }
    }
  }
});

test("cada nivel se puede recorrer hasta la arena del jefe", () => {
  for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex += 1) {
    const world = playable(levelIndex, { charges: 5 });
    world.reducedMotion = true;
    // Sin daño para medir solo la geometría del recorrido.
    world.invulnerable = Number.POSITIVE_INFINITY;
    const result = runToArena(world);
    assert.equal(
      result.reached,
      true,
      `el nivel ${levelIndex + 1} no se pudo recorrer (${JSON.stringify(result)})`,
    );
  }
});

test("la salida queda accesible tras vencer al jefe", () => {
  const world = playable(0, { charges: 5 });
  world.reducedMotion = true;
  world.invulnerable = Number.POSITIVE_INFINITY;
  runToArena(world);
  world.boss.alive = false;
  world.arenaLocked = false;
  for (const item of world.collectibles) item.taken = true;
  for (let i = 0; i < 60 * 30; i += 1) {
    if (world.grounded && !groundAt(world, world.x + PLAYER_W + 24)) jump(world);
    step(world, 1 / 60, { left: false, right: true });
    if (world.status === "won") break;
  }
  assert.equal(world.status, "won", "el jugador debe alcanzar la salida");
  assert.ok(world.x >= GATE_X - PLAYER_W);
});

test("el jugador nunca queda encerrado entre bloques", () => {
  for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex += 1) {
    const world = playable(levelIndex);
    const standable = world.blocks.filter(
      (block) =>
        // Solo se prueba la cara superior libre: en una torre no se puede estar
        // sobre el bloque inferior.
        !world.blocks.some(
          (other) =>
            other !== block &&
            other.x === block.x &&
            other.y + other.h > block.y - PLAYER_H &&
            other.y < block.y,
        ),
    );
    for (const block of standable) {
      // Se coloca al jugador encima de cada bloque: debe poder salir andando.
      world.x = block.x;
      world.y = block.y - PLAYER_H;
      world.vx = 0;
      world.vy = 0;
      const startX = world.x;
      for (let i = 0; i < 60; i += 1) step(world, 1 / 60, { left: false, right: true });
      assert.ok(
        world.x > startX + 8 || world.y > block.y,
        `atascado sobre el bloque (${block.x},${block.y}) del nivel ${levelIndex + 1}`,
      );
    }
  }
});
