/**
 * Single source of truth for the event dates.
 *
 * These strings were previously duplicated across the landing page, the footer
 * and the registration page, so a date change meant hunting every copy. Change
 * the two Date values here and every surface follows.
 */
export const EVENT_START = new Date("2026-10-24T09:00:00+05:30");
export const EVENT_END = new Date("2026-10-25T18:00:00+05:30");

/** "24–25 October 2026" — the range as shown in body copy. */
export const EVENT_DATES = "24–25 October 2026";

/** "24 October 2026 at 09:00 IST" — used for the accessible deadline text. */
export const EVENT_START_LABEL = "24 October 2026 at 09:00 IST";

/** "25 October 2026, 18:00 IST" — when demos wrap. */
export const EVENT_END_LABEL = "25 October 2026, 18:00 IST";

export type EventPhase = "upcoming" | "live" | "concluded";

/** Which side of the event we are on, for the hero countdown. */
export function eventPhase(now: number = Date.now()): EventPhase {
  if (now < EVENT_START.getTime()) return "upcoming";
  if (now < EVENT_END.getTime()) return "live";
  return "concluded";
}
