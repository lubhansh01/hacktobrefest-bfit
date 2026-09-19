/**
 * Self-check for the event clock. Run with: npx tsx src/lib/event.check.ts
 *
 * The hero countdown froze at 00:00:00:00 once before, when the stored date had
 * already passed. These asserts pin the three phases so that cannot regress.
 */
import assert from "node:assert/strict";
import { EVENT_START, EVENT_END, EVENT_DATES, eventPhase } from "./event.js";

const DAY = 86_400_000;

// Start is 24 Oct 2026, 09:00 IST; end is 25 Oct 2026, 18:00 IST.
assert.equal(EVENT_START.toISOString(), "2026-10-24T03:30:00.000Z");
assert.equal(EVENT_END.toISOString(), "2026-10-25T12:30:00.000Z");
assert.ok(EVENT_END > EVENT_START, "event must end after it starts");
assert.match(EVENT_DATES, /24.*25 October 2026/);

// Phase boundaries.
assert.equal(eventPhase(EVENT_START.getTime() - DAY), "upcoming");
assert.equal(eventPhase(EVENT_START.getTime() - 1), "upcoming");
assert.equal(eventPhase(EVENT_START.getTime()), "live", "start instant is live");
assert.equal(eventPhase(EVENT_END.getTime() - 1), "live");
assert.equal(eventPhase(EVENT_END.getTime()), "concluded", "end instant is over");
assert.equal(eventPhase(EVENT_END.getTime() + DAY), "concluded");

// The countdown must never render a negative or frozen-zero clock: once the
// start passes we are in a non-"upcoming" phase, so the digits aren't shown.
for (const t of [EVENT_START.getTime() + 1, EVENT_END.getTime() + DAY * 365]) {
  assert.notEqual(eventPhase(t), "upcoming");
}

console.log("event clock OK —", EVENT_DATES, "| phase today:", eventPhase());
