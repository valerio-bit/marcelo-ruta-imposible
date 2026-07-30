/**
 * Motor de audio sintetizado con Web Audio. Todos los sonidos se generan por
 * código: no hay música ni efectos con derechos de autor. El contexto se crea
 * solo tras una interacción del usuario para no reproducir audio automático.
 */

export type SoundName =
  | "jump"
  | "doubleJump"
  | "stomp"
  | "enemyHit"
  | "enemyDown"
  | "hurt"
  | "fall"
  | "guard"
  | "solidBlock"
  | "blockCrack"
  | "blockBreak"
  | "document"
  | "recharge"
  | "power"
  | "pulse"
  | "empty"
  | "switch"
  | "deflect"
  | "aim"
  | "shoot"
  | "summon"
  | "summonAlly"
  | "allyShot"
  | "zombieWarn"
  | "zombieRise"
  | "arena"
  | "bossTell"
  | "bossDash"
  | "bossShoot"
  | "bossJump"
  | "bossSlam"
  | "bossBeam"
  | "bossSplit"
  | "bossPhase"
  | "bossHurt"
  | "bossDown"
  | "win"
  | "lose"
  | "ui";

type ContextClass = typeof AudioContext;

export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private unlocked = false;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(enabled ? 0.9 : 0, this.context.currentTime, 0.02);
    }
  }

  /** Debe llamarse desde un gesto del usuario (click, tecla, toque). */
  unlock() {
    if (this.unlocked) return;
    const ctx = this.ensure();
    if (!ctx) return;
    this.unlocked = true;
    if (ctx.state === "suspended") void ctx.resume();
  }

  dispose() {
    if (this.context) {
      void this.context.close().catch(() => undefined);
    }
    this.context = null;
    this.master = null;
    this.unlocked = false;
  }

  private ensure(): AudioContext | null {
    if (this.context) return this.context;
    if (typeof window === "undefined") return null;
    const Ctor: ContextClass | undefined =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: ContextClass }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = this.enabled ? 0.9 : 0;
      this.master.connect(this.context.destination);
      return this.context;
    } catch {
      return null;
    }
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    volume = 0.06,
    slideTo?: number,
    delay = 0,
  ) {
    const ctx = this.context;
    if (!ctx || !this.master || !this.enabled) return;
    const start = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slideTo !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(30, slideTo),
        start + duration,
      );
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private noise(
    duration: number,
    filterFrequency: number,
    volume = 0.1,
    type: BiquadFilterType = "lowpass",
    delay = 0,
  ) {
    const ctx = this.context;
    if (!ctx || !this.master || !this.enabled) return;
    const start = ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    filter.type = type;
    filter.frequency.value = filterFrequency;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(start);
  }

  play(name: string) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === "suspended") return;

    switch (name as SoundName) {
      case "jump":
        this.tone(430, 0.11, "square", 0.045, 700);
        break;
      case "doubleJump":
        this.tone(640, 0.12, "triangle", 0.05, 1080);
        this.tone(320, 0.1, "square", 0.03, 520, 0.03);
        break;
      case "stomp":
        this.tone(220, 0.09, "square", 0.06, 120);
        this.noise(0.08, 1600, 0.07);
        break;
      case "enemyHit":
        this.tone(300, 0.07, "square", 0.05, 190);
        break;
      case "enemyDown":
        this.tone(180, 0.16, "sawtooth", 0.055, 80);
        this.noise(0.14, 900, 0.08);
        break;
      case "hurt":
        this.tone(190, 0.2, "sawtooth", 0.06, 90);
        this.tone(120, 0.24, "sawtooth", 0.045, 60, 0.08);
        break;
      case "fall":
        this.tone(300, 0.34, "sine", 0.05, 70);
        break;
      case "guard":
        this.tone(760, 0.14, "triangle", 0.05, 1200);
        this.tone(1140, 0.12, "sine", 0.03, 1500, 0.06);
        break;
      case "solidBlock":
        this.tone(140, 0.07, "square", 0.05, 110);
        this.noise(0.05, 700, 0.05);
        break;
      case "blockCrack":
        this.noise(0.09, 2200, 0.09, "highpass");
        this.tone(520, 0.06, "square", 0.03, 340);
        break;
      case "blockBreak":
        this.noise(0.2, 1300, 0.14);
        this.noise(0.14, 3200, 0.08, "highpass", 0.03);
        this.tone(240, 0.14, "square", 0.05, 90);
        break;
      case "document":
        this.tone(880, 0.14, "triangle", 0.05, 1180);
        this.tone(1320, 0.16, "triangle", 0.04, 1600, 0.08);
        break;
      case "recharge":
        // Recarga: arpegio ascendente, distinto del sonido del poder.
        [523, 659, 784, 1046].forEach((frequency, index) => {
          this.tone(frequency, 0.13, "triangle", 0.05, undefined, index * 0.07);
        });
        break;
      case "power":
        [392, 523, 659, 880].forEach((frequency, index) => {
          this.tone(frequency, 0.18, "sine", 0.045, undefined, index * 0.09);
        });
        break;
      case "pulse":
        this.tone(240, 0.24, "sawtooth", 0.06, 1300);
        this.noise(0.18, 2600, 0.06, "highpass");
        break;
      case "empty":
        this.tone(200, 0.1, "square", 0.04, 150);
        this.tone(150, 0.12, "square", 0.035, 110, 0.08);
        break;
      case "switch":
        this.tone(700, 0.06, "square", 0.035, 900);
        break;
      case "deflect":
        this.tone(1500, 0.08, "square", 0.04, 600);
        break;
      case "aim":
        this.tone(620, 0.28, "sine", 0.035, 1050);
        break;
      case "shoot":
        this.tone(880, 0.1, "square", 0.045, 320);
        this.noise(0.06, 3000, 0.04, "highpass");
        break;
      case "summon":
        this.tone(300, 0.2, "triangle", 0.05, 620);
        this.noise(0.14, 1400, 0.05);
        break;
      case "summonAlly":
        [660, 990, 1320].forEach((frequency, index) => {
          this.tone(frequency, 0.14, "triangle", 0.045, undefined, index * 0.06);
        });
        break;
      case "allyShot":
        this.tone(1400, 0.07, "square", 0.03, 900);
        break;
      case "zombieWarn":
        // Aviso del zombi: raspado grave y creciente durante el aviso.
        this.noise(0.5, 420, 0.09);
        this.tone(90, 0.5, "sawtooth", 0.04, 150);
        break;
      case "zombieRise":
        this.noise(0.3, 800, 0.12);
        this.tone(160, 0.26, "sawtooth", 0.05, 70);
        break;
      case "arena":
        [110, 146, 220].forEach((frequency, index) => {
          this.tone(frequency, 0.6, "sawtooth", 0.04, undefined, index * 0.12);
        });
        this.noise(0.5, 500, 0.06);
        break;
      case "bossTell":
        this.tone(300, 0.22, "square", 0.05, 180);
        break;
      case "bossDash":
        this.noise(0.24, 1800, 0.1, "highpass");
        this.tone(180, 0.22, "sawtooth", 0.055, 420);
        break;
      case "bossShoot":
        this.tone(420, 0.14, "square", 0.05, 160);
        this.tone(210, 0.16, "sawtooth", 0.04, 90, 0.04);
        break;
      case "bossJump":
        this.tone(260, 0.18, "square", 0.05, 520);
        break;
      case "bossSlam":
        this.noise(0.34, 480, 0.16);
        this.tone(80, 0.34, "sawtooth", 0.07, 44);
        break;
      case "bossBeam":
        this.tone(1200, 0.4, "sawtooth", 0.05, 300);
        this.noise(0.34, 3000, 0.06, "highpass");
        break;
      case "bossSplit":
        this.tone(500, 0.16, "square", 0.05, 250);
        this.tone(700, 0.16, "square", 0.04, 350, 0.07);
        break;
      case "bossPhase":
        [147, 185, 220, 294].forEach((frequency, index) => {
          this.tone(frequency, 0.34, "sawtooth", 0.05, undefined, index * 0.08);
        });
        break;
      case "bossHurt":
        this.tone(260, 0.12, "square", 0.055, 150);
        this.noise(0.1, 1200, 0.07);
        break;
      case "bossDown":
        [392, 330, 262, 196, 131].forEach((frequency, index) => {
          this.tone(frequency, 0.4, "sawtooth", 0.055, undefined, index * 0.1);
        });
        this.noise(0.6, 700, 0.12, "lowpass", 0.2);
        break;
      case "win":
        [523, 659, 784, 1046, 1318].forEach((frequency, index) => {
          this.tone(frequency, 0.24, "triangle", 0.055, undefined, index * 0.11);
        });
        break;
      case "lose":
        [330, 262, 196, 131].forEach((frequency, index) => {
          this.tone(frequency, 0.34, "sawtooth", 0.05, undefined, index * 0.13);
        });
        break;
      default:
        this.tone(520, 0.07, "triangle", 0.035);
        break;
    }
  }
}
