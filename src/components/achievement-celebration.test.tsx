import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { markAchievementsNotified } from "@/app/(app)/actions";
import { AchievementCelebration } from "./achievement-celebration";

vi.mock("@/app/(app)/actions", () => ({
  markAchievementsNotified: vi.fn().mockResolvedValue(undefined),
}));

describe("AchievementCelebration", () => {
  beforeEach(() => vi.mocked(markAchievementsNotified).mockClear());

  it("announces an award and acknowledges it once dismissed", async () => {
    render(
      <AchievementCelebration
        achievements={[
          {
            slug: "curious-mind",
            name: "Curious Mind",
            description: "Attempt questions in five topics.",
            insightAwarded: 50,
          },
        ]}
      />,
    );

    expect(screen.getByText("Achievement unlocked")).toBeVisible();
    expect(screen.getByText("Curious Mind")).toBeVisible();
    expect(screen.getByText("+50 Insight")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Nice!" }));
    await waitFor(() =>
      expect(
        screen.queryByText("Achievement unlocked"),
      ).not.toBeInTheDocument(),
    );
    expect(markAchievementsNotified).toHaveBeenCalledWith(["curious-mind"]);
  });
});
