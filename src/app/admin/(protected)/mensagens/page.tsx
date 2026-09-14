import type { Metadata } from "next";
import { createListGuestsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import type { Guest } from "@/domain/entities/Guest";
import { MessagesList, type MessageItem } from "./MessagesList";

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

  const messages: MessageItem[] | null =
    guests
      ?.filter((guest): guest is Guest & { message: string } => Boolean(guest.message))
      .map((guest) => ({
        id: guest.id!,
        fullName: guest.fullName,
        nickname: guest.nickname,
        companionsCount: guest.companionsCount,
        message: guest.message,
        date: guest.confirmedAt ?? guest.createdAt,
      })) ?? null;

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
        <MessagesList messages={messages} />
      )}
    </div>
  );
}
