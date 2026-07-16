import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dismissPlayIntroduction } from "./actions";
import { PlayGame } from "./play-game";

vi.mock("./actions", () => ({
  dismissPlayIntroduction: vi.fn().mockResolvedValue({ ok: true }),
}));

describe("PlayGame choice submission", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("starts an unlocked pack directly when opened from the packs page", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "session-pack" }), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "presentation-pack",
            prompt: "A question from the selected pack",
            answerMode: "recall",
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
      );

    render(
      <PlayGame
        autoStart
        immediateChoiceSubmit={false}
        initialMode="pack"
        initialSelectedId="pack-1"
        packs={[{ id: "pack-1", name: "Science Starter" }]}
        showPlayIntro={false}
        standardTimerSeconds={30}
        topics={[]}
      />,
    );

    expect(
      await screen.findByText("A question from the selected pack"),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/play/sessions",
      expect.objectContaining({
        body: JSON.stringify({ mode: "pack", packId: "pack-1" }),
      }),
    );
  });

  it("locks the answer and freezes interaction while submission is pending", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "session-pending" }), {
          status: 201,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "presentation-pending",
            prompt: "What is the capital of France?",
            answerMode: "recall",
            topic: {
              id: "topic-1",
              slug: "geography",
              name: "Geography",
            },
            difficulty: 1,
            media: null,
            timeLimitSeconds: 30,
            scoringTimeLimitSeconds: 30,
            startingPoints: 100,
            expiresAt: new Date(Date.now() + 30_000).toISOString(),
            mediaLoadDeadline: null,
          }),
          { status: 200 },
        ),
      )
      .mockReturnValueOnce(new Promise<Response>(() => undefined));

    render(
      <PlayGame
        immediateChoiceSubmit={false}
        initialMode="mixed"
        packs={[]}
        showPlayIntro={false}
        standardTimerSeconds={30}
        topics={[]}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Start playing" }),
    );
    const input = await screen.findByPlaceholderText("Type your answer");
    await userEvent.type(input, "Paris");
    await userEvent.click(screen.getByRole("button", { name: "Lock in answer" }));

    expect(screen.getByText("Answer locked. Checking it now…")).toBeVisible();
    expect(input).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Checking answer…" }),
    ).toBeDisabled();
    expect(screen.getByText(/Locked at \d+s · \d+ pts/)).toBeVisible();
  });

  it("explains scoring and lets the player turn off the introduction", async () => {
    render(
      <PlayGame
        immediateChoiceSubmit={false}
        initialMode="mixed"
        packs={[]}
        showPlayIntro
        standardTimerSeconds={30}
        topics={[]}
      />,
    );

    expect(screen.getByText("Welcome to Play")).toBeVisible();
    expect(screen.getByText(/novel and difficult questions/i)).toBeVisible();

    await userEvent.click(
      screen.getByRole("button", { name: "Don’t show this again" }),
    );

    expect(screen.queryByText("Welcome to Play")).toBeNull();
    expect(vi.mocked(dismissPlayIntroduction)).toHaveBeenCalledOnce();
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
            submittedAnswer: "Au",
            timedOut: false,
            canonicalAnswer: "Au",
            explanation: "Au comes from the Latin aurum.",
            details: "Gold is a chemical element.",
            source: { label: "Source", url: "https://example.com" },
            packNames: ["Science & Nature Starter"],
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
        immediateChoiceSubmit
        initialMode="mixed"
        packs={[]}
        showPlayIntro={false}
        standardTimerSeconds={30}
        topics={[]}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Start playing" }),
    );
    await screen.findByText("What is the chemical symbol for gold?");
    await userEvent.click(screen.getByRole("button", { name: "Show choices" }));
    await userEvent.click(await screen.findByRole("button", { name: "Au" }));

    expect(await screen.findByText("That’s right")).toBeVisible();
    expect(
      screen.getByRole("img", { name: "Difficulty 3 out of 5" }),
    ).toBeVisible();
    expect(
      screen.getByText("What is the chemical symbol for gold?"),
    ).toBeVisible();
    expect(screen.getByText("Your answer")).toBeVisible();
    expect(screen.getAllByText("Au")).toHaveLength(2);
    expect(screen.getByTestId("question-pack")).toHaveTextContent(
      "Science & Nature Starter",
    );
    expect(screen.getByTestId("question-pack")).not.toHaveTextContent(
      "Question pack",
    );
    expect(
      screen
        .getByTestId("question-pack")
        .compareDocumentPosition(screen.getByText("Correct answer")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByText("Explanation")).toBeNull();
    expect(screen.queryByText("More context")).toBeNull();
    expect(
      screen
        .getByText("Gold is a chemical element.")
        .compareDocumentPosition(screen.getByTestId("topic-proficiency")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Source" })).toBeNull();
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/play/presentations/presentation-1/answer",
      expect.objectContaining({
        body: expect.stringContaining('"answer":"Au"'),
      }),
    );
  });

  it("shows required choices immediately and submits them without a reveal request", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "session-1" }), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "presentation-required",
            prompt: "Which of these is not a planet?",
            answerMode: "required_choice",
            topic: {
              id: "topic-1",
              slug: "science-nature",
              name: "Science & Nature",
            },
            difficulty: 2,
            media: null,
            timeLimitSeconds: 30,
            scoringTimeLimitSeconds: 30,
            startingPoints: 100,
            expiresAt: new Date(Date.now() + 30_000).toISOString(),
            mediaLoadDeadline: null,
            initialChoices: {
              choices: [
                { id: "choice-1", text: "Mars" },
                { id: "choice-2", text: "Venus" },
                { id: "canonical", text: "The Moon" },
                { id: "choice-3", text: "Mercury" },
              ],
              assistance: "required_choices",
              pointFactor: 0.5,
              revisedPointCeiling: 100,
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            correct: true,
            submittedAnswer: "The Moon",
            timedOut: false,
            canonicalAnswer: "The Moon",
            explanation: "The Moon is a natural satellite.",
            details: "It orbits Earth.",
            source: { label: "Source", url: "https://example.com" },
            packNames: ["Easy Does It"],
            earnedPoints: 90,
            topicMastery: { proficiency: 0.6 },
            subtopicMastery: [],
            achievements: [],
            insightBalance: 0,
          }),
          { status: 200 },
        ),
      );

    render(
      <PlayGame
        immediateChoiceSubmit
        initialMode="mixed"
        packs={[]}
        showPlayIntro={false}
        standardTimerSeconds={30}
        topics={[]}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Start playing" }),
    );
    expect(
      await screen.findByText("Multiple choice · shown at 50% value"),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Show choices" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "The Moon" }));

    expect(await screen.findByText("That’s right")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/play/presentations/presentation-required/answer",
      expect.objectContaining({
        body: expect.stringContaining('"answer":"The Moon"'),
      }),
    );
  });
});
