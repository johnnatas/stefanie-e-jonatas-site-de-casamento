import type { Metadata } from "next";
import Link from "next/link";
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
      <div className="flex items-center gap-4">
        <Link href="/admin/presentes" className="font-sans text-sm text-forest/70 hover:text-forest">
          ← Voltar
        </Link>
      </div>
      <h1 className="mt-2 font-serif text-3xl text-forest">Novo presente</h1>
      <div className="mt-6">
        <GiftForm existingCategories={existingCategories} />
      </div>
    </div>
  );
}
