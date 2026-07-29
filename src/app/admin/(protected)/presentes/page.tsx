import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createListGiftsUseCase, createGetAdminSecuritySettingsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { GiftsTable } from "@/components/admin/GiftsTable";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import type { Gift } from "@/domain/entities/Gift";
import type { PaymentProvider } from "@/domain/entities/PaymentProvider";

export const metadata: Metadata = {
  title: "Presentes | Painel Administrativo",
};

export default async function AdminGiftsPage() {
  const backendConfigured = isBackendConfigured();
  let gifts: Gift[] | null = null;
  let activeProvider: PaymentProvider = "mercado_pago";

  if (backendConfigured) {
    try {
      gifts = await createListGiftsUseCase().execute();
      activeProvider = (await createGetAdminSecuritySettingsUseCase().execute()).activePaymentProvider;
    } catch {
      gifts = null;
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-3xl text-forest">Presentes</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/presentes/importar"
            className="flex min-h-11 items-center font-sans text-sm uppercase tracking-widest text-moss hover:text-forest"
          >
            Importar
          </Link>
          <Link
            href="/admin/presentes/novo"
            className="rounded-full bg-moss px-5 py-2 font-sans text-xs uppercase tracking-widest text-paper transition-colors hover:bg-moss/80"
          >
            Novo presente
          </Link>
        </div>
      </div>

      {!gifts ? (
        <div className="mt-6">
          <ConfigurationNotice
            message={
              backendConfigured
                ? "Não foi possível carregar os presentes agora."
                : "Configure o Supabase (.env.local) para gerenciar a lista de presentes."
            }
          />
        </div>
      ) : gifts.length === 0 ? (
        <p className="mt-6 font-sans text-forest/70">Nenhum presente cadastrado ainda.</p>
      ) : (
        <>
          <p className="mt-6 font-sans text-sm text-forest/70">
            Valor total cadastrado:{" "}
            <span className="font-medium text-forest">
              {formatCurrency(gifts.reduce((total, gift) => total + gift.price, 0))}
            </span>
          </p>
          <Suspense fallback={<p className="mt-6 font-sans text-forest/70">Carregando...</p>}>
            <GiftsTable
              gifts={gifts.map((gift) => ({
                id: gift.id!,
                name: gift.name,
                category: gift.category,
                price: gift.price,
                status: gift.status,
                createdAt: gift.createdAt,
                hasPaymentLink: gift.hasLinkFor(activeProvider),
              }))}
            />
          </Suspense>
        </>
      )}
    </div>
  );
}
