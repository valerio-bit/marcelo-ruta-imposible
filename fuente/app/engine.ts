/**
 * Motor de juego de «Marcelo: La Ruta Imposible».
 *
 * El motor no toca el DOM, React ni Web Audio: recibe entradas, avanza el
 * mundo y deja pedidos de sonido/eventos en colas. Así puede probarse con
 * `node --test` y se mantiene independiente del framerate.
 */

import {
  LEVELS,
  MAX_CHARGES,
  POWER_BY_ID,
  START_CHARGES,
  STARTING_ACTIVE,
  type BossAttackDef,
  type DocumentDef,
  type EnemyKind,
} from "./cv-data.ts";

export const VIEW_W = 960;
export const VIEW_H = 540;
export const GROUND_Y = 468;
export const WORLD_W = 3240;
export const ARENA_X = 2500;
/** La barrera de la arena coincide con el borde: nunca sobre un pozo. */
export const ARENA_GATE_X = ARENA_X;
export const GATE_X = 3110;
export const PLAYER_W = 40;
export const PLAYER_H = 70;
export const BLOCK = 46;
export const MAX_SPAWNLINGS = 6;
export const ZOMBIE_WARNING = 2;

const GRAVITY = 1540;
const MAX_VX = 288;
/** Altura de salto ≈ 125 px: define qué plataformas y bloques son alcanzables. */
const JUMP_VY = -620;
const SUPER_JUMP_VY = -684;
const MAX_DT = 1 / 30;
export const JUMP_HEIGHT = (JUMP_VY * JUMP_VY) / (2 * GRAVITY);

export type GameStatus = "menu" | "playing" | "paused" | "won" | "failed";

export type Platform = { x: number; y: number; w: number; h: number };

export type Block = {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Los bloques rompibles se dibujan en ámbar con grietas visibles. */
  breakable: boolean;
  broken: boolean;
  /** Golpes necesarios: alimenta las grietas progresivas. */
  armor: number;
  hits: number;
  /** Temporizador de sacudida al recibir un golpe que no lo destruye. */
  shake: number;
};

export type Collectible = {
  x: number;
  y: number;
  index: number;
  taken: boolean;
};

export type Enemy = {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  minX: number;
  maxX: number;
  alive: boolean;
  hp: number;
  maxHp: number;
  hurt: number;
  baseY: number;
  phase: number;
  facing: number;
  grounded: boolean;
  stun: number;
  /** Enemigo a distancia: aviso antes de disparar. */
  aim: number;
  cooldown: number;
  /** Zombi enterrado. */
  state: "buried" | "warning" | "rising" | "active" | "idle";
  timer: number;
  /** Invocador aéreo. */
  spawned: number;
  /** Jefes. */
  boss: boolean;
  phaseIndex: number;
  attackIndex: number;
  telegraph: number;
  telegraphOf: BossAttackDef | null;
  acting: number;
  wait: number;
  hitCooldown: number;
  ownerId: number;
};

export type Projectile = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  maxLife: number;
  kind: "orb" | "paper" | "bit" | "shock" | "beam";
  hostile: boolean;
  spin: number;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  kind: "spark" | "smoke" | "shard" | "glyph" | "ring" | "slash" | "after";
  spin: number;
};

export type Ally = {
  x: number;
  y: number;
  life: number;
  phase: number;
  cooldown: number;
};

export type PickedDocument = DocumentDef & { levelYear: string };

export type WorldState = {
  levelIndex: number;
  status: GameStatus;
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  jumps: number;
  coyote: number;
  /** Salto pulsado poco antes de tocar suelo: se ejecuta al aterrizar. */
  jumpBuffer: number;
  facing: number;
  cameraX: number;
  time: number;
  timeLimit: number;
  energy: number;
  maxEnergy: number;
  invulnerable: number;
  shieldReady: boolean;
  guardReady: boolean;
  /** Cargas del poder E. */
  charges: number;
  equipped: string;
  cooldown: number;
  pulseVisual: number;
  pulseRadius: number;
  owned: string[];
  platforms: Platform[];
  blocks: Block[];
  collectibles: Collectible[];
  enemies: Enemy[];
  projectiles: Projectile[];
  particles: Particle[];
  ally: Ally | null;
  boss: Enemy | null;
  bossDown: boolean;
  bossPhase: number;
  arenaLocked: boolean;
  arenaEntered: boolean;
  shake: number;
  flash: number;
  hitStop: number;
  toast: string;
  toastTime: number;
  radar: boolean;
  reducedMotion: boolean;
  combo: number;
  comboTime: number;
  elapsed: number;
  lastFrame: number;
  sounds: string[];
  events: string[];
  trail: { x: number; y: number; life: number }[];
  safeX: number;
  safeY: number;
};

export type Controls = {
  left: boolean;
  right: boolean;
};

export type PulseProfile = {
  radius: number;
  damage: number;
  blockRadius: number;
  color: string;
  stun: number;
  chain: number;
  clearsProjectiles: boolean;
  ally: number;
  restore: boolean;
};

const BASE_PULSE: PulseProfile = {
  radius: 150,
  damage: 2,
  blockRadius: 132,
  color: "#81fff1",
  stun: 0.45,
  chain: 0,
  clearsProjectiles: false,
  ally: 0,
  restore: false,
};

