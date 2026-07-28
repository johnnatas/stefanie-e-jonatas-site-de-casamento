import type { Metadata } from "next";
import { Suspense } from "react";
import { createListGiftsUseCase, getSiteContentOrDefault } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { mapGiftToDto, GiftDto } from "@/components/gifts/GiftDto";
import { GiftGrid } from "@/components/gifts/GiftGrid";
import { GiftFiltersBar } from "@/components/gifts/GiftFiltersBar";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { canReserveForLater } from "@/shared/utils/giftReservationWindow";
import { filterAndSortGifts, getGiftCategories } from "@/shared/utils/giftFilters";

export const metadata: Metadata = {
  title: "Lista de Presentes | Stéfanie & Jonatas",
};

interface GiftsPageProps {
  searchParams: Promise<{
    status?: string;
    q?: string;
    categoria?: string | string[];
    situacao?: string;
    ordenar?: string;
    presente?: string;
  }>;
}

const STATUS_MESSAGES: Record<string, string> = {
  sucesso: "Pagamento aprovado! Muito obrigado pelo carinho.",
  pendente: "Pagamento em processamento. Assim que for aprovado, atualizaremos a lista.",
  falha: "Não foi possível concluir o pagamento. Você pode tentar novamente.",
};

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function GiftsPage({ searchParams }: GiftsPageProps) {
  const { status, q, categoria, situacao, ordenar, presente } = await searchParams;

  let gifts: GiftDto[] = [];
  let loadError = false;
  let allowReserveForLater = false;
  let backgroundImage: string | null = null;

  if (isBackendConfigured()) {
    try {
      const [result, settings, presentesContent] = await Promise.all([
        createListGiftsUseCase().execute(),
        getSiteContentOrDefault("settings"),
        getSiteContentOrDefault("presentes"),
      ]);
      gifts = result.map(mapGiftToDto);
      allowReserveForLater = canReserveForLater(new Date(settings.weddingDateIso));
      backgroundImage = presentesContent.backgroundImage;
    } catch {
      loadError = true;
    }
  }

  const categories = getGiftCategories(gifts);
  const visibleGifts = filterAndSortGifts(gifts, { q, categoria: toArray(categoria), situacao, ordenar });
  const openGiftId = presente && gifts.some((gift) => gift.id === presente) ? presente : null;

  return (
    <div className="pb-20 pt-16">
      {backgroundImage && (
        <div
          className="fixed inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}

      <h1 className="sr-only">Lista de Presentes</h1>

      {status && STATUS_MESSAGES[status] && (
        <div className="mx-auto max-w-2xl px-6">
          <p className="rounded-md border border-moss/40 bg-moss/10 px-4 py-3 text-center font-sans text-sm text-forest">
            {STATUS_MESSAGES[status]}
          </p>
          {status === "sucesso" && (
            <p className="mt-2 text-center font-sans text-xs text-forest/60">
              Enviamos um e-mail de agradecimento — se não aparecer na caixa de entrada, dê uma olhada na caixa de
              spam.
            </p>
          )}
        </div>
      )}

      <div className="mx-auto mt-8 max-w-7xl px-6">
        {!isBackendConfigured() || loadError ? (
          <ConfigurationNotice message="A lista de presentes será exibida assim que o backend (Supabase) estiver configurado." />
        ) : (
          <>
            {gifts.length > 0 && (
              <>
                <h2 className="sr-only">Filtrar e ordenar presentes</h2>
                <Suspense fallback={<div className="mb-8 h-11" />}>
                  <GiftFiltersBar categories={categories} />
                </Suspense>
                <p className="mb-4 font-sans text-xs text-forest/60">
                  {visibleGifts.length} de {gifts.length} presentes
                </p>
              </>
            )}
            <GiftGrid
              gifts={visibleGifts}
              canReserveForLater={allowReserveForLater}
              openGiftId={openGiftId}
              emptyMessage={gifts.length > 0 ? "Nenhum presente encontrado com esses filtros." : undefined}
            />
          </>
        )}
      </div>
    </div>
  );
}
