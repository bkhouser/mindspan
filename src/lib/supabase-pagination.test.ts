import { describe, expect, it, vi } from "vitest";
import { fetchAllPages } from "./supabase-pagination";

describe("fetchAllPages", () => {
  it("continues past Supabase's default 1,000-row boundary", async () => {
    const source = Array.from({ length: 1100 }, (_, id) => ({ id }));
    const loadPage = vi.fn(async (from: number, to: number) => ({
      data: source.slice(from, to + 1),
      error: null,
    }));

    const rows = await fetchAllPages(loadPage);

    expect(rows).toHaveLength(1100);
    expect(rows.at(-1)).toEqual({ id: 1099 });
    expect(loadPage).toHaveBeenNthCalledWith(1, 0, 999);
    expect(loadPage).toHaveBeenNthCalledWith(2, 1000, 1999);
  });
});
