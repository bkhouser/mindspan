import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8"),
);
const releaseData = JSON.parse(
  readFileSync(resolve(root, "content", "releases.json"), "utf8"),
);
const changelog = readFileSync(resolve(root, "CHANGELOG.md"), "utf8");
const releases = releaseData.releases;

if (!Array.isArray(releases) || releases.length === 0)
  throw new Error("content/releases.json must contain at least one release");
if (releases[0]?.version !== packageJson.version)
  throw new Error(
    `Current in-app release ${releases[0]?.version ?? "missing"} does not match package ${packageJson.version}`,
  );
if (!changelog.includes(`## ${packageJson.version} -`))
  throw new Error(
    `CHANGELOG.md does not contain a dated ${packageJson.version} release heading`,
  );

const versions = new Set();
for (const release of releases) {
  if (!release.version || versions.has(release.version))
    throw new Error(`Duplicate or missing release version: ${release.version}`);
  versions.add(release.version);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(release.releasedAt ?? ""))
    throw new Error(`${release.version} has an invalid release date`);
  if (!Array.isArray(release.highlights) || release.highlights.length === 0)
    throw new Error(`${release.version} must have at least one highlight`);
  if (!Array.isArray(release.sections) || release.sections.length === 0)
    throw new Error(`${release.version} must have at least one section`);
  if (release.questionChanges) {
    for (const key of ["added", "revised", "retired"]) {
      const value = release.questionChanges[key];
      if (!Number.isInteger(value) || value < 0)
        throw new Error(`${release.version} questionChanges.${key} is invalid`);
    }
  }
}

console.log(
  `Release metadata verified for v${packageJson.version} (${releases.length} release${releases.length === 1 ? "" : "s"})`,
);
