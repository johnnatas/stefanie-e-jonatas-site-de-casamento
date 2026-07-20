"use server";

import { revalidatePath } from "next/cache";
import { createDeleteGuestUseCase } from "@/infrastructure/composition";

export async function deleteGuestAction(guestId: string): Promise<void> {
  await createDeleteGuestUseCase().execute(guestId);
  revalidatePath("/admin/convidados");
}
