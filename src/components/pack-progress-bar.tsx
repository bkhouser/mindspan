type PackProgressBarProps = {
  answered: number;
  correct: number;
  total: number;
};

export function PackProgressBar({
  answered,
  correct,
  total,
}: PackProgressBarProps) {
  const safeTotal = Math.max(0, total);
  const safeAnswered = Math.min(safeTotal, Math.max(0, answered));
  const safeCorrect = Math.min(safeAnswered, Math.max(0, correct));
  const answeredWidth = safeTotal ? (safeAnswered / safeTotal) * 100 : 0;
  const correctWidth = safeTotal ? (safeCorrect / safeTotal) * 100 : 0;

  return (
    <div className="min-w-64">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-black">
        <span className="whitespace-nowrap text-emerald-200">
          {safeCorrect} correct
        </span>
        <span className="whitespace-nowrap text-sky-200">
          {safeAnswered} answered
        </span>
        <span className="whitespace-nowrap text-[var(--muted)]">
          {safeTotal} total
        </span>
      </div>
      <div
        aria-label={`${safeCorrect} correct, ${safeAnswered} answered, ${safeTotal} total questions`}
        className="relative h-3 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-inset ring-white/10"
        role="img"
      >
        <span
          className="absolute inset-y-0 left-0 bg-sky-300/75"
          data-testid="answered-progress"
          style={{ width: `${answeredWidth}%` }}
          title={`${safeAnswered} answered`}
        />
        <span
          className="absolute inset-y-0 left-0 bg-emerald-300"
          data-testid="correct-progress"
          style={{ width: `${correctWidth}%` }}
          title={`${safeCorrect} correct`}
        />
      </div>
    </div>
  );
}
