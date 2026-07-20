import Link from "next/link";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { DashboardSummary } from "@/application/use-cases/admin/GetDashboardSummaryUseCase";

interface DashboardStatsProps {
  summary: DashboardSummary;
}

export function DashboardStats({ summary }: DashboardStatsProps) {
  const items = [
    { label: "Confirmados", value: summary.confirmedGuestsCount, href: "/admin/convidados?status=confirmed" },
    { label: "Pendentes", value: summary.pendingGuestsCount, href: "/admin/convidados?status=pending" },
    { label: "Não vão", value: summary.declinedGuestsCount, href: "/admin/convidados?status=declined" },
    { label: "Total de pessoas", value: summary.totalAttendeesCount, href: "/admin/convidados" },
    { label: "Presentes cadastrados", value: summary.totalGiftsCount, href: "/admin/presentes" },
    { label: "Presentes recebidos", value: summary.paidGiftsCount, href: "/admin/presentes?status=paid" },
    {
      label: "Valor arrecadado",
      value: formatCurrency(summary.totalAmountReceived),
      href: "/admin/presentes?status=paid",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="rounded-lg border border-line bg-paper p-5 text-center transition-colors hover:border-moss"
        >
          <p className="font-serif text-3xl text-forest">{item.value}</p>
          <p className="mt-1 font-sans text-xs uppercase tracking-widest text-forest/70">
            {item.label}
          </p>
        </Link>
      ))}
    </div>
  );
}
