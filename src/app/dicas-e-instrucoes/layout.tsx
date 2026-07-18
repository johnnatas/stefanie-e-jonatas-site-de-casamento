import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dicas e Instruções | Stéfanie & Jonatas",
};

const TABS = [
  { label: "Cerimônia", href: "/dicas-e-instrucoes/cerimonia" },
  { label: "Traje", href: "/dicas-e-instrucoes/codigo-de-vestimenta" },
  { label: "Hospedagem", href: "/dicas-e-instrucoes/hospedagem" },
];

export default function TipsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-20">
      <section className="mx-auto max-w-3xl px-6 pt-20 text-center">
        <span className="font-serif text-xs uppercase tracking-widest text-gold">Para os convidados</span>
        <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">Dicas e Instruções</h1>
      </section>

      <nav className="mx-auto mt-10 flex max-w-3xl justify-center gap-8 border-b border-line px-6">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="pb-4 font-serif text-sm uppercase tracking-widest text-ink-soft hover:text-gold"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="mt-12">{children}</div>
    </div>
  );
}
