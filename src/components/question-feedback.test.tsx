import { createRef } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  QuestionFeedback,
  type QuestionFeedbackHandle,
} from "./question-feedback";

const attemptId = "11111111-1111-4111-8111-111111111111";

describe("QuestionFeedback", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("keeps the default control compact and saves a positive reaction", async () => {
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response("{}", { status: 200 }));
    render(<QuestionFeedback attemptId={attemptId} />);

    expect(screen.getByText("Question feedback")).toBeVisible();
    expect(screen.queryByText("Optional details")).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Good question" }),
    );

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
      .mockImplementation(async () => new Response("{}", { status: 200 }));
    render(<QuestionFeedback attemptId={attemptId} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Question needs work" }),
    );
    expect(screen.getByText("Optional details")).toBeVisible();
    await userEvent.click(screen.getByText("Wrong topic"));
    await userEvent.click(screen.getByText("Answer is given away"));
    await userEvent.type(
      screen.getByPlaceholderText("Optional note"),
      "This belongs in Geography.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save details" }));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(JSON.parse(String(request.mock.calls[1]?.[1]?.body))).toMatchObject({
      sentiment: "down",
      reasons: ["wrong_topic", "answer_given_away"],
      comment: "This belongs in Geography.",
    });
  });

  it("saves edited details when the parent advances without Save details", async () => {
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response("{}", { status: 200 }));
    const ref = createRef<QuestionFeedbackHandle>();
    render(<QuestionFeedback attemptId={attemptId} ref={ref} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Question needs work" }),
    );
    await waitFor(() => expect(request).toHaveBeenCalledOnce());
    await userEvent.click(screen.getByText("Weak explanation"));
    await userEvent.type(
      screen.getByPlaceholderText("Optional note"),
      "This needs more context.",
    );

    await expect(ref.current?.savePending()).resolves.toBe(true);
    expect(request).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(request.mock.calls[1]?.[1]?.body))).toMatchObject({
      attemptId,
      sentiment: "down",
      reasons: ["weak_explanation"],
      comment: "This needs more context.",
    });
  });
});
