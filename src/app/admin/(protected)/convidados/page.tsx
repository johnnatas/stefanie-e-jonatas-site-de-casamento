import type { Metadata } from "next";
import Link from "next/link";
import { createListGuestsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { DeleteGuestButton } from "@/components/admin/DeleteGuestButton";
import type { Guest } from "@/domain/entities/Guest";

export const metadata: Metadata = {
  title: "Convidados | Painel Administrativo",
};

const STATUS_LABELS: Record<Guest["attendanceStatus"], string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  declined: "Recusado",
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
        <Link
          href="/admin/convidados/novo"
          className="font-sans text-sm uppercase tracking-widest text-moss hover:text-forest"
        >
          + Novo convidado
        </Link>
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
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse font-sans text-sm">
            <thead>
              <tr className="border-b border-line text-left text-forest/70">
                <th className="py-2 pr-4">Nome</th>
                <th className="py-2 pr-4">Contato</th>
                <th className="py-2 pr-4">Acompanhantes</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4" />
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <tr key={guest.id} className="border-b border-line">
                  <td className="py-3 pr-4 text-forest">
                    {guest.fullName}
                    {guest.nickname && <span className="text-forest/70"> ({guest.nickname})</span>}
                  </td>
                  <td className="py-3 pr-4 text-forest/70">
                    {[guest.email, guest.phone].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="py-3 pr-4 text-forest/70">{guest.companionsCount}</td>
                  <td className="py-3 pr-4 text-forest/70">{STATUS_LABELS[guest.attendanceStatus]}</td>
                  <td className="py-3 pr-4">
                    <Link href={`/admin/convidados/${guest.id}`} className="text-moss hover:text-moss/80">
                      Editar
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    <DeleteGuestButton guestId={guest.id!} guestName={guest.fullName} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
