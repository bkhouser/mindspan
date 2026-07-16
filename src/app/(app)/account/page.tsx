import { KeyRound, Mail, Megaphone } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { signOut } from "@/app/login/actions";
import { requireUser } from "@/lib/auth";
import { DISPLAY_VERSION } from "@/lib/app-version";
import { SecurityControls } from "./security-controls";

export default async function AccountPage() {
  const { user } = await requireUser();
  const providers = new Set(
    user.identities?.map((identity) => identity.provider) ?? [],
  );
  return (
    <>
      <header>
        <p className="text-sm font-black uppercase tracking-[.2em] text-[var(--brand)]">
          Account
        </p>
        <h1 className="mt-2 text-4xl font-black">Security & sign-in</h1>
        <p className="mt-3 max-w-2xl leading-7 text-[var(--muted)]">
          Manage your Mindspan password and account access.
        </p>
      </header>
      <Card className="my-7 flex flex-wrap items-center gap-4 p-5">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-300/10 text-emerald-200">
          <Mail aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm text-[var(--muted)]">Signed-in email</p>
          <p className="font-black">{user.email}</p>
        </div>
        <div className="ml-auto inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-bold">
          <KeyRound aria-hidden="true" size={16} />
          Email sign-in
        </div>
      </Card>
      <SecurityControls hasPassword={providers.has("email")} />
      <div className="mt-7 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
        <span>Mindspan {DISPLAY_VERSION}</span>
        <span aria-hidden="true">·</span>
        <Link
          className="inline-flex items-center gap-1.5 font-bold text-[var(--brand)] hover:underline"
          href="/updates"
        >
          <Megaphone aria-hidden="true" size={15} />
          View updates
        </Link>
      </div>
      <form action={signOut} className="mt-7">
        <button
          className="text-sm font-bold text-[var(--muted)] hover:text-white"
          type="submit"
        >
          Sign out of Mindspan
        </button>
      </form>
    </>
  );
}
