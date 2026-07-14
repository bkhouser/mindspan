"use client";

import { MessageSquareWarning } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navClassName =
  "inline-flex min-h-11 shrink-0 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-bold text-slate-300 hover:bg-white/5 hover:text-white";

export function FeedbackNavLink() {
  const pathname = usePathname();
  const href = `/feedback?from=${encodeURIComponent(pathname)}`;

  return (
    <Link className={navClassName} href={href}>
      <MessageSquareWarning aria-hidden="true" size={19} />
      Feedback
    </Link>
  );
}