export const PULSE_PROFILES: Record<string, Partial<PulseProfile>> = {
  voz: {},
  oratoria: { radius: 248, damage: 3, blockRadius: 186, stun: 1.15, color: "#b4ffe8" },
  automatizacion: {
    radius: 212,
    damage: 3,
    blockRadius: 320,
    stun: 0.7,
    color: "#ffd3a5",
  },
  rayo: {
    radius: 300,
    damage: 3,
    blockRadius: 210,
    chain: 3,
    clearsProjectiles: true,
    color: "#99f4ff",
  },
  agente: { radius: 150, damage: 2, blockRadius: 150, ally: 9, color: "#b7fff1" },
  sinergia: {
    radius: 340,
    damage: 4,
    blockRadius: 340,
    stun: 1.4,
    chain: 4,
    clearsProjectiles: true,
    ally: 10,
    restore: true,
    color: "#ffc6ec",
  },
};

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const overlaps = (
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

export const has = (world: WorldState, power: string) => world.owned.includes(power);

export function pulseProfile(world: WorldState): PulseProfile {
  const profile = { ...BASE_PULSE, ...(PULSE_PROFILES[world.equipped] ?? {}) };
  if (has(world, "siaf")) profile.blockRadius += 90;
  return profile;
}

/* ───────────────────────── GEOMETRÍA ───────────────────────── */

/**
 * Alturas calculadas contra la física real: con un salto de ~125 px el jugador
 * (70 px de alto) solo alcanza superficies cuya cara superior esté a 343 px o
 * más abajo desde el suelo, y desde una plataforma media alcanza las altas.
 */
export function createPlatforms(levelIndex: number): Platform[] {
  const lift = levelIndex % 2 === 0 ? 0 : 8;
  return [
    // Suelo con pozos entre segmentos.
    { x: 0, y: GROUND_Y, w: 470, h: 72 },
    { x: 540, y: GROUND_Y, w: 380, h: 72 },
    { x: 990, y: GROUND_Y, w: 400, h: 72 },
    { x: 1470, y: GROUND_Y, w: 360, h: 72 },
    { x: 1900, y: GROUND_Y, w: 520, h: 72 },
    { x: ARENA_X, y: GROUND_Y, w: WORLD_W - ARENA_X, h: 72 },
    // Plataformas intermedias (alcanzables desde el suelo).
    { x: 262, y: 366 - lift, w: 162, h: 18 },
    { x: 600, y: 356 + lift, w: 158, h: 18 },
    { x: 1012, y: 368 - lift, w: 152, h: 18 },
    { x: 1206, y: 356 + lift, w: 150, h: 18 },
    { x: 1508, y: 360 - lift, w: 168, h: 18 },
    { x: 1772, y: 352 + lift, w: 150, h: 18 },
    { x: 2046, y: 364 - lift, w: 152, h: 18 },
    { x: 2262, y: 356 + lift, w: 140, h: 18 },
    // Plataformas altas (alcanzables desde las intermedias).
    { x: 448, y: 250, w: 92, h: 16 },
    { x: 806, y: 240, w: 98, h: 16 },
    { x: 1080, y: 248, w: 92, h: 16 },
    { x: 1392, y: 240, w: 92, h: 16 },
    { x: 1676, y: 244, w: 100, h: 16 },
    { x: 1958, y: 236, w: 92, h: 16 },
    { x: 2160, y: 248, w: 96, h: 16 },
    // Arena del jefe: cobertura para esquivar sin estorbar al jefe.
    { x: 2600, y: 352, w: 150, h: 18 },
    { x: 2790, y: 240, w: 148, h: 16 },
    { x: 3120, y: 352, w: 100, h: 18 },
  ];
}

/**
 * Cada bloque rompible queda en una altura donde el jugador cabe debajo
 * (necesita 116 px de holgura) y llega a su cara inferior con el salto.
 * La torre del cofre además se abre con el pulso E o con una caída fuerte, y
 * siempre puede saltarse por encima: nunca bloquea el avance del nivel.
 */
export function createBlocks(levelIndex: number): Block[] {
  const armor = levelIndex >= 4 ? 2 : 1;
  const make = (
    x: number,
    y: number,
    breakable: boolean,
    blockArmor = breakable ? armor : 0,
  ): Block => ({
    x,
    y,
    w: BLOCK,
    h: BLOCK,
    breakable,
    broken: false,
    armor: blockArmor,
    hits: 0,
    shake: 0,
  });

  return [
    // Fila 1 sobre el suelo: rompible + sólido para contraste inmediato.
    make(782, 318, true),
    make(828, 318, false),
    make(874, 318, true),
    // Fila 2 sobre la plataforma intermedia de 2021.
    make(1230, 210, true),
    make(1276, 210, false),
    // Fila 3 sobre el suelo.
    make(1676, 318, true),
    make(1722, 318, true),
    // Fila 4 sobre el suelo, antes de la arena.
    make(1912, 318, false),
    make(1958, 318, true),
    make(2004, 318, true),
    // Torre del cofre: se abre con E, con una caída fuerte o se salta encima.
    make(2206, 422, true),
    make(2206, 376, true),
    make(2252, 422, false),
    // Cobertura de la arena del jefe, fuera de la zona donde entra el jefe.
    make(2500, 318, true),
    make(2546, 318, false),
    make(2820, 318, false),
    make(2866, 318, true),
  ];
}

/**
 * Posiciones verificadas: cada una está sobre una superficie que el jugador
 * pisa o a la que llega de un salto, repartidas de izquierda a derecha.
 */
const DOC_SPOTS = [
  { x: 336, y: 300 },
  { x: 868, y: 272 },
  { x: 1438, y: 196 },
  { x: 1690, y: 196 },
  { x: 2004, y: 188 },
  { x: 2229, y: 300 },
];

/** Reparto por cantidad de documentos, para que nunca queden amontonados. */
const DOC_SPREAD: Record<number, number[]> = {
  1: [0],
  2: [0, 5],
  3: [0, 2, 5],
  4: [0, 2, 4, 5],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
};

export function documentCount(levelIndex: number): number {
  return clamp(LEVELS[levelIndex].documents.length, 1, DOC_SPOTS.length);
}

/** Documentos necesarios para abrir la salida: dos tercios, mínimo 2. */
export function requiredDocuments(levelIndex: number): number {
  const total = documentCount(levelIndex);
  return Math.min(total, Math.max(2, Math.ceil((total * 2) / 3)));
}

export function createCollectibles(levelIndex: number): Collectible[] {
  const total = documentCount(levelIndex);
  const spread = DOC_SPREAD[total] ?? DOC_SPREAD[6];
  return spread.map((spot, index) => ({
    x: DOC_SPOTS[spot].x,
    y: DOC_SPOTS[spot].y,
    index,
    taken: false,
  }));
}

/* ───────────────────────── ENEMIGOS ───────────────────────── */

function baseEnemy(id: number, kind: EnemyKind): Enemy {
  return {
    id,
    kind,
    x: 0,
    y: 0,
    w: 44,
    h: 42,
    vx: 0,
    vy: 0,
    minX: 0,
    maxX: WORLD_W,
    alive: true,
    hp: 1,
    maxHp: 1,
    hurt: 0,
    baseY: 0,
    phase: 0,
    facing: 1,
    grounded: false,
    stun: 0,
    aim: 0,
    cooldown: 1.4,
    state: "idle",
    timer: 0,
    spawned: 0,
    boss: false,
    phaseIndex: 0,
    attackIndex: 0,
    telegraph: 0,
    telegraphOf: null,
    acting: 0,
    wait: 1.2,
    hitCooldown: 0,
    ownerId: -1,
  };
}

const WALKER_SPOTS = [
  { x: 660, y: GROUND_Y - 42, minX: 560, maxX: 900 },
  { x: 1120, y: GROUND_Y - 42, minX: 1000, maxX: 1370 },
  { x: 2020, y: GROUND_Y - 42, minX: 1910, maxX: 2180 },
];
const FLYER_SPOTS = [
  { x: 870, y: 296, minX: 760, maxX: 1040 },
  { x: 1450, y: 300, minX: 1330, maxX: 1660 },
  { x: 1980, y: 292, minX: 1830, maxX: 2200 },
];
const RANGED_SPOTS = [
  { x: 1050, y: 368 - 44, minX: 1012, maxX: 1120 },
  { x: 1540, y: GROUND_Y - 44, minX: 1490, maxX: 1660 },
  { x: 2080, y: 364 - 44, minX: 2046, maxX: 2150 },
];
const SUMMONER_SPOTS = [
  { x: 1320, y: 130, minX: 1120, maxX: 1520 },
  { x: 2040, y: 112, minX: 1880, maxX: 2280 },
];
// Cada zombi patrulla dentro de su segmento de suelo: nunca sobre un pozo.
const ZOMBIE_SPOTS = [
  { x: 420, y: GROUND_Y - 40, minX: 40, maxX: 424 },
  { x: 1300, y: GROUND_Y - 40, minX: 1000, maxX: 1344 },
  { x: 2100, y: GROUND_Y - 40, minX: 1910, maxX: 2374 },
];

export function createEnemies(levelIndex: number): Enemy[] {
  const level = LEVELS[levelIndex];
  const speed = 46 + levelIndex * 9;
  const enemies: Enemy[] = [];
  let id = 1;

  const plan = new Map<EnemyKind, number>();
  for (const entry of level.enemies) plan.set(entry.kind, entry.count);

  for (let i = 0; i < (plan.get("walker") ?? 0); i += 1) {
    const spot = WALKER_SPOTS[i % WALKER_SPOTS.length];
    const enemy = baseEnemy(id++, "walker");
    enemy.x = spot.x;
    enemy.y = spot.y;
    enemy.baseY = spot.y;
    enemy.minX = spot.minX;
    enemy.maxX = spot.maxX;
    enemy.vx = i % 2 === 0 ? speed : -speed;
    enemy.hp = enemy.maxHp = 1;
    enemies.push(enemy);
  }

  for (let i = 0; i < (plan.get("flyer") ?? 0); i += 1) {
    const spot = FLYER_SPOTS[i % FLYER_SPOTS.length];
    const enemy = baseEnemy(id++, "flyer");
    enemy.x = spot.x;
    enemy.y = spot.y;
    enemy.baseY = spot.y;
    enemy.w = 50;
    enemy.h = 38;
    enemy.minX = spot.minX;
    enemy.maxX = spot.maxX;
    enemy.phase = i * 1.7;
    enemy.vx = i % 2 === 0 ? -speed * 1.12 : speed * 1.12;
    enemy.hp = enemy.maxHp = 1;
    enemies.push(enemy);
  }

  for (let i = 0; i < (plan.get("ranged") ?? 0); i += 1) {
    const spot = RANGED_SPOTS[i % RANGED_SPOTS.length];
    const enemy = baseEnemy(id++, "ranged");
    enemy.x = spot.x;
    enemy.y = spot.y;
    enemy.baseY = spot.y;
    enemy.w = 46;
    enemy.h = 44;
    enemy.minX = spot.minX;
    enemy.maxX = spot.maxX;
    enemy.vx = 0;
    enemy.cooldown = 1.6 + i * 0.5;
    enemy.hp = enemy.maxHp = 1;
    enemies.push(enemy);
  }

  for (let i = 0; i < (plan.get("summoner") ?? 0); i += 1) {
    const spot = SUMMONER_SPOTS[i % SUMMONER_SPOTS.length];
    const enemy = baseEnemy(id++, "summoner");
    enemy.x = spot.x;
    enemy.y = spot.y;
    enemy.baseY = spot.y;
    enemy.w = 62;
    enemy.h = 52;
    enemy.minX = spot.minX;
    enemy.maxX = spot.maxX;
    enemy.vx = i % 2 === 0 ? 54 : -54;
    enemy.phase = i * 2.3;
    enemy.cooldown = 2.6 + i * 0.8;
    enemy.hp = enemy.maxHp = 2;
    enemies.push(enemy);
  }

  for (let i = 0; i < (plan.get("zombie") ?? 0); i += 1) {
    const spot = ZOMBIE_SPOTS[i % ZOMBIE_SPOTS.length];
    const enemy = baseEnemy(id++, "zombie");
    enemy.x = spot.x + i * 14;
    enemy.y = spot.y;
    enemy.baseY = spot.y;
    enemy.w = 42;
    enemy.h = 40;
    enemy.minX = spot.minX;
    enemy.maxX = spot.maxX;
    enemy.state = "buried";
    enemy.timer = 0;
    enemy.vx = 0;
    enemy.hp = enemy.maxHp = 1;
    enemies.push(enemy);
  }

  return enemies;
}

export function createBoss(levelIndex: number): Enemy {
  const definition = LEVELS[levelIndex].boss;
  const boss = baseEnemy(900 + levelIndex, "boss");
  boss.boss = true;
  boss.w = definition.w;
  boss.h = definition.h;
  boss.x = 2960;
  boss.y = GROUND_Y - definition.h;
  boss.baseY = GROUND_Y - definition.h;
  boss.minX = ARENA_X + 60;
  boss.maxX = 3040;
  boss.hp = boss.maxHp = definition.hp;
  boss.wait = 1.5;
  boss.facing = -1;
  return boss;
}

/* ───────────────────────── MUNDO ───────────────────────── */

export type WorldOptions = {
  owned?: string[];
  charges?: number;
  equipped?: string;
  reducedMotion?: boolean;
};

export function levelTimeLimit(levelIndex: number, owned: string[]): number {
  let time = 172 - levelIndex * 3;
  if (owned.includes("etica")) time += 25;
  if (owned.includes("cooperacion")) time += 8;
  if (owned.includes("siaf")) time += 10;
  return time;
}

export function levelMaxEnergy(owned: string[]): number {
  let energy = 100;
  if (owned.includes("autoempleo")) energy += 12;
  if (owned.includes("tablero")) energy += 50;
  return energy;
}

export function createWorld(
  levelIndex: number,
  status: GameStatus = "playing",
  options: WorldOptions = {},
): WorldState {
  const owned = [...(options.owned ?? [])];
  const timeLimit = levelTimeLimit(levelIndex, owned);
  const maxEnergy = levelMaxEnergy(owned);
  const actives = owned.filter((id) => POWER_BY_ID.get(id)?.kind !== "passive");
  const requested = options.equipped ?? STARTING_ACTIVE;
  const equipped =
    requested === STARTING_ACTIVE || actives.includes(requested)
      ? requested
      : STARTING_ACTIVE;

  // Protocolo de reintento: nadie queda bloqueado por falta de cargas.
  const charges = clamp(
    Math.max(options.charges ?? START_CHARGES, 1),
    0,
    MAX_CHARGES,
  );

  return {
    levelIndex,
    status,
    x: 92,
    y: GROUND_Y - PLAYER_H,
    vx: 0,
    vy: 0,
    grounded: true,
    jumps: 0,
    coyote: 0,
    jumpBuffer: 0,
    facing: 1,
    cameraX: 0,
    time: timeLimit,
    timeLimit,
    energy: maxEnergy,
    maxEnergy,
    invulnerable: 0,
    shieldReady: owned.includes("escudo"),
    guardReady: owned.includes("ciberescudo"),
    charges,
    equipped,
    cooldown: 0,
    pulseVisual: 0,
    pulseRadius: 0,
    owned,
    platforms: createPlatforms(levelIndex),
    blocks: createBlocks(levelIndex),
    collectibles: createCollectibles(levelIndex),
    enemies: createEnemies(levelIndex),
    projectiles: [],
    particles: [],
    ally: null,
    boss: createBoss(levelIndex),
    bossDown: false,
    bossPhase: 0,
    arenaLocked: false,
    arenaEntered: false,
    shake: 0,
    flash: 0,
    hitStop: 0,
    toast: "",
    toastTime: 0,
    radar: owned.includes("datos") || owned.includes("tablero"),
    reducedMotion: options.reducedMotion ?? false,
    combo: 0,
    comboTime: 0,
    elapsed: 0,
    lastFrame: 0,
    sounds: [],
    events: [],
    trail: [],
    safeX: 92,
    safeY: GROUND_Y - PLAYER_H,
  };
}

/* ───────────────────────── EFECTOS ───────────────────────── */

function play(world: WorldState, name: string) {
  if (world.sounds.length < 12) world.sounds.push(name);
}

function shake(world: WorldState, amount: number) {
  if (world.reducedMotion) return;
  world.shake = Math.min(18, Math.max(world.shake, amount));
}

export function toast(world: WorldState, text: string, seconds = 1.6) {
  world.toast = text;
  world.toastTime = seconds;
}

function spawnParticles(
  world: WorldState,
  x: number,
  y: number,
  kind: Particle["kind"],
  count: number,
  color: string,
  spread = 150,
) {
  const total = world.reducedMotion ? Math.ceil(count / 3) : count;
  if (world.particles.length > 260) return;
  for (let i = 0; i < total; i += 1) {
    const angle = (Math.PI * 2 * i) / total + Math.random() * 0.6;
    const speed = spread * (0.35 + Math.random() * 0.85);
    const life = 0.32 + Math.random() * 0.5;
    world.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      life,
      maxLife: life,
      size: kind === "shard" ? 4 + Math.random() * 7 : 2 + Math.random() * 4,
      color,
      kind,
      spin: Math.random() * Math.PI,
    });
  }
}

