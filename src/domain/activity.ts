import type { Database, Json } from "@/types/database.generated";

type ActivityKind = Database["public"]["Enums"]["activity_kind"];

function payloadText(payload: Json, key: string) {
  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return null;
  }
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function groupActivityLabel(
  kind: ActivityKind,
  payload: Json,
  topicNameById: ReadonlyMap<string, string> = new Map(),
) {
  switch (kind) {
    case "achievement_earned": {
      const name = payloadText(payload, "name");
      return name
        ? `earned the “${name}” achievement`
        : "earned an achievement";
    }
    case "group_joined":
      return "joined the group";
    case "played_today":
      return "played today";
    case "mastery_tier_up": {
      const tier = payloadText(payload, "tier");
      const topicName =
        payloadText(payload, "topic_name") ??
        topicNameById.get(payloadText(payload, "topic_id") ?? "");
      if (tier && topicName)
        return `advanced to ${tier} mastery in ${topicName}`;
      if (tier) return `advanced to ${tier} mastery`;
      if (topicName) return `advanced a mastery tier in ${topicName}`;
      return "advanced a mastery tier";
    }
    case "pack_unlocked":
      return "unlocked a question pack";
  }
}

export function groupActivityDetail(
  kind: ActivityKind,
  payload: Json,
  achievementDescriptionById: ReadonlyMap<string, string> = new Map(),
) {
  if (kind !== "achievement_earned") return null;

  return (
    payloadText(payload, "description") ??
    achievementDescriptionById.get(
      payloadText(payload, "achievement_id") ?? "",
    ) ??
    null
  );
}
