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

  it("uses a bounded browser submission time to absorb request transit", () => {
    const result = resolveAttemptTiming({
      now: 30_600,
      startedAt: 0,
      expiresAt: 30_000,
      timeLimitSeconds: 30,
      clientTimedOut: false,
      clientElapsedMs: 29_400,
      untimed: false,
    });

    expect(result).toMatchObject({ elapsedMs: 29_400, expired: false });
    expect(result.remainingRatio).toBeCloseTo(0.02);
  });

  it("caps a forged browser submission time to two seconds of grace", () => {
    expect(
      resolveAttemptTiming({
        now: 20_000,
        startedAt: 0,
        expiresAt: 30_000,
        timeLimitSeconds: 30,
        clientTimedOut: false,
        clientElapsedMs: 1,
        untimed: false,
      }),
    ).toEqual({ elapsedMs: 18_000, expired: false, remainingRatio: 0.4 });
  });
});
