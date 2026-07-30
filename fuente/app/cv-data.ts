/**
 * Datos verificados del CV de Marcelo Valeri Quispe Cruz.
 *
 * Autoridad de la información:
 *  1. Versión 2026 del proyecto jugable (estructura de 7 niveles y 7 villanos).
 *  2. Expediente histórico `ruta-profesional-marcelo.html` (solo para ampliar
 *     detalles verificados: horas, instituciones, códigos y notas).
 *
 * Ningún empleo, estudio, institución, fecha, código ni premio de este archivo
 * es inventado. Los efectos de juego (radios, segundos, energía) sí son diseño
 * de videojuego y se muestran siempre etiquetados como efecto, no como mérito.
 */

export const EDITION = "2026";
export const LAST_UPDATE = "julio de 2026";

export type PowerKind = "active" | "passive" | "final";

export type PowerDef = {
  id: string;
  kind: PowerKind;
  glyph: string;
  name: string;
  /** Efecto real dentro del juego. */
  effect: string;
  /** Logro real del CV que respalda el poder. */
  source: string;
  issuer: string;
  year: string;
};

export type DocumentDef = {
  id: string;
  icon: string;
  category: string;
  title: string;
  issuer: string;
  year: string;
  detail: string;
  /** Poder (pasivo o activo) que entrega el documento. */
  power?: string;
  /** El documento devuelve una carga de E. */
  recharge?: boolean;
};

export type BossAttackKind =
  | "dash"
  | "volley"
  | "slam"
  | "summon"
  | "beam"
  | "split"
  | "orbit";

export type BossAttackDef = {
  kind: BossAttackKind;
  /** Segundos de aviso antes del golpe: el ataque siempre es telegrafiado. */
  telegraph: number;
  /** Segundos de espera después del golpe. */
  recover: number;
  /** Parámetro libre según el tipo de ataque. */
  power?: number;
};

export type BossPhaseDef = {
  label: string;
  /** Se activa cuando la vida cae por debajo de esta fracción. */
  from: number;
  speed: number;
  attacks: BossAttackDef[];
  line: string;
};

export type BossDef = {
  id: string;
  name: string;
  glyph: string;
  hp: number;
  w: number;
  h: number;
  color: string;
  /** Dos o más patrones de comportamiento por diseño. */
  phases: BossPhaseDef[];
  intro: string;
  defeat: string;
};

export type EnemyKind =
  | "walker"
  | "flyer"
  | "ranged"
  | "summoner"
  | "spawnling"
  | "zombie"
  | "boss";

export type EnemyPlan = { kind: EnemyKind; count: number };

export type LevelDef = {
  id: string;
  year: string;
  title: string;
  subtitle: string;
  villain: string;
  villainLine: string;
  /** Introducción narrativa breve del nivel. */
  intro: string;
  /** Conflicto real de esa etapa de la trayectoria. */
  conflict: string;
  /** Escena posterior a la victoria. */
  outro: string;
  /** Recompensa (id de poder) por derrotar al jefe. */
  reward: string;
  palette: [string, string, string, string];
  documents: DocumentDef[];
  boss: BossDef;
  enemies: EnemyPlan[];
};

/* ─────────────────────────── PODERES ─────────────────────────── */

