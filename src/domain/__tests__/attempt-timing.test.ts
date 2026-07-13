import { describe, expect, it } from "vitest";
import { resolveAttemptTiming } from "../attempt-timing";

describe("attempt timing", () => {
  it("never expires an assessment presentation", () => {
    expect(
      resolveAttemptTiming({
        now: 300_000,
        startedAt: 0,
        expiresAt: 30_000,
        timeLimitSeconds: 30,
        clientTimedOut: true,
        untimed: true,
      }),
    ).toEqual({ elapsedMs: 300_000, expired: false, remainingRatio: 1 });
  });

  it("still expires timed gameplay", () => {
    expect(
      resolveAttemptTiming({
        now: 30_001,
        startedAt: 0,
        expiresAt: 30_000,
        timeLimitSeconds: 30,
        clientTimedOut: false,
        untimed: false,
      }),
    ).toEqual({ elapsedMs: 30_001, expired: true, remainingRatio: 0 });
  });
});
