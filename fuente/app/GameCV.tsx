"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AudioEngine } from "./audio.ts";
import { PORTRAIT } from "./portrait.ts";
import {
  derivePowers,
  getMotionSnapshot,
  getSaveSnapshot,
  getServerMotionSnapshot,
  getServerSaveSnapshot,
  subscribeMotion,
  subscribeSave,
  writeSave,
  type SaveShape,
} from "./client-state.ts";
import {
  ARCHIVE,
  CONTACT,
  EDITION,
  HIGHLIGHTS,
  LAST_UPDATE,
  LEVELS,
  MAX_CHARGES,
  POWERS,
  POWER_BY_ID,
  PROFILE_BLOCKS,
  START_CHARGES,
  STARTING_ACTIVE,
  type DocumentDef,
} from "./cv-data.ts";
import {
  claimBossReward,
  createWorld,
  cyclePower,
  drainEvents,
  drainSounds,
  documentCount,
  firePulse,
  jump,
  releaseJump,
  slamDown,
  step,
  VIEW_H,
  VIEW_W,
  type GameStatus,
  type WorldState,
} from "./engine.ts";
import { drawWorld } from "./render.ts";

type ModalName = "map" | "inventory" | "profile" | "help" | "powers" | null;

const KEY_CODES = {
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
  jump: ["ArrowUp", "KeyW", "Space"],
  pulse: ["KeyE", "KeyK"],
  cycle: ["KeyQ"],
  slam: ["ArrowDown", "KeyS"],
};