function spawnRing(world: WorldState, x: number, y: number, radius: number, color: string) {
  world.particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    life: 0.42,
    maxLife: 0.42,
    size: radius,
    color,
    kind: "ring",
    spin: 0,
  });
}

function spawnSlash(world: WorldState, x: number, y: number, color: string) {
  if (world.reducedMotion) return;
  world.particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    life: 0.26,
    maxLife: 0.26,
    size: 60,
    color,
    kind: "slash",
    spin: Math.random() * Math.PI,
  });
}

/* ───────────────────────── ACCIONES ───────────────────────── */

export function jump(world: WorldState) {
  if (world.status !== "playing") return false;
  const doubleJump = has(world, "doblesalto");
  const power = has(world, "emprende") ? SUPER_JUMP_VY : JUMP_VY;
  const canGround = world.grounded || world.coyote > 0;
  if (canGround) {
    world.vy = power;
    world.grounded = false;
    world.coyote = 0;
    world.jumps = 1;
    play(world, "jump");
    spawnParticles(world, world.x + PLAYER_W / 2, world.y + PLAYER_H, "smoke", 6, "#9fb4c8", 90);
    return true;
  }
  if (doubleJump && world.jumps < 2) {
    world.vy = power * 1.02;
    world.jumps = 2;
    play(world, "doubleJump");
    spawnRing(world, world.x + PLAYER_W / 2, world.y + PLAYER_H / 2, 34, "#b7fff1");
    spawnParticles(world, world.x + PLAYER_W / 2, world.y + PLAYER_H, "smoke", 9, "#c9e6ff", 130);
    return true;
  }
  // Si se pulsó justo antes de aterrizar, el salto sale al tocar el suelo.
  world.jumpBuffer = 0.12;
  return false;
}

