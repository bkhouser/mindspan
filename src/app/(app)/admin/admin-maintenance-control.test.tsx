import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminMaintenanceControl } from "./admin-maintenance-control";

vi.mock("./actions", () => ({ setMaintenanceMode: vi.fn() }));

describe("AdminMaintenanceControl", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("asks before beginning an update drain", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <AdminMaintenanceControl activePresentationCount={2} enabled={false} />,
    );

    const form = screen
      .getByRole("button", { name: "Begin update drain" })
      .closest("form");
    expect(form).not.toBeNull();

    expect(fireEvent.submit(form!)).toBe(false);
    expect(confirm).toHaveBeenCalledWith(
      "Begin an update drain? New questions will pause while active answers remain available.",
    );
  });

  it("reports active questions while the drain is enabled", () => {
    render(<AdminMaintenanceControl activePresentationCount={1} enabled />);

    expect(
      screen.getByText("1 active question still able to submit."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Resume play" })).toBeVisible();
  });
});
