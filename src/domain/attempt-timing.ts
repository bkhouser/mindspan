export interface AttemptTimingInput {
  now: number;
  startedAt: number;
  expiresAt: number;
  timeLimitSeconds: number;
  clientTimedOut: boolean;
  untimed: boolean;
}

export function resolveAttemptTiming(input: AttemptTimingInput) {
  const elapsedMs = Math.min(
    2_147_483_647,
    Math.max(0, input.now - input.startedAt),
  );
  if (input.untimed) return { elapsedMs, expired: false, remainingRatio: 1 };

  const expired = input.now >= input.expiresAt || input.clientTimedOut;
  const remainingRatio = expired
    ? 0
    : Math.max(0, Math.min(1, 1 - elapsedMs / (input.timeLimitSeconds * 1000)));
  return { elapsedMs, expired, remainingRatio };
}
