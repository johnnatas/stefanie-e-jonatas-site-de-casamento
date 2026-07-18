import Link from "next/link";

interface InfoCard {
  title: string;
  description: string;
  href: string;
}

const CARDS: InfoCard[] = [
  {
    title: "Cerimônia",
    description: "Horário, local e tudo sobre a celebração.",
    href: "/dicas-e-instrucoes/cerimonia",
  },
  {
    title: "Traje",
    description: "Código de vestimenta para o grande dia.",
    href: "/dicas-e-instrucoes/codigo-de-vestimenta",
  },
  {
    title: "Hospedagem",
    description: "Sugestões de hotéis e pousadas próximas.",
    href: "/dicas-e-instrucoes/hospedagem",
  },
  {
    title: "Lista de presentes",
    description: "Ajude a construir o começo da nossa nova casa.",
    href: "/presentes",
  },
  {
    title: "Nossa história",
    description: "Como tudo começou até chegarmos aqui.",
    href: "/nossa-historia",
  },
];

export function InfoCards() {
  return (
    <section className="bg-cream-dark/40 py-24">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Link key={card.href} href={card.href} className="flip-card h-48">
            <div className="flip-card-inner h-full w-full">
              <div className="flip-card-front flex h-full flex-col items-center justify-center rounded-lg border border-line bg-cream px-6 text-center">
                <h3 className="font-serif text-2xl text-ink">{card.title}</h3>
              </div>
              <div className="flip-card-back flex h-full flex-col items-center justify-center rounded-lg border border-rose bg-cream px-6 text-center">
                <h3 className="font-serif text-xl text-rose">{card.title}</h3>
                <p className="mt-3 font-sans text-sm text-ink-soft">{card.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
