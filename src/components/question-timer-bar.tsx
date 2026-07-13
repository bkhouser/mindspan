interface QuestionTimerBarProps {
  decorative?: boolean;
  ratio: number;
}

export function QuestionTimerBar({
  decorative = false,
  ratio,
}: QuestionTimerBarProps) {
  const percentage = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  const color =
    percentage <= 20
      ? "bg-[var(--danger)]"
      : percentage <= 40
        ? "bg-[var(--accent)]"
        : "bg-[var(--brand)]";

  return (
    <div
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : "Time remaining"}
      aria-valuemax={decorative ? undefined : 100}
      aria-valuemin={decorative ? undefined : 0}
      aria-valuenow={decorative ? undefined : percentage}
      className="h-3 overflow-hidden rounded-full border border-white/10 bg-white/10 shadow-inner"
      data-testid="question-timer-bar"
      role={decorative ? undefined : "progressbar"}
    >
      <div
        className={`h-full rounded-full shadow-[0_0_12px_currentColor] transition-[width,background-color] duration-100 ${color}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
