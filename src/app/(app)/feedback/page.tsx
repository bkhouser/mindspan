import { CheckCircle2, MessageSquareWarning } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { FeedbackForm } from "./feedback-form";

function safeSourcePage(value: string | undefined) {
  return value?.startsWith("/") && value.length <= 500 ? value : "/feedback";
}

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; submitted?: string }>;
}) {
  await requireUser();
  const query = await searchParams;
  const sourcePage = safeSourcePage(query.from);

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <p className="text-sm font-black uppercase tracking-[.2em] text-[var(--brand)]">
          Private beta
        </p>
        <h1 className="mt-2 text-4xl font-black">Send feedback</h1>
        <p className="mt-3 max-w-2xl leading-7 text-[var(--muted)]">
          Found a problem or have an idea? Tell us what happened. Your report
          goes directly to the Mindspan system administrator.
        </p>
      </header>
      {query.submitted === "1" ? (
        <Card
          className="mt-7 border-emerald-300/30 bg-emerald-300/10 p-5"
          role="status"
        >
          <div className="flex gap-3">
            <CheckCircle2
              className="mt-0.5 shrink-0 text-emerald-200"
              aria-hidden="true"
            />
            <div>
              <h2 className="font-black">Thanks—your feedback was sent.</h2>
              <p className="mt-1 text-sm text-emerald-50/80">
                You can submit another report whenever you spot something else.
              </p>
              {sourcePage !== "/feedback" ? (
                <Link
                  className="mt-3 inline-block text-sm font-black text-emerald-100 underline underline-offset-4"
                  href={sourcePage}
                >
                  Return to the previous page
                </Link>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}
      <Card className="mt-7 p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <MessageSquareWarning
            className="text-[var(--brand)]"
            aria-hidden="true"
          />
          <div>
            <h2 className="text-xl font-black">Issue report</h2>
            <p className="text-sm text-[var(--muted)]">
              Reporting from {sourcePage}
            </p>
          </div>
        </div>
        <FeedbackForm sourcePage={sourcePage} />
      </Card>
    </div>
  );
}
