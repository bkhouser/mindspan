import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PackProgressBar } from "./pack-progress-bar";

afterEach(cleanup);

describe("PackProgressBar", () => {
  it("shows cumulative answered and correct progress against the pack total", () => {
    render(<PackProgressBar answered={45} correct={30} total={100} />);

    expect(
      screen.getByRole("img", {
        name: "30 correct, 45 answered, 100 total questions",
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("answered-progress")).toHaveStyle({
      width: "45%",
    });
    expect(screen.getByTestId("correct-progress")).toHaveStyle({
      width: "30%",
    });
  });

  it("handles empty packs without invalid widths", () => {
    render(<PackProgressBar answered={0} correct={0} total={0} />);

    expect(screen.getByTestId("answered-progress")).toHaveStyle({
      width: "0%",
    });
    expect(screen.getByTestId("correct-progress")).toHaveStyle({ width: "0%" });
  });
});
