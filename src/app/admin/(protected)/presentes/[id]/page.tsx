import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createListGiftsUseCase, createGetAdminSecuritySettingsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { GiftForm } from "@/components/admin/GiftForm";
import type { PaymentProvider } from "@/domain/entities/PaymentProvider";

export const metadata: Metadata = {
  title: "Editar Presente | Painel Administrativo",
};

interface EditGiftPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditGiftPage({ params }: EditGiftPageProps) {
  const { id } = await params;
  const backendConfigured = isBackendConfigured();

  if (!backendConfigured) {
    return (
      <div>
        <h1 className="font-serif text-3xl text-forest">Editar presente</h1>
        <div className="mt-6">
          <ConfigurationNotice message="Configure o Supabase (.env.local) para editar presentes." />
        </div>
      </div>
    );
  }

  let gifts;
  let activeProvider: PaymentProvider = "mercado_pago";
  try {
    gifts = await createListGiftsUseCase().execute();
    activeProvider = (await createGetAdminSecuritySettingsUseCase().execute()).activePaymentProvider;
  } catch {
    return (
      <div>
        <h1 className="font-serif text-3xl text-forest">Editar presente</h1>
        <div className="mt-6">
          <ConfigurationNotice message="Não foi possível carregar este presente agora." />
        </div>
      </div>
    );
  }

  const gift = gifts.find((candidate) => candidate.id === id);

  if (!gift) {
    notFound();
  }

  const existingCategories = Array.from(new Set(gifts.map((candidate) => candidate.category))).sort();

  return (
    <div>
      <div className="flex items-center gap-4">
        <Link href="/admin/presentes" className="font-sans text-sm text-forest/70 hover:text-forest">
          ← Voltar
        </Link>
      </div>
      <h1 className="mt-2 font-serif text-3xl text-forest">Editar presente</h1>
      <div className="mt-6">
        <GiftForm
          defaultValues={{
            id: gift.id,
            name: gift.name,
            description: gift.description,
            imageUrl: gift.imageUrl ?? "",
            price: gift.price,
            category: gift.category,
          }}
          checkoutUrl={gift.checkoutUrlFor(activeProvider)}
          existingCategories={existingCategories}
        />
      </div>
    </div>
  );
}
