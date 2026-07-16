import { describe, expect, it, vi } from "vitest";
import {
  AUTH_COOKIE_MAX_AGE_SECONDS,
  authCookieOptions,
} from "@/lib/supabase/cookie-options";

describe("authCookieOptions", () => {
  it("keeps sessions across browser restarts", () => {
    expect(AUTH_COOKIE_MAX_AGE_SECONDS).toBe(34_560_000);
    expect(authCookieOptions()).toMatchObject({
      path: "/",
      sameSite: "lax",
      maxAge: 34_560_000,
    });
  });

  it("marks production cookies as secure", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(authCookieOptions().secure).toBe(true);
    vi.unstubAllEnvs();
  });
});
