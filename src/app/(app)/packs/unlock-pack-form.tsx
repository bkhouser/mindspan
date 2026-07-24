"use client";

import { LockKeyhole } from "lucide-react";
import { unlockPack } from "./actions";

export function confirmPackUnlock(packName: string, priceInsight: number) {
  return window.confirm(
    `Unlock ${packName} for ${priceInsight} Insight? This will deduct the Insight from your balance.`,
  );
}

export function UnlockPackForm({
  canAfford,
  packId,
  packName,
  priceInsight,
}: {
  canAfford: boolean;
  packId: string;
  packName: string;
  priceInsight: number;
}) {
  return (
    <form
      action={unlockPack}
      className="mt-6"
      onSubmit={(event) => {
        if (!confirmPackUnlock(packName, priceInsight)) event.preventDefault();
      }}
    >
      <input name="packId" type="hidden" value={packId} />
      <button
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-white/10 px-4 font-black disabled:opacity-40"
        disabled={!canAfford}
        type="submit"
      >
        <LockKeyhole aria-hidden="true" size={16} />
        Unlock · {priceInsight}
      </button>
    </form>
  );
}