export function GameCV() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<WorldState>(createWorld(0, "menu"));
  const keysRef = useRef(new Set<string>());
  const frameRef = useRef<number | null>(null);
  const audioRef = useRef<AudioEngine | null>(null);

  const save = useSyncExternalStore(
    subscribeSave,
    getSaveSnapshot,
    getServerSaveSnapshot,
  );
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    getMotionSnapshot,
    getServerMotionSnapshot,
  );
  // El store del progreso es la fuente de verdad; se lee al vuelo en callbacks.
  const [status, setStatus] = useState<GameStatus>("menu");
  const [modal, setModal] = useState<ModalName>(null);
  const [levelIndex, setLevelIndex] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [briefing, setBriefing] = useState(false);
  const [dossier, setDossier] = useState<DocumentDef | null>(null);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [bossBanner, setBossBanner] = useState<string | null>(null);
  const [powerFlyout, setPowerFlyout] = useState(false);
  const [hud, setHud] = useState({
    charges: START_CHARGES,
    equipped: STARTING_ACTIVE,
    energy: 100,
    maxEnergy: 100,
    time: 0,
    documents: 0,
    bossHp: 1,
    bossPhase: 0,
    bossAlive: true,
    arena: false,
  });

  const ownedPowers = useMemo(() => derivePowers(save), [save]);
  const unlockedLevel =
    save.completed.length === 0
      ? 0
      : Math.min(LEVELS.length - 1, Math.max(...save.completed) + 1);
  const progress = Math.round((save.completed.length / LEVELS.length) * 100);
  const currentLevel = LEVELS[levelIndex];

  const activePowers = useMemo(() => {
    const ids = [STARTING_ACTIVE, ...ownedPowers].filter(
      (id, index, list) =>
        list.indexOf(id) === index && POWER_BY_ID.get(id)?.kind !== "passive",
    );
    return ids.map((id) => POWER_BY_ID.get(id)).filter((power) => Boolean(power));
  }, [ownedPowers]);

  const passivePowers = useMemo(
    () =>
      ownedPowers
        .map((id) => POWER_BY_ID.get(id))
        .filter((power) => power?.kind === "passive"),
    [ownedPowers],
  );

  const inventory = useMemo(
    () =>
      LEVELS.flatMap((level) =>
        (save.collected[level.id] ?? [])
          .map((id) => level.documents.find((document) => document.id === id))
          .filter((document): document is DocumentDef => Boolean(document))
          .map((document) => ({
            ...document,
            levelYear: `${level.year} · ${level.title}`,
          })),
      ),
    [save.collected],
  );

  /* ── Preferencias y guardado ── */

  // El motor es un sistema externo: se le informa la preferencia vigente.
  useEffect(() => {
    worldRef.current.reducedMotion = reducedMotion;
  }, [reducedMotion]);

  const persist = useCallback((next: SaveShape) => {
    writeSave(next);
  }, []);

  useEffect(() => {
    audioRef.current = new AudioEngine();
    const engine = audioRef.current;
    return () => {
      engine.dispose();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    audioRef.current?.setEnabled(soundOn);
  }, [soundOn]);

  const unlockAudio = useCallback(() => {
    audioRef.current?.unlock();
  }, []);

  /* ── Control de estado ── */

  const syncStatus = useCallback((next: GameStatus) => {
    worldRef.current.status = next;
    setStatus(next);
  }, []);

  const startLevel = useCallback(
    (index: number) => {
      const safeIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
      const current = getSaveSnapshot();
      worldRef.current = createWorld(safeIndex, "paused", {
        owned: derivePowers(current),
        charges: current.charges,
        equipped: current.equipped,
        reducedMotion,
      });
      keysRef.current.clear();
      setLevelIndex(safeIndex);
      setModal(null);
      setBossBanner(null);
      setDossier(null);
      setDossierOpen(false);
      setBriefing(true);
      setStatus("paused");
      unlockAudio();
    },
    [reducedMotion, unlockAudio],
  );

  const beginPlay = useCallback(() => {
    setBriefing(false);
    unlockAudio();
    audioRef.current?.play("ui");
    syncStatus("playing");
  }, [syncStatus, unlockAudio]);

  const triggerJump = useCallback(() => {
    unlockAudio();
    jump(worldRef.current);
  }, [unlockAudio]);

  const endJump = useCallback(() => {
    releaseJump(worldRef.current);
  }, []);

  const triggerSlam = useCallback(() => {
    unlockAudio();
    slamDown(worldRef.current);
  }, [unlockAudio]);

  const triggerPulse = useCallback(() => {
    unlockAudio();
    firePulse(worldRef.current);
  }, [unlockAudio]);

  const triggerCycle = useCallback(() => {
    const next = cyclePower(worldRef.current, 1);
    persist({ ...getSaveSnapshot(), equipped: next });
  }, [persist]);

  const equipPower = useCallback(
    (id: string) => {
      worldRef.current.equipped = id;
      persist({ ...getSaveSnapshot(), equipped: id });
      audioRef.current?.play("switch");
      setPowerFlyout(false);
    },
    [persist],
  );

  const setControl = useCallback((code: string, pressed: boolean) => {
    if (pressed) keysRef.current.add(code);
    else keysRef.current.delete(code);
  }, []);

  /* ── Teclado ── */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isGameKey = Object.values(KEY_CODES).flat().includes(event.code);
      if (isGameKey) event.preventDefault();
      if (event.repeat && KEY_CODES.jump.includes(event.code)) return;
      keysRef.current.add(event.code);
      if (KEY_CODES.jump.includes(event.code)) triggerJump();
      if (KEY_CODES.pulse.includes(event.code)) triggerPulse();
      if (KEY_CODES.cycle.includes(event.code)) triggerCycle();
      if (KEY_CODES.slam.includes(event.code)) triggerSlam();
      if (event.code === "Escape") {
        if (worldRef.current.status === "playing") syncStatus("paused");
        else if (worldRef.current.status === "paused" && !briefing) syncStatus("playing");
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.code);
      if (KEY_CODES.jump.includes(event.code)) endJump();
    };
    const onBlur = () => keysRef.current.clear();
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [briefing, endJump, syncStatus, triggerCycle, triggerJump, triggerPulse, triggerSlam]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && worldRef.current.status === "playing") {
        worldRef.current.status = "paused";
        setStatus("paused");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  /* ── Bucle principal ── */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let previous = 0;
    let hudAccumulator = 0;
    let running = true;

    const loop = (time: number) => {
      if (!running) return;
      const world = worldRef.current;
      const delta = previous ? (time - previous) / 1000 : 0;
      previous = time;

      if (world.status === "playing") {
        step(world, delta, {
          left: KEY_CODES.left.some((key) => keysRef.current.has(key)),
          right: KEY_CODES.right.some((key) => keysRef.current.has(key)),
        });
      }

      for (const sound of drainSounds(world)) audioRef.current?.play(sound);

      const events = drainEvents(world);
      for (const event of events) {
        if (event.startsWith("document:")) {
          const id = event.slice("document:".length);
          const level = LEVELS[world.levelIndex];
          const document = level.documents.find((item) => item.id === id);
          if (document) {
            setDossier(document);
            setDossierOpen(true);
            const current = getSaveSnapshot();
            const already = current.collected[level.id] ?? [];
            if (!already.includes(id)) {
              persist({
                ...current,
                collected: { ...current.collected, [level.id]: [...already, id] },
                powers: [...new Set([...current.powers, ...world.owned])],
                  charges: world.charges,
              });
            }
          }
        }
        if (event === "boss-down") {
          const level = LEVELS[world.levelIndex];
          const reward = claimBossReward(world);
          const power = POWER_BY_ID.get(reward.power);
          setBossBanner(
            `${level.boss.defeat} · Recompensa: ${power?.name ?? reward.power}`,
          );
          persist({
            ...getSaveSnapshot(),
            powers: [...new Set([...getSaveSnapshot().powers, ...world.owned])],
            charges: world.charges,
          });
        }
        if (event === "level-won") {
          const current = getSaveSnapshot();
          persist({
            ...current,
            completed: current.completed.includes(world.levelIndex)
              ? current.completed
              : [...current.completed, world.levelIndex].sort((a, b) => a - b),
            powers: [...new Set([...current.powers, ...world.owned])],
            charges: world.charges,
              equipped: world.equipped,
          });
          setStatus("won");
        }
        if (event === "level-failed") {
          persist({ ...getSaveSnapshot(), charges: world.charges });
          setStatus("failed");
        }
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      drawWorld(context, world);

      hudAccumulator += delta;
      if (hudAccumulator > 0.2) {
        hudAccumulator = 0;
        // Solo se avisa a React cuando algo cambió de verdad: sin esto, el
        // árbol entero se repintaba varias veces por segundo sin motivo.
        setHud((previous) => {
          const next = {
          charges: world.charges,
          equipped: world.equipped,
            energy: Math.round(world.energy),
            maxEnergy: world.maxEnergy,
            time: Math.ceil(world.time),
            documents: world.collectibles.filter((item) => item.taken).length,
            bossHp: world.boss ? world.boss.hp / world.boss.maxHp : 0,
            bossPhase: world.boss?.phaseIndex ?? 0,
            bossAlive: Boolean(world.boss?.alive),
            arena: world.arenaEntered,
          };
          const igual = (Object.keys(next) as (keyof typeof next)[]).every(
            (clave) => previous[clave] === next[clave],
          );
          return igual ? previous : next;
        });
      }

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [persist]);

  // El expediente contextual se recoge solo tras unos segundos.
  useEffect(() => {
    if (!dossierOpen || !dossier) return;
    const timer = window.setTimeout(() => setDossierOpen(false), 7000);
    return () => window.clearTimeout(timer);
  }, [dossier, dossierOpen]);

  const continueAfterWin = () => {
    if (levelIndex < LEVELS.length - 1) startLevel(levelIndex + 1);
    else {
      syncStatus("menu");
      setModal("inventory");
    }
  };

  const openModal = (next: ModalName) => {
    if (worldRef.current.status === "playing") syncStatus("paused");
    setModal(next);
  };

  const closeModal = () => {
    setModal(null);
    if (worldRef.current.status === "paused" && !briefing) syncStatus("playing");
  };

  const equippedPower = POWER_BY_ID.get(hud.equipped) ?? POWER_BY_ID.get(STARTING_ACTIVE);
  const rewardPower = POWER_BY_ID.get(currentLevel.reward);
  // Los paneles flotantes solo se muestran durante la partida.
  const inRun = status === "playing" || (status === "paused" && !briefing);
  const displayCharges = inRun ? hud.charges : save.charges;

  return (
    <main className="site-shell" onPointerDown={unlockAudio}>
      <header className="topbar">
        <a className="brand" href="#juego" aria-label="Ir al juego">
          <span className="brand-mark">MV</span>
          <span>
            <strong>MARCELO</strong>
            <small>LA RUTA IMPOSIBLE</small>
          </span>
        </a>
        <nav aria-label="Navegación principal">
          <button type="button" onClick={() => openModal("map")}>Ruta</button>
          <button type="button" onClick={() => openModal("inventory")}>
            Archivos <span>{inventory.length}</span>
          </button>
          <button type="button" onClick={() => openModal("powers")}>Poderes</button>
          <button type="button" onClick={() => openModal("profile")}>Perfil</button>
          <button
            type="button"
            className="icon-button"
            aria-label={soundOn ? "Silenciar efectos de sonido" : "Activar efectos de sonido"}
            aria-pressed={soundOn}
            onClick={() => {
              unlockAudio();
              setSoundOn((value) => !value);
            }}
          >
            {soundOn ? "SÍ" : "NO"}
          </button>
        </nav>
      </header>

      <section className="hero" id="juego">
        <div className="hero-copy">
          <p className="eyebrow"><span /> CV INTERACTIVO · EDICIÓN {EDITION}</p>
          <h1>
            UN CV QUE NO<br />
            SE LEE. <em>SE SUPERA.</em>
          </h1>
          <p className="hero-lead">
            Siete escenarios. Siete villanos profesionales con jefe propio. Una
            ruta que conecta gestión pública, innovación, datos, derecho e
            inteligencia artificial.
          </p>
          <div className="hero-actions">
            <button
              className="primary-action"
              type="button"
              onClick={() => startLevel(unlockedLevel)}
            >
              <span>▶</span> {save.completed.length ? "CONTINUAR RUTA" : "INICIAR MISIÓN"}
            </button>
            <button className="secondary-action" type="button" onClick={() => openModal("map")}>
              VER LOS 7 NIVELES
            </button>
          </div>
          <div className="hero-stats">
            <div><strong>2017—26</strong><span>Trayectoria</span></div>
            <div><strong>7</strong><span>Jefes</span></div>
            <div><strong>{progress}%</strong><span>Ruta dominada</span></div>
          </div>
        </div>

        <div className="game-frame" data-status={status}>
          <div className="frame-label">
            <span className="live-dot" />
            PARTIDA LOCAL · {status === "playing" ? "EN CURSO" : "LISTA"}
            <span className="frame-edition">EXPEDIENTE {EDITION}</span>
          </div>
          <canvas
            ref={canvasRef}
            width={VIEW_W}
            height={VIEW_H}
            aria-label={`Juego de plataformas: ${currentLevel.title}. Flechas o A y D para moverte, espacio para saltar, E para el poder y Q para cambiarlo.`}
          />

          {/* Panel discreto del CV: confirma que se explora un expediente real. */}
          {inRun && (
          <aside
            className={`cv-dock${dossierOpen ? " is-open" : ""}`}
            aria-label="Panel del expediente profesional"
          >
            <button
              type="button"
              className="cv-dock-toggle"
              aria-expanded={dossierOpen}
              onClick={() => setDossierOpen((value) => !value)}
            >
              <span className="cv-dock-badge">CV {EDITION}</span>
              <span className="cv-dock-count">
                {hud.documents}/{documentCount(levelIndex)}
              </span>
              <span className="cv-dock-caret">{dossierOpen ? "▾" : "▸"}</span>
            </button>
            {dossierOpen && (
              <div className="cv-dock-body">
                {dossier ? (
                  <>
                    <small>{dossier.category.toUpperCase()} · {dossier.year}</small>
                    <strong>{dossier.title}</strong>
                    <p>{dossier.issuer}</p>
                    <p className="cv-dock-detail">{dossier.detail}</p>
                    <em>PERIODO DEL NIVEL · {currentLevel.year}</em>
                    {dossier.power && POWER_BY_ID.get(dossier.power) && (
                      <span className="cv-dock-power">
                        {POWER_BY_ID.get(dossier.power)?.glyph}{" "}
                        {POWER_BY_ID.get(dossier.power)?.name}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <small>EXPEDIENTE {EDITION}</small>
                    <strong>Documentos verificados del CV</strong>
                    <p>Recoge los cristales para abrir cada ficha documental.</p>
                    <em>ACTUALIZADO A {LAST_UPDATE.toUpperCase()}</em>
                  </>
                )}
                <button
                  type="button"
                  className="cv-dock-link"
                  onClick={() => openModal("inventory")}
                >
                  VER EXPEDIENTE COMPLETO ↗
                </button>
              </div>
            )}
          </aside>
          )}

          {/* Panel de poderes E, compacto. */}
          {inRun && (
          <div className="power-dock" aria-label="Poder activo">
            <button
              type="button"
              className="power-dock-main"
              aria-expanded={powerFlyout}
              onClick={() => setPowerFlyout((value) => !value)}
            >
              <span className="power-dock-key">E</span>
              <span className="power-dock-count" data-empty={hud.charges === 0}>
                ×{hud.charges}
              </span>
              <span className="power-dock-name">{equippedPower?.name ?? "Pulso"}</span>
            </button>
            {powerFlyout && (
              <div className="power-flyout">
                <p>VARIANTES DE E · Q PARA ROTAR</p>
                {activePowers.map((power) => (
                  <button
                    type="button"
                    key={power?.id}
                    className={power?.id === hud.equipped ? "is-current" : ""}
                    onClick={() => power && equipPower(power.id)}
                  >
                    <b>{power?.glyph}</b>
                    <span>
                      <strong>{power?.name}</strong>
                      <small>{power?.effect}</small>
                      <em>{power?.source} · {power?.issuer} · {power?.year}</em>
                    </span>
                  </button>
                ))}
                <p className="power-flyout-foot">
                  Recarga: documentos marcados y victorias de jefe. Máximo {MAX_CHARGES}.
                </p>
              </div>
            )}
          </div>
          )}

          {status === "menu" && !briefing && (
            <div className="game-overlay intro-overlay">
              <p className="overlay-kicker">EXPEDIENTE #MV-{EDITION}</p>
              <h2>LA RUTA ESTÁ ABIERTA</h2>
              <p>
                Siete etapas reales, siete jefes. Recupera documentos, vence al
                villano de cada etapa y llega al portal.
              </p>
              <button type="button" onClick={() => startLevel(unlockedLevel)}>
                ENTRAR AL SISTEMA
              </button>
              <button className="text-action" type="button" onClick={() => openModal("help")}>
                ¿CÓMO SE JUEGA?
              </button>
            </div>
          )}

          {briefing && (
            <div className="game-overlay brief-overlay">
              <p className="overlay-kicker">
                NIVEL {levelIndex + 1}/7 · {currentLevel.year}
              </p>
              <h2>{currentLevel.title.toUpperCase()}</h2>
              <p className="brief-intro">{currentLevel.intro}</p>
              <div className="brief-grid">
                <article>
                  <small>CONFLICTO</small>
                  <p>{currentLevel.conflict}</p>
                </article>
                <article>
                  <small>VILLANO · JEFE</small>
                  <p>
                    <strong>{currentLevel.villain}</strong> {currentLevel.villainLine}
                    <br />
                    Arena final: {currentLevel.boss.name}.
                  </p>
                </article>
                <article>
                  <small>RECOMPENSA</small>
                  <p>
                    {rewardPower?.name} — {rewardPower?.effect}
                    <br />
                    <em>{rewardPower?.source}</em>
                  </p>
                </article>
              </div>
              <button type="button" onClick={beginPlay}>ENTRAR AL NIVEL</button>
            </div>
          )}

          {status === "paused" && !modal && !briefing && (
            <div className="game-overlay compact-overlay">
              <p className="overlay-kicker">SISTEMA EN PAUSA</p>
              <h2>{currentLevel.title}</h2>
              <div className="overlay-actions">
                <button type="button" onClick={() => syncStatus("playing")}>CONTINUAR</button>
                <button
                  type="button"
                  className="outline-action"
                  onClick={() => syncStatus("menu")}
                >
                  SALIR
                </button>
              </div>
            </div>
          )}

          {status === "won" && (
            <div className="game-overlay result-overlay">
              <span className="result-glyph">✓</span>
              <p className="overlay-kicker">
                NIVEL ASEGURADO · {hud.documents}/{documentCount(levelIndex)} DOCUMENTOS
              </p>
              <h2>{currentLevel.villain} FUE SUPERADO</h2>
              <p>{currentLevel.outro}</p>
              <p className="result-reward">
                RECOMPENSA · {rewardPower?.glyph} {rewardPower?.name} —{" "}
                {rewardPower?.effect}
                <br />
                <span>Respaldo real: {rewardPower?.source} · {rewardPower?.issuer}</span>
              </p>
              <div className="overlay-actions">
                <button type="button" onClick={continueAfterWin}>
                  {levelIndex === LEVELS.length - 1 ? "VER EXPEDIENTE FINAL" : "SIGUIENTE NIVEL"}
                </button>
                <button
                  type="button"
                  className="outline-action"
                  onClick={() => openModal("inventory")}
                >
                  VER LOGROS
                </button>
              </div>
            </div>
          )}

          {status === "failed" && (
            <div className="game-overlay result-overlay failure">
              <span className="result-glyph">!</span>
              <p className="overlay-kicker">RUTA INTERRUMPIDA</p>
              <h2>{currentLevel.villain} GANÓ ESTA RONDA</h2>
              <p>
                El progreso recolectado se conserva y siempre vuelves con al menos
                una carga de E. Replantea la ruta y vuelve a intentarlo.
              </p>
              <div className="overlay-actions">
                <button type="button" onClick={() => startLevel(levelIndex)}>REINTENTAR</button>
                <button
                  type="button"
                  className="outline-action"
                  onClick={() => syncStatus("menu")}
                >
                  SALIR
                </button>
              </div>
            </div>
          )}

          {bossBanner && status === "playing" && (
            <aside className="achievement-card boss-card" aria-live="polite">
              <button
                type="button"
                aria-label="Cerrar mensaje del jefe"
                onClick={() => setBossBanner(null)}
              >
                ×
              </button>
              <span className="achievement-icon">{currentLevel.boss.glyph}</span>
              <div>
                <small>JEFE DERROTADO · {currentLevel.villain.toUpperCase()}</small>
                <strong>{currentLevel.boss.name}</strong>
                <p>{bossBanner}</p>
              </div>
            </aside>
          )}

          <div className="mobile-controls" aria-label="Controles táctiles">
            <div>
              <button
                type="button"
                aria-label="Mover a la izquierda"
                onPointerDown={() => setControl("ArrowLeft", true)}
                onPointerUp={() => setControl("ArrowLeft", false)}
                onPointerCancel={() => setControl("ArrowLeft", false)}
                onPointerLeave={() => setControl("ArrowLeft", false)}
              >←</button>
              <button
                type="button"
                aria-label="Mover a la derecha"
                onPointerDown={() => setControl("ArrowRight", true)}
                onPointerUp={() => setControl("ArrowRight", false)}
                onPointerCancel={() => setControl("ArrowRight", false)}
                onPointerLeave={() => setControl("ArrowRight", false)}
              >→</button>
            </div>
            <div>
              <button
                type="button"
                className="cycle-button"
                aria-label="Cambiar poder equipado"
                onPointerDown={triggerCycle}
              >
                ⟳
              </button>
              <button
                type="button"
                className="pulse-button"
                aria-label={`Activar poder E. Cargas disponibles: ${displayCharges}`}
                onPointerDown={triggerPulse}
              >
                E<b>{displayCharges}</b>
              </button>
              <button
                type="button"
                className="slam-button"
                aria-label="Picado hacia abajo"
                onPointerDown={triggerSlam}
              >↓</button>
              <button
                type="button"
                className="jump-button"
                aria-label="Saltar"
                onPointerDown={triggerJump}
                onPointerUp={endJump}
                onPointerCancel={endJump}
              >↑</button>
            </div>
          </div>
        </div>

        <div className="controls-strip">
          <span><kbd>A</kbd><kbd>D</kbd> MOVER</span>
          <span><kbd>ESPACIO</kbd> SALTAR</span>
          <span><kbd>E</kbd> PODER ×{displayCharges}</span>
          <span><kbd>Q</kbd> CAMBIAR</span>
          <span><kbd>S</kbd> PICADO</span>
          <span><kbd>ESC</kbd> PAUSA</span>
          <button type="button" onClick={() => openModal("help")}>MANUAL ↗</button>
        </div>
      </section>

      <section className="manifesto">
        <p>GESTIÓN PÚBLICA</p><span>×</span><p>TECNOLOGÍA</p><span>×</span>
        <p>IMPACTO SOCIAL</p><span>×</span><p>IA</p>
      </section>

      <section className="latest-section">
        <div className="section-heading">
          <p className="eyebrow"><span /> ACTUALIZACIÓN {LAST_UPDATE.toUpperCase()}</p>
          <h2>LO ÚLTIMO<br />DEL EXPEDIENTE</h2>
          <p>
            Un artículo científico publicado, un primer lugar nacional y el primer
            empleo dedicado a inteligencia artificial. Todo esto ya forma parte de
            los dos últimos niveles del juego.
          </p>
        </div>
        <div className="latest-grid">
          {HIGHLIGHTS.map((item) => (
            <article key={item.title} className="latest-card">
              <span className="latest-crystal" aria-hidden="true" />
              <small>{item.tag} · {item.year}</small>
              <h3>{item.title}</h3>
              <p>{item.issuer}</p>
              <div>{item.detail}</div>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <div>
          <span className="brand-mark">MV</span>
          <p>
            <strong>Marcelo Valeri Quispe Cruz</strong><br />
            {CONTACT.place} · {EDITION} · {CONTACT.email}
          </p>
        </div>
        <p>
          Diseñado como experiencia original de plataformas.<br />
          Sin personajes, niveles, sonidos ni recursos de Nintendo.
        </p>
      </footer>

      {modal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "map" ? "Mapa de niveles" :
              modal === "inventory" ? "Expediente profesional" :
              modal === "powers" ? "Poderes profesionales" :
              modal === "profile" ? "Perfil profesional" : "Manual del juego"
            }
          >
            <button className="modal-close" type="button" aria-label="Cerrar" onClick={closeModal}>×</button>

            {modal === "map" && (
              <>
                <p className="modal-kicker">MAPA DE LA RUTA</p>
                <h2>SIETE JEFES.<br />UNA HISTORIA REAL.</h2>
                <div className="route-list">
                  {LEVELS.map((level, index) => {
                    const isUnlocked = index <= unlockedLevel || save.completed.includes(index);
                    return (
                      <button
                        type="button"
                        key={level.id}
                        disabled={!isUnlocked}
                        onClick={() => startLevel(index)}
                        className={save.completed.includes(index) ? "is-complete" : ""}
                      >
                        <span className="route-number" aria-hidden="true">
                          0{index + 1}
                        </span>
                        <span>
                          <small>{level.year}</small>
                          <strong>{level.title}</strong>
                          <em>
                            VILLANO · {level.villain} → JEFE · {level.boss.name} ·{" "}
                            {level.boss.phases.length} FASES
                          </em>
                        </span>
                        <b>{save.completed.includes(index) ? "✓" : isUnlocked ? "→" : "⌁"}</b>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {modal === "inventory" && (
              <>
                <p className="modal-kicker">
                  EXPEDIENTE PROFESIONAL · EDICIÓN {EDITION} · ACTUALIZADO A {LAST_UPDATE.toUpperCase()}
                </p>
                <h2>{inventory.length} DOCUMENTOS<br />RECUPERADOS</h2>
                {inventory.length === 0 ? (
                  <div className="empty-state">
                    <span>◇</span>
                    <p>Los documentos aparecerán aquí mientras avanzas por la ruta.</p>
                    <button type="button" onClick={() => startLevel(0)}>RECUPERAR EL PRIMERO</button>
                  </div>
                ) : (
                  <div className="inventory-grid">
                    {inventory.map((item) => (
                      <article key={`${item.levelYear}-${item.id}`}>
                        <span>{item.icon}</span>
                        <div>
                          <small>{item.levelYear}</small>
                          <h3>{item.title}</h3>
                          <p>{item.issuer} · {item.year}</p>
                          <div>{item.detail}</div>
                          {item.power && POWER_BY_ID.get(item.power) && (
                            <em>
                              {POWER_BY_ID.get(item.power)?.glyph}{" "}
                              {POWER_BY_ID.get(item.power)?.name} ·{" "}
                              {POWER_BY_ID.get(item.power)?.effect}
                            </em>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                <h3 className="archive-title">CV AMPLIADO · INFORMACIÓN VERIFICADA</h3>
                <p className="archive-note">
                  Fichas documentales en texto: no se simulan imágenes de
                  certificados. Contacto: {CONTACT.email} · {CONTACT.linkedin}
                </p>
                <div className="archive-grid">
                  {[...new Set(ARCHIVE.map((entry) => entry.group))].map((group) => (
                    <article key={group}>
                      <h4>{group}</h4>
                      <ul>
                        {ARCHIVE.filter((entry) => entry.group === group).map((entry) => (
                          <li key={`${entry.title}-${entry.year}`}>
                            <strong>{entry.title}</strong>
                            <span>{entry.issuer} · {entry.year}</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </>
            )}

            {modal === "powers" && (
              <>
                <p className="modal-kicker">PODERES PROFESIONALES</p>
                <h2>CADA PODER VIENE<br />DE UN LOGRO REAL.</h2>
                <div className="power-columns">
                  <div>
                    <h3>Activos · tecla E</h3>
                    {POWERS.filter((power) => power.kind !== "passive").map((power) => {
                      const owned =
                        power.id === STARTING_ACTIVE || ownedPowers.includes(power.id);
                      return (
                        <article key={power.id} className={owned ? "" : "is-locked"}>
                          <b>{power.glyph}</b>
                          <div>
                            <strong>{power.name}</strong>
                            <p>{power.effect}</p>
                            <em>{power.source} · {power.issuer} · {power.year}</em>
                          </div>
                          {owned ? (
                            <button
                              type="button"
                              onClick={() => equipPower(power.id)}
                              disabled={hud.equipped === power.id}
                            >
                              {hud.equipped === power.id ? "EQUIPADO" : "EQUIPAR"}
                            </button>
                          ) : (
                            <span className="lock-tag">POR DESBLOQUEAR</span>
                          )}
                        </article>
                      );
                    })}
                  </div>
                  <div>
                    <h3>Mejoras pasivas</h3>
                    {POWERS.filter((power) => power.kind === "passive").map((power) => (
                      <article
                        key={power.id}
                        className={ownedPowers.includes(power.id) ? "" : "is-locked"}
                      >
                        <b>{power.glyph}</b>
                        <div>
                          <strong>{power.name}</strong>
                          <p>{power.effect}</p>
                          <em>{power.source} · {power.issuer} · {power.year}</em>
                        </div>
                        {!ownedPowers.includes(power.id) && (
                          <span className="lock-tag">POR DESBLOQUEAR</span>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
                <p className="archive-note">
                  Cargas de E: la campaña empieza con {START_CHARGES} y acumula
                  hasta {MAX_CHARGES}. Se recargan con documentos marcados y al
                  vencer a cada jefe. Pasivas activas ahora: {passivePowers.length}.
                </p>
              </>
            )}

            {modal === "profile" && (
              <>
                <p className="modal-kicker">EXPEDIENTE DE PERSONAJE</p>
                <h2>MARCELO VALERI<br />QUISPE CRUZ</h2>
                <div className="profile-layout">
                  <div className="avatar-card">
                    <div className="avatar-portrait">
                      {/* El retrato va incrustado como data URI: el artefacto de un
                          solo archivo no puede depender del optimizador de imágenes. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={PORTRAIT} alt="Retrato de Marcelo Valeri Quispe Cruz" />
                    </div>
                    <p>CLASE</p>
                    <strong>ESTRATEGA HÍBRIDO</strong>
                    <div className="skill-bars">
                      <label>GESTIÓN <span style={{ width: "94%" }} /></label>
                      <label>COMUNICACIÓN <span style={{ width: "91%" }} /></label>
                      <label>TECNOLOGÍA <span style={{ width: "84%" }} /></label>
                      <label>IMPACTO <span style={{ width: "92%" }} /></label>
                    </div>
                  </div>
                  <div className="profile-copy">
                    {PROFILE_BLOCKS.map((block) => (
                      <article key={block.label}>
                        <small>{block.label}</small>
                        <p>{block.text}</p>
                      </article>
                    ))}
                    <div className="profile-tags">
                      <span>POWER BI</span><span>AGENTES IA</span><span>SIAF / SIGA</span>
                      <span>STORYTELLING</span><span>DERECHO DIGITAL</span><span>INGLÉS B1</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {modal === "help" && (
              <>
                <p className="modal-kicker">PROTOCOLO DE MISIÓN</p>
                <h2>CONTROLES Y<br />REGLAS DEL SISTEMA</h2>
                <div className="help-grid">
                  <article>
                    <span>01</span><h3>AVANZA</h3>
                    <p>A/D o flechas para moverte, Espacio/W/↑ para saltar, Esc para pausar. En celular usa los botones inferiores.</p>
                  </article>
                  <article>
                    <span>02</span><h3>RECUPERA</h3>
                    <p>Toca los cristales documentales. Dos tercios abren la salida; todos completan el expediente del nivel.</p>
                  </article>
                  <article>
                    <span>03</span><h3>PODER E</h3>
                    <p>E gasta una carga (empiezas con {START_CHARGES}, máximo {MAX_CHARGES}). Q cambia de variante. Se recarga con documentos marcados y al vencer jefes.</p>
                  </article>
                  <article>
                    <span>04</span><h3>ROMPE</h3>
                    <p>Los bloques ámbar con grietas se rompen con la cabeza, con el picado (<kbd>S</kbd> o ↓) o con el pulso E. Los grises de acero son indestructibles.</p>
                  </article>
                  <article>
                    <span>05</span><h3>ENEMIGOS</h3>
                    <p>Torretas que avisan antes de disparar, invocadores aéreos que sueltan criaturas y zombis que asoman la mano 2 segundos antes de salir.</p>
                  </article>
                  <article>
                    <span>06</span><h3>JEFE</h3>
                    <p>Cada nivel termina en una arena. El jefe telegrafía sus ataques y debe caer para abrir la salida.</p>
                  </article>
                </div>
                <button className="modal-primary" type="button" onClick={() => startLevel(levelIndex)}>
                  VOLVER A LA MISIÓN
                </button>
              </>
            )}
          </section>
        </div>
      )}

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        Nivel {levelIndex + 1} de {LEVELS.length}: {currentLevel.title}. Estado {status}.
        Documentos {hud.documents} de {documentCount(levelIndex)}. Energía {hud.energy} de {hud.maxEnergy}.
        Cargas de E: {displayCharges} de {MAX_CHARGES}. Poder equipado {equippedPower?.name}.
        {hud.arena
          ? hud.bossAlive
            ? ` Jefe ${currentLevel.boss.name} activo, fase ${hud.bossPhase + 1}, vida ${Math.round(hud.bossHp * 100)} por ciento.`
            : ` Jefe ${currentLevel.boss.name} derrotado, salida abierta.`
          : ""}
        {reducedMotion ? " Efectos reducidos activados." : ""}
      </div>
    </main>
  );
}