/** Soltar el salto lo corta: saltos cortos y largos con la misma tecla. */
export function releaseJump(world: WorldState) {
  if (world.vy < -250) world.vy = -250;
}

/**
 * Picado: cae con fuerza, rompe bloques agrietados y golpea doble.
 * Da una opción ofensiva aérea que no gasta cargas de E.
 */
export function slamDown(world: WorldState) {
  if (world.status !== "playing" || world.grounded) return false;
  if (world.vy > 600) return false;
  world.vy = 780;
  world.vx *= 0.3;
  play(world, "bossJump");
  spawnParticles(world, world.x + PLAYER_W / 2, world.y + PLAYER_H, "after", 8, "#b7fff1", 120);
  return true;
}

function damageEnemy(world: WorldState, enemy: Enemy, amount: number, critical = false) {
  if (!enemy.alive) return;
  enemy.hp -= amount;
  enemy.hurt = 0.22;
  if (enemy.boss) {
    spawnParticles(world, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "spark", 16, "#ffffff", 210);
    shake(world, critical ? 9 : 6);
  } else {
    spawnParticles(world, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "spark", 10, "#ffe7a8", 170);
  }
  if (enemy.hp <= 0) {
    enemy.alive = false;
    world.combo += 1;
    world.comboTime = 2.4;
    spawnParticles(world, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "shard", 14, "#ff9bd0", 220);
    spawnSlash(world, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#ffffff");
    if (enemy.boss) {
      play(world, "bossDown");
      world.bossDown = true;
      world.arenaLocked = false;
      world.flash = 0.5;
      shake(world, 16);
      world.events.push("boss-down");
    } else {
      play(world, "enemyDown");
      if (enemy.id >= 2000) {
        world.enemies = world.enemies.filter((other) => other.alive || other.id < 2000);
      }
      if (world.combo > 0 && world.combo % 3 === 0) {
        grantCharge(world, `Racha de ${world.combo}`);
      }
      if (has(world, "viral") && world.combo >= 2) {
        world.time += 2;
        toast(world, `Onda viral · combo ×${world.combo} · +2 s`, 1.1);
      }
    }
  } else {
    play(world, enemy.boss ? "bossHurt" : "enemyHit");
  }
}

/** Golpe a un bloque: grietas progresivas y destrucción confiable. */
export function hitBlock(world: WorldState, block: Block, source: "bump" | "smash" | "pulse") {
  if (block.broken) return false;
  if (!block.breakable) {
    block.shake = 0.16;
    play(world, "solidBlock");
    spawnParticles(world, block.x + block.w / 2, block.y + block.h / 2, "smoke", 4, "#9aa8c0", 70);
    return false;
  }
  block.hits += 1;
  block.shake = 0.2;
  if (block.hits < block.armor) {
    play(world, "blockCrack");
    spawnParticles(world, block.x + block.w / 2, block.y + block.h / 2, "shard", 7, "#ffd3a5", 130);
    shake(world, 3);
    return false;
  }
  block.broken = true;
  play(world, "blockBreak");
  spawnParticles(world, block.x + block.w / 2, block.y + block.h / 2, "shard", 18, "#ffd88a", 230);
  spawnParticles(world, block.x + block.w / 2, block.y + block.h / 2, "smoke", 8, "#f0f6ff", 120);
  spawnRing(world, block.x + block.w / 2, block.y + block.h / 2, 40, "#ffe9b0");
  shake(world, source === "pulse" ? 7 : 5);
  world.energy = Math.min(world.maxEnergy, world.energy + 2);
  world.events.push("block-broken");
  return true;
}

/** Poder E: consume una carga, daña, rompe bloques y da respuesta audiovisual. */
export function firePulse(world: WorldState) {
  if (world.status !== "playing") return false;
  if (world.cooldown > 0) return false;
  if (world.charges <= 0) {
    play(world, "empty");
    toast(world, "Sin cargas · recupera un documento o vence al jefe", 1.8);
    return false;
  }

  const profile = pulseProfile(world);
  world.charges -= 1;
  world.cooldown = has(world, "analisis") ? 0.3 : 0.5;
  world.pulseVisual = 0.45;
  world.pulseRadius = profile.radius;
  play(world, "pulse");
  shake(world, 5);
  world.flash = 0.16;

  const cx = world.x + PLAYER_W / 2;
  const cy = world.y + PLAYER_H / 2;
  spawnRing(world, cx, cy, profile.radius, profile.color);
  spawnParticles(world, cx, cy, "glyph", 12, profile.color, 190);
  for (let i = 0; i < 4; i += 1) {
    world.trail.push({ x: world.x - world.facing * i * 12, y: world.y, life: 0.3 });
  }

  let hits = 0;
  const targets = [...world.enemies, ...(world.boss ? [world.boss] : [])]
    .filter((enemy) => enemy.alive)
    .filter((enemy) => enemy.kind !== "zombie" || enemy.state !== "buried")
    .map((enemy) => ({
      enemy,
      distance: Math.hypot(enemy.x + enemy.w / 2 - cx, enemy.y + enemy.h / 2 - cy),
    }))
    .sort((a, b) => a.distance - b.distance);

  const reach = profile.chain > 0 ? profile.radius * 1.25 : profile.radius;
  let chained = 0;
  for (const target of targets) {
    if (target.distance > reach) continue;
    if (profile.chain > 0 && chained >= profile.chain) break;
    damageEnemy(world, target.enemy, profile.damage, true);
    target.enemy.stun = Math.max(target.enemy.stun, profile.stun);
    spawnSlash(world, target.enemy.x + target.enemy.w / 2, target.enemy.y + target.enemy.h / 2, profile.color);
    chained += 1;
    hits += 1;
  }

  for (const block of world.blocks) {
    if (block.broken || !block.breakable) continue;
    const distance = Math.hypot(block.x + block.w / 2 - cx, block.y + block.h / 2 - cy);
    if (distance <= profile.blockRadius) {
      block.hits = block.armor - 1;
      hitBlock(world, block, "pulse");
    }
  }

  if (profile.clearsProjectiles) {
    const before = world.projectiles.length;
    world.projectiles = world.projectiles.filter((projectile) => {
      if (!projectile.hostile) return true;
      const distance = Math.hypot(projectile.x - cx, projectile.y - cy);
      if (distance <= profile.radius) {
        spawnParticles(world, projectile.x, projectile.y, "spark", 6, profile.color, 130);
        return false;
      }
      return true;
    });
    if (world.projectiles.length !== before) play(world, "deflect");
  }

  if (profile.ally > 0) {
    world.ally = { x: world.x, y: world.y - 40, life: profile.ally, phase: 0, cooldown: 0.6 };
    play(world, "summonAlly");
  }

  if (profile.restore) {
    world.energy = world.maxEnergy;
    world.shieldReady = true;
    toast(world, "Sinergia final · energía y escudo restaurados", 1.8);
  }

  if (hits > 0) shake(world, 7);
  return true;
}

export function cyclePower(world: WorldState, direction = 1) {
  const actives = [STARTING_ACTIVE, ...world.owned].filter(
    (id, index, list) =>
      list.indexOf(id) === index && POWER_BY_ID.get(id)?.kind !== "passive",
  );
  if (actives.length <= 1) return world.equipped;
  const current = actives.indexOf(world.equipped);
  const next = (current + direction + actives.length) % actives.length;
  world.equipped = actives[next];
  play(world, "switch");
  return world.equipped;
}

export function grantCharge(world: WorldState, reason: string) {
  if (world.charges >= MAX_CHARGES) {
    toast(world, `Cargas al máximo (${MAX_CHARGES})`, 1.2);
    return false;
  }
  world.charges += 1;
  play(world, "recharge");
  spawnRing(world, world.x + PLAYER_W / 2, world.y + PLAYER_H / 2, 54, "#12d9be");
  toast(world, `${reason} · E ×${world.charges}`, 1.6);
  return true;
}

export function grantPower(world: WorldState, powerId: string) {
  if (!powerId || world.owned.includes(powerId)) return;
  world.owned.push(powerId);
  const power = POWER_BY_ID.get(powerId);
  if (!power) return;
  if (powerId === "escudo") world.shieldReady = true;
  if (powerId === "ciberescudo") world.guardReady = true;
  if (powerId === "datos" || powerId === "tablero") world.radar = true;
  if (powerId === "autoempleo" || powerId === "tablero") {
    world.maxEnergy = levelMaxEnergy(world.owned);
  }
  if (powerId === "etica") world.time += 25;
  if (powerId === "cooperacion") world.time += 8;
  if (powerId === "siaf") world.time += 10;
  if (power.kind !== "passive") world.equipped = powerId;
  world.events.push(`power:${powerId}`);
  play(world, "power");
}

function hurtPlayer(world: WorldState, amount: number, fromX: number, label: string) {
  if (world.invulnerable > 0) return;
  if (world.guardReady) {
    world.guardReady = false;
    world.invulnerable = 1.1;
    play(world, "guard");
    spawnRing(world, world.x + PLAYER_W / 2, world.y + PLAYER_H / 2, 60, "#8d64ff");
    toast(world, "Escudo de ciberseguridad legal absorbió el golpe", 1.6);
    return;
  }
  if (world.shieldReady) {
    world.shieldReady = false;
    world.invulnerable = 1.1;
    play(world, "guard");
    spawnRing(world, world.x + PLAYER_W / 2, world.y + PLAYER_H / 2, 60, "#12d9be");
    toast(world, "Escudo de integridad activado", 1.6);
    return;
  }
  world.energy = Math.max(0, world.energy - amount);
  world.vx = world.x < fromX ? -155 : 155;
  world.vy = -235;
  world.invulnerable = 1.2;
  world.combo = 0;
  shake(world, 8);
  world.flash = 0.2;
  play(world, "hurt");
  spawnParticles(world, world.x + PLAYER_W / 2, world.y + PLAYER_H / 2, "spark", 12, "#ff7a86", 200);
  toast(world, label, 1.5);
}

/* ───────────────────────── COLISIONES ───────────────────────── */

function solidBlocks(world: WorldState) {
  return world.blocks.filter((block) => !block.broken);
}

function resolveHorizontal(world: WorldState) {
  for (const block of solidBlocks(world)) {
    if (!overlaps(world.x, world.y, PLAYER_W, PLAYER_H, block.x, block.y, block.w, block.h)) {
      continue;
    }
    if (world.vx > 0) {
      world.x = block.x - PLAYER_W;
      world.vx = 0;
    } else if (world.vx < 0) {
      world.x = block.x + block.w;
      world.vx = 0;
    }
  }
  if (world.arenaLocked && world.x < ARENA_GATE_X) {
    world.x = ARENA_GATE_X;
    world.vx = 0;
  }
}

function resolveVertical(world: WorldState, previousBottom: number, previousTop: number) {
  // Plataformas de un solo sentido.
  for (const platform of world.platforms) {
    if (world.vy < 0) continue;
    if (previousBottom > platform.y + 10) continue;
    if (world.y + PLAYER_H < platform.y) continue;
    if (world.x + PLAYER_W <= platform.x || world.x >= platform.x + platform.w) continue;
    world.y = platform.y - PLAYER_H;
    world.vy = 0;
    world.grounded = true;
    world.jumps = 0;
  }

  // Bloques: colisión sólida por los cuatro lados.
  for (const block of solidBlocks(world)) {
    if (!overlaps(world.x, world.y, PLAYER_W, PLAYER_H, block.x, block.y, block.w, block.h)) {
      continue;
    }
    if (world.vy > 0) {
      // Caer desde una plataforma sobre un bloque agrietado también lo rompe.
      const heavy = world.vy > 430;
      // Un picado franco lo abre de una, aunque tenga blindaje.
      const dive = world.vy > 600;
      world.y = block.y - PLAYER_H;
      world.vy = 0;
      world.grounded = true;
      world.jumps = 0;
      if (heavy) {
        if (dive && block.breakable) block.hits = Math.max(block.hits, block.armor - 1);
        hitBlock(world, block, "smash");
      }
    } else if (world.vy < 0) {
      world.y = block.y + block.h;
      world.vy = 80;
      hitBlock(world, block, "bump");
    } else if (previousTop >= block.y + block.h - 2) {
      world.y = block.y + block.h;
    } else {
      world.y = block.y - PLAYER_H;
      world.grounded = true;
    }
  }
}

/* ───────────────────────── ENEMIGOS: IA ───────────────────────── */

function surfaceUnder(world: WorldState, x: number, y: number): number | null {
  let best: number | null = null;
  for (const platform of world.platforms) {
    if (x < platform.x || x > platform.x + platform.w) continue;
    if (platform.y < y - 4) continue;
    if (best === null || platform.y < best) best = platform.y;
  }
  for (const block of solidBlocks(world)) {
    if (x < block.x || x > block.x + block.w) continue;
    if (block.y < y - 4) continue;
    if (best === null || block.y < best) best = block.y;
  }
  return best;
}

function fireProjectile(
  world: WorldState,
  x: number,
  y: number,
  vx: number,
  vy: number,
  kind: Projectile["kind"],
  life = 3.4,
  r = 9,
) {
  if (world.projectiles.length > 60) return;
  world.projectiles.push({ x, y, vx, vy, r, life, maxLife: life, kind, hostile: true, spin: 0 });
}

function spawnSpawnling(world: WorldState, owner: Enemy) {
  const alive = world.enemies.filter(
    (enemy) => enemy.kind === "spawnling" && enemy.alive,
  ).length;
  if (alive >= MAX_SPAWNLINGS) return;
  const own = world.enemies.filter(
    (enemy) => enemy.kind === "spawnling" && enemy.alive && enemy.ownerId === owner.id,
  ).length;
  if (own >= 3) return;
  const enemy = baseEnemy(2000 + world.enemies.length, "spawnling");
  enemy.x = owner.x + owner.w / 2 - 15;
  enemy.y = owner.y + owner.h;
  enemy.baseY = enemy.y;
  enemy.w = 30;
  enemy.h = 30;
  enemy.vx = Math.random() < 0.5 ? -76 : 76;
  enemy.vy = 40;
  enemy.minX = 20;
  enemy.maxX = WORLD_W - 40;
  enemy.hp = enemy.maxHp = 1;
  enemy.ownerId = owner.id;
  world.enemies.push(enemy);
  play(world, "summon");
  spawnParticles(world, enemy.x + 15, enemy.y, "smoke", 6, "#c9b6ff", 100);
}

function updateEnemy(world: WorldState, enemy: Enemy, dt: number) {
  if (!enemy.alive) return;
  enemy.hurt = Math.max(0, enemy.hurt - dt);
  if (enemy.stun > 0) {
    enemy.stun -= dt;
    return;
  }

  const playerCenter = world.x + PLAYER_W / 2;
  const onCamera = enemy.x - world.cameraX > -60 && enemy.x - world.cameraX < VIEW_W + 60;

  switch (enemy.kind) {
    case "walker": {
      enemy.x += enemy.vx * dt;
      if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) {
        enemy.vx *= -1;
        enemy.x = clamp(enemy.x, enemy.minX, enemy.maxX);
      }
      enemy.facing = Math.sign(enemy.vx) || 1;
      break;
    }
    case "flyer": {
      enemy.x += enemy.vx * dt;
      enemy.y = enemy.baseY + Math.sin(world.elapsed * 2.4 + enemy.phase) * 34;
      if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) {
        enemy.vx *= -1;
        enemy.x = clamp(enemy.x, enemy.minX, enemy.maxX);
      }
      enemy.facing = Math.sign(enemy.vx) || 1;
      break;
    }
    case "ranged": {
      enemy.facing = playerCenter < enemy.x ? -1 : 1;
      const distance = Math.abs(playerCenter - (enemy.x + enemy.w / 2));
      if (enemy.aim > 0) {
        enemy.aim -= dt;
        if (enemy.aim <= 0) {
          const originX = enemy.x + enemy.w / 2 + enemy.facing * 22;
          const originY = enemy.y + 18;
          const dx = playerCenter - originX;
          const dy = world.y + PLAYER_H / 2 - originY;
          const length = Math.hypot(dx, dy) || 1;
          fireProjectile(world, originX, originY, (dx / length) * 292, (dy / length) * 292, "orb");
          play(world, "shoot");
          spawnParticles(world, originX, originY, "spark", 6, "#ff9d6c", 120);
          enemy.cooldown = 2.3;
        }
      } else {
        enemy.cooldown -= dt;
        if (enemy.cooldown <= 0 && distance < 520 && onCamera) {
          enemy.aim = 0.7;
          play(world, "aim");
        }
      }
      break;
    }
    case "summoner": {
      enemy.x += enemy.vx * dt;
      enemy.y = enemy.baseY + Math.sin(world.elapsed * 1.5 + enemy.phase) * 22;
      if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) {
        enemy.vx *= -1;
        enemy.x = clamp(enemy.x, enemy.minX, enemy.maxX);
      }
      if (enemy.aim > 0) {
        enemy.aim -= dt;
        if (enemy.aim <= 0) {
          spawnSpawnling(world, enemy);
          enemy.cooldown = 3.4;
        }
      } else {
        enemy.cooldown -= dt;
        if (enemy.cooldown <= 0 && onCamera) {
          enemy.aim = 0.65;
          play(world, "aim");
        }
      }
      break;
    }
    case "spawnling": {
      enemy.vy += GRAVITY * 0.55 * dt;
      enemy.y += enemy.vy * dt;
      const surface = surfaceUnder(world, enemy.x + enemy.w / 2, enemy.y + enemy.h - 6);
      if (surface !== null && enemy.y + enemy.h >= surface && enemy.vy >= 0) {
        enemy.y = surface - enemy.h;
        enemy.vy = 0;
        enemy.grounded = true;
      } else {
        enemy.grounded = false;
      }
      if (enemy.grounded) {
        enemy.x += enemy.vx * dt;
        const ahead = surfaceUnder(
          world,
          enemy.x + (enemy.vx > 0 ? enemy.w + 6 : -6),
          enemy.y + enemy.h - 4,
        );
        // Cambia de dirección en los bordes de plataforma y en los límites.
        if (ahead === null || Math.abs(ahead - (enemy.y + enemy.h)) > 26) {
          enemy.vx *= -1;
          enemy.x = clamp(enemy.x, enemy.minX, enemy.maxX);
        }
        if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) {
          enemy.vx *= -1;
          enemy.x = clamp(enemy.x, enemy.minX, enemy.maxX);
        }
      }
      enemy.facing = Math.sign(enemy.vx) || 1;
      if (enemy.y > VIEW_H + 120) enemy.alive = false;
      break;
    }
    case "zombie": {
      if (enemy.state === "buried") {
        const distance = Math.abs(playerCenter - (enemy.x + enemy.w / 2));
        if (distance < 300 && onCamera) {
          enemy.state = "warning";
          enemy.timer = ZOMBIE_WARNING;
          play(world, "zombieWarn");
          spawnParticles(world, enemy.x + enemy.w / 2, enemy.y + enemy.h, "smoke", 8, "#8b7f6a", 90);
        }
        break;
      }
      if (enemy.state === "warning") {
        // Exactamente 2 s de mano fuera del suelo, sin causar daño.
        enemy.timer -= dt;
        if (enemy.timer <= 0) {
          enemy.state = "rising";
          enemy.timer = 0.36;
          play(world, "zombieRise");
          spawnParticles(world, enemy.x + enemy.w / 2, enemy.y + enemy.h, "smoke", 14, "#a5936f", 150);
          shake(world, 4);
        }
        break;
      }
      if (enemy.state === "rising") {
        enemy.timer -= dt;
        if (enemy.timer <= 0) {
          enemy.state = "active";
          enemy.vx = playerCenter < enemy.x ? -64 : 64;
        }
        break;
      }
      enemy.x += enemy.vx * dt;
      const chase = Math.abs(playerCenter - (enemy.x + enemy.w / 2)) < 240;
      if (chase) enemy.vx = playerCenter < enemy.x ? -70 : 70;
      if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) {
        enemy.vx *= -1;
        enemy.x = clamp(enemy.x, enemy.minX, enemy.maxX);
      }
      enemy.facing = Math.sign(enemy.vx) || 1;
      break;
    }
    default:
      break;
  }
}

