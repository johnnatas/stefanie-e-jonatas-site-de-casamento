import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createListGiftsUseCase } from "@/infrastructure/composition";
import { GiftForm } from "@/components/admin/GiftForm";

export const metadata: Metadata = {
  title: "Editar Presente | Painel Administrativo",
};

interface EditGiftPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditGiftPage({ params }: EditGiftPageProps) {
  const { id } = await params;
  const gifts = await createListGiftsUseCase().execute();
  const gift = gifts.find((candidate) => candidate.id === id);

  if (!gift) {
    notFound();
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Editar presente</h1>
      <div className="mt-6">
        <GiftForm
          defaultValues={{
            id: gift.id,
            name: gift.name,
            description: gift.description,
            imageUrl: gift.imageUrl,
            price: gift.price,
            category: gift.category,
          }}
        />
      </div>
    </div>
  );
}
