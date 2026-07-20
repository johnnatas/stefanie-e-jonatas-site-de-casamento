import type { Metadata } from "next";
import Link from "next/link";
import { createListGiftsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { GiftsTable } from "@/components/admin/GiftsTable";
import type { Gift } from "@/domain/entities/Gift";

export const metadata: Metadata = {
  title: "Presentes | Painel Administrativo",
};

export default async function AdminGiftsPage() {
  const backendConfigured = isBackendConfigured();
  let gifts: Gift[] | null = null;

  if (backendConfigured) {
    try {
      gifts = await createListGiftsUseCase().execute();
    } catch {
      gifts = null;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-forest">Presentes</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/presentes/importar"
            className="font-sans text-sm uppercase tracking-widest text-moss hover:text-forest"
          >
            Importar CSV
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
        <GiftsTable
          gifts={gifts.map((gift) => ({
            id: gift.id!,
            name: gift.name,
            category: gift.category,
            price: gift.price,
            status: gift.status,
          }))}
        />
      )}
    </div>
  );
}
