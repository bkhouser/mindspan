import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envPath = new URL("../.env.local", import.meta.url);
const fileValues = existsSync(envPath) ? Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
) : {};
const values = { ...fileValues, ...process.env };

const client = createClient(values.NEXT_PUBLIC_SUPABASE_URL, values.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const expected = { topics: 8, packs: 12, question_versions: 40, achievements: 7 };
for (const [table, minimum] of Object.entries(expected)) {
  const { count, error } = await client.from(table).select("id", { count: "exact", head: true });
  if (error) throw error;
  if ((count ?? 0) < minimum) throw new Error(`${table}: expected at least ${minimum}, received ${count ?? 0}`);
  console.log(`${table}: ${count}`);
}

const { data: buckets, error: bucketError } = await client.storage.listBuckets();
if (bucketError) throw bucketError;
for (const id of ["question-media", "avatars"]) {
  const bucket = buckets.find((candidate) => candidate.id === id);
  if (!bucket || bucket.public) throw new Error(`${id}: expected a private bucket`);
  console.log(`${id}: private`);
}
