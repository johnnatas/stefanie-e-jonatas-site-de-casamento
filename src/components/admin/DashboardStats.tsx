import { formatCurrency } from "@/shared/utils/formatCurrency";
import { DashboardSummary } from "@/application/use-cases/admin/GetDashboardSummaryUseCase";

interface DashboardStatsProps {
  summary: DashboardSummary;
}

export function DashboardStats({ summary }: DashboardStatsProps) {
  const items = [
    { label: "Confirmados", value: summary.confirmedGuestsCount },
    { label: "Não vão", value: summary.declinedGuestsCount },
    { label: "Total de pessoas", value: summary.totalAttendeesCount },
    { label: "Presentes cadastrados", value: summary.totalGiftsCount },
    { label: "Presentes recebidos", value: summary.paidGiftsCount },
    { label: "Valor arrecadado", value: formatCurrency(summary.totalAmountReceived) },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-line bg-cream p-5 text-center">
          <p className="font-serif text-3xl text-ink">{item.value}</p>
          <p className="mt-1 font-sans text-xs uppercase tracking-widest text-ink-soft">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}
