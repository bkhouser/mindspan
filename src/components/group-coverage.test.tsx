import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { TopicMastery } from "@/domain/types";
import { GroupCoverage } from "./group-coverage";

afterEach(cleanup);

function mastery(topicId: string, proficiency: number): TopicMastery {
  return {
    topicId,
    proficiency,
    rankScore: 0.5,
    accuracy: proficiency,
    assistedRate: 0,
    weightedSuccesses: 3,
    weightedEvidence: 5,
    uniqueQuestions: 6,
    tier: "proficient",
  };
}

describe("GroupCoverage heatmap", () => {
  it("shows explicit percentages in equal-size cells and distinguishes unplayed topics", () => {
    render(
      <GroupCoverage
        members={[
          { id: "1", name: "Alex", mastery: [mastery("science", 0.67)] },
          { id: "2", name: "Blair", mastery: [] },
          { id: "3", name: "Casey", mastery: [] },
          { id: "4", name: "Drew", mastery: [] },
        ]}
        topics={[
          { id: "science", name: "Science & Nature" },
          { id: "history", name: "History" },
        ]}
      />,
    );

    expect(screen.getByText("67%")).toBeVisible();
    expect(
      screen.getByLabelText("Alex, Science & Nature: 67 percent correct"),
    ).toHaveClass("h-11");
    expect(
      screen.getByLabelText("Alex, History: not played"),
    ).toHaveTextContent("—");
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
  });

  it("uses the heatmap and concise coverage summary for small groups too", () => {
    render(
      <GroupCoverage
        members={[
          {
            id: "1",
            name: "Alex",
            mastery: [mastery("science", 0.8), mastery("history", 0.7)],
          },
          {
            id: "2",
            name: "Blair",
            mastery: [mastery("science", 0.6)],
          },
        ]}
        topics={[
          { id: "science", name: "Science & Nature" },
          { id: "history", name: "History" },
          { id: "sports", name: "Sports" },
        ]}
      />,
    );

    expect(
      screen.getByLabelText("Alex, Science & Nature: 80 percent correct"),
    ).toBeVisible();
    expect(screen.getByText("Best covered")).toBeVisible();
    expect(screen.getByText(/2 strong members:/)).toBeVisible();
    expect(screen.getByText("History", { selector: "b" })).toBeVisible();
    expect(screen.getByText("Sports", { selector: "p" })).toBeVisible();
  });
});
