/**
 * Pruebas del motor de juego. Node ejecuta los módulos TypeScript con
 * eliminación de tipos, así que se prueba el mismo código que usa el navegador.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  ARCHIVE,
  LEVELS,
  MAX_CHARGES,
  POWERS,
  POWER_BY_ID,
  START_CHARGES,
  STARTING_ACTIVE,
} from "../app/cv-data.ts";
import {
  ARENA_X,
  BLOCK,
  GATE_X,
  GROUND_Y,
  JUMP_HEIGHT,
  PLAYER_H,
  PLAYER_W,
  WORLD_W,
  ZOMBIE_WARNING,
  claimBossReward,
  createBlocks,
  createCollectibles,
  createBoss,
  createEnemies,
  createWorld,
  cyclePower,
  drainEvents,
  enemyIsHarmless,
  firePulse,
  grantCharge,
  hitBlock,
  jump,
  levelTimeLimit,
  releaseJump,
  requiredDocuments,
  slamDown,
  pulseProfile,
  step,
} from "../app/engine.ts";

const NO_INPUT = { left: false, right: false };

/** Avanza el mundo en pasos fijos para que la física no dependa del framerate. */
function advance(world, seconds, controls = NO_INPUT, dt = 1 / 60) {
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i += 1) step(world, dt, controls);
  return world;
}

function playable(levelIndex, options = {}) {
  const world = createWorld(levelIndex, "playing", options);
  world.reducedMotion = true;
  return world;
}

/* ───────────────── Estructura de la campaña ───────────────── */

test("la campaña tiene siete niveles cronológicos con jefe obligatorio", () => {
  assert.equal(LEVELS.length, 7);
  const villains = LEVELS.map((level) => level.villain);
  assert.deepEqual(villains, [
    "La Duda",
    "El Caos",
    "La Procrastinación",
    "La Burocracia",
    "El Desánimo",
    "El Bug Legacy",
    "El Sesgo",
  ]);
  for (const [index, level] of LEVELS.entries()) {
    assert.ok(level.boss, `el nivel ${index + 1} necesita jefe`);
    assert.ok(level.boss.hp > 0);
    assert.ok(level.boss.phases.length >= 2, `${level.boss.name} necesita 2+ patrones`);
    assert.ok(level.intro.length > 40, "cada nivel necesita introducción narrativa");
    assert.ok(level.conflict.length > 30, "cada nivel necesita conflicto");
    assert.ok(level.outro.length > 20, "cada nivel necesita escena de victoria");
    assert.ok(POWER_BY_ID.has(level.reward), "la recompensa debe ser un poder real");
    assert.ok(
      level.documents.length >= 3 && level.documents.length <= 6,
      `el nivel ${index + 1} tiene ${level.documents.length} documentos`,
    );
    for (const attack of level.boss.phases.flatMap((phase) => phase.attacks)) {
      assert.ok(attack.telegraph >= 0.4, "todo ataque de jefe debe telegrafiarse");
    }
  }
});

test("la dificultad de los jefes crece de forma monótona", () => {
  const life = LEVELS.map((level) => level.boss.hp);
  for (let i = 1; i < life.length; i += 1) {
    assert.ok(life[i] > life[i - 1], `el jefe ${i + 1} debe ser más duro`);
  }
});

test("El Sesgo es el jefe final y tiene varias fases", () => {
  const final = LEVELS[LEVELS.length - 1];
  assert.equal(final.villain, "El Sesgo");
  assert.ok(final.boss.phases.length >= 3);
  // La batalla final combina mecánicas de niveles anteriores.
  const kinds = new Set(final.boss.phases.flatMap((phase) => phase.attacks).map((a) => a.kind));
  for (const kind of ["dash", "volley", "summon", "slam", "beam", "orbit", "split"]) {
    assert.ok(kinds.has(kind), `la batalla final debe incluir ${kind}`);
  }
});

test("cada poder declara el logro real que lo respalda", () => {
  for (const power of POWERS) {
    assert.ok(power.source.length > 8, `${power.id} sin logro de origen`);
    assert.ok(power.issuer.length > 2, `${power.id} sin institución`);
    assert.ok(power.year.length >= 4, `${power.id} sin año`);
    assert.ok(power.effect.length > 10, `${power.id} sin efecto de juego`);
  }
  assert.ok(POWER_BY_ID.get(STARTING_ACTIVE));
  assert.ok(ARCHIVE.length >= 40, "el CV ampliado debe conservar el expediente");
});

