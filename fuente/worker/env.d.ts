/**
 * Tipos mínimos del entorno Cloudflare Workers que usa `worker/index.ts`.
 * Evita depender de `@cloudflare/workers-types` (no está en el lockfile) y deja
 * `tsc --noEmit` limpio sin cambiar el comportamiento del runtime.
 */

declare interface Fetcher {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
}

declare interface D1Database {
  prepare(query: string): unknown;
  exec(query: string): Promise<unknown>;
}
