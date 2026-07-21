import { z } from "zod";
import releaseData from "../../content/releases.json";
import { APP_VERSION } from "@/lib/app-version";

export {
  hasSignificantQuestionChanges,
  questionChangesSummary,
} from "@/domain/release-note-utils";
export type { QuestionChanges } from "@/domain/release-note-utils";

const releaseItemSchema = z.object({
  text: z.string().trim().min(1),
  audience: z.enum(["all", "admin"]).default("all"),
});

const questionChangesSchema = z.object({
  added: z.number().int().nonnegative(),
  addedLabel: z.string().trim().min(1).optional(),
  revised: z.number().int().nonnegative(),
  retired: z.number().int().nonnegative(),
});

const releaseSchema = z.object({
  version: z.string().trim().min(1),
  releasedAt: z.iso.date(),
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  highlights: z.array(releaseItemSchema).min(1),
  sections: z
    .array(
      z.object({
        heading: z.string().trim().min(1),
        items: z.array(releaseItemSchema).min(1),
      }),
    )
    .min(1),
  questionChanges: questionChangesSchema.optional(),
});

const parsed = z
  .object({ releases: z.array(releaseSchema).min(1) })
  .parse(releaseData);

export type ReleaseNote = z.infer<typeof releaseSchema>;

export const RELEASES: ReleaseNote[] = parsed.releases;
export const CURRENT_RELEASE = RELEASES[0];

if (CURRENT_RELEASE.version !== APP_VERSION) {
  throw new Error(
    `Current release ${CURRENT_RELEASE.version} does not match application ${APP_VERSION}`,
  );
}

export function releasesNewerThan(
  version: string | null | undefined,
  releases: ReleaseNote[] = RELEASES,
) {
  if (!version) return [];
  const previousIndex = releases.findIndex(
    (release) => release.version === version,
  );
  return previousIndex < 0 ? [] : releases.slice(0, previousIndex);
}

export function unreadReleaseVersions(
  version: string | null | undefined,
  releases: ReleaseNote[] = RELEASES,
) {
  if (!version || version === releases[0]?.version) return [];
  const newerReleases = releasesNewerThan(version, releases);
  return (newerReleases.length ? newerReleases : releases.slice(0, 1)).map(
    (release) => release.version,
  );
}

export function visibleRelease(release: ReleaseNote, isAdmin: boolean) {
  const visible = (audience: "all" | "admin") => audience === "all" || isAdmin;
  return {
    ...release,
    highlights: release.highlights.filter((item) => visible(item.audience)),
    sections: release.sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => visible(item.audience)),
      }))
      .filter((section) => section.items.length > 0),
  };
}
