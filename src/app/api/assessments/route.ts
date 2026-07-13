import { NextResponse } from "next/server";
import { apiContext, errorResponse } from "@/lib/api";

export async function POST() {
  try {
    const { user, admin } = await apiContext();
    const { data: existing } = await admin.from("assessment_runs").select("id,session_id,response_count,status").eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (existing) return NextResponse.json(existing);
    const { data: session, error: sessionError } = await admin.from("play_sessions").insert({ user_id: user.id, mode: "mixed" }).select("id").single();
    if (sessionError) throw sessionError;
    const { data: run, error } = await admin.from("assessment_runs").insert({ user_id: user.id, session_id: session.id }).select("id,session_id,response_count,status").single();
    if (error) throw error;
    return NextResponse.json(run, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
