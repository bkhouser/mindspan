import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlayGame } from "./play-game";

describe("PlayGame choice submission", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("submits a revealed choice immediately when the player enables it", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "session-1" }), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "presentation-1",
            prompt: "What is the chemical symbol for gold?",
            topic: {
              id: "topic-1",
              slug: "science-nature",
              name: "Science & Nature",
            },
            difficulty: 3,
            media: null,
            timeLimitSeconds: 30,
            scoringTimeLimitSeconds: 30,
            startingPoints: 300,
            expiresAt: new Date(Date.now() + 30_000).toISOString(),
            mediaLoadDeadline: null,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              { id: "choice-1", text: "Ag" },
              { id: "choice-2", text: "Au" },
              { id: "choice-3", text: "Fe" },
              { id: "choice-4", text: "Pb" },
            ],
            assistance: "show_choices",
            pointFactor: 0.5,
            revisedPointCeiling: 150,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            correct: true,
            canonicalAnswer: "Au",
            explanation: "Au comes from the Latin aurum.",
            details: "Gold is a chemical element.",
            source: { label: "Source", url: "https://example.com" },
            earnedPoints: 120,
            topicMastery: {
              topicId: "topic-1",
              proficiency: 0.6,
              rankScore: null,
              accuracy: 1,
              assistedRate: 1,
              weightedSuccesses: 0.6,
              weightedEvidence: 1,
              uniqueQuestions: 1,
              tier: "unrated",
            },
            subtopicMastery: [],
            achievements: [],
            insightBalance: 0,
          }),
          { status: 200 },
        ),
      );

    render(
      <PlayGame
        globalTimerSeconds={30}
        groups={[]}
        immediateChoiceSubmit
        initialMode="mixed"
        packs={[]}
        topics={[]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Start playing" }));
    await screen.findByText("What is the chemical symbol for gold?");
    await userEvent.click(screen.getByRole("button", { name: "Show choices" }));
    await userEvent.click(await screen.findByRole("button", { name: "Au" }));

    expect(await screen.findByText("That’s right")).toBeVisible();
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/play/presentations/presentation-1/answer",
      expect.objectContaining({ body: expect.stringContaining('"answer":"Au"') }),
    );
  });
});