/* ───────────────── Bloques rompibles ───────────────── */

test("cada bloque rompible es alcanzable: cabe el jugador debajo y llega el salto", () => {
  for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex += 1) {
    const world = playable(levelIndex);
    const surfaces = [
      ...world.platforms.map((platform) => platform.y),
      ...world.blocks.map((block) => block.y),
    ];
    for (const block of world.blocks) {
      if (!block.breakable) continue;
      const support = surfaces
        .filter((y) => y >= block.y + block.h + PLAYER_H)
        .sort((a, b) => a - b)[0];
      const reachableFromBelow =
        support !== undefined && support - PLAYER_H - (block.y + block.h) <= JUMP_HEIGHT;
      // O se golpea desde abajo, o es una torre que se pisa/rompe con E.
      const standable = block.y + block.h >= GROUND_Y - BLOCK * 2;
      assert.ok(
        reachableFromBelow || standable,
        `bloque rompible inalcanzable en nivel ${levelIndex + 1} (${block.x},${block.y})`,
      );
    }
  }
});

test("el golpe de cabeza rompe el bloque ámbar y libera la colisión", () => {
  const world = playable(0);
  const block = world.blocks.find((item) => item.breakable && item.y === 318);
  assert.ok(block, "debe existir una fila rompible sobre el suelo");
  block.armor = 1;

  // Colocar al jugador justo debajo del bloque y saltar.
  world.x = block.x + 2;
  world.y = GROUND_Y - PLAYER_H;
  world.grounded = true;
  jump(world);
  advance(world, 0.6);

  assert.equal(block.broken, true, "el bloque debe romperse al golpearlo con la cabeza");
  // Sin colisión residual: el jugador puede ocupar el espacio del bloque.
  world.x = block.x + 2;
  world.y = block.y;
  world.vy = 0;
  advance(world, 0.05);
  assert.ok(world.y >= block.y, "el bloque roto no debe seguir empujando al jugador");
});

test("los bloques indestructibles resisten el golpe y el pulso", () => {
  const world = playable(0);
  const solid = world.blocks.find((item) => !item.breakable);
  assert.ok(solid);
  assert.equal(hitBlock(world, solid, "bump"), false);
  assert.equal(solid.broken, false);
  world.x = solid.x;
  world.y = solid.y + 80;
  world.charges = 5;
  firePulse(world);
  assert.equal(solid.broken, false, "el acero no se rompe con E");
});

test("el pulso E rompe los bloques rompibles dentro de su alcance", () => {
  const world = playable(0);
  const block = world.blocks.find((item) => item.breakable);
  assert.ok(block);
  world.x = block.x;
  world.y = block.y + 60;
  world.charges = 3;
  const broke = firePulse(world);
  assert.equal(broke, true);
  assert.equal(block.broken, true, "E debe destruir el bloque agrietado cercano");
});

test("los bloques con blindaje muestran grietas antes de romperse", () => {
  const world = playable(4);
  const block = world.blocks.find((item) => item.breakable);
  assert.ok(block);
  assert.equal(block.armor, 2, "los niveles avanzados usan dos golpes");
  assert.equal(hitBlock(world, block, "bump"), false);
  assert.equal(block.hits, 1);
  assert.equal(block.broken, false);
  assert.equal(hitBlock(world, block, "bump"), true);
  assert.equal(block.broken, true);
});

test("una caída fuerte también rompe el bloque ámbar", () => {
  const world = playable(0);
  const block = world.blocks.find((item) => item.breakable && item.y === 318);
  assert.ok(block);
  block.armor = 1;
  // Se deja caer desde justo debajo de la plataforma superior.
  world.x = block.x + 2;
  world.y = block.y - PLAYER_H - 44;
  world.vy = 620;
  advance(world, 0.4);
  assert.equal(block.broken, true);
});

test("ningún bloque queda invisible ni superpuesto a otro", () => {
  for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex += 1) {
    const blocks = createBlocks(levelIndex);
    for (let i = 0; i < blocks.length; i += 1) {
      for (let j = i + 1; j < blocks.length; j += 1) {
        const a = blocks[i];
        const b = blocks[j];
        const overlap =
          a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
        assert.equal(overlap, false, `bloques superpuestos en nivel ${levelIndex + 1}`);
      }
    }
  }
});

