import { Card } from "@/components/ui/card";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export default function NoAccessPage() {
  return <main className="grid min-h-screen place-items-center px-6"><Card className="max-w-lg p-8 text-center"><h1 className="text-3xl font-black">An invitation is required</h1><p className="mt-4 leading-7 text-[var(--muted)]">This private beta account has not been granted access. Ask a Mindspan system or group administrator for a current invitation link.</p><form action={signOut} className="mt-7"><Button type="submit">Sign out</Button></form></Card></main>;
}
