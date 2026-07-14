import { cn } from "@/lib/utils";

export function QuestionPackLabel({
  packNames,
  className,
  testId,
}: {
  packNames: string[];
  className?: string;
  testId?: string;
}) {
  if (!packNames.length) return null;

  return (
    <p
      className={cn(
        "text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]",
        className,
      )}
      data-testid={testId}
    >
      {packNames.length === 1 ? "Question pack" : "Question packs"}
      <span className="normal-case tracking-normal">
        {" "}
        · {packNames.join(", ")}
      </span>
    </p>
  );
}