/* ───────────────── Cargas de E ───────────────── */

test("la campaña arranca con tres cargas y nunca pasa de cinco", () => {
  assert.equal(START_CHARGES, 3);
  assert.equal(MAX_CHARGES, 5);
  const world = playable(0);
  assert.equal(world.charges, 3);
  for (let i = 0; i < 10; i += 1) grantCharge(world, "prueba");
  assert.equal(world.charges, MAX_CHARGES, "el tope de cargas debe ser 5");
});

test("cada pulso consume una carga y sin cargas no se dispara", () => {
  const world = playable(0);
  world.charges = 2;
  assert.equal(firePulse(world), true);
  assert.equal(world.charges, 1);
  world.cooldown = 0;
  assert.equal(firePulse(world), true);
  assert.equal(world.charges, 0);
  world.cooldown = 0;
  assert.equal(firePulse(world), false, "sin cargas no debe activarse");
  assert.equal(world.charges, 0);
  assert.ok(world.toast.includes("Sin cargas"));
});

test("las cargas se conservan entre niveles y el reintento nunca deja en cero", () => {
  const carried = createWorld(3, "playing", { charges: 4 });
  assert.equal(carried.charges, 4, "las cargas restantes viajan al siguiente nivel");
  const retry = createWorld(3, "playing", { charges: 0 });
  assert.equal(retry.charges, 1, "al reintentar siempre queda al menos una carga");
});

test("el documento marcado y la victoria del jefe recargan una carga", () => {
  const world = playable(0, { charges: 1 });
  const document = LEVELS[0].documents.find((item) => item.recharge);
  assert.ok(document, "cada nivel debe tener un documento que recarga");
  const item = world.collectibles.find(
    (entry) => LEVELS[0].documents[entry.index].id === document.id,
  );
  world.x = item.x - PLAYER_W / 2;
  world.y = item.y - PLAYER_H / 2;
  advance(world, 0.05);
  assert.equal(item.taken, true);
  assert.equal(world.charges, 2, "el documento marcado devuelve una carga");

  const before = world.charges;
  const reward = claimBossReward(world);
  assert.equal(reward.charges, before + 1, "vencer al jefe recarga una carga");
  assert.ok(world.owned.includes(LEVELS[0].reward));
});

test("recoger un documento dos veces no genera cargas infinitas", () => {
  const world = playable(0, { charges: 0 });
  const document = LEVELS[0].documents.find((item) => item.recharge);
  const item = world.collectibles.find(
    (entry) => LEVELS[0].documents[entry.index].id === document.id,
  );
  world.x = item.x - PLAYER_W / 2;
  world.y = item.y - PLAYER_H / 2;
  advance(world, 0.4);
  const afterFirst = world.charges;
  advance(world, 1);
  assert.equal(world.charges, afterFirst, "el cristal no reaparece dentro de la partida");
});

test("las variantes activas de E se rotan y cambian de alcance", () => {
  const world = playable(5, { owned: ["oratoria", "rayo", "etica"], equipped: "voz" });
  const base = pulseProfile(world).radius;
  const next = cyclePower(world, 1);
  assert.notEqual(next, "voz");
  assert.notEqual(pulseProfile(world).radius, base);
  // Las pasivas nunca entran en la rotación de E.
  for (let i = 0; i < 6; i += 1) {
    assert.notEqual(cyclePower(world, 1), "etica");
  }
});

test("la llave SIAF amplía el alcance del pulso sobre bloques", () => {
  const plain = playable(4, { owned: [] });
  const withKey = playable(4, { owned: ["siaf"] });
  assert.ok(pulseProfile(withKey).blockRadius > pulseProfile(plain).blockRadius);
});

/* ───────────────── Enemigos ───────────────── */

