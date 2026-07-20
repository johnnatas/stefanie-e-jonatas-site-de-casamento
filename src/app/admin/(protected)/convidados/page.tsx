import type { Metadata } from "next";
import Link from "next/link";
import { createListGuestsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { GuestsTable } from "@/components/admin/GuestsTable";
import type { Guest } from "@/domain/entities/Guest";

export const metadata: Metadata = {
  title: "Convidados | Painel Administrativo",
};

export default async function AdminGuestsPage() {
  const backendConfigured = isBackendConfigured();
  let guests: Guest[] | null = null;

  if (backendConfigured) {
    try {
      guests = await createListGuestsUseCase().execute();
    } catch {
      guests = null;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-forest">Convidados</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/convidados/importar"
            className="font-sans text-sm uppercase tracking-widest text-moss hover:text-forest"
          >
            Importar CSV
          </Link>
          <Link
            href="/admin/convidados/novo"
            className="font-sans text-sm uppercase tracking-widest text-moss hover:text-forest"
          >
            + Novo convidado
          </Link>
        </div>
      </div>

      {!guests ? (
        <div className="mt-6">
          <ConfigurationNotice
            message={
              backendConfigured
                ? "Não foi possível carregar os convidados agora."
                : "Configure o Supabase (.env.local) para ver a lista de convidados."
            }
          />
        </div>
      ) : guests.length === 0 ? (
        <p className="mt-6 font-sans text-forest/70">Nenhum convidado cadastrado ainda.</p>
      ) : (
        <GuestsTable guests={guests} />
      )}
    </div>
  );
}
