import type { Metadata } from "next";
import Link from "next/link";
import { createListGiftsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { DeleteGiftButton } from "@/components/admin/DeleteGiftButton";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import type { Gift, GiftStatus } from "@/domain/entities/Gift";

export const metadata: Metadata = {
  title: "Presentes | Painel Administrativo",
};

const STATUS_LABEL: Record<GiftStatus, string> = {
  available: "Disponível",
  reserved: "Reservado",
  paid: "Presenteado",
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
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse font-sans text-sm">
            <thead>
              <tr className="border-b border-line text-left text-forest/70">
                <th className="py-2 pr-4">Nome</th>
                <th className="py-2 pr-4">Categoria</th>
                <th className="py-2 pr-4">Valor</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4" />
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {gifts.map((gift) => (
                <tr key={gift.id} className="border-b border-line">
                  <td className="py-3 pr-4 text-forest">{gift.name}</td>
                  <td className="py-3 pr-4 text-forest/70">{gift.category}</td>
                  <td className="py-3 pr-4 text-forest/70">{formatCurrency(gift.price)}</td>
                  <td className="py-3 pr-4 text-forest/70">{STATUS_LABEL[gift.status]}</td>
                  <td className="py-3 pr-4">
                    <Link href={`/admin/presentes/${gift.id}`} className="text-moss hover:text-moss/80">
                      Editar
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    <DeleteGiftButton giftId={gift.id!} giftName={gift.name} />
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
