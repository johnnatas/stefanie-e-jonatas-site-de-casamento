import type { Metadata } from "next";
import { createListGiftsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { mapGiftToDto, GiftDto } from "@/components/gifts/GiftDto";
import { GiftGrid } from "@/components/gifts/GiftGrid";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";

export const metadata: Metadata = {
  title: "Lista de Presentes | Stéfanie & Jonatas",
};

interface GiftsPageProps {
  searchParams: Promise<{ status?: string }>;
}

const STATUS_MESSAGES: Record<string, string> = {
  sucesso: "Pagamento aprovado! Muito obrigado pelo carinho.",
  pendente: "Pagamento em processamento. Assim que for aprovado, atualizaremos a lista.",
  falha: "Não foi possível concluir o pagamento. Você pode tentar novamente.",
};

export default async function GiftsPage({ searchParams }: GiftsPageProps) {
  const { status } = await searchParams;

  let gifts: GiftDto[] = [];
  let loadError = false;

  if (isBackendConfigured()) {
    try {
      const result = await createListGiftsUseCase().execute();
      gifts = result.map(mapGiftToDto);
    } catch {
      loadError = true;
    }
  }

  return (
    <div className="pb-20">
      <section className="mx-auto max-w-2xl px-6 pt-20 text-center">
        <span className="font-sans text-xs uppercase tracking-widest text-rose">Com carinho</span>
        <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">Lista de Presentes</h1>
        <p className="mt-6 font-sans text-ink-soft">
          Sua presença já é o nosso maior presente. Mas se quiser nos ajudar a começar essa nova
          fase da vida, preparamos esta lista com muito carinho.
        </p>
      </section>

      {status && STATUS_MESSAGES[status] && (
        <div className="mx-auto mt-8 max-w-2xl px-6">
          <p className="rounded-md border border-rose/40 bg-rose/10 px-4 py-3 text-center font-sans text-sm text-ink">
            {STATUS_MESSAGES[status]}
          </p>
        </div>
      )}

      <div className="mx-auto mt-12 max-w-5xl px-6">
        {!isBackendConfigured() || loadError ? (
          <ConfigurationNotice message="A lista de presentes será exibida assim que o backend (Supabase) estiver configurado." />
        ) : (
          <GiftGrid gifts={gifts} />
        )}
      </div>
    </div>
  );
}