/** El zombi no puede dañar mientras solo asoma la mano. */
export function enemyIsHarmless(enemy: Enemy) {
  return (
    !enemy.alive ||
    (enemy.kind === "zombie" &&
      (enemy.state === "buried" || enemy.state === "warning" || enemy.state === "rising"))
  );
}

/* ───────────────────────── JEFES ───────────────────────── */

function bossDefinition(world: WorldState) {
  return LEVELS[world.levelIndex].boss;
}

function executeBossAttack(world: WorldState, boss: Enemy, attack: BossAttackDef) {
  const definition = bossDefinition(world);
  const phase = definition.phases[boss.phaseIndex];
  const cx = boss.x + boss.w / 2;
  const cy = boss.y + boss.h / 2;
  const playerCenter = world.x + PLAYER_W / 2;
  boss.facing = playerCenter < cx ? -1 : 1;

  switch (attack.kind) {
    case "dash": {
      boss.vx = boss.facing * phase.speed * 2.5;
      boss.acting = attack.recover;
      play(world, "bossDash");
      spawnParticles(world, cx, cy, "after", 10, definition.color, 150);
      break;
    }
    case "volley": {
      const count = attack.power ?? 3;
      const muzzleX = cx + boss.facing * (boss.w / 2 + 14);
      for (let i = 0; i < count; i += 1) {
        const spread = (i - (count - 1) / 2) * 0.22;
        const dx = playerCenter - muzzleX;
        const dy = world.y + PLAYER_H / 2 - cy;
        const angle = Math.atan2(dy, dx) + spread;
        fireProjectile(
          world,
          muzzleX,
          cy,
          Math.cos(angle) * 250,
          Math.sin(angle) * 250,
          definition.id === "sello" ? "paper" : definition.id === "legacy" ? "bit" : "orb",
          3.6,
          10,
        );
      }
      boss.acting = 0.1;
      play(world, "bossShoot");
      break;
    }
    case "slam": {
      boss.vy = -520;
      boss.acting = attack.recover;
      boss.state = "idle";
      boss.timer = 1;
      play(world, "bossJump");
      break;
    }
    case "summon": {
      const count = attack.power ?? 2;
      for (let i = 0; i < count; i += 1) {
        const alive = world.enemies.filter((e) => e.kind === "spawnling" && e.alive).length;
        if (alive >= MAX_SPAWNLINGS) break;
        const minion = baseEnemy(3000 + world.enemies.length, "spawnling");
        minion.x = clamp(cx - 40 + i * 42, ARENA_X + 30, WORLD_W - 70);
        minion.y = 180;
        minion.baseY = minion.y;
        minion.w = 32;
        minion.h = 32;
        minion.vx = i % 2 === 0 ? -80 : 80;
        minion.vy = 30;
        minion.minX = ARENA_X + 20;
        minion.maxX = WORLD_W - 40;
        minion.hp = minion.maxHp = 1;
        minion.ownerId = boss.id;
        world.enemies.push(minion);
      }
      boss.acting = 0.2;
      play(world, "summon");
      break;
    }
    case "beam": {
      // 0.4 s de columna visible e inofensiva antes de quemar.
      const life = 0.95;
      world.projectiles.push({
        x: playerCenter,
        y: 0,
        vx: 0,
        vy: 0,
        r: 26,
        life,
        maxLife: life,
        kind: "beam",
        hostile: true,
        spin: 0,
      });
      boss.acting = attack.recover * 0.5;
      play(world, "bossBeam");
      shake(world, 6);
      break;
    }
    case "split": {
      for (let i = 0; i < (attack.power ?? 2); i += 1) {
        const copy = baseEnemy(4000 + world.enemies.length, "walker");
        copy.x = clamp(cx + (i === 0 ? -120 : 120), ARENA_X + 30, WORLD_W - 80);
        copy.y = GROUND_Y - 44;
        copy.baseY = copy.y;
        copy.w = 44;
        copy.h = 44;
        copy.minX = ARENA_X + 25;
        copy.maxX = WORLD_W - 50;
        copy.vx = i === 0 ? -96 : 96;
        copy.hp = copy.maxHp = 2;
        copy.ownerId = boss.id;
        world.enemies.push(copy);
      }
      boss.acting = 0.25;
      play(world, "bossSplit");
      break;
    }
    case "orbit": {
      const count = attack.power ?? 6;
      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count;
        fireProjectile(
          world,
          cx,
          cy,
          Math.cos(angle) * 190,
          Math.sin(angle) * 190,
          "orb",
          3.2,
          9,
        );
      }
      boss.acting = 0.2;
      play(world, "bossShoot");
      break;
    }
    default:
      boss.acting = 0.2;
      break;
  }
}

