import { describe, expect, it, vi } from "vitest";
import {
  productionEnvironment,
  verifyProductionEnvironment,
} from "./verify-production-env.mjs";

const valid = {
  NEXT_PUBLIC_SITE_URL: "https://mindspan.example.com",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
  SUPABASE_SECRET_KEY: "sb_secret_example",
};

describe("production environment verification", () => {
  it("rejects loopback production endpoints", () => {
    expect(() =>
      productionEnvironment({
        ...valid,
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      }),
    ).toThrow(/HTTPS/);
  });

  it("rejects a publishable key that Supabase does not accept", async () => {
    const request = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    await expect(verifyProductionEnvironment(valid, request)).rejects.toThrow(
      /rejected.*401/i,
    );
  });

  it("accepts a key validated by the configured Supabase project", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    await expect(verifyProductionEnvironment(valid, request)).resolves.toMatchObject({
      siteUrl: "https://mindspan.example.com",
      supabaseUrl: "https://project.supabase.co",
    });
    expect(request).toHaveBeenCalledWith(
      "https://project.supabase.co/auth/v1/settings",
      expect.objectContaining({
        headers: { apikey: "sb_publishable_example" },
      }),
    );
  });
});
