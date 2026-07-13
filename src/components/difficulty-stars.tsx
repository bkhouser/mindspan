import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface DifficultyStarsProps {
  difficulty: number;
  className?: string;
  label?: string;
  size?: number;
}

export function DifficultyStars({
  difficulty,
  className,
  label,
  size = 15,
}: DifficultyStarsProps) {
  const value = Math.max(0, Math.min(5, Math.round(difficulty)));
  const accessibleLabel = label ?? `Difficulty ${value} out of 5`;
  return (
    <span
      aria-label={accessibleLabel}
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      title={accessibleLabel}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          aria-hidden="true"
          className={
            star <= value ? "fill-amber-300 text-amber-300" : "text-white/20"
          }
          key={star}
          size={size}
        />
      ))}
    </span>
  );
}
