import type { Metadata } from "next";
import { createListGiftsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { GiftForm } from "@/components/admin/GiftForm";

export const metadata: Metadata = {
  title: "Novo Presente | Painel Administrativo",
};

export default async function NewGiftPage() {
  let existingCategories: string[] = [];

  if (isBackendConfigured()) {
    try {
      const gifts = await createListGiftsUseCase().execute();
      existingCategories = Array.from(new Set(gifts.map((gift) => gift.category))).sort();
    } catch {
      existingCategories = [];
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Novo presente</h1>
      <div className="mt-6">
        <GiftForm existingCategories={existingCategories} />
      </div>
    </div>
  );
}
