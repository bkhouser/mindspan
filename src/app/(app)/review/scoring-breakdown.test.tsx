import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ScoringBreakdown } from "./page";

const snapshot = {
  algorithmVersion: "mindspan-score-v1",
  basePoints: 400,
  proficiency: 0.6,
  proficiencyFactor: 0.8,
  priorAttemptCount: 3,
  priorCorrectCount: 2,
  repeatFactor: 0.2,
  assistanceFactor: 1,
  remainingRatio: 0.5,
  timeFactor: 0.625,
  startingPoints: 64,
};

describe("ScoringBreakdown", () => {
  afterEach(cleanup);

  it("shows every scoring factor and prior question history by default", () => {
    render(<ScoringBreakdown correct earnedPoints={40} snapshot={snapshot} />);

    expect(
      screen.getByText("40 points earned").closest("details"),
    ).toHaveAttribute("open");
    expect(screen.queryByText(/ceiling/)).not.toBeInTheDocument();
    expect(screen.getByText("Repeat history")).toBeVisible();
    expect(screen.getByText("3 prior attempts / 2 correct")).toBeVisible();
    expect(screen.queryByText(/The point ceiling/)).not.toBeInTheDocument();
  });

  it("keeps older snapshots readable when prior attempt totals were not stored", () => {
    const legacySnapshot = { ...snapshot };
    delete (legacySnapshot as { priorAttemptCount?: number }).priorAttemptCount;
    render(
      <ScoringBreakdown correct earnedPoints={40} snapshot={legacySnapshot} />,
    );

    expect(screen.getByText("Previously correct 2 times")).toBeVisible();
  });

  it("uses the singular point label", () => {
    render(<ScoringBreakdown correct earnedPoints={1} snapshot={snapshot} />);

    expect(screen.getByText("1 point earned")).toBeVisible();
  });
});