function updateBoss(world: WorldState, dt: number) {
  const boss = world.boss;
  if (!boss || !boss.alive) return;
  const definition = bossDefinition(world);
  boss.hurt = Math.max(0, boss.hurt - dt);
  boss.hitCooldown = Math.max(0, boss.hitCooldown - dt);

  // Fases: el patrón cambia con la vida restante.
  const ratio = boss.hp / boss.maxHp;
  let target = 0;
  for (let i = 0; i < definition.phases.length; i += 1) {
    if (ratio <= definition.phases[i].from) target = i;
  }
  if (target > boss.phaseIndex) {
    boss.phaseIndex = target;
    world.bossPhase = target;
    boss.telegraph = 0;
    boss.telegraphOf = null;
    boss.acting = 0;
    boss.wait = 0.9;
    boss.stun = 0.35;
    world.flash = 0.28;
    shake(world, 10);
    play(world, "bossPhase");
    toast(world, `${definition.name} · ${definition.phases[target].label}`, 2.2);
    world.events.push(`boss-phase:${target}`);
  }

  if (!world.arenaEntered) {
    boss.y = boss.baseY;
    return;
  }

  const phase = definition.phases[boss.phaseIndex];
  if (boss.stun > 0) {
    boss.stun -= dt;
  } else if (boss.telegraph > 0) {
    boss.telegraph -= dt;
    boss.vx *= 0.86;
    if (boss.telegraph <= 0 && boss.telegraphOf) {
      const attack = boss.telegraphOf;
      boss.telegraphOf = null;
      executeBossAttack(world, boss, attack);
      boss.wait = attack.recover;
    }
  } else if (boss.acting > 0) {
    boss.acting -= dt;
  } else if (boss.wait > 0) {
    boss.wait -= dt;
    boss.vx *= 0.9;
    const playerCenter = world.x + PLAYER_W / 2;
    boss.vx += Math.sign(playerCenter - (boss.x + boss.w / 2)) * phase.speed * 0.5 * dt;
  } else {
    const attack = phase.attacks[boss.attackIndex % phase.attacks.length];
    boss.attackIndex += 1;
    boss.telegraph = attack.telegraph;
    boss.telegraphOf = attack;
    boss.vx *= 0.4;
    play(world, "bossTell");
    spawnRing(world, boss.x + boss.w / 2, boss.y + boss.h / 2, 70, definition.color);
  }

  boss.x += boss.vx * dt;
  boss.vy += GRAVITY * dt;
  boss.y += boss.vy * dt;
  if (boss.y + boss.h >= GROUND_Y) {
    const wasAir = boss.vy > 260;
    boss.y = GROUND_Y - boss.h;
    boss.vy = 0;
    if (wasAir) {
      // Onda de choque saltable al aterrizar.
      for (const direction of [-1, 1]) {
        fireProjectile(
          world,
          boss.x + boss.w / 2,
          GROUND_Y - 22,
          direction * 250,
          0,
          "shock",
          2.4,
          16,
        );
      }
      play(world, "bossSlam");
      shake(world, 11);
      spawnParticles(world, boss.x + boss.w / 2, GROUND_Y, "smoke", 16, "#ffffff", 220);
    }
  }
  boss.x = clamp(boss.x, boss.minX, boss.maxX);
  boss.vx = clamp(boss.vx, -phase.speed * 3.4, phase.speed * 3.4);
}

