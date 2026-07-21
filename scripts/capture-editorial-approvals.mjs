import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEditorialApprovals, readLocalEnv } from "./catalog-lib.mjs";

const root = resolve(import.meta.dirname, "..");
const ledgerPath = resolve(
  root,
  "content",
  "catalog",
  "editorial-approvals.json",
);
const values = readLocalEnv();
const admin = createClient(
  values.NEXT_PUBLIC_SUPABASE_URL,
  values.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

const approvals = new Map();
for (const entry of loadEditorialApprovals(ledgerPath)) {
  const hashes = approvals.get(entry.editorialKey) ?? new Set();
  hashes.add(entry.contentHash);
  approvals.set(entry.editorialKey, hashes);
}

function addApproval(editorialKey, contentHash) {
  if (!editorialKey || !/^[a-f0-9]{32}$/.test(contentHash ?? ""))
    throw new Error("Invalid portable editorial approval entry");
  const hashes = approvals.get(editorialKey) ?? new Set();
  hashes.add(contentHash);
  approvals.set(editorialKey, hashes);
}

async function fetchApprovedVersionIds() {
  const ids = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("question_editorial_reviews")
      .select("question_version_id")
      .eq("verdict", "approved")
      .range(from, from + 999);
    if (error) throw error;
    ids.push(...(data ?? []).map((row) => row.question_version_id));
    if ((data ?? []).length < 1000) break;
  }
  return ids;
}

const approvedVersionIds = await fetchApprovedVersionIds();
for (let index = 0; index < approvedVersionIds.length; index += 200) {
  const batch = approvedVersionIds.slice(index, index + 200);
  const { data, error } = await admin
    .from("question_versions")
    .select("editorial_key,editorial_content_hash")
    .eq("status", "published")
    .in("id", batch);
  if (error) throw error;
  for (const version of data ?? [])
    addApproval(version.editorial_key, version.editorial_content_hash);
}

const importPath = process.argv[2];
if (importPath) {
  const imported = JSON.parse(readFileSync(resolve(importPath), "utf8"));
  if (!Array.isArray(imported.editorialApprovals))
    throw new Error(
      "The imported Question Quality export does not include editorialApprovals",
    );
  for (const entry of imported.editorialApprovals)
    addApproval(entry.editorialKey, entry.contentHash);
}

const serialized = Object.fromEntries(
  [...approvals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, hashes]) => [key, [...hashes].sort()]),
);
writeFileSync(
  ledgerPath,
  `${JSON.stringify({ schemaVersion: 1, approvals: serialized }, null, 2)}\n`,
);
console.log({
  approvedVersionsInDatabase: approvedVersionIds.length,
  importedExport: Boolean(importPath),
  portableApprovalEntries: Object.values(serialized).reduce(
    (sum, hashes) => sum + hashes.length,
    0,
  ),
});
