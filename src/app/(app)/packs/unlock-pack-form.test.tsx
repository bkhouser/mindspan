import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UnlockPackForm } from "./unlock-pack-form";

vi.mock("./actions", () => ({
  unlockPack: vi.fn(),
}));

describe("UnlockPackForm", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("asks for confirmation before submitting an unlock", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <UnlockPackForm
        canAfford
        packId="pack-1"
        packName="Ancient Worlds"
        priceInsight={100}
      />,
    );

    const form = screen
      .getByRole("button", { name: "Unlock · 100" })
      .closest("form");
    expect(form).not.toBeNull();

    const submitted = fireEvent.submit(form!);

    expect(confirm).toHaveBeenCalledWith(
      "Unlock Ancient Worlds for 100 Insight? This will deduct the Insight from your balance.",
    );
    expect(submitted).toBe(false);
  });

  it("does not allow an unaffordable pack to be submitted", () => {
    render(
      <UnlockPackForm
        canAfford={false}
        packId="pack-1"
        packName="Ancient Worlds"
        priceInsight={100}
      />,
    );

    expect(screen.getByRole("button", { name: "Unlock · 100" })).toBeDisabled();
  });
});