test("el zombi enterrado avisa exactamente 2 segundos y no daña durante el aviso", () => {
  assert.equal(ZOMBIE_WARNING, 2);
  const world = playable(0);
  const zombie = world.enemies.find((enemy) => enemy.kind === "zombie");
  assert.ok(zombie, "el zombi aparece desde los primeros niveles");
  assert.equal(zombie.state, "buried");

  world.x = zombie.x - 60;
  world.y = GROUND_Y - PLAYER_H;
  world.cameraX = Math.max(0, world.x - 320);
  step(world, 1 / 60, NO_INPUT);
  assert.equal(zombie.state, "warning");
  assert.ok(Math.abs(zombie.timer - ZOMBIE_WARNING) < 0.02);
  assert.equal(enemyIsHarmless(zombie), true, "la mano no puede hacer daño");

  // A mitad del aviso el jugador puede pisar el mismo punto sin recibir daño.
  const energy = world.energy;
  advance(world, 1);
  world.x = zombie.x;
  world.y = zombie.y;
  advance(world, 0.1);
  assert.equal(zombie.state, "warning");
  assert.equal(world.energy, energy, "durante el aviso no hay daño");

  advance(world, 1.1);
  assert.notEqual(zombie.state, "warning", "tras 2 s el zombi emerge");
  advance(world, 0.5);
  assert.equal(zombie.state, "active");
  assert.equal(enemyIsHarmless(zombie), false);
});

test("el enemigo a distancia avisa, dispara y su proyectil desaparece solo", () => {
  const world = playable(1);
  const shooter = world.enemies.find((enemy) => enemy.kind === "ranged");
  assert.ok(shooter, "los niveles con torretas deben tenerlas");
  world.x = shooter.x - 220;
  world.y = shooter.y - 20;
  world.cameraX = Math.max(0, world.x - 320);
  shooter.cooldown = 0.2;

  advance(world, 1.3);
  assert.ok(world.projectiles.length > 0, "la torreta debe disparar");
  const shot = world.projectiles[0];
  assert.equal(shot.hostile, true);
  assert.ok(shot.vx !== 0 || shot.vy !== 0, "el proyectil debe viajar");
  advance(world, 4);
  assert.equal(
    world.projectiles.some((item) => item === shot),
    false,
    "el proyectil debe desaparecer de forma segura",
  );
});

test("la torreta no dispara desde fuera de cámara", () => {
  const world = playable(1);
  const shooter = world.enemies.find((enemy) => enemy.kind === "ranged");
  world.x = 92;
  world.y = GROUND_Y - PLAYER_H;
  world.cameraX = 0;
  shooter.x = 2400; // muy lejos, fuera de la vista
  shooter.cooldown = 0;
  advance(world, 1.5);
  assert.equal(world.projectiles.length, 0, "sin cámara no hay disparo injusto");
});

test("el invocador aéreo suelta criaturas que caminan y no se acumulan", () => {
  const world = playable(6);
  const summoner = world.enemies.find((enemy) => enemy.kind === "summoner");
  assert.ok(summoner, "los niveles avanzados tienen invocador aéreo");
  world.x = summoner.x;
  world.y = GROUND_Y - PLAYER_H;
  world.cameraX = Math.max(0, world.x - 320);

  advance(world, 30);
  const spawnlings = world.enemies.filter((enemy) => enemy.kind === "spawnling");
  assert.ok(spawnlings.length > 0, "debe soltar criaturas");
  const alive = spawnlings.filter((enemy) => enemy.alive);
  assert.ok(alive.length <= 6, "la cantidad simultánea está limitada");
  const grounded = spawnlings.filter((enemy) => enemy.grounded);
  assert.ok(grounded.length > 0, "las criaturas deben aterrizar en el terreno");
  for (const creature of grounded) {
    assert.ok(Math.abs(creature.vx) > 0, "al aterrizar deben caminar");
  }
});

test("los invocadores solo aparecen en niveles avanzados", () => {
  const early = createEnemies(0).filter((enemy) => enemy.kind === "summoner");
  const late = createEnemies(6).filter((enemy) => enemy.kind === "summoner");
  assert.equal(early.length, 0);
  assert.ok(late.length >= 1);
});

test("se conservan los enemigos originales de tierra y aire", () => {
  for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex += 1) {
    const enemies = createEnemies(levelIndex);
    assert.ok(enemies.some((enemy) => enemy.kind === "walker"));
    assert.ok(enemies.some((enemy) => enemy.kind === "flyer"));
    assert.ok(enemies.some((enemy) => enemy.kind === "zombie"));
  }
});

/* ───────────────── Jefes en juego ───────────────── */

