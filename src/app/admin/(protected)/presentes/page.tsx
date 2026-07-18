import type { Metadata } from "next";
import Link from "next/link";
import { createListGiftsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
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
        <h1 className="font-serif text-3xl text-ink">Presentes</h1>
        <Link
          href="/admin/presentes/novo"
          className="rounded-full bg-gold px-5 py-2 font-sans text-xs uppercase tracking-widest text-paper transition-colors hover:bg-gold-soft"
        >
          Novo presente
        </Link>
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
        <p className="mt-6 font-sans text-ink-soft">Nenhum presente cadastrado ainda.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse font-sans text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="py-2 pr-4">Nome</th>
                <th className="py-2 pr-4">Categoria</th>
                <th className="py-2 pr-4">Valor</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {gifts.map((gift) => (
                <tr key={gift.id} className="border-b border-line">
                  <td className="py-3 pr-4 text-ink">{gift.name}</td>
                  <td className="py-3 pr-4 text-ink-soft">{gift.category}</td>
                  <td className="py-3 pr-4 text-ink-soft">{formatCurrency(gift.price)}</td>
                  <td className="py-3 pr-4 text-ink-soft">{STATUS_LABEL[gift.status]}</td>
                  <td className="py-3 pr-4">
                    <Link href={`/admin/presentes/${gift.id}`} className="text-gold hover:text-gold-soft">
                      Editar
                    </Link>
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
