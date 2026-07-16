export interface AttemptTimingInput {
  now: number;
  startedAt: number;
  expiresAt: number;
  timeLimitSeconds: number;
  clientTimedOut: boolean;
  clientElapsedMs?: number;
  untimed: boolean;
}

// Browser timing is advisory. This absorbs ordinary request transit without
// allowing a client to move an answer arbitrarily far back in time.
export const MAX_SUBMISSION_TRANSIT_GRACE_MS = 2_000;

export function resolveAttemptTiming(input: AttemptTimingInput) {
  const serverElapsedMs = Math.min(
    2_147_483_647,
    Math.max(0, input.now - input.startedAt),
  );
  if (input.untimed)
    return { elapsedMs: serverElapsedMs, expired: false, remainingRatio: 1 };

  const claimedElapsedMs = Number.isFinite(input.clientElapsedMs)
    ? Math.max(0, Math.min(serverElapsedMs, input.clientElapsedMs!))
    : serverElapsedMs;
  const elapsedMs = Math.max(
    serverElapsedMs - MAX_SUBMISSION_TRANSIT_GRACE_MS,
    claimedElapsedMs,
  );

  const expired =
    input.clientTimedOut || input.startedAt + elapsedMs >= input.expiresAt;
  const remainingRatio = expired
    ? 0
    : Math.max(0, Math.min(1, 1 - elapsedMs / (input.timeLimitSeconds * 1000)));
  return { elapsedMs, expired, remainingRatio };
}
