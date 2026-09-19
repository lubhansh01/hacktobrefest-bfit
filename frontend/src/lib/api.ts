/**
 * Base URL for the mail API, which is deployed separately from this app.
 *
 * Empty in dev: Vite proxies /api/* to the backend (see vite.config.ts), so the
 * same relative paths work locally and in production, where VITE_API_URL points
 * at the deployed API origin.
 */
const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export const api = (path: string) => `${BASE}${path}`;
