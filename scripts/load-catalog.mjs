import { createClient } from "@supabase/supabase-js";
import {
  loadCatalog,
  loadEditorialApprovals,
  readLocalEnv,
} from "./catalog-lib.mjs";

const { questions } = loadCatalog();
const values = readLocalEnv();
const admin = createClient(
  values.NEXT_PUBLIC_SUPABASE_URL,
  values.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

let inserted = 0;
let updated = 0;
let skipped = 0;
for (let index = 0; index < questions.length; index += 200) {
  const batch = questions.slice(index, index + 200);
  const { data, error } = await admin.rpc("sync_published_catalog_v6", {
    payload: batch,
  });
  if (error) throw error;
  for (const result of data ?? []) {
    if (result.result_action === "inserted") inserted += 1;
    else if (result.result_action === "updated") updated += 1;
    else skipped += 1;
  }
  console.log(
    `Loaded ${Math.min(index + batch.length, questions.length)}/${questions.length}`,
  );
}

console.log({ inserted, updated, skipped, total: questions.length });

const editorialApprovals = loadEditorialApprovals();
let approvalsApplied = 0;
for (let index = 0; index < editorialApprovals.length; index += 200) {
  const batch = editorialApprovals.slice(index, index + 200);
  const { data, error } = await admin.rpc(
    "apply_catalog_editorial_approvals_v1",
    { payload: batch },
  );
  if (error) throw error;
  approvalsApplied += (data ?? []).filter((result) => result.result_applied)
    .length;
}
console.log({
  editorialApprovals: editorialApprovals.length,
  approvalsApplied,
});

const { data: taxonomySummary, error: taxonomyError } = await admin.rpc(
  "finalize_normalized_taxonomy_v1",
);
if (taxonomyError) throw taxonomyError;
console.log({ taxonomy: taxonomySummary?.[0] ?? null });