/* ───────────────────────── ALIADO ───────────────────────── */

function updateAlly(world: WorldState, dt: number) {
  const ally = world.ally;
  if (!ally) return;
  ally.life -= dt;
  ally.phase += dt * 3;
  if (ally.life <= 0) {
    world.ally = null;
    return;
  }
  const targetX = world.x + PLAYER_W / 2 + Math.cos(ally.phase) * 66;
  const targetY = world.y + 6 + Math.sin(ally.phase * 1.3) * 26;
  ally.x += (targetX - ally.x) * Math.min(1, dt * 7);
  ally.y += (targetY - ally.y) * Math.min(1, dt * 7);
  ally.cooldown -= dt;
  if (ally.cooldown > 0) return;
  const candidates = [...world.enemies, ...(world.boss ? [world.boss] : [])].filter(
    (enemy) =>
      enemy.alive &&
      !enemyIsHarmless(enemy) &&
      Math.hypot(enemy.x + enemy.w / 2 - ally.x, enemy.y + enemy.h / 2 - ally.y) < 220,
  );
  if (candidates.length === 0) return;
  candidates.sort(
    (a, b) =>
      Math.hypot(a.x - ally.x, a.y - ally.y) - Math.hypot(b.x - ally.x, b.y - ally.y),
  );
  const target = candidates[0];
  damageEnemy(world, target, 1);
  spawnSlash(world, target.x + target.w / 2, target.y + target.h / 2, "#b7fff1");
  play(world, "allyShot");
  ally.cooldown = 1.15;
}

/* ───────────────────────── PASO PRINCIPAL ───────────────────────── */

