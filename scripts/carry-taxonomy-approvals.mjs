import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEditorialApprovals, readLocalEnv } from "./catalog-lib.mjs";

const ledgerPath = resolve(
  import.meta.dirname,
  "..",
  "content",
  "catalog",
  "editorial-approvals.json",
);
const approvals = new Map();
for (const entry of loadEditorialApprovals(ledgerPath)) {
  const hashes = approvals.get(entry.editorialKey) ?? new Set();
  hashes.add(entry.contentHash);
  approvals.set(entry.editorialKey, hashes);
}

const values = readLocalEnv();
const admin = createClient(
  values.NEXT_PUBLIC_SUPABASE_URL,
  values.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);
const keys = [...approvals.keys()];
let carried = 0;
for (let index = 0; index < keys.length; index += 200) {
  const batch = keys.slice(index, index + 200);
  const { data, error } = await admin
    .from("question_versions")
    .select("editorial_key,editorial_content_hash")
    .eq("status", "published")
    .in("editorial_key", batch);
  if (error) throw error;
  for (const version of data ?? []) {
    if (!version.editorial_key || !version.editorial_content_hash) continue;
    const hashes = approvals.get(version.editorial_key);
    if (!hashes?.has(version.editorial_content_hash)) {
      hashes?.add(version.editorial_content_hash);
      carried += 1;
    }
  }
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
console.log({ approvedQuestionKeys: keys.length, taxonomyHashesAdded: carried });