export const POWERS: PowerDef[] = [
  {
    id: "voz",
    kind: "active",
    glyph: "◈",
    name: "Voz de Investigación",
    effect: "Pulso de argumento: daña enemigos y rompe bloques agrietados cercanos.",
    source: "Ponente — IV Jornada de Investigación Científica",
    issuer: "Universidad Nacional de Juliaca",
    year: "2019",
  },
  {
    id: "oratoria",
    kind: "active",
    glyph: "≋",
    name: "Aura de Oratoria",
    effect: "Onda amplia: alcance mayor, aturde a los enemigos alcanzados.",
    source: "I Seminario Internacional de Oratoria",
    issuer: "Academia Indoamericana de Debate",
    year: "2020",
  },
  {
    id: "automatizacion",
    kind: "active",
    glyph: "▤",
    name: "Automatización de Documentos",
    effect: "Rompe TODOS los bloques agrietados del radio ampliado y empuja enemigos.",
    source: "Office Básico e Intermedio — CCTIC (240 h)",
    issuer: "Universidad Nacional de Moquegua",
    year: "2022",
  },
  {
    id: "rayo",
    kind: "active",
    glyph: "⌁",
    name: "Rayo de Prompting Avanzado",
    effect: "Cadena eléctrica: golpea a tres enemigos y destruye proyectiles enemigos.",
    source: "Introducción a la IA Moderna",
    issuer: "Cisco Networking Academy",
    year: "2025",
  },
  {
    id: "agente",
    kind: "active",
    glyph: "AG",
    name: "Agente Aliado",
    effect: "Despliega un dron aliado 9 s que ataca por su cuenta.",
    source: "Creación de Agentes en ChatGPT · código DAB448E4",
    issuer: "NETZUN",
    year: "06 may 2026",
  },
  {
    id: "sinergia",
    kind: "final",
    glyph: "∞",
    name: "Sinergia Final",
    effect: "Combina onda total, dron aliado, escudo y energía completa.",
    source: "Perfil híbrido: gestión pública + derecho digital + ingeniería",
    issuer: "Le Wagon · VIU · UPC",
    year: "2026",
  },

  {
    id: "etica",
    kind: "passive",
    glyph: "🧭",
    name: "Brújula Ética",
    effect: "+25 s de tiempo en todos los niveles.",
    source: "Conducta Responsable en Investigación — nota 18.30",
    issuer: "UPCH — QUIPU",
    year: "2019",
  },
  {
    id: "autoempleo",
    kind: "passive",
    glyph: "✦",
    name: "Impulso de Autoempleo",
    effect: "+12 de energía máxima.",
    source: "Autoempleo (MTPE, 104 h) y I Congreso de Gestión Pública (120 h)",
    issuer: "MTPE — Jóvenes Productivos / UNAM",
    year: "2019",
  },
  {
    id: "cooperacion",
    kind: "passive",
    glyph: "◉",
    name: "Red de Cooperación Global",
    effect: "+8 s y señala la posición de los documentos del nivel.",
    source: "Curso de Cooperación Internacional (80 h)",
    issuer: "IFOSOCJ + Colegio de Abogados de Moquegua",
    year: "2020",
  },
  {
    id: "doblesalto",
    kind: "passive",
    glyph: "I",
    name: "Núcleo de Innovación",
    effect: "Doble salto: impúlsate otra vez en el aire.",
    source: "1.er puesto — Innovation Challenge",
    issuer: "PUCP + EQUIPU",
    year: "2021",
  },
  {
    id: "fondos",
    kind: "passive",
    glyph: "S/",
    name: "Imán de Fondos",
    effect: "+5 s por cada documento recuperado.",
    source: "Ganador del fondo concursable APORTES",
    issuer: "Aportes para el Desarrollo Humano",
    year: "2021",
  },
  {
    id: "escudo",
    kind: "passive",
    glyph: "⚑",
    name: "Escudo de Integridad",
    effect: "Bloquea un golpe por nivel sin recibir daño.",
    source: "Fiscalizador de Local de Votación — ERM y 2.ª elección regional",
    issuer: "Jurado Nacional de Elecciones",
    year: "2022",
  },
  {
    id: "planillas",
    kind: "passive",
    glyph: "◎",
    name: "Gestión de Expedientes",
    effect: "Los documentos devuelven +10 de energía extra.",
    source: "Promotor Social — CIAM (SIR-CIAM, reporte al MIMP)",
    issuer: "Municipalidad Provincial Mariscal Nieto",
    year: "2023",
  },
  {
    id: "analisis",
    kind: "passive",
    glyph: "⚖",
    name: "Análisis Legal Rápido",
    effect: "El pulso E se recarga 40 % más rápido.",
    source: "Diplomado en Flagrancia Delictiva y Proceso Penal",
    issuer: "Ilustre Colegio de Abogados del Callao",
    year: "2024",
  },
  {
    id: "siaf",
    kind: "passive",
    glyph: "🏦",
    name: "Llave SIAF · SIGA",
    effect: "+10 s y mayor alcance del pulso sobre bloques.",
    source: "Especialista SIAF (200 h) y Especialista SIGA (200 h)",
    issuer: "CENTRUM PUCP — Escuela de Gestión Pública",
    year: "2025",
  },
  {
    id: "datos",
    kind: "passive",
    glyph: "01",
    name: "Visión de Datos",
    effect: "Radar: revela la salida y la arena del jefe.",
    source: "TechEmprende: IA aplicada a Negocios y Data Analytics (46 h)",
    issuer: "Merlin Data Technology",
    year: "2025",
  },
  {
    id: "emprende",
    kind: "passive",
    glyph: "12K",
    name: "Órbita Emprendedora",
    effect: "Salto más alto en toda la ruta.",
    source: "Emprende Joven — reconocimiento de S/ 12,000",
    issuer: "Municipalidad Provincial Mariscal Nieto",
    year: "2025",
  },
  {
    id: "tablero",
    kind: "passive",
    glyph: "BI",
    name: "Tablero Táctico",
    effect: "+50 de energía máxima y radar permanente.",
    source: "Aprende Power BI — certificado 933f…6125",
    issuer: "LinkedIn Learning · Microsoft",
    year: "27 jul 2026",
  },
  {
    id: "resiliencia",
    kind: "passive",
    glyph: "EQ",
    name: "Resiliencia Emocional",
    effect: "Cada documento devuelve +20 de energía.",
    source: "Habilidades Socioemocionales — componente culminado",
    issuer: "Sector 3 Social Venture Group",
    year: "2026",
  },
  {
    id: "ciberescudo",
    kind: "passive",
    glyph: "🔐",
    name: "Escudo de Ciberseguridad Legal",
    effect: "El primer golpe de cada nivel no hace daño.",
    source: "Maestría en Derecho Digital y Ciberseguridad (I ciclo)",
    issuer: "Universidad Internacional de Valencia",
    year: "2026",
  },
  {
    id: "viral",
    kind: "passive",
    glyph: "11K",
    name: "Onda Viral de Impacto",
    effect: "Las derrotas encadenadas devuelven tiempo.",
    source: "TikTok Manager — comunidad de +11 mil seguidores",
    issuer: "Mar de Becas",
    year: "2026",
  },
];

export const POWER_BY_ID = new Map(POWERS.map((power) => [power.id, power]));

/** Poder activo con el que arranca la campaña. */
export const STARTING_ACTIVE = "voz";
export const START_CHARGES = 3;
export const MAX_CHARGES = 5;

/* ─────────────────────────── NIVELES ─────────────────────────── */

