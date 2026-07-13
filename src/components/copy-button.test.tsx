import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "./copy-button";

describe("CopyButton", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, "clipboard");
  });

  it("copies the invitation link and confirms success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    render(<CopyButton value="http://localhost:3000/login?invite=example" />);
    await userEvent.click(screen.getByRole("button", { name: "Copy invitation link" }));

    expect(writeText).toHaveBeenCalledWith("http://localhost:3000/login?invite=example");
    expect(screen.getByRole("button", { name: "Copied" })).toBeVisible();
  });
});
