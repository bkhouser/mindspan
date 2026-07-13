import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssessmentGame } from "./assessment-game";

describe("AssessmentGame", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("starts an untimed assessment and submits typed answers with Enter", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "run-1", response_count: 0 }), {
          status: 201,
        }),
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
            startingPoints: 0,
            expiresAt: new Date(Date.now() + 30_000).toISOString(),
            mediaLoadDeadline: null,
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
            details: "",
            source: { label: "Source", url: "https://example.com" },
            earnedPoints: 0,
            achievements: [],
            insightBalance: 0,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "presentation-2",
            prompt: "Which planet is the largest in the solar system?",
            topic: {
              id: "topic-1",
              slug: "science-nature",
              name: "Science & Nature",
            },
            difficulty: 4,
            media: null,
            timeLimitSeconds: 30,
            startingPoints: 0,
            expiresAt: new Date(Date.now() + 30_000).toISOString(),
            mediaLoadDeadline: null,
          }),
          { status: 200 },
        ),
      );

    render(<AssessmentGame />);
    const begin = screen.getByRole("button", { name: "Begin assessment" });
    await userEvent.click(begin);

    expect(
      await screen.findByText("What is the chemical symbol for gold?"),
    ).toBeVisible();
    expect(
      screen.getByRole("img", { name: "Difficulty 3 out of 5" }),
    ).toBeVisible();
    expect(screen.getByText("Untimed")).toBeVisible();
    await userEvent.type(
      screen.getByPlaceholderText("Type your answer"),
      "Au{Enter}",
    );
    expect(await screen.findByText("Correct")).toBeVisible();
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/assessments",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/assessments/run-1/next",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/play/presentations/presentation-1/answer",
      expect.objectContaining({
        body: expect.stringContaining('"timedOut":false'),
      }),
    );

    await userEvent.keyboard("{Enter}");
    expect(
      await screen.findByText(
        "Which planet is the largest in the solar system?",
      ),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/assessments/run-1/next",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("submits a choice as soon as it is selected when enabled", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "run-1", response_count: 0 }), {
          status: 201,
        }),
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
            startingPoints: 0,
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
            assistancePenalty: 0.5,
            revisedPointCeiling: 0,
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
            details: "",
            source: { label: "Source", url: "https://example.com" },
            earnedPoints: 0,
            achievements: [],
            insightBalance: 0,
          }),
          { status: 200 },
        ),
      );

    render(<AssessmentGame immediateChoiceSubmit />);
    await userEvent.click(
      screen.getByRole("button", { name: "Begin assessment" }),
    );
    await screen.findByText("What is the chemical symbol for gold?");
    await userEvent.click(screen.getByRole("button", { name: "Show choices" }));
    await userEvent.click(await screen.findByRole("button", { name: "Au" }));

    expect(await screen.findByText("Correct")).toBeVisible();
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/play/presentations/presentation-1/answer",
      expect.objectContaining({ body: expect.stringContaining('"answer":"Au"') }),
    );
  });
});
