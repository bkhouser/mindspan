import { render, screen } from "@testing-library/react";
import { Sparkles } from "lucide-react";
import { describe, expect, it } from "vitest";
import { InfoTooltip } from "./info-tooltip";

describe("InfoTooltip", () => {
  it("connects a keyboard-focusable trigger to its explanation", () => {
    render(
      <InfoTooltip id="insight-help" label="Insight unlocks bonus packs.">
        <Sparkles />
      </InfoTooltip>,
    );

    expect(
      screen.getByRole("button", { name: "What is Insight?" }),
    ).toHaveAttribute("aria-describedby", "insight-help");
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Insight unlocks bonus packs.",
    );
  });
});
