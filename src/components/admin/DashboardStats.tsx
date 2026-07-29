import Link from "next/link";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { DashboardSummary } from "@/application/use-cases/admin/GetDashboardSummaryUseCase";

interface DashboardStatsProps {
  summary: DashboardSummary;
}

interface StatItem {
  label: string;
  value: string | number;
  href: string;
}

function StatCard({ item }: { item: StatItem }) {
  return (
    <Link
      href={item.href}
      className="rounded-lg border border-line bg-paper p-5 text-center transition-colors hover:border-moss"
    >
      <p className="font-serif text-3xl text-forest">{item.value}</p>
      <p className="mt-1 font-sans text-xs uppercase tracking-widest text-forest/70">{item.label}</p>
    </Link>
  );
}

function StatGrid({ items }: { items: StatItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <StatCard key={item.label} item={item} />
      ))}
    </div>
  );
}

export function DashboardStats({ summary }: DashboardStatsProps) {
  const totalGuestsItem: StatItem = {
    label: "Total de pessoas",
    value: summary.totalGuestsCount,
    href: "/admin/convidados",
  };
  const guestItems: StatItem[] = [
    { label: "Confirmados", value: summary.confirmedGuestsCount, href: "/admin/convidados?status=confirmed" },
    { label: "Pendentes", value: summary.pendingGuestsCount, href: "/admin/convidados?status=pending" },
    { label: "Não vão", value: summary.declinedGuestsCount, href: "/admin/convidados?status=declined" },
  ];

  const totalGiftsItem: StatItem = {
    label: "Presentes cadastrados",
    value: summary.totalGiftsCount,
    href: "/admin/presentes",
  };
  const giftItems: StatItem[] = [
    { label: "Presentes recebidos", value: summary.paidGiftsCount, href: "/admin/presentes?status=paid" },
    {
      label: "Valor arrecadado",
      value: formatCurrency(summary.totalAmountReceived),
      href: "/admin/presentes?status=paid",
    },
    {
      label: "Valor total cadastrado",
      value: formatCurrency(summary.totalAmountRegistered),
      href: "/admin/presentes",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="font-sans text-xs uppercase tracking-[0.2em] text-forest/70">Convidados</span>
        <div className="flex flex-col gap-4">
          <StatCard item={totalGuestsItem} />
          <StatGrid items={guestItems} />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <span className="font-sans text-xs uppercase tracking-[0.2em] text-forest/70">Presentes</span>
        <div className="flex flex-col gap-4">
          <StatCard item={totalGiftsItem} />
          <StatGrid items={giftItems} />
        </div>
      </div>
    </div>
  );
}
