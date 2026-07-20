import type { Metadata } from "next";
import { createListGiftContributionsUseCase, createListGiftsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { buildContributionRows, type ContributionRow } from "./buildContributionRows";

export const metadata: Metadata = {
  title: "Pagamentos | Painel Administrativo",
};

const STATUS_LABEL: Record<ContributionRow["status"], string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

export default async function AdminPagamentosPage() {
  const backendConfigured = isBackendConfigured();
  let rows: ContributionRow[] | null = null;

  if (backendConfigured) {
    try {
      const [contributions, gifts] = await Promise.all([
        createListGiftContributionsUseCase().execute(),
        createListGiftsUseCase().execute(),
      ]);
      rows = buildContributionRows(contributions, gifts);
    } catch {
      rows = null;
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Pagamentos</h1>

      {!rows ? (
        <div className="mt-6">
          <ConfigurationNotice
            message={
              backendConfigured
                ? "Não foi possível carregar os pagamentos agora."
                : "Configure o Supabase (.env.local) para ver os pagamentos."
            }
          />
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-6 font-sans text-forest/70">Nenhuma contribuição registrada ainda.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse font-sans text-sm">
            <thead>
              <tr className="border-b border-line text-left text-forest/70">
                <th className="py-2 pr-4">Convidado</th>
                <th className="py-2 pr-4">Presente</th>
                <th className="py-2 pr-4">Valor</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Data</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line">
                  <td className="py-3 pr-4 text-forest">{row.guestName}</td>
                  <td className="py-3 pr-4 text-forest/70">{row.giftName}</td>
                  <td className="py-3 pr-4 text-forest/70">{formatCurrency(row.amount)}</td>
                  <td className="py-3 pr-4 text-forest/70">{STATUS_LABEL[row.status]}</td>
                  <td className="py-3 pr-4 text-forest/70">{row.createdAt.toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
