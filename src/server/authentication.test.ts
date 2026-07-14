import { describe, expect, it } from "vitest";
import { authenticatedDestination } from "./authentication";

describe("authenticatedDestination", () => {
  it("sends the bootstrap system administrator directly to administration", () => {
    expect(
      authenticatedDestination({
        granted: true,
        onboardingCompleted: false,
        bootstrapAdmin: true,
      }),
    ).toBe("/admin");
  });

  it("preserves account-security destinations for the bootstrap administrator", () => {
    expect(
      authenticatedDestination({
        granted: true,
        onboardingCompleted: true,
        bootstrapAdmin: true,
        requestedPath: "/account/reset-password",
      }),
    ).toBe("/account/reset-password");
  });

  it("keeps ordinary invited players in onboarding until they finish it", () => {
    expect(
      authenticatedDestination({
        granted: true,
        onboardingCompleted: false,
        bootstrapAdmin: false,
      }),
    ).toBe("/onboarding");
  });

  it("keeps users without beta access out", () => {
    expect(
      authenticatedDestination({
        granted: false,
        onboardingCompleted: true,
        bootstrapAdmin: true,
      }),
    ).toBe("/no-access");
  });
});