export function step(world: WorldState, dt: number, controls: Controls) {
  if (world.status !== "playing") return world;
  const delta = clamp(dt, 0, MAX_DT);
  world.elapsed += delta;

  if (world.hitStop > 0) {
    world.hitStop -= delta;
    return world;
  }

  const previousTop = world.y;
  const previousBottom = world.y + PLAYER_H;

  // Movimiento horizontal.
  const target = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
  // Girar en seco responde más rápido que seguir acelerando de frente.
  const turning = target !== 0 && Math.sign(world.vx) === -target;
  const acceleration = (world.grounded ? 1400 : 860) * (turning ? 1.9 : 1);
  world.vx += target * acceleration * delta;
  if (target === 0) world.vx *= Math.pow(world.grounded ? 0.0015 : 0.12, delta);
  world.vx = clamp(world.vx, -MAX_VX, MAX_VX);
  if (target !== 0) world.facing = target;
  world.x += world.vx * delta;
  world.x = clamp(world.x, 20, WORLD_W - 60);
  resolveHorizontal(world);

  // Movimiento vertical.
  const wasGrounded = world.grounded;
  // Caída más pesada que la subida: el salto se siente firme sin cambiar su altura.
  world.vy += GRAVITY * (world.vy > 0 ? 1.3 : 1) * delta;
  world.vy = Math.min(world.vy, 980);
  world.y += world.vy * delta;
  world.grounded = false;
  resolveVertical(world, previousBottom, previousTop);
  if (world.jumpBuffer > 0) {
    world.jumpBuffer -= delta;
    if (world.grounded) {
      world.jumpBuffer = 0;
      jump(world);
    }
  }
  if (wasGrounded && !world.grounded) world.coyote = 0.13;
  else world.coyote = Math.max(0, world.coyote - delta);
  if (world.grounded) {
    world.safeX = world.x;
    world.safeY = world.y;
  }

  // Estela ninja.
  if (!world.reducedMotion && Math.abs(world.vx) > 190) {
    world.trail.push({ x: world.x, y: world.y, life: 0.24 });
  }
  world.trail = world.trail.filter((point) => {
    point.life -= delta;
    return point.life > 0;
  });

  // Caída al pozo.
  if (world.y > VIEW_H + 60) {
    world.x = world.safeX;
    world.y = world.safeY - 24;
    world.vx = 0;
    world.vy = -120;
    world.invulnerable = Math.max(world.invulnerable, 0.8);
    world.time = Math.max(0, world.time - 8);
    world.energy = Math.max(0, world.energy - 14);
    play(world, "fall");
    shake(world, 8);
    toast(world, "La ruta se reconfiguró · −8 s", 1.6);
  }

  // Arena del jefe.
  if (!world.arenaEntered && world.x > ARENA_X) {
    world.arenaEntered = true;
    if (world.boss && world.boss.alive) {
      world.arenaLocked = true;
      play(world, "arena");
      toast(world, `${bossDefinition(world).name}: ${bossDefinition(world).intro}`, 3.2);
      world.events.push("boss-intro");
    }
  }

  for (const enemy of world.enemies) updateEnemy(world, enemy, delta);
  updateBoss(world, delta);
  updateAlly(world, delta);

  // Proyectiles.
  world.projectiles = world.projectiles.filter((projectile) => {
    projectile.life -= delta;
    if (projectile.life <= 0) return false;
    if (projectile.kind !== "beam") {
      projectile.x += projectile.vx * delta;
      projectile.y += projectile.vy * delta;
      projectile.spin += delta * 8;
      if (projectile.x < -60 || projectile.x > WORLD_W + 60) return false;
      if (projectile.y > VIEW_H + 60 || projectile.y < -120) return false;
      if (projectile.kind !== "shock") {
        for (const platform of world.platforms) {
          if (
            overlaps(
              projectile.x - projectile.r,
              projectile.y - projectile.r,
              projectile.r * 2,
              projectile.r * 2,
              platform.x,
              platform.y,
              platform.w,
              platform.h,
            )
          ) {
            spawnParticles(world, projectile.x, projectile.y, "spark", 5, "#ffb0a0", 90);
            return false;
          }
        }
      }
    }
    const hitbox =
      projectile.kind === "beam"
        ? { x: projectile.x - projectile.r, y: 0, w: projectile.r * 2, h: VIEW_H }
        : {
            x: projectile.x - projectile.r,
            y: projectile.y - projectile.r,
            w: projectile.r * 2,
            h: projectile.r * 2,
          };
    if (
      projectile.hostile &&
      overlaps(world.x, world.y, PLAYER_W, PLAYER_H, hitbox.x, hitbox.y, hitbox.w, hitbox.h)
    ) {
      hurtPlayer(world, projectile.kind === "beam" ? 14 : 11, projectile.x, "Impacto enemigo");
      return false;
    }
    return true;
  });

  // Contacto con enemigos.
  const contacts = [...world.enemies, ...(world.boss ? [world.boss] : [])];
  for (const enemy of contacts) {
    if (enemyIsHarmless(enemy)) continue;
    if (!overlaps(world.x, world.y, PLAYER_W, PLAYER_H, enemy.x, enemy.y, enemy.w, enemy.h)) {
      continue;
    }
    const stomp = world.vy > 55 && previousBottom <= enemy.y + 18;
    if (stomp) {
      if (enemy.boss) {
        if (enemy.hitCooldown <= 0) {
          enemy.hitCooldown = 0.45;
          damageEnemy(world, enemy, world.vy > 600 ? 2 : 1, true);
        }
      } else {
        damageEnemy(world, enemy, world.vy > 600 ? 2 : 1, true);
      }
      world.vy = world.vy > 600 ? -430 : -372;
      // Sin esta gracia, al rebotar sobre un jefe alto el contacto del
      // siguiente fotograma contaba como golpe recibido.
      world.invulnerable = Math.max(world.invulnerable, 0.35);
      world.hitStop = world.reducedMotion ? 0 : 0.045;
      play(world, "stomp");
      spawnSlash(world, enemy.x + enemy.w / 2, enemy.y, "#ffffff");
    } else {
      hurtPlayer(
        world,
        enemy.boss ? 20 : 13,
        enemy.x,
        `${LEVELS[world.levelIndex].villain} drenó tu enfoque`,
      );
    }
  }

  // Documentos del CV.
  for (const item of world.collectibles) {
    if (item.taken) continue;
    if (!overlaps(world.x, world.y, PLAYER_W, PLAYER_H, item.x - 22, item.y - 26, 44, 52)) continue;
    item.taken = true;
    const document = LEVELS[world.levelIndex].documents[item.index];
    world.energy = Math.min(
      world.maxEnergy,
      world.energy +
        15 +
        (has(world, "resiliencia") ? 20 : 0) +
        (has(world, "planillas") ? 10 : 0),
    );
    if (has(world, "fondos")) world.time += 5;
    play(world, "document");
    spawnRing(world, item.x, item.y, 56, LEVELS[world.levelIndex].palette[3]);
    spawnParticles(world, item.x, item.y, "glyph", 12, LEVELS[world.levelIndex].palette[3], 160);
    world.events.push(`document:${document.id}`);
    if (document.power) grantPower(world, document.power);
    if (document.recharge) grantCharge(world, `${document.title}`);
    else toast(world, document.title, 2.4);
  }

  // Partículas.
  world.particles = world.particles.filter((particle) => {
    particle.life -= delta;
    if (particle.kind === "ring" || particle.kind === "slash") return particle.life > 0;
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vy += 420 * delta;
    particle.vx *= 0.985;
    return particle.life > 0;
  });

  for (const block of world.blocks) block.shake = Math.max(0, block.shake - delta);

  // Salida.
  const taken = world.collectibles.filter((item) => item.taken).length;
  const bossAlive = Boolean(world.boss?.alive);
  if (world.x > GATE_X) {
    const needed = requiredDocuments(world.levelIndex);
    if (taken >= needed && !bossAlive) {
      world.status = "won";
      play(world, "win");
      world.events.push("level-won");
    } else {
      world.x = GATE_X - 6;
      if (world.toastTime <= 0)
        toast(
        world,
        bossAlive
          ? `${bossDefinition(world).name} aún protege la salida`
          : `Recupera ${needed} de ${documentCount(world.levelIndex)} documentos para abrir la salida`,
        2,
      );
    }
  }

  // Temporizadores.
  world.time -= delta;
  world.invulnerable = Math.max(0, world.invulnerable - delta);
  world.cooldown = Math.max(0, world.cooldown - delta);
  world.pulseVisual = Math.max(0, world.pulseVisual - delta);
  world.toastTime = Math.max(0, world.toastTime - delta);
  world.shake = Math.max(0, world.shake - delta * 42);
  world.flash = Math.max(0, world.flash - delta * 2.2);
  world.comboTime = Math.max(0, world.comboTime - delta);
  if (world.comboTime <= 0) world.combo = 0;

  if (world.time <= 0 || world.energy <= 0) {
    world.time = Math.max(0, world.time);
    world.status = "failed";
    play(world, "lose");
    world.events.push("level-failed");
  }

  world.cameraX = clamp(world.x - 320, 0, WORLD_W - VIEW_W);
  return world;
}

/** Recompensa por derrotar al jefe: poder real del CV + una carga de E. */
export function claimBossReward(world: WorldState) {
  const level = LEVELS[world.levelIndex];
  grantPower(world, level.reward);
  const gained = world.charges < MAX_CHARGES;
  if (gained) world.charges += 1;
  return { power: level.reward, charge: gained, charges: world.charges };
}

export function drainSounds(world: WorldState): string[] {
  const sounds = world.sounds;
  world.sounds = [];
  return sounds;
}

export function drainEvents(world: WorldState): string[] {
  const events = world.events;
  world.events = [];
  return events;
}
