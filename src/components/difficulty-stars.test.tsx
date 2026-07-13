import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DifficultyStars } from "./difficulty-stars";

describe("DifficultyStars", () => {
  it("fills the number of stars matching the difficulty", () => {
    render(<DifficultyStars difficulty={3} />);
    const scale = screen.getByRole("img", {
      name: "Difficulty 3 out of 5",
    });
    expect(scale.querySelectorAll(".fill-amber-300")).toHaveLength(3);
    expect(scale.querySelectorAll("svg")).toHaveLength(5);
  });

  it("clamps unexpected values to the five-star scale", () => {
    render(<DifficultyStars difficulty={8} />);
    expect(
      screen.getByRole("img", { name: "Difficulty 5 out of 5" }),
    ).toBeVisible();
  });
});
