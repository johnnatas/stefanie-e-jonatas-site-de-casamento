import type { Metadata } from "next";
import { createListGuestsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
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
      <h1 className="font-serif text-3xl text-ink">Convidados</h1>

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
        <p className="mt-6 font-sans text-ink-soft">Nenhuma confirmação recebida ainda.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse font-sans text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="py-2 pr-4">Nome</th>
                <th className="py-2 pr-4">Contato</th>
                <th className="py-2 pr-4">Acompanhantes</th>
                <th className="py-2 pr-4">Confirmado</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <tr key={guest.id} className="border-b border-line">
                  <td className="py-3 pr-4 text-ink">{guest.fullName}</td>
                  <td className="py-3 pr-4 text-ink-soft">
                    {guest.email} · {guest.phone}
                  </td>
                  <td className="py-3 pr-4 text-ink-soft">{guest.companionsCount}</td>
                  <td className="py-3 pr-4 text-ink-soft">
                    {guest.attendanceConfirmed ? "Sim" : "Não"}
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
