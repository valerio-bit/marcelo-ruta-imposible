# Marcelo: La Ruta Imposible

**CV jugable de Marcelo Valeri Quispe Cruz — edición 2026.**

### ▶ Jugar ahora: https://valerio-bit.github.io/marcelo-ruta-imposible/

Funciona en computadora y celular, sin instalar nada. El progreso se guarda en el
propio navegador.

---

## Qué es

Un currículum que no se lee: se supera. Siete niveles cronológicos (2017 → 2026)
que recorren una trayectoria real en gestión pública, procesos electorales,
comunicación digital, datos e inteligencia artificial. Cada nivel termina en una
arena con un jefe que representa el obstáculo real de esa etapa, y cada poder
que se desbloquea está respaldado por una certificación o un logro verificable.

- **Publicado en 2026**: el libro *Voces de Moquegua* (ISBN 978-612-47402-5-1),
  un artículo científico en *Multidisciplinary Reviews*,
  1.er lugar en la Hackatón Nacional Transformagob (PCM) y el primer empleo
  dedicado a inteligencia artificial, todo dentro de los dos últimos niveles.
- **7 jefes** con barra de vida, ataques anticipados y varias fases. «El Sesgo»
  cierra la historia con tres fases.
- **Poder `E` con cargas**: se empieza con 3, el máximo es 5, se conservan entre
  niveles. Seis variantes activas y quince mejoras pasivas, todas ligadas a un
  logro real del CV.
- **Enemigos**: torretas que avisan antes de disparar, invocadores aéreos y
  zombis que asoman la mano dos segundos antes de emerger.
- **Expediente en pantalla**: al recoger cada documento se muestra su nombre,
  institución, fecha y el poder que otorga, con acceso al CV ampliado.

## Controles

| Acción | Teclado | Celular |
|---|---|---|
| Mover | `A` / `D` o flechas | botones ← → |
| Saltar | `Espacio`, `W`, ↑ | botón ↑ |
| Poder | `E` | botón `E` (muestra las cargas) |
| Picado | `S` o ↓ | botón ↓ |
| Cambiar poder | `Q` | botón ⟳ |
| Pausa | `Esc` | — |

## Cómo está hecho

React 19, Next 16 sobre vinext, TypeScript y Canvas 2D. Toda la lógica de juego
vive en un motor puro (`fuente/app/engine.ts`) cubierto por 65 pruebas
automatizadas que se ejecutan en Node; el sonido es sintetizado con Web Audio.

La página publicada es un único archivo HTML con el CSS, el JavaScript y las
tipografías incrustados: **cero peticiones externas**.

```bash
cd fuente
npm ci
npm run dev              # desarrollo en http://localhost:3000
npm test                 # 65 pruebas de motor y render + build + HTML
npm run build && npm run build:standalone
```

## Contacto

Marcelo Valeri Quispe Cruz · Moquegua, Perú
marcelovalerioqc@gmail.com · linkedin.com/in/marcelo-valeri-iatencion

## Aviso

Personajes, enemigos, niveles, bloques, sonidos y arte son originales. No se
utilizan ROM, código, personajes, música ni recursos de Nintendo ni de ninguna
otra franquicia.
