import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppNav } from "./app-nav";

let pathname = "/home";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

describe("AppNav admin submenu", () => {
  beforeEach(() => {
    pathname = "/home";
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows only Question Quality to a question reviewer", async () => {
    render(<AppNav canReviewQuestions isAdmin={false} />);

    expect(screen.queryByText("Question Index")).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("Admin"));

    expect(
      screen.getByRole("link", { name: "Question Quality" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Overview" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Questions" }),
    ).not.toBeInTheDocument();
  });

  it("shows released admin destinations to a system admin", () => {
    pathname = "/admin";
    render(<AppNav canReviewQuestions isAdmin />);

    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Question Quality" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Questions" }),
    ).not.toBeInTheDocument();
  });

  it("remembers expansion and treats Question Index as part of quality", async () => {
    window.localStorage.setItem("mindspan-admin-nav-expanded", "true");
    pathname = "/admin/question-index";
    render(<AppNav canReviewQuestions isAdmin={false} />);

    const qualityLink = screen.getByRole("link", {
      name: "Question Quality",
    });
    await waitFor(() => expect(qualityLink).toBeVisible());
    expect(qualityLink).toHaveAttribute("aria-current", "page");
  });
});