test("el jefe telegrafía, cambia de fase y su barra baja al recibir golpes", () => {
  const world = playable(6, { charges: 5, owned: ["sinergia"], equipped: "sinergia" });
  const boss = world.boss;
  assert.ok(boss);
  world.x = ARENA_X + 120;
  world.y = GROUND_Y - PLAYER_H;
  world.cameraX = Math.max(0, world.x - 320);
  advance(world, 0.1);
  assert.equal(world.arenaEntered, true, "entrar a la arena activa la pelea");
  assert.equal(world.arenaLocked, true, "la arena se cierra mientras el jefe vive");

  let sawTelegraph = false;
  for (let i = 0; i < 600; i += 1) {
    step(world, 1 / 60, NO_INPUT);
    if (boss.telegraph > 0) sawTelegraph = true;
  }
  assert.equal(sawTelegraph, true, "el jefe debe avisar antes de atacar");

  const full = boss.maxHp;
  boss.hp = Math.ceil(full * 0.4);
  advance(world, 0.2);
  assert.ok(boss.phaseIndex > 0, "al perder vida cambia de patrón");
});

test("la salida no se abre mientras el jefe siga vivo", () => {
  const world = playable(0);
  for (const item of world.collectibles) item.taken = true;
  world.x = GATE_X + 20;
  world.y = GROUND_Y - PLAYER_H;
  advance(world, 0.05);
  assert.equal(world.status, "playing", "el jefe vivo bloquea la salida");
  assert.ok(world.x <= GATE_X);

  world.boss.alive = false;
  world.x = GATE_X + 20;
  advance(world, 0.05);
  assert.equal(world.status, "won", "sin jefe y con documentos, la salida se abre");
});

test("hacen falta al menos dos documentos para salir", () => {
  const world = playable(0);
  world.boss.alive = false;
  world.collectibles[0].taken = true;
  world.x = GATE_X + 20;
  world.y = GROUND_Y - PLAYER_H;
  advance(world, 0.05);
  assert.equal(world.status, "playing");
  world.collectibles[1].taken = true;
  world.x = GATE_X + 20;
  advance(world, 0.05);
  assert.equal(world.status, "won");
});

test("el jefe cae al pisarlo repetidamente aunque no queden cargas", () => {
  const world = playable(0, { charges: 0 });
  const boss = world.boss;
  world.arenaEntered = true;
  for (let i = 0; i < boss.maxHp; i += 1) {
    boss.hitCooldown = 0;
    world.x = boss.x + 10;
    world.y = boss.y - PLAYER_H + 6;
    world.vy = 320;
    step(world, 1 / 60, NO_INPUT);
  }
  assert.equal(boss.alive, false, "siempre debe existir una ruta sin cargas");
  assert.ok(drainEvents(world).includes("boss-down"));
});

test("cada nivel crea su propio jefe con vida completa", () => {
  for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex += 1) {
    const boss = createBoss(levelIndex);
    assert.equal(boss.boss, true);
    assert.equal(boss.hp, LEVELS[levelIndex].boss.hp);
    assert.equal(boss.hp, boss.maxHp);
    assert.ok(boss.x > ARENA_X, "el jefe espera en la arena final");
    assert.ok(boss.x < WORLD_W);
  }
});

/* ───────────────── Física y jugador ───────────────── */

test("la física no depende del framerate", () => {
  const slow = playable(0);
  const fast = playable(0);
  jump(slow);
  jump(fast);
  advance(slow, 0.5, NO_INPUT, 1 / 30);
  advance(fast, 0.5, NO_INPUT, 1 / 144);
  assert.ok(Math.abs(slow.y - fast.y) < 12, "la altura debe coincidir entre framerates");
});

test("el salto alcanza las plataformas intermedias desde el suelo", () => {
  const world = playable(0);
  const reachable = world.platforms
    .filter((platform) => platform.h === 18 && platform.y !== GROUND_Y)
    .every((platform) => GROUND_Y - platform.y <= JUMP_HEIGHT + 1);
  assert.equal(reachable, true, "ninguna plataforma intermedia debe ser inalcanzable");
});

test("el doble salto solo funciona con el logro de innovación", () => {
  const plain = playable(0);
  jump(plain);
  advance(plain, 0.12);
  assert.equal(jump(plain), false, "sin el logro no hay segundo salto");

  const upgraded = playable(2, { owned: ["doblesalto"] });
  jump(upgraded);
  advance(upgraded, 0.12);
  assert.equal(jump(upgraded), true, "con Núcleo de Innovación sí");
});

