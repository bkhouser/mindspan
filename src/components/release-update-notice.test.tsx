import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { ReleaseNote } from "@/domain/release-notes";
import { ReleaseUpdateNotice } from "./release-update-notice";

const release: ReleaseNote = {
  version: "2.0.0",
  releasedAt: "2026-07-15",
  title: "Smoother play",
  summary: "Summary",
  highlights: [
    { text: "First highlight.", audience: "all" },
    { text: "Second highlight.", audience: "all" },
    { text: "Third highlight.", audience: "all" },
    { text: "Fourth highlight.", audience: "all" },
    { text: "Fifth highlight.", audience: "all" },
    { text: "Detailed-page-only highlight.", audience: "all" },
  ],
  sections: [
    {
      heading: "Fixed",
      items: [{ text: "A fix", audience: "all" }],
    },
  ],
};

describe("ReleaseUpdateNotice", () => {
  afterEach(cleanup);

  it("summarizes the latest release and the number of missed updates", () => {
    render(<ReleaseUpdateNotice release={release} releaseCount={3} />);
    expect(screen.getByText("Mindspan was updated")).toBeVisible();
    expect(screen.getByText("Smoother play")).toBeVisible();
    expect(
      screen.getByText("There have been 3 updates since your last visit."),
    ).toBeVisible();
    expect(screen.queryByText(/available/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "See all updates" }),
    ).toHaveAttribute("href", "/updates");
    expect(screen.getByText("Fifth highlight.")).toBeVisible();
    expect(
      screen.queryByText("Detailed-page-only highlight."),
    ).not.toBeInTheDocument();
  });

  it("can be dismissed without visiting the Updates page", async () => {
    render(<ReleaseUpdateNotice release={release} releaseCount={1} />);
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.queryByText("Mindspan was updated")).not.toBeInTheDocument();
  });
});
