/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, type User } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in."
  );
}

export const supabase = createClient(url, anonKey);
export type { User };

/** Google sign-in. Supabase uses a redirect, not a popup. */
export async function signInWithGoogle(redirectTo: string = window.location.href) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Display helpers — Google identity lives in user_metadata, not on the user. */
export const displayName = (u: User | null | undefined) =>
  (u?.user_metadata?.full_name as string) || (u?.user_metadata?.name as string) || u?.email || "";
export const photoURL = (u: User | null | undefined) =>
  (u?.user_metadata?.avatar_url as string) || (u?.user_metadata?.picture as string) || "";

/**
 * mentors and event_team are keyed by email (they were email-keyed Firestore
 * docs), but the UI reads `row.id` everywhere. Re-expose email as id.
 */
export const withId = <T extends { email: string }>(rows: T[]): (T & { id: string })[] =>
  rows.map((r) => ({ ...r, id: r.email }));

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

/**
 * Logs a failed query with enough context to debug an RLS rejection,
 * then rethrows.
 */
export function handleDbError(error: unknown, operationType: OperationType, path: string | null): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Supabase error:", JSON.stringify({ error: message, operationType, path }));
  throw error instanceof Error ? error : new Error(message);
}

/** Throws on error, returns rows. Saves a destructure at ~200 call sites. */
export function unwrap<T>(
  res: { data: T | null; error: unknown },
  operationType: OperationType,
  path: string
): T {
  if (res.error) handleDbError(res.error, operationType, path);
  return res.data as T;
}

type SubscribeOptions = {
  /** Column to sort by, applied to the initial fetch and every refetch. */
  orderBy?: { column: string; ascending?: boolean };
  /** Simple equality filter, e.g. { column: "status", value: "approved" }. */
  eq?: { column: string; value: string | number | boolean };
  /** Escape hatch for anything else — receives the query builder, returns it. */
  refine?: (q: any) => any;
};

/**
 * Live view of a table: fetches once, then refetches on any change.
 * Replaces Firestore's onSnapshot. Returns an unsubscribe function.
 *
 * ponytail: refetches the whole table on every change rather than
 * patching rows in place. Fine at this event's data volume (hundreds of
 * teams); switch to applying payload.new/payload.old if it ever isn't.
 */
export function subscribe<T = any>(
  table: string,
  onRows: (rows: T[]) => void,
  options: SubscribeOptions = {},
  onError?: (error: unknown) => void
): () => void {
  let cancelled = false;

  const fetchRows = async () => {
    let q = supabase.from(table).select("*");
    if (options.eq) q = q.eq(options.eq.column, options.eq.value);
    if (options.refine) q = options.refine(q);
    if (options.orderBy) {
      q = q.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
    }
    const { data, error } = await q;
    if (cancelled) return;
    if (error) {
      onError ? onError(error) : handleDbError(error, OperationType.LIST, table);
      return;
    }
    onRows((data ?? []) as T[]);
  };

  fetchRows();

  const channel = supabase
    .channel(`public:${table}:${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table }, fetchRows)
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

/** Live view of a single row by primary key. */
export function subscribeRow<T = any>(
  table: string,
  id: string,
  onRow: (row: T | null) => void,
  idColumn: string = "id"
): () => void {
  let cancelled = false;

  const fetchRow = async () => {
    const { data, error } = await supabase.from(table).select("*").eq(idColumn, id).maybeSingle();
    if (cancelled) return;
    if (error) {
      handleDbError(error, OperationType.GET, `${table}/${id}`);
      return;
    }
    onRow((data ?? null) as T | null);
  };

  fetchRow();

  const channel = supabase
    .channel(`public:${table}:${id}:${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table, filter: `${idColumn}=eq.${id}` }, fetchRow)
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}
