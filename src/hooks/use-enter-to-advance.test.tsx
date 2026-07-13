import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEnterToAdvance } from "./use-enter-to-advance";

function Harness({
  enabled = true,
  onAdvance,
  blocked = false,
}: {
  enabled?: boolean;
  onAdvance: () => void;
  blocked?: boolean;
}) {
  useEnterToAdvance(enabled, onAdvance);
  return (
    <>
      <input aria-label="Report details" />
      {blocked ? <div data-enter-advance-blocker="true" /> : null}
    </>
  );
}

describe("useEnterToAdvance", () => {
  afterEach(cleanup);

  it("advances on an unmodified Enter key", async () => {
    const onAdvance = vi.fn();
    render(<Harness onAdvance={onAdvance} />);
    fireEvent.keyDown(window, { key: "Enter" });
    await waitFor(() => expect(onAdvance).toHaveBeenCalledOnce());
  });

  it("does not advance from an interactive field", () => {
    const onAdvance = vi.fn();
    const view = render(<Harness onAdvance={onAdvance} />);
    fireEvent.keyDown(view.getByLabelText("Report details"), { key: "Enter" });
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it("does not advance while an overlay blocks the shortcut", () => {
    const onAdvance = vi.fn();
    render(<Harness blocked onAdvance={onAdvance} />);
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onAdvance).not.toHaveBeenCalled();
  });
});
