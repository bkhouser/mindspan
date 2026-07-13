import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export function Button({ className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn("inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--brand)] px-5 py-2.5 font-black text-slate-950 transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-50", className)} type={type} {...props} />;
}
