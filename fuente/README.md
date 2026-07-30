# Marcelo: La Ruta Imposible

CV jugable y responsive de Marcelo Valeri Quispe Cruz, edición **2026**,
actualizado a **julio de 2026**. Funciona en computadora y celular desde un
navegador moderno.

## Qué incluye

- 7 niveles cronológicos (2017 → 2026+) con introducción narrativa, conflicto
  real de esa etapa, mensajes del villano, arena final y escena de victoria.
- 7 jefes obligatorios con barra de vida, ataques telegrafiados, 2 o 3 fases y
  recompensa ligada a un logro real del CV. «El Sesgo» cierra la historia con
  tres fases que combinan las mecánicas aprendidas.
- Poder `E` con **cargas**: se empieza con 3, el máximo es 5, se conservan entre
  niveles y se guardan con el progreso. Variantes activas seleccionables y
  mejoras pasivas (doble salto, escudo, radar, energía, agente aliado).
- Enemigos: caminantes, voladores, **torreta a distancia** (avisa antes de
  disparar), **invocador aéreo** (suelta criaturas que caminan y giran en los
  bordes) y **zombi enterrado** (asoma la mano exactamente 2 s sin hacer daño).
- Bloques ámbar rompibles con grietas progresivas, partículas, destello,
  sacudida y sonido; bloques de acero indestructibles claramente distintos.
  Se rompen con la cabeza, con una caída fuerte o con el pulso `E`.
- Panel discreto del expediente: documento actual, institución, fecha, periodo
  del nivel y poder relacionado, con acceso al CV ampliado.
- Efectos originales de agilidad: estelas, humo, destellos, cortes abstractos,
  partículas y screen shake controlado, respetando `prefers-reduced-motion`.
- Sonido sintetizado con Web Audio (sin música ni efectos con copyright) y
  control para activarlo o silenciarlo.
- Certificaciones 2026 incorporadas: Agentes en ChatGPT (NETZUN), Power BI
  (LinkedIn Learning · Microsoft) y Habilidades Socioemocionales (Sector 3).

## Abrir en Windows

1. Instala Node.js 22 o superior si aún no lo tienes.
2. Haz doble clic en `INICIAR_JUEGO.bat`.
3. El juego se abrirá en `http://localhost:3000`.

## Abrir en macOS o Linux

```bash
chmod +x INICIAR_JUEGO.sh
./INICIAR_JUEGO.sh
```

Después abre `http://localhost:3000`.

## Desarrollo, pruebas y compilación

```bash
npm ci
npm run dev
npm run lint
npm test
```

- `npm run test:unit` ejecuta las pruebas del motor y del render (Node ejecuta
  los módulos TypeScript con eliminación de tipos).
- `npm test` corre esas pruebas, compila producción y valida el HTML renderizado.
- La compilación de producción queda en `dist/` y está preparada para un entorno
  Cloudflare Workers compatible. **No se edita `dist/` a mano.**

## Artefacto autónomo (un solo archivo)

```bash
npm run build
npm run build:standalone
```

Genera `dist/standalone/`:

- `marcelo-ruta-imposible.html`: el juego completo en un único archivo, con CSS,
  JavaScript y tipografías incrustadas y **cero peticiones externas**. Se puede
  abrir con doble clic o subir a cualquier hosting estático.
- `index.html`: el mismo archivo, listo para servir una carpeta.
- `artifact-body.html`: la versión sin `<html>`/`<head>` para publicadores que
  aportan su propio envoltorio.

Para revisarlo como se verá publicado:

```bash
node scripts/serve-standalone.mjs 4173
```

## Publicación

- `.openai/hosting.json` conserva el `project_id` original
  (`appgprj_6a6aba28f9908191b4df3353a6ad97d3`). El despliegue a ese proyecto se
  hace desde el entorno de Codex/Sites que tiene esas credenciales; el archivo
  no se modifica para no crear un sitio duplicado.
- Alternativa gratuita con el mismo artefacto: subir `dist/standalone/index.html`
  a cualquier hosting estático (GitHub Pages, Cloudflare Pages, Netlify).
- Despliegue a Cloudflare Workers desde este mismo repositorio:

```bash
npx wrangler login
npx wrangler deploy
```

## Controles

- Mover: `A` / `D` o flechas.
- Saltar: `Espacio`, `W` o flecha arriba.
- Poder: `E` (o `K`). Cambiar de variante: `Q`.
- Pausa: `Esc`.

En celular aparecen botones táctiles: izquierda, derecha, cambiar poder,
`E` con el contador de cargas y salto.

## Identidad visual

El proyecto usa personajes, enemigos, niveles, bloques, castillos, sonidos y
arte originales. No incluye ROM, código, personajes, música ni recursos de
Nintendo.
