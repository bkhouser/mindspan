import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const catalogRoot = resolve(root, "content", "catalog");
const sourceDirectories = ["questions", "enrichments", "revisions"];
const fromIndex = process.argv.indexOf("--from");
const from = fromIndex >= 0 ? process.argv[fromIndex + 1] : undefined;
const jsonOnly = process.argv.includes("--json");

if (!from) {
  throw new Error(
    "Usage: npm run release:question-changes -- --from <previous-tag> [--json]",
  );
}

function currentFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? currentFiles(path) : [path];
  });
}

function readCurrentSources() {
  const sources = new Map();
  for (const directory of sourceDirectories) {
    for (const path of currentFiles(resolve(catalogRoot, directory))) {
      if (!path.endsWith(".json")) continue;
      sources.set(
        relative(root, path).replaceAll("\\", "/"),
        readFileSync(path, "utf8"),
      );
    }
  }
  return sources;
}

function git(args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function readSourcesAt(reference) {
  const paths = git([
    "ls-tree",
    "-r",
    "--name-only",
    reference,
    "--",
    ...sourceDirectories.map((directory) => `content/catalog/${directory}`),
  ])
    .split(/\r?\n/)
    .filter((path) => path.endsWith(".json"));
  return new Map(
    paths.map((path) => [path, git(["show", `${reference}:${path}`])]),
  );
}

function effectiveQuestions(sources) {
  const questions = new Map();
  const overlays = [];
  for (const [path, source] of sources) {
    const parsed = JSON.parse(source);
    if (path.includes("/questions/")) {
      if (!Array.isArray(parsed)) throw new Error(`${path} is not an array`);
      for (const question of parsed)
        questions.set(question.catalogKey, structuredClone(question));
    } else {
      overlays.push(parsed);
    }
  }
  for (const overlay of overlays) {
    for (const [catalogKey, changes] of Object.entries(overlay)) {
      const question = questions.get(catalogKey);
      if (question) questions.set(catalogKey, { ...question, ...changes });
    }
  }
  return questions;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonical(child)]),
    );
  return value;
}

const before = effectiveQuestions(readSourcesAt(from));
const after = effectiveQuestions(readCurrentSources());
const changes = {
  added: [...after.keys()].filter((key) => !before.has(key)).length,
  revised: [...after.entries()].filter(
    ([key, question]) =>
      before.has(key) &&
      JSON.stringify(canonical(before.get(key))) !==
        JSON.stringify(canonical(question)),
  ).length,
  retired: [...before.keys()].filter((key) => !after.has(key)).length,
};

if (jsonOnly) {
  console.log(JSON.stringify(changes));
} else {
  console.log(`Question catalog changes since ${from}:`);
  console.log(`  Added:   ${changes.added}`);
  console.log(`  Revised: ${changes.revised}`);
  console.log(`  Retired: ${changes.retired}`);
  console.log(`Release metadata: ${JSON.stringify(changes)}`);
}