export const LEVELS: LevelDef[] = [
  {
    id: "origen",
    year: "2017—2019",
    title: "El archivo de la duda",
    subtitle: "Investigación, integridad y primeros pasos",
    villain: "La Duda",
    villainLine: "«Todavía no estás listo.»",
    intro:
      "Moquegua, 2017. Marcelo entra al archivo donde se guardan los primeros expedientes de su carrera: talleres, observación electoral y una tesis sobre corrupción pública. Todo está ahí, pero alguien apagó las luces.",
    conflict:
      "Empezar sin credenciales: el archivo solo se abre para quien demuestre método, ética y capacidad de sustentar hallazgos en público.",
    outro:
      "«Entonces la nota era real.» La Duda se apaga y el archivo queda iluminado: la investigación resistió su propio examen.",
    reward: "etica",
    palette: ["#130f2f", "#312460", "#8d64ff", "#efc8ff"],
    documents: [
      {
        id: "cri-2019",
        icon: "◈",
        category: "Certificación",
        title: "Conducta Responsable en Investigación",
        issuer: "UPCH — QUIPU",
        year: "2019",
        detail:
          "Curso finalizado satisfactoriamente con nota 18.30: ética, rigor e integridad científica.",
        recharge: true,
      },
      {
        id: "ponente-2019",
        icon: "⌁",
        category: "Reconocimiento",
        title: "Ponente — IV Jornada de Investigación Científica",
        issuer: "Universidad Nacional de Juliaca",
        year: "2019",
        detail:
          "Ponencia de su tesis sobre percepción ciudadana frente a la corrupción en el sector público de Moquegua.",
        power: "voz",
      },
      {
        id: "autoempleo-2019",
        icon: "✦",
        category: "Certificado",
        title: "Gestión pública y autoempleo",
        issuer: "MTPE — Jóvenes Productivos / UNAM",
        year: "2019",
        detail:
          "Curso taller de competencias para el autoempleo (104 h) y I Congreso Internacional de Gestión Pública (120 h).",
        power: "autoempleo",
      },
    ],
    boss: {
      id: "espejo",
      name: "Espejo de la Duda",
      glyph: "?",
      hp: 5,
      w: 86,
      h: 92,
      color: "#8d64ff",
      intro: "«Cada logro tuyo tiene una versión más pequeña. Mírala.»",
      defeat: "«…La nota era 18.30.» El espejo se parte y deja pasar la luz.",
      phases: [
        {
          label: "Reflejo",
          from: 1,
          speed: 62,
          line: "«Todavía no estás listo.»",
          attacks: [
            { kind: "dash", telegraph: 0.85, recover: 1.05 },
            { kind: "volley", telegraph: 0.8, recover: 1.2, power: 2 },
          ],
        },
        {
          label: "Fractura",
          from: 0.5,
          speed: 92,
          line: "«¿Y si nadie te cree?»",
          attacks: [
            { kind: "volley", telegraph: 0.62, recover: 0.85, power: 3 },
            { kind: "summon", telegraph: 0.7, recover: 1.3, power: 2 },
            { kind: "dash", telegraph: 0.6, recover: 0.8 },
          ],
        },
      ],
    },
    enemies: [
      { kind: "walker", count: 2 },
      { kind: "zombie", count: 2 },
      { kind: "flyer", count: 1 },
    ],
  },
  {
    id: "comunidad",
    year: "2020",
    title: "La ciudad suspendida",
    subtitle: "Servicio público, cultura y comunicación",
    villain: "El Caos",
    villainLine: "«Cuando todo cambia, nadie avanza.»",
    intro:
      "2020. La ciudad se detiene y la gestión pública se muda a una pantalla. Marcelo sostiene TDR, órdenes de servicio e informes presupuestales mientras el suelo se reconfigura.",
    conflict:
      "Trabajar en una municipalidad y en logística remota cuando la ciudad entera cambió de reglas de un día para otro.",
    outro:
      "«Coordinaste sin salir de casa.» El Caos se dispersa: la comunicación abierta sostuvo la ruta.",
    reward: "oratoria",
    palette: ["#071d2b", "#10465a", "#22b8a7", "#b4ffe8"],
    documents: [
      {
        id: "promuvi-2020",
        icon: "▣",
        category: "Trabajo",
        title: "Promotor municipal — PROMUVI",
        issuer: "Municipalidad Provincial Mariscal Nieto",
        year: "Ene—Mar 2020",
        detail:
          "Sistema de títulos de propiedad, elaboración de TDR, seguimiento de órdenes e informes presupuestales.",
      },
      {
        id: "cooperacion-2020",
        icon: "◉",
        category: "Diploma",
        title: "Curso de Cooperación Internacional (80 h)",
        issuer: "IFOSOCJ + Colegio de Abogados de Moquegua",
        year: "2020",
        detail: "Concluido y aprobado con diploma conjunto de ambas instituciones.",
        power: "cooperacion",
        recharge: true,
      },
      {
        id: "oratoria-2020",
        icon: "≋",
        category: "Certificado",
        title: "I Seminario Internacional de Oratoria",
        issuer: "Academia Indoamericana de Debate",
        year: "2020",
        detail:
          "Seminario con ponentes de México, Honduras, Panamá, Venezuela, Chile, Uruguay y Perú.",
      },
    ],
    boss: {
      id: "nodo",
      name: "Nodo del Caos",
      glyph: "✳",
      hp: 6,
      w: 92,
      h: 88,
      color: "#22b8a7",
      intro: "«No hay agenda. No hay sala. No hay turno.»",
      defeat: "«Igual convocaste a siete países.» El nodo se ordena y libera la salida.",
      phases: [
        {
          label: "Dispersión",
          from: 1,
          speed: 74,
          line: "«Cuando todo cambia, nadie avanza.»",
          attacks: [
            { kind: "volley", telegraph: 0.75, recover: 1, power: 3 },
            { kind: "dash", telegraph: 0.8, recover: 1 },
          ],
        },
        {
          label: "Tormenta",
          from: 0.55,
          speed: 104,
          line: "«Que nadie escuche a nadie.»",
          attacks: [
            { kind: "orbit", telegraph: 0.7, recover: 1.4, power: 6 },
            { kind: "volley", telegraph: 0.55, recover: 0.75, power: 4 },
            { kind: "summon", telegraph: 0.7, recover: 1.2, power: 2 },
          ],
        },
      ],
    },
    enemies: [
      { kind: "walker", count: 2 },
      { kind: "zombie", count: 2 },
      { kind: "flyer", count: 2 },
      { kind: "ranged", count: 1 },
    ],
  },
  {
    id: "innovacion",
    year: "2021—2022",
    title: "La fábrica del mañana",
    subtitle: "Innovación, liderazgo y transparencia",
    villain: "La Procrastinación",
    villainLine: "«Puede esperar hasta mañana.»",
    intro:
      "2021. Una fábrica de prototipos, fondos concursables y mesas de trabajo juveniles. Cada máquina funciona, pero un engranaje lento intenta detener el turno.",
    conflict:
      "Competir, ganar financiamiento y fiscalizar elecciones sin postergar ninguna entrega.",
    outro:
      "«Primer puesto, fondo ganado y dos jornadas electorales.» La Procrastinación se detiene: el turno se cumplió.",
    reward: "automatizacion",
    palette: ["#1b1225", "#522446", "#fa6f61", "#ffd3a5"],
    documents: [
      {
        id: "innovation-2021",
        icon: "I",
        category: "Reconocimiento",
        title: "1.er puesto — Innovation Challenge",
        issuer: "PUCP + EQUIPU",
        year: "2021",
        detail:
          "Primer puesto en la final con el equipo Laura Rodríguez Dulanto, formulando una solución creativa al reto propuesto.",
        power: "doblesalto",
      },
      {
        id: "aportes-2021",
        icon: "S/",
        category: "Logro",
        title: "Ganador del fondo concursable APORTES",
        issuer: "Aportes para el Desarrollo Humano",
        year: "2021",
        detail:
          "Financiamiento de mini proyectos agrícolas sostenibles junto a la Red de Jóvenes Emprendedores — Cusco.",
        power: "fondos",
        recharge: true,
      },
      {
        id: "jne-2022",
        icon: "⚑",
        category: "Trabajo",
        title: "Fiscalizador de Local de Votación",
        issuer: "Jurado Nacional de Elecciones",
        year: "Oct y Dic 2022",
        detail:
          "Informes de funcionamiento de los FLV en las ERM 2022 y en la segunda elección regional.",
        power: "escudo",
      },
    ],
    boss: {
      id: "reloj",
      name: "Engranaje Perezoso",
      glyph: "◷",
      hp: 7,
      w: 96,
      h: 90,
      color: "#fa6f61",
      intro: "«Deja el prototipo. Mañana rinde más.»",
      defeat: "«Entregaste antes del plazo.» El engranaje cede y la línea vuelve a girar.",
      phases: [
        {
          label: "Inercia",
          from: 1,
          speed: 58,
          line: "«Puede esperar hasta mañana.»",
          attacks: [
            { kind: "slam", telegraph: 0.9, recover: 1.15 },
            { kind: "volley", telegraph: 0.75, recover: 1, power: 3 },
          ],
        },
        {
          label: "Arranque",
          from: 0.5,
          speed: 128,
          line: "«Ahora todo junto y tarde.»",
          attacks: [
            { kind: "dash", telegraph: 0.5, recover: 0.55 },
            { kind: "dash", telegraph: 0.45, recover: 0.5 },
            { kind: "slam", telegraph: 0.7, recover: 0.9 },
          ],
        },
      ],
    },
    enemies: [
      { kind: "walker", count: 2 },
      { kind: "zombie", count: 2 },
      { kind: "flyer", count: 2 },
      { kind: "ranged", count: 2 },
    ],
  },
  {
    id: "gestion",
    year: "2023—2024",
    title: "El laberinto del papel",
    subtitle: "Gestión pública, sistemas y comunicación digital",
    villain: "La Burocracia",
    villainLine: "«Te falta un sello. Vuelve al inicio.»",
    intro:
      "2023. Pasillos de expedientes, planillas y dictámenes regionales. El camino existe, pero cada puerta pide un sello más que la anterior.",
    conflict:
      "Sostener CIAM, planillas, el Consejo Regional y la producción digital sin que el trámite gane a las personas.",
    outro:
      "«Ese expediente ya estaba firmado.» La Burocracia se archiva sola y el pasillo se abre.",
    reward: "analisis",
    palette: ["#0a1528", "#123e68", "#2c8edb", "#c4edff"],
    documents: [
      {
        id: "ciam-2023",
        icon: "◎",
        category: "Trabajo",
        title: "Promotor Social — CIAM",
        issuer: "Municipalidad Provincial Mariscal Nieto",
        year: "Ene—Jul 2023",
        detail:
          "Manejo del sistema SIR-CIAM, reporte de data al MIMP, elaboración de TDR y seguimiento de órdenes de servicio.",
        power: "planillas",
      },
      {
        id: "consejo-2023",
        icon: "▤",
        category: "Trabajo",
        title: "Consejo Regional de Moquegua",
        issuer: "Gobierno Regional de Moquegua",
        year: "Oct 2023 — Ene 2024",
        detail:
          "Asistencia técnica en fiscalización, dictámenes regionales, sesiones solemnes y acervo documentario.",
        recharge: true,
      },
      {
        id: "pupalife-2024",
        icon: "▶",
        category: "Trabajo",
        title: "Contenido y video con IA",
        issuer: "PUPALIFE S.A.C.S.",
        year: "Ene—Feb 2024",
        detail:
          "Community management para TikTok, Facebook e Instagram y edición de video con IA de forma orgánica.",
      },
    ],
    boss: {
      id: "sello",
      name: "Sello Infinito",
      glyph: "▩",
      hp: 8,
      w: 104,
      h: 96,
      color: "#2c8edb",
      intro: "«Su expediente ingresó a cola. Tiempo estimado: nunca.»",
      defeat: "«Observación levantada.» El sello se rompe y el trámite por fin avanza.",
      phases: [
        {
          label: "Mesa de partes",
          from: 1,
          speed: 66,
          line: "«Te falta un sello. Vuelve al inicio.»",
          attacks: [
            { kind: "slam", telegraph: 0.95, recover: 1.1 },
            { kind: "volley", telegraph: 0.7, recover: 0.95, power: 4 },
          ],
        },
        {
          label: "Cola infinita",
          from: 0.6,
          speed: 96,
          line: "«Ahora todos los expedientes a la vez.»",
          attacks: [
            { kind: "volley", telegraph: 0.55, recover: 0.7, power: 5 },
            { kind: "summon", telegraph: 0.65, recover: 1.15, power: 3 },
            { kind: "slam", telegraph: 0.7, recover: 0.85 },
          ],
        },
      ],
    },
    enemies: [
      { kind: "walker", count: 2 },
      { kind: "zombie", count: 2 },
      { kind: "flyer", count: 2 },
      { kind: "ranged", count: 2 },
      { kind: "summoner", count: 1 },
    ],
  },
  {
    id: "nucleo",
    year: "2025",
    title: "El núcleo tecnológico",
    subtitle: "IA, datos, sistemas del Estado y emprendimiento",
    villain: "El Desánimo",
    villainLine: "«El cambio es demasiado grande.»",
    intro:
      "2025. El laboratorio se enciende: LLM, analítica de datos, SIAF, SIGA y un premio de S/ 12,000 para su emprendimiento. Sobre el techo se forma una nube gris.",
    conflict:
      "Reconvertir un perfil de gestión pública hacia la tecnología mientras la nube repite que el cambio es demasiado grande.",
    outro:
      "«Seis certificaciones en un año.» El Desánimo se disuelve y el núcleo queda estable.",
    reward: "rayo",
    palette: ["#080c20", "#18234f", "#5354d9", "#99f4ff"],
    documents: [
      {
        id: "cisco-2025",
        icon: "AI",
        category: "Certificación internacional",
        title: "Introducción a la IA Moderna",
        issuer: "Cisco Networking Academy",
        year: "Nov 2025",
        detail:
          "LLM, visión por computadora, prompt engineering avanzado y automatización con IA generativa.",
        recharge: true,
      },
      {
        id: "merlin-2025",
        icon: "01",
        category: "Certificación",
        title: "IA aplicada a Negocios y Data Analytics",
        issuer: "Merlin Data Technology",
        year: "Jul—Nov 2025",
        detail: "Especialización TechEmprende de 46 horas en IA para negocios y analítica.",
        power: "datos",
      },
      {
        id: "emprende-2025",
        icon: "12K",
        category: "Reconocimiento",
        title: "Emprende Joven — S/ 12,000",
        issuer: "Municipalidad Provincial Mariscal Nieto",
        year: "2025",
        detail: "Reconocimiento económico para impulsar su emprendimiento.",
        power: "emprende",
      },
    ],
    boss: {
      id: "nube",
      name: "Nube Gris",
      glyph: "☁",
      hp: 9,
      w: 112,
      h: 84,
      color: "#5354d9",
      intro: "«Mira el tamaño de lo que quieres cambiar.»",
      defeat: "«Y aun así aprendiste el stack completo.» La nube se abre en datos limpios.",
      phases: [
        {
          label: "Llovizna",
          from: 1,
          speed: 82,
          line: "«El cambio es demasiado grande.»",
          attacks: [
            { kind: "volley", telegraph: 0.7, recover: 0.9, power: 4 },
            { kind: "summon", telegraph: 0.7, recover: 1.1, power: 3 },
          ],
        },
        {
          label: "Tormenta seca",
          from: 0.65,
          speed: 112,
          line: "«Nadie sostiene tanto a la vez.»",
          attacks: [
            { kind: "beam", telegraph: 0.85, recover: 1.05, power: 2 },
            { kind: "volley", telegraph: 0.5, recover: 0.65, power: 6 },
            { kind: "dash", telegraph: 0.55, recover: 0.7 },
          ],
        },
      ],
    },
    enemies: [
      { kind: "walker", count: 2 },
      { kind: "zombie", count: 3 },
      { kind: "flyer", count: 2 },
      { kind: "ranged", count: 2 },
      { kind: "summoner", count: 1 },
    ],
  },
  {
    id: "sistema",
    year: "2026",
    title: "La frontera del sistema",
    subtitle: "Derecho digital, software y agentes de IA",
    villain: "El Bug Legacy",
    villainLine: "«Siempre se hizo así.»",
    intro:
      "2026. Bootcamp, maestría en derecho digital, ingeniería de sistemas y agentes de IA en producción. En el borde del sistema vive un error que nadie quiso tocar.",
    conflict:
      "Escribir el sistema nuevo sin romper el que ya sostiene al Estado, y sin repetir el error heredado.",
    outro:
      "«Refactorizado.» El Bug Legacy se cierra y el agente aliado queda desplegado a tu lado.",
    reward: "agente",
    palette: ["#061a1b", "#0c4240", "#14b8a6", "#b7fff1"],
    documents: [
      {
        id: "netzun-2026",
        icon: "AG",
        category: "Certificación",
        title: "Creación de Agentes en ChatGPT",
        issuer: "NETZUN",
        year: "06 may 2026",
        detail: "Curso online completado. Código de certificado DAB448E4.",
        recharge: true,
      },
      {
        id: "powerbi-2026",
        icon: "BI",
        category: "Certificación",
        title: "Aprende Power BI",
        issuer: "LinkedIn Learning · Microsoft",
        year: "27 jul 2026",
        detail: "Modelado, visualización y tableros de datos. Certificado 933f…6125.",
        power: "tablero",
      },
      {
        id: "socioemocional-2026",
        icon: "EQ",
        category: "Certificación",
        title: "Habilidades Socioemocionales",
        issuer: "Sector 3 Social Venture Group",
        year: "2026",
        detail: "Componente de formación culminado exitosamente.",
        power: "resiliencia",
      },
    ],
    boss: {
      id: "legacy",
      name: "Núcleo Legacy",
      glyph: "</>",
      hp: 10,
      w: 100,
      h: 100,
      color: "#14b8a6",
      intro: "«No me documentes. No me toques. Funciono.»",
      defeat: "«Ahora sí está documentado.» El núcleo se recompila y libera la frontera.",
      phases: [
        {
          label: "Herencia",
          from: 1,
          speed: 88,
          line: "«Siempre se hizo así.»",
          attacks: [
            { kind: "volley", telegraph: 0.65, recover: 0.85, power: 5 },
            { kind: "dash", telegraph: 0.6, recover: 0.75 },
          ],
        },
        {
          label: "Fork",
          from: 0.66,
          speed: 116,
          line: "«Entonces me duplico.»",
          attacks: [
            { kind: "split", telegraph: 0.8, recover: 1.35, power: 2 },
            { kind: "beam", telegraph: 0.75, recover: 0.95, power: 2 },
            { kind: "volley", telegraph: 0.5, recover: 0.6, power: 6 },
          ],
        },
        {
          label: "Deprecado",
          from: 0.3,
          speed: 142,
          line: "«Si caigo, caigo con todo el sistema.»",
          attacks: [
            { kind: "dash", telegraph: 0.42, recover: 0.45 },
            { kind: "orbit", telegraph: 0.6, recover: 1.2, power: 8 },
            { kind: "summon", telegraph: 0.6, recover: 0.95, power: 3 },
          ],
        },
      ],
    },
    enemies: [
      { kind: "walker", count: 2 },
      { kind: "zombie", count: 3 },
      { kind: "flyer", count: 3 },
      { kind: "ranged", count: 3 },
      { kind: "summoner", count: 2 },
    ],
  },
  {
    id: "jefe",
    year: "2026+",
    title: "La cámara del algoritmo",
    subtitle: "Integra lo público, lo humano y lo tecnológico",
    villain: "El Sesgo",
    villainLine: "«El futuro solo admite un perfil.»",
    intro:
      "La última cámara no tiene expedientes: tiene un filtro. Capacitación electoral, comunidad de +11 mil seguidores y un perfil híbrido entran a la vez, y el algoritmo decide que eso no cabe en su plantilla.",
    conflict:
      "Un perfil que mezcla gestión pública, derecho digital, ingeniería y comunicación no encaja en ninguna casilla del filtro.",
    outro:
      "«Perfil no clasificable.» El Sesgo se apaga. La ruta completa queda como expediente público.",
    reward: "sinergia",
    palette: ["#110d1c", "#3b174e", "#b743a7", "#ffc6ec"],
    documents: [
      {
        id: "onpe-2026",
        icon: "ON",
        category: "Trabajo",
        title: "Capacitador Electoral — Elecciones Generales 2026",
        issuer: "ONPE — ODPE Mariscal Nieto",
        year: "Feb—Abr 2026",
        detail:
          "Capacitación de personal electoral (STAE/CCPP) para el desarrollo de los comicios en Moquegua.",
        recharge: true,
      },
      {
        id: "mardebecas-2026",
        icon: "11K",
        category: "Trabajo",
        title: "TikTok Manager — Mar de Becas",
        issuer: "Comunidad de +11 mil seguidores",
        year: "2026 — Actualidad",
        detail:
          "Estrategia de contenido, narrativas de impacto social y liderazgo de equipo para democratizar becas.",
        power: "viral",
      },
      {
        id: "hibrido-2026",
        icon: "∞",
        category: "Síntesis",
        title: "Perfil híbrido en construcción",
        issuer: "Le Wagon · VIU · UPC",
        year: "2026 — En curso",
        detail:
          "Bootcamp de programación, maestría en Derecho Digital y Ciberseguridad e Ingeniería de Sistemas.",
        power: "ciberescudo",
      },
    ],
    boss: {
      id: "sesgo",
      name: "El Sesgo",
      glyph: "◬",
      hp: 14,
      w: 128,
      h: 118,
      color: "#b743a7",
      intro: "«Clasificando… gestión pública, derecho, ingeniería, comunicación. Error.»",
      defeat:
        "«Perfil no clasificable. Registrando excepción.» El filtro se rompe: la ruta imposible quedó documentada.",
      phases: [
        {
          label: "Filtro",
          from: 1,
          speed: 84,
          line: "«El futuro solo admite un perfil.»",
          attacks: [
            { kind: "volley", telegraph: 0.68, recover: 0.8, power: 6 },
            { kind: "dash", telegraph: 0.62, recover: 0.7 },
            { kind: "beam", telegraph: 0.8, recover: 0.9, power: 2 },
          ],
        },
        {
          label: "Sesgo aprendido",
          from: 0.66,
          speed: 112,
          line: "«Aprendí de todos los que te dijeron que no.»",
          attacks: [
            { kind: "summon", telegraph: 0.62, recover: 1, power: 4 },
            { kind: "slam", telegraph: 0.72, recover: 0.85 },
            { kind: "volley", telegraph: 0.48, recover: 0.6, power: 7 },
            { kind: "orbit", telegraph: 0.62, recover: 1.15, power: 8 },
          ],
        },
        {
          label: "Colapso del modelo",
          from: 0.3,
          speed: 150,
          line: "«Entonces reescribo la plantilla.»",
          attacks: [
            { kind: "dash", telegraph: 0.4, recover: 0.4 },
            { kind: "split", telegraph: 0.7, recover: 1.1, power: 2 },
            { kind: "beam", telegraph: 0.55, recover: 0.7, power: 3 },
            { kind: "orbit", telegraph: 0.5, recover: 0.95, power: 10 },
          ],
        },
      ],
    },
    enemies: [
      { kind: "walker", count: 3 },
      { kind: "zombie", count: 3 },
      { kind: "flyer", count: 3 },
      { kind: "ranged", count: 3 },
      { kind: "summoner", count: 2 },
    ],
  },
];

