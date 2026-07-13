"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

export async function unlockPack(formData: FormData) {
  const { supabase } = await requireUser();
  const packId = String(formData.get("packId") ?? "");
  await supabase.rpc("unlock_pack", { target_pack: packId, request_key: crypto.randomUUID() });
  revalidatePath("/packs"); revalidatePath("/home");
}
