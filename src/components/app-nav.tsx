import {
  Award,
  BookOpenCheck,
  Brain,
  CircleUserRound,
  LayoutDashboard,
  Package,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";

const links = [
  { href: "/home", label: "Home", icon: LayoutDashboard },
  { href: "/play", label: "Play", icon: Brain },
  { href: "/review", label: "Review", icon: BookOpenCheck },
  { href: "/packs", label: "Packs", icon: Package },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/achievements", label: "Achievements", icon: Award },
  { href: "/profile", label: "Profile", icon: CircleUserRound },
];

export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  return (
    <aside className="border-b border-white/10 bg-slate-950/45 px-4 py-3 backdrop-blur lg:fixed lg:inset-y-0 lg:w-64 lg:border-b-0 lg:border-r lg:px-5 lg:py-8">
      <Link
        className="hidden px-3 text-2xl font-black tracking-tight lg:block"
        href="/home"
      >
        Mindspan
      </Link>
      <nav
        className="flex gap-1 overflow-x-auto lg:mt-10 lg:flex-col"
        aria-label="App navigation"
      >
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            className="inline-flex min-h-11 shrink-0 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-bold text-slate-300 hover:bg-white/5 hover:text-white"
            href={href}
            key={href}
          >
            <Icon size={19} />
            {label}
          </Link>
        ))}
        {isAdmin ? (
          <Link
            className="inline-flex min-h-11 shrink-0 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-bold text-amber-200 hover:bg-white/5"
            href="/admin"
          >
            <Shield size={19} />
            Admin
          </Link>
        ) : null}
      </nav>
    </aside>
  );
}
