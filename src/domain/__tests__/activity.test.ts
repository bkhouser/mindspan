import { describe, expect, it } from "vitest";
import {
  groupActivityDetail,
  groupActivityLabel,
} from "@/domain/activity";

describe("groupActivityLabel", () => {
  it("includes the specific achievement name", () => {
    expect(
      groupActivityLabel("achievement_earned", {
        achievement_id: "achievement-id",
        name: "Curious Mind",
      }),
    ).toBe("earned the “Curious Mind” achievement");
  });

  it("handles legacy achievement events without a stored name", () => {
    expect(
      groupActivityLabel("achievement_earned", {
        achievement_id: "achievement-id",
      }),
    ).toBe("earned an achievement");
  });

  it("resolves achievement detail for existing activity events", () => {
    expect(
      groupActivityDetail(
        "achievement_earned",
        { achievement_id: "achievement-id", name: "Curious Mind" },
        new Map([
          ["achievement-id", "Answer questions in five different topics."],
        ]),
      ),
    ).toBe("Answer questions in five different topics.");
  });

  it("supports achievement descriptions stored directly on newer events", () => {
    expect(
      groupActivityDetail("achievement_earned", {
        achievement_id: "achievement-id",
        description: "Complete your first ten questions.",
      }),
    ).toBe("Complete your first ten questions.");
  });

  it("does not add detail to unrelated activity", () => {
    expect(groupActivityDetail("played_today", {})).toBeNull();
  });

  it("includes the topic in a mastery-tier activity", () => {
    expect(
      groupActivityLabel(
        "mastery_tier_up",
        { tier: "developing", topic_id: "science" },
        new Map([["science", "Science & Nature"]]),
      ),
    ).toBe("advanced to developing mastery in Science & Nature");
  });

  it("preserves a useful fallback for legacy mastery activity", () => {
    expect(groupActivityLabel("mastery_tier_up", { tier: "developing" })).toBe(
      "advanced to developing mastery",
    );
  });
});
