"use client";

import {
  Award,
  BookOpenCheck,
  Brain,
  ChevronDown,
  CircleUserRound,
  FileQuestion,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Package,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { FeedbackNavLink } from "@/components/feedback-nav-link";
import { DISPLAY_VERSION } from "@/lib/app-version";

const links = [
  { href: "/home", label: "Home", icon: LayoutDashboard },
  { href: "/play", label: "Play", icon: Brain },
  { href: "/review", label: "Review", icon: BookOpenCheck },
  { href: "/packs", label: "Packs", icon: Package },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/achievements", label: "Achievements", icon: Award },
  { href: "/profile", label: "Profile", icon: CircleUserRound },
  { href: "/account", label: "Account", icon: KeyRound },
  { href: "/updates", label: "Updates", icon: Megaphone },
];

const adminNavStorageKey = "mindspan-admin-nav-expanded";

function adminNavWasExpanded() {
  try {
    return window.localStorage.getItem(adminNavStorageKey) === "true";
  } catch {
    return false;
  }
}

function rememberAdminNav(open: boolean) {
  try {
    window.localStorage.setItem(adminNavStorageKey, String(open));
  } catch {
    // Navigation must remain usable when a browser blocks local storage.
  }
}

function isActive(pathname: string, href: string) {
  if (href === "/admin/question-quality") {
    return (
      pathname.startsWith("/admin/question-quality") ||
      pathname.startsWith("/admin/question-index")
    );
  }
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({
  canReviewQuestions,
  isAdmin,
}: {
  canReviewQuestions: boolean;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const adminDetails = useRef<HTMLDetailsElement>(null);
  const hasAdminMenu = canReviewQuestions || isAdmin;

  useEffect(() => {
    if (!adminDetails.current) return;
    if (
      pathname.startsWith("/admin") ||
      adminNavWasExpanded()
    ) {
      adminDetails.current.open = true;
    }
  }, [pathname]);

  const adminLinks = [
    ...(isAdmin
      ? [{ href: "/admin", label: "Overview", icon: LayoutDashboard }]
      : []),
    ...(canReviewQuestions
      ? [
          {
            href: "/admin/question-quality",
            label: "Question Quality",
            icon: ListChecks,
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            href: "/admin/questions",
            label: "Questions",
            icon: FileQuestion,
          },
        ]
      : []),
  ];

  return (
    <aside className="border-b border-white/10 bg-slate-950/45 px-4 py-3 backdrop-blur lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r lg:px-5 lg:py-8">
      <Link
        className="hidden px-3 text-2xl font-black tracking-tight lg:block"
        href="/home"
      >
        Mindspan
      </Link>
      <nav
        className="flex gap-1 overflow-x-auto lg:mt-10 lg:flex-1 lg:flex-col"
        aria-label="App navigation"
      >
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            aria-current={isActive(pathname, href) ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-bold hover:text-white ${
              isActive(pathname, href)
                ? "bg-white/10 text-white"
                : "text-slate-300 hover:bg-white/5"
            }`}
            href={href}
            key={href}
          >
            <Icon size={19} />
            {label}
          </Link>
        ))}
        <FeedbackNavLink />
        {hasAdminMenu ? (
          <details
            className="group shrink-0"
            onToggle={(event) => rememberAdminNav(event.currentTarget.open)}
            open={pathname.startsWith("/admin") || undefined}
            ref={adminDetails}
          >
            <summary
              className={`flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-2xl px-3 py-2 text-sm font-bold transition hover:bg-white/5 [&::-webkit-details-marker]:hidden ${
                pathname.startsWith("/admin")
                  ? "bg-white/10 text-white"
                  : isAdmin
                    ? "text-amber-200"
                    : "text-sky-200"
              }`}
            >
              <Shield aria-hidden="true" size={19} />
              Admin
              <ChevronDown
                aria-hidden="true"
                className="ml-auto transition group-open:rotate-180"
                size={15}
              />
            </summary>
            <div className="mt-1 flex gap-1 rounded-2xl bg-black/15 p-1 lg:ml-4 lg:flex-col lg:bg-transparent lg:p-0">
              {adminLinks.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                      active
                        ? "bg-[var(--brand)]/15 text-[var(--brand)]"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                    href={href}
                    key={href}
                  >
                    <Icon aria-hidden="true" size={16} />
                    {label}
                  </Link>
                );
              })}
            </div>
          </details>
        ) : null}
      </nav>
      <p className="hidden px-3 pt-5 text-xs font-bold text-[var(--muted)] lg:block">
        Mindspan {DISPLAY_VERSION}
      </p>
    </aside>
  );
}