test("los pasivos del CV amplían tiempo y energía", () => {
  assert.ok(levelTimeLimit(0, ["etica"]) > levelTimeLimit(0, []));
  const plain = playable(0, { owned: [] });
  const boosted = playable(0, { owned: ["tablero"] });
  assert.ok(boosted.maxEnergy > plain.maxEnergy);
  assert.equal(boosted.radar, true, "el Tablero Táctico enciende el radar");
});

test("el escudo de integridad absorbe un golpe y luego se gasta", () => {
  const world = playable(2, { owned: ["escudo"] });
  const walker = world.enemies.find((enemy) => enemy.kind === "walker");
  const energy = world.energy;
  world.x = walker.x;
  world.y = walker.y;
  world.vy = 0;
  step(world, 1 / 60, NO_INPUT);
  assert.equal(world.energy, energy, "el primer golpe se bloquea");
  assert.equal(world.shieldReady, false);
});

test("perder toda la energía o el tiempo termina el nivel", () => {
  const byEnergy = playable(0);
  byEnergy.energy = 0;
  advance(byEnergy, 0.2);
  assert.equal(byEnergy.status, "failed");

  const byTime = playable(0);
  byTime.time = 0.05;
  advance(byTime, 0.2);
  assert.equal(byTime.status, "failed");
});

test("el mundo no acumula partículas ni proyectiles sin control", () => {
  const world = playable(6, { charges: 5 });
  world.x = ARENA_X + 100;
  world.cameraX = ARENA_X - 220;
  advance(world, 40);
  assert.ok(world.particles.length < 400, "las partículas se reciclan");
  assert.ok(world.projectiles.length < 80, "los proyectiles caducan");
});

test("el efecto reducido desactiva la sacudida de cámara", () => {
  const world = playable(0);
  world.reducedMotion = true;
  world.charges = 3;
  firePulse(world);
  assert.equal(world.shake, 0, "prefers-reduced-motion no debe sacudir la pantalla");
});


/* ───────────── Correcciones de jugabilidad ───────────── */

test("pisar a un enemigo no devuelve daño en el mismo rebote", () => {
  const world = playable(6, { charges: 0 });
  const boss = world.boss;
  world.arenaEntered = true;
  const energy = world.energy;
  // Pisada sobre el jefe y dos segundos de contacto seguido.
  boss.hitCooldown = 0;
  world.x = boss.x + 10;
  world.y = boss.y - PLAYER_H + 6;
  world.vy = 320;
  step(world, 1 / 60, NO_INPUT);
  assert.ok(world.invulnerable > 0, "el rebote debe dar gracia de invulnerabilidad");
  advance(world, 0.3);
  assert.equal(world.energy, energy, "pisar no puede costar energía");
});

test("caer al pozo devuelve al jugador a suelo firme", () => {
  const world = playable(0);
  // Correr hasta el borde del primer pozo y caer.
  world.x = 460;
  world.y = GROUND_Y - PLAYER_H;
  advance(world, 0.1, { left: false, right: true });
  const safe = world.safeX;
  world.y = 700;
  step(world, 1 / 60, NO_INPUT);
  assert.equal(world.x, safe, "reaparece donde pisó suelo por última vez");
  advance(world, 1.2);
  assert.ok(world.grounded, "debe quedar de pie, no caer otra vez");
});

test("la barrera de la arena no está sobre un pozo", () => {
  const world = playable(0);
  const sobreSuelo = world.platforms.some(
    (platform) =>
      platform.y === GROUND_Y &&
      ARENA_X >= platform.x &&
      ARENA_X <= platform.x + platform.w,
  );
  assert.equal(sobreSuelo, true);
});

test("el salto pulsado antes de aterrizar se ejecuta al tocar suelo", () => {
  const world = playable(0);
  // Cayendo a 30 px del suelo se pulsa salto: no hay coyote, debe guardarse.
  world.y = GROUND_Y - PLAYER_H - 30;
  world.vy = 300;
  world.grounded = false;
  world.coyote = 0;
  assert.equal(jump(world), false);
  assert.ok(world.jumpBuffer > 0, "la pulsación debe quedar guardada");
  advance(world, 0.15);
  assert.ok(world.vy < 0, "al aterrizar, el salto guardado sale solo");
});

