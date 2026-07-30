/**
 * Punto de entrada del artefacto autónomo: un único HTML con todo el juego
 * dentro, generado desde este mismo código fuente (no se edita `dist/` a mano).
 * Se usa para publicar y para poder abrir el CV sin servidor.
 */

import { createRoot } from "react-dom/client";
import { GameCV } from "./GameCV.tsx";

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<GameCV />);
}
