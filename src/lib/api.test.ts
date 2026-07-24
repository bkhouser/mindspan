import { describe, expect, it, vi } from "vitest";
import { assertNewPlayWorkAllowed } from "./api";

function settingsClient(result: {
  data: {
    maintenance_message: string | null;
    maintenance_mode: boolean;
  } | null;
  error: Error | null;
}) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue(result),
        })),
      })),
    })),
  } as unknown as Parameters<typeof assertNewPlayWorkAllowed>[0];
}

describe("assertNewPlayWorkAllowed", () => {
  it("allows normal play while maintenance mode is off", async () => {
    await expect(
      assertNewPlayWorkAllowed(
        settingsClient({
          data: { maintenance_message: null, maintenance_mode: false },
          error: null,
        }),
      ),
    ).resolves.toBeUndefined();
  });

  it("rejects new play work with a friendly updating message", async () => {
    await expect(
      assertNewPlayWorkAllowed(
        settingsClient({
          data: { maintenance_message: null, maintenance_mode: true },
          error: null,
        }),
      ),
    ).rejects.toMatchObject({
      code: "SYSTEM_UPDATING",
      status: 503,
      message:
        "Mindspan is being updated. Your active answer is safe—please wait a moment.",
    });
  });

  it("uses the configured updating message when one is present", async () => {
    await expect(
      assertNewPlayWorkAllowed(
        settingsClient({
          data: {
            maintenance_message: "Back shortly.",
            maintenance_mode: true,
          },
          error: null,
        }),
      ),
    ).rejects.toMatchObject({ message: "Back shortly." });
  });
});
