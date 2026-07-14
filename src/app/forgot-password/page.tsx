import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ResetRequestForm } from "./reset-request-form";

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <Card className="w-full max-w-md p-7 sm:p-9">
        <Link className="text-xl font-black" href="/">Mindspan</Link>
        <h1 className="mt-8 text-3xl font-black">Reset your password</h1>
        <p className="mt-3 leading-7 text-[var(--muted)]">We’ll email a secure link that lets you choose a new password.</p>
        <ResetRequestForm />
        <Link className="mt-6 inline-block text-sm font-bold text-[var(--brand)] hover:underline" href="/login">Back to sign in</Link>
      </Card>
    </main>
  );
}
