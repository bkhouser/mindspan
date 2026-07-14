import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuestionFeedback } from "./question-feedback";

const attemptId = "11111111-1111-4111-8111-111111111111";

describe("QuestionFeedback", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("keeps the default control compact and saves a positive reaction", async () => {
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    render(<QuestionFeedback attemptId={attemptId} />);

    expect(screen.getByText("Question feedback")).toBeVisible();
    expect(screen.queryByText("Optional details")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Good question" }));

    await waitFor(() => expect(request).toHaveBeenCalledOnce());
    expect(JSON.parse(String(request.mock.calls[0]?.[1]?.body))).toMatchObject({
      attemptId,
      sentiment: "up",
      reasons: [],
    });
    expect(await screen.findByText("Saved")).toBeVisible();
  });

  it("opens optional reasons only after a negative reaction", async () => {
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    render(<QuestionFeedback attemptId={attemptId} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Question needs work" }),
    );
    expect(screen.getByText("Optional details")).toBeVisible();
    await userEvent.click(screen.getByText("My answer should be accepted"));
    await userEvent.type(
      screen.getByPlaceholderText("Optional note"),
      "Jefferson should count.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save details" }));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(JSON.parse(String(request.mock.calls[1]?.[1]?.body))).toMatchObject({
      sentiment: "down",
      reasons: ["should_have_been_accepted"],
      comment: "Jefferson should count.",
    });
  });
});