/* ───────────────────── EXPEDIENTE AMPLIADO ───────────────────── */

export type ArchiveEntry = {
  group: string;
  title: string;
  issuer: string;
  year: string;
};

/**
 * CV ampliado recuperado del expediente histórico. Solo información ya
 * declarada por el titular; no se generan constancias ni imágenes de
 * certificados que no existan.
 */
export const ARCHIVE: ArchiveEntry[] = [
  {
    group: "Formación",
    title: "Licenciado en Gestión Pública y Desarrollo Social",
    issuer: "Universidad Nacional de Moquegua",
    year: "2018—2025",
  },
  {
    group: "Formación",
    title: "Bootcamp de Programación",
    issuer: "Le Wagon (Argentina)",
    year: "2026 — En curso",
  },
  {
    group: "Formación",
    title: "Maestría en Derecho Digital y Ciberseguridad (I ciclo)",
    issuer: "Universidad Internacional de Valencia",
    year: "2026 — En curso",
  },
  {
    group: "Formación",
    title: "Ingeniería de Sistemas (I ciclo)",
    issuer: "Universidad Peruana de Ciencias Aplicadas",
    year: "2026 — En curso",
  },
  {
    group: "Formación",
    title: "Inglés Intermedio B1 — constancia (560 h)",
    issuer: "Centro de Idiomas — Universidad Continental",
    year: "Ago 2024 — Abr 2025",
  },

  {
    group: "Experiencia",
    title: "Capacitador Electoral — Elecciones Generales 2026",
    issuer: "ONPE — ODPE Mariscal Nieto",
    year: "Feb—Abr 2026",
  },
  {
    group: "Experiencia",
    title: "TikTok Manager y Marketing — comunidad de +11 mil seguidores",
    issuer: "Mar de Becas",
    year: "2026 — Actualidad",
  },
  {
    group: "Experiencia",
    title: "Practicante Pre-profesional — Secretaría General (SIGA, SISGEDO)",
    issuer: "Gobierno Regional de Moquegua",
    year: "Mar—Jun 2025",
  },
  {
    group: "Experiencia",
    title: "Voluntariado — Módulo Penal, Investigación Preparatoria (SIJ)",
    issuer: "Corte Superior de Justicia de Moquegua",
    year: "May—Nov 2025",
  },
  {
    group: "Experiencia",
    title: "Servicio especializado en gestión documental (SIAF-SIGA, POI, CEPLAN)",
    issuer: "Universidad Nacional de Moquegua",
    year: "Nov—Dic 2024",
  },
  {
    group: "Experiencia",
    title: "Community Manager y edición de video con IA",
    issuer: "PUPALIFE S.A.C.S.",
    year: "Ene—Feb 2024",
  },
  {
    group: "Experiencia",
    title: "Practicante Profesional — Consejo Regional",
    issuer: "Gobierno Regional de Moquegua",
    year: "Oct 2023 — Ene 2024",
  },
  {
    group: "Experiencia",
    title: "Practicante — Gerencia de Administración y Finanzas (PDT PLAME)",
    issuer: "Municipalidad C.P. San Francisco",
    year: "Ago—Sep 2023",
  },
  {
    group: "Experiencia",
    title: "Promotor Social y Asistente Administrativo — CIAM",
    issuer: "Municipalidad Provincial Mariscal Nieto",
    year: "Ene—Jul 2023",
  },
  {
    group: "Experiencia",
    title: "Fiscalizador de Local de Votación — ERM y 2.ª elección regional",
    issuer: "Jurado Nacional de Elecciones",
    year: "Oct y Dic 2022",
  },
  {
    group: "Experiencia",
    title: "Asistente Administrativo — Logística (virtual)",
    issuer: "T&S Multiservicios S.R.L.",
    year: "Jul 2020 — Jul 2021",
  },
  {
    group: "Experiencia",
    title: "Promotor — Gerencia Municipal / PROMUVI",
    issuer: "Municipalidad Provincial Mariscal Nieto",
    year: "Ene—Mar 2020",
  },
  {
    group: "Experiencia",
    title: "Observador Electoral — ERM, 2.ª vuelta y Referéndum",
    issuer: "Asociación Civil Transparencia",
    year: "2018",
  },

  {
    group: "Certificaciones",
    title: "Aprende Power BI — certificado 933f…6125",
    issuer: "LinkedIn Learning · Microsoft",
    year: "27 jul 2026",
  },
  {
    group: "Certificaciones",
    title: "Creación de Agentes en ChatGPT — código DAB448E4",
    issuer: "NETZUN",
    year: "06 may 2026",
  },
  {
    group: "Certificaciones",
    title: "Habilidades Socioemocionales",
    issuer: "Sector 3 Social Venture Group",
    year: "2026",
  },
  {
    group: "Certificaciones",
    title: "Introducción a la IA Moderna",
    issuer: "Cisco Networking Academy",
    year: "Nov 2025",
  },
  {
    group: "Certificaciones",
    title: "TechEmprende: IA aplicada a Negocios y Data Analytics (46 h)",
    issuer: "Merlin Data Technology",
    year: "Jul—Nov 2025",
  },
  {
    group: "Certificaciones",
    title: "Especialista SIAF (200 h) y Especialista SIGA (200 h)",
    issuer: "CENTRUM PUCP — Escuela de Gestión Pública",
    year: "Feb—Mar 2025",
  },
  {
    group: "Certificaciones",
    title: "Marketing + IA: Estrategias Inteligentes",
    issuer: "Universidad Continental — Wichay",
    year: "Abr—Jun 2025",
  },
  {
    group: "Certificaciones",
    title: "Comunicación Persuasiva y Storytelling",
    issuer: "Universidad Continental — Wichay",
    year: "Sep—Nov 2025",
  },
  {
    group: "Certificaciones",
    title: "Diplomado en Flagrancia Delictiva y Proceso Penal (Reg. GC. 00874/2024)",
    issuer: "Ilustre Colegio de Abogados del Callao",
    year: "Sep—Nov 2024",
  },
  {
    group: "Certificaciones",
    title: "Office Básico e Intermedio — CCTIC (240 h)",
    issuer: "Universidad Nacional de Moquegua",
    year: "2022",
  },
  {
    group: "Certificaciones",
    title: "Programa Friedrich Naumann y Escuela de Transparencia",
    issuer: "FNS · U. Andina del Cusco / Transparencia · Unión Europea",
    year: "2022",
  },
  {
    group: "Certificaciones",
    title: "Promotor del Desarrollo Humano Integral (128 h)",
    issuer: "Escuela de Líderes Santa Ángela — CEFOPROH",
    year: "2021",
  },
  {
    group: "Certificaciones",
    title: "Curso de Cooperación Internacional (80 h)",
    issuer: "IFOSOCJ + Colegio de Abogados de Moquegua",
    year: "2020",
  },
  {
    group: "Certificaciones",
    title: "Protección de DDHH y acceso a la justicia de personas LGTBIQ (30 h)",
    issuer: "Poder Judicial del Perú",
    year: "2020",
  },
  {
    group: "Certificaciones",
    title: "Formación de Actores y Gestión Cultural Virtual (120 h)",
    issuer: "Ministerio de Cultura + Casa Nuestra Southern Perú",
    year: "2020",
  },
  {
    group: "Certificaciones",
    title: "I Seminario Internacional de Oratoria",
    issuer: "Academia Indoamericana de Debate",
    year: "2020",
  },
  {
    group: "Certificaciones",
    title: "Conducta Responsable en Investigación — nota 18.30",
    issuer: "UPCH — QUIPU",
    year: "2019",
  },
  {
    group: "Certificaciones",
    title: "Fortalecimiento de competencias para el autoempleo (104 h)",
    issuer: "MTPE — Jóvenes Productivos",
    year: "2019",
  },
  {
    group: "Certificaciones",
    title: "I Congreso Internacional de Gestión Pública (120 h)",
    issuer: "UNAM — EP Gestión Pública",
    year: "2019",
  },
  {
    group: "Certificaciones",
    title: "Redacción con normas APA (40 h) y curso del Congreso (24 h)",
    issuer: "UNAM / Congreso de la República",
    year: "2019",
  },
  {
    group: "Certificaciones",
    title: "Taller: Trata de Personas y Tráfico Ilícito de Migrantes (4 h)",
    issuer: "Gobierno Regional de Moquegua",
    year: "2017",
  },
  {
    group: "Certificaciones",
    title: "Seminario: Accidentes de Trabajo y Procedimiento Inspectivo (5 h)",
    issuer: "Gerencia Regional de Trabajo — Moquegua",
    year: "2018",
  },

  {
    group: "Reconocimientos",
    title: "Emprende Joven — reconocimiento económico de S/ 12,000",
    issuer: "Municipalidad Provincial Mariscal Nieto",
    year: "2025",
  },
  {
    group: "Reconocimientos",
    title: "Programa de incubación «En Órbita» (40 h)",
    issuer: "ProInnovate",
    year: "Nov 2025",
  },
  {
    group: "Reconocimientos",
    title: "1.er puesto — Innovation Challenge",
    issuer: "PUCP + EQUIPU",
    year: "2021",
  },
  {
    group: "Reconocimientos",
    title: "Ganador del fondo concursable APORTES",
    issuer: "Aportes para el Desarrollo Humano",
    year: "2021",
  },
  {
    group: "Reconocimientos",
    title: "Parlamentario Joven — Plenario Regional",
    issuer: "Congreso de la República + HSS",
    year: "2021",
  },
  {
    group: "Reconocimientos",
    title: "Ponente — IV Jornada de Investigación Científica",
    issuer: "Universidad Nacional de Juliaca",
    year: "2019",
  },
  {
    group: "Reconocimientos",
    title: "Reconocimiento a «Los Quispe» como organización juvenil",
    issuer: "COREJU — Gobierno Regional de Moquegua",
    year: "2019",
  },
  {
    group: "Emprendimiento",
    title: "Startups Qusi Kali (harinas antianémicas) y Nutriseed",
    issuer: "Socio y jefe de marketing — formalización empresarial",
    year: "2022",
  },
  {
    group: "Emprendimiento",
    title: "Miembro fundador — Prointegros Moquegua",
    issuer: "Promotores de Integridad y Transparencia",
    year: "2020",
  },
];

export const PROFILE_BLOCKS = [
  {
    label: "Perfil",
    text: "Licenciado en Gestión Pública y Desarrollo Social con experiencia en gobierno, procesos electorales, comunicación digital y transformación tecnológica.",
  },
  {
    label: "Especialidad",
    text: "Conecta instituciones, datos, IA y narrativas para convertir procesos complejos en soluciones comprensibles y útiles.",
  },
  {
    label: "Formación 2026",
    text: "Bootcamp de programación en Le Wagon, Maestría en Derecho Digital y Ciberseguridad en VIU e Ingeniería de Sistemas en UPC.",
  },
  {
    label: "Ubicación",
    text: "Moquegua, Perú · Disponible para proyectos de innovación pública, IA, producto y comunicación de impacto.",
  },
];

export const CONTACT = {
  email: "marcelovalerioqc@gmail.com",
  linkedin: "linkedin.com/in/marcelo-valeri-iatencion",
  place: "Moquegua, Perú",
};

export const ALL_DOCUMENTS = LEVELS.flatMap((level) =>
  level.documents.map((document) => ({ ...document, levelId: level.id })),
);
