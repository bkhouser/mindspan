import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const startedAt = performance.now();
  try {
    const { error } = await createAdminClient().from("topics").select("id", { head: true, count: "exact" });
    if (error) throw error;
    return NextResponse.json({ status: "ok", database: "reachable", latencyMs: Math.round(performance.now() - startedAt) });
  } catch {
    return NextResponse.json({ status: "degraded", database: "unreachable" }, { status: 503 });
  }
}
