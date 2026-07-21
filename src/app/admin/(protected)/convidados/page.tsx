import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
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
            Importar
          </Link>
          <Link
            href="/admin/convidados/novo"
            className="rounded-full bg-moss px-5 py-2 font-sans text-xs uppercase tracking-widest text-paper transition-colors hover:bg-moss/80"
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
        <Suspense fallback={<p className="mt-6 font-sans text-forest/70">Carregando...</p>}>
          <GuestsTable
            guests={guests.map((guest) => ({
              id: guest.id!,
              fullName: guest.fullName,
              nickname: guest.nickname,
              email: guest.email,
              phone: guest.phone,
              companionsCount: guest.companionsCount,
              attendanceStatus: guest.attendanceStatus,
            }))}
          />
        </Suspense>
      )}
    </div>
  );
}
