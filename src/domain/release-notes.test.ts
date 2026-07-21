import { describe, expect, it } from "vitest";
import { APP_VERSION } from "@/lib/app-version";
import {
  CURRENT_RELEASE,
  hasSignificantQuestionChanges,
  questionChangesSummary,
  releasesNewerThan,
  type ReleaseNote,
  unreadReleaseVersions,
  visibleRelease,
} from "./release-notes";

const release = (version: string): ReleaseNote => ({
  version,
  releasedAt: "2026-07-15",
  title: `Release ${version}`,
  summary: "Summary",
  highlights: [{ text: "Player highlight", audience: "all" }],
  sections: [
    {
      heading: "Added",
      items: [
        { text: "Player change", audience: "all" },
        { text: "Admin change", audience: "admin" },
      ],
    },
  ],
});

describe("release notes", () => {
  it("uses the package version for the current release", () => {
    expect(CURRENT_RELEASE.version).toBe(APP_VERSION);
  });

  it("finds every release newer than the player's prior version", () => {
    const releases = [release("3.0.0"), release("2.0.0"), release("1.0.0")];
    expect(
      releasesNewerThan("1.0.0", releases).map((item) => item.version),
    ).toEqual(["3.0.0", "2.0.0"]);
    expect(releasesNewerThan(null, releases)).toEqual([]);
    expect(releasesNewerThan("unknown", releases)).toEqual([]);
  });

  it("highlights the current release when an older version is no longer retained", () => {
    const releases = [release("3.0.0"), release("2.0.0")];
    expect(unreadReleaseVersions("1.0.0", releases)).toEqual(["3.0.0"]);
    expect(unreadReleaseVersions("2.0.0", releases)).toEqual(["3.0.0"]);
    expect(unreadReleaseVersions("3.0.0", releases)).toEqual([]);
    expect(unreadReleaseVersions(null, releases)).toEqual([]);
  });

  it("keeps administrator-only notes private from ordinary players", () => {
    expect(visibleRelease(release("1.0.0"), false).sections[0].items).toEqual([
      { text: "Player change", audience: "all" },
    ]);
    expect(
      visibleRelease(release("1.0.0"), true).sections[0].items,
    ).toHaveLength(2);
  });

  it("shows question-change counts only when they are significant", () => {
    expect(
      hasSignificantQuestionChanges({ added: 2, revised: 7, retired: 0 }),
    ).toBe(false);
    expect(
      hasSignificantQuestionChanges({ added: 2, revised: 8, retired: 0 }),
    ).toBe(true);
  });

  it("can explain that added questions are prepared for future packs", () => {
    expect(
      questionChangesSummary({
        added: 400,
        addedLabel: "questions prepared for future packs",
        revised: 438,
        retired: 0,
      }),
    ).toBe("400 questions prepared for future packs · 438 revised");
  });
});
