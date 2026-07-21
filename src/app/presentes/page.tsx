import type { Metadata } from "next";
import { createListGiftsUseCase, getSiteContentOrDefault } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { mapGiftToDto, GiftDto } from "@/components/gifts/GiftDto";
import { GiftGrid } from "@/components/gifts/GiftGrid";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { SplitPanel } from "@/components/ui/SplitPanel";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { canReserveForLater } from "@/shared/utils/giftReservationWindow";

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
  let allowReserveForLater = false;

  if (isBackendConfigured()) {
    try {
      const [result, settings] = await Promise.all([
        createListGiftsUseCase().execute(),
        getSiteContentOrDefault("settings"),
      ]);
      gifts = result.map(mapGiftToDto);
      allowReserveForLater = canReserveForLater(new Date(settings.weddingDateIso));
    } catch {
      loadError = true;
    }
  }

  return (
    <div className="pb-20">
      <h1 className="sr-only">Lista de Presentes</h1>

      <SplitPanel
        title="Lista de Presentes"
        tone="dark"
        image={<PlaceholderImage label="Lista de presentes" className="absolute inset-0 h-full w-full" />}
      >
        <p>
          Sua presença já é o nosso maior presente. Mas se quiser nos ajudar a começar essa nova
          fase da vida, preparamos esta lista com muito carinho.
        </p>
      </SplitPanel>

      {status && STATUS_MESSAGES[status] && (
        <div className="mx-auto mt-8 max-w-2xl px-6">
          <p className="rounded-md border border-moss/40 bg-moss/10 px-4 py-3 text-center font-sans text-sm text-forest">
            {STATUS_MESSAGES[status]}
          </p>
        </div>
      )}

      <div className="mx-auto mt-12 max-w-5xl px-6">
        {!isBackendConfigured() || loadError ? (
          <ConfigurationNotice message="A lista de presentes será exibida assim que o backend (Supabase) estiver configurado." />
        ) : (
          <GiftGrid gifts={gifts} canReserveForLater={allowReserveForLater} />
        )}
      </div>
    </div>
  );
}
