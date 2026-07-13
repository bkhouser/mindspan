export const DEFAULT_TIMER_SECONDS = 30;
export const MIN_TIMER_SECONDS = 10;
export const MAX_TIMER_SECONDS = 120;

const MIN_QUESTION_TIMER_SECONDS = 5;
const MAX_QUESTION_TIMER_SECONDS = 360;

export function scaleQuestionTimer(
  authoredSeconds: number,
  configuredSeconds: number,
) {
  return Math.max(
    MIN_QUESTION_TIMER_SECONDS,
    Math.min(
      MAX_QUESTION_TIMER_SECONDS,
      Math.round((authoredSeconds * configuredSeconds) / DEFAULT_TIMER_SECONDS),
    ),
  );
}

export function remainingScoringRatio(
  elapsedMs: number,
  scoringTimerSeconds: number,
) {
  return Math.max(0, Math.min(1, 1 - elapsedMs / (scoringTimerSeconds * 1000)));
}
