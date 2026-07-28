import type { Metadata } from "next";
import Link from "next/link";
import { createListGuestsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import type { Guest } from "@/domain/entities/Guest";

export const metadata: Metadata = {
  title: "Mensagens | Painel Administrativo",
};

export default async function AdminMensagensPage() {
  const backendConfigured = isBackendConfigured();
  let guests: Guest[] | null = null;

  if (backendConfigured) {
    try {
      guests = await createListGuestsUseCase().execute();
    } catch {
      guests = null;
    }
  }

  const messages = guests?.filter((guest) => guest.message) ?? null;

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Mensagens</h1>
      <p className="mt-2 font-sans text-sm text-forest/70">
        Recados deixados pelos convidados ao confirmar presença.
      </p>

      {!messages ? (
        <div className="mt-6">
          <ConfigurationNotice
            message={
              backendConfigured
                ? "Não foi possível carregar as mensagens agora."
                : "Configure o Supabase (.env.local) para ver as mensagens dos convidados."
            }
          />
        </div>
      ) : messages.length === 0 ? (
        <p className="mt-6 font-sans text-forest/70">Nenhuma mensagem deixada até agora.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {messages.map((guest) => (
            <li key={guest.id} className="rounded-md border border-line p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/admin/convidados/${guest.id}`} className="font-serif text-lg text-forest hover:text-moss">
                  {guest.fullName}
                  {guest.nickname && <span className="text-forest/70"> ({guest.nickname})</span>}
                </Link>
                {guest.companionsCount > 0 && (
                  <span className="font-sans text-xs uppercase tracking-widest text-forest/60">
                    +{guest.companionsCount} acompanhante{guest.companionsCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <p className="mt-2 font-sans text-sm italic text-forest/80">&ldquo;{guest.message}&rdquo;</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
