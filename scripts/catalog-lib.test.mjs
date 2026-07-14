import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { readLocalEnv } from "./catalog-lib.mjs";

describe("readLocalEnv", () => {
  it("uses process environment values when .env.local is absent", () => {
    const missingEnvFile = resolve(
      import.meta.dirname,
      "definitely-missing.env.local",
    );
    const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://production.example.test";

    try {
      expect(readLocalEnv(missingEnvFile).NEXT_PUBLIC_SUPABASE_URL).toBe(
        "https://production.example.test",
      );
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
    }
  });
});
