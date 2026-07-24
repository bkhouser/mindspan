import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_TIMER_SECONDS } from "@/domain/timer-rules";
import {
  ApiError,
  apiContext,
  assertNewPlayWorkAllowed,
  errorResponse,
} from "@/lib/api";

const schema = z
  .object({
    mode: z.enum(["mixed", "topic", "pack"]),
    topicId: z.string().uuid().optional(),
    packId: z.string().uuid().optional(),
    groupId: z.string().uuid().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "topic" && !value.topicId)
      ctx.addIssue({ code: "custom", message: "topicId is required" });
    if (value.mode === "pack" && !value.packId)
      ctx.addIssue({ code: "custom", message: "packId is required" });
  });

export async function POST(request: Request) {
  try {
    const { user, supabase, admin } = await apiContext();
    await assertNewPlayWorkAllowed(admin);
    const input = schema.parse(await request.json());
    const { data: settings } = await admin
      .from("system_settings")
      .select("default_timer_seconds")
      .eq("id", true)
      .maybeSingle();
    const globalTimer =
      settings?.default_timer_seconds ?? DEFAULT_TIMER_SECONDS;
    let effectiveTimer = globalTimer;
    if (input.groupId) {
      const { data: membership } = await admin
        .from("group_memberships")
        .select("group_id")
        .eq("group_id", input.groupId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!membership) throw new ApiError("GROUP_ACCESS_DENIED", 403);
      const { data: group } = await admin
        .from("groups")
        .select("timer_seconds_override")
        .eq("id", input.groupId)
        .single();
      effectiveTimer = group?.timer_seconds_override ?? globalTimer;
    }
    const { data, error } = await supabase
      .from("play_sessions")
      .insert({
        user_id: user.id,
        mode: input.mode,
        topic_id: input.topicId ?? null,
        pack_id: input.packId ?? null,
        group_id: input.groupId ?? null,
        timer_limit_seconds: effectiveTimer,
        scoring_timer_seconds: globalTimer,
      })
      .select("id,mode,started_at")
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
