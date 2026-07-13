import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { QuestionTimerBar } from "./question-timer-bar";

describe("QuestionTimerBar", () => {
  afterEach(cleanup);

  it("reports and displays the remaining percentage", () => {
    render(<QuestionTimerBar ratio={0.62} />);

    const bar = screen.getByRole("progressbar", { name: "Time remaining" });
    expect(bar).toHaveAttribute("aria-valuenow", "62");
    expect(bar.firstElementChild).toHaveStyle({ width: "62%" });
  });

  it("can render a visual duplicate without repeating screen-reader output", () => {
    render(<QuestionTimerBar decorative ratio={0.5} />);

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByTestId("question-timer-bar")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