test("soltar el salto lo corta", () => {
  const largo = playable(0);
  const corto = playable(0);
  jump(largo);
  jump(corto);
  releaseJump(corto);
  advance(largo, 0.25);
  advance(corto, 0.25);
  assert.ok(corto.y > largo.y, "el salto corto debe llegar más abajo");
});

test("el picado rompe bloques blindados sin gastar cargas", () => {
  const world = playable(4, { charges: 0 });
  const block = world.blocks.find((item) => item.breakable && item.y === 318);
  assert.ok(block);
  assert.equal(block.armor, 2);
  world.x = block.x + 2;
  world.y = block.y - PLAYER_H - 60;
  world.vy = 0;
  world.grounded = false;
  const cargasAntes = world.charges;
  assert.equal(slamDown(world), true);
  advance(world, 0.5);
  assert.equal(world.charges, cargasAntes, "el picado no consume cargas");
  assert.equal(block.broken, true, "dos golpes de picado o uno fuerte lo abren");
});

test("los documentos por nivel son variables y la salida pide dos tercios", () => {
  for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex += 1) {
    const total = LEVELS[levelIndex].documents.length;
    const spots = createCollectibles(levelIndex);
    assert.equal(spots.length, total, `faltan posiciones en el nivel ${levelIndex + 1}`);
    const needed = requiredDocuments(levelIndex);
    assert.ok(needed >= 2 && needed <= total);
    // Nunca dos documentos en el mismo sitio.
    const claves = new Set(spots.map((spot) => `${spot.x},${spot.y}`));
    assert.equal(claves.size, spots.length);
  }
  assert.equal(requiredDocuments(0), 2);
});

test("todo documento está al alcance de un salto desde alguna superficie", () => {
  for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex += 1) {
    const world = playable(levelIndex);
    const superficies = [
      ...world.platforms.map((platform) => ({ y: platform.y, x0: platform.x, x1: platform.x + platform.w })),
      ...world.blocks.map((block) => ({ y: block.y, x0: block.x, x1: block.x + block.w })),
    ];
    for (const item of world.collectibles) {
      const alcanzable = superficies.some((s) => {
        if (item.x < s.x0 - 40 || item.x > s.x1 + 40) return false;
        const alturaJugador = s.y - PLAYER_H;
        // El cristal entra en el recorrido entre estar de pie y el tope del salto.
        return item.y + 26 >= alturaJugador - JUMP_HEIGHT && item.y - 26 <= alturaJugador + PLAYER_H;
      });
      assert.ok(
        alcanzable,
        `documento inalcanzable en nivel ${levelIndex + 1} (${item.x},${item.y})`,
      );
    }
  }
});

test("los zombis patrullan sobre suelo firme", () => {
  for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex += 1) {
    const world = playable(levelIndex);
    const suelos = world.platforms.filter((platform) => platform.y === GROUND_Y);
    for (const zombie of world.enemies.filter((enemy) => enemy.kind === "zombie")) {
      for (const x of [zombie.minX, zombie.maxX]) {
        const haySuelo = suelos.some((s) => x >= s.x - 4 && x <= s.x + s.w + 4);
        assert.ok(haySuelo, `zombi sobre el vacío en x=${x} (nivel ${levelIndex + 1})`);
      }
    }
  }
});

test("encadenar tres derrotas devuelve una carga", () => {
  const world = playable(0, { charges: 1 });
  const victimas = world.enemies.filter((enemy) => enemy.kind !== "zombie").slice(0, 3);
  assert.ok(victimas.length >= 3);
  for (const enemy of victimas) {
    enemy.hp = 1;
    world.x = enemy.x;
    world.y = enemy.y - PLAYER_H + 8;
    world.vy = 300;
    step(world, 1 / 60, NO_INPUT);
  }
  assert.ok(world.charges >= 2, "la racha de 3 debe recargar E");
});

test("el tiempo disponible baja conforme avanza la campaña", () => {
  for (let i = 1; i < LEVELS.length; i += 1) {
    assert.ok(
      levelTimeLimit(i, []) < levelTimeLimit(i - 1, []),
      `el nivel ${i + 1} debería ser más exigente en tiempo`,
    );
  }
  assert.ok(levelTimeLimit(6, []) > 140, "pero sin volverse imposible");
});
