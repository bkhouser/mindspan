"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

function legacyCopy(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard copy was rejected");
}

export function CopyButton({ value }: { value: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else legacyCopy(value);
      setStatus("copied");
    } catch {
      try {
        legacyCopy(value);
        setStatus("copied");
      } catch {
        setStatus("failed");
      }
    }

    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setStatus("idle"), 2_000);
  }

  const label = status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : "Copy invitation link";
  return (
    <button
      aria-label={label}
      aria-live="polite"
      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-black text-[var(--brand)] hover:bg-white/5"
      onClick={copy}
      type="button"
    >
      {status === "copied" ? <Check aria-hidden="true" size={18} /> : <Copy aria-hidden="true" size={18} />}
      <span aria-hidden="true" className="hidden sm:inline">{label}</span>
    </button>
  );
}
