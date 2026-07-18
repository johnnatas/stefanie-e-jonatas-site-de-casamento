import type { Metadata } from "next";
import { ArchFlipCard } from "@/components/ui/ArchFlipCard";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { MILESTONES } from "@/shared/milestones";

export const metadata: Metadata = {
  title: "Nossa História | Stéfanie & Jonatas",
};

export default function OurStoryPage() {
  return (
    <div className="pb-20">
      <section className="mx-auto max-w-3xl px-6 pt-20 text-center">
        <span className="font-serif text-xs uppercase tracking-widest text-gold">Nossa história</span>
        <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">Como tudo começou</h1>
        <p className="mt-6 font-sans leading-relaxed text-ink-soft">
          Toda grande história de amor começa de um jeito simples. A nossa não foi diferente — um
          encontro despretensioso que, com o tempo, se transformou em cumplicidade, parceria e um
          amor que a gente quer celebrar ao lado de quem a gente ama.
        </p>
      </section>

      <div className="mx-auto mt-16 flex max-w-3xl flex-col gap-16 px-6">
        {MILESTONES.map((milestone, index) => (
          <div key={milestone.title} className="flex flex-col items-center gap-6 text-center">
            <ArchFlipCard
              className="h-72 w-full max-w-xs"
              number={`0${index + 1}.`}
              image={
                <PlaceholderImage
                  label={`Foto — ${milestone.title}`}
                  className="absolute inset-0 h-full w-full"
                />
              }
              title={milestone.title}
              date={milestone.date}
              description={milestone.description}
            />
            <div>
              <span className="font-sans text-xs uppercase tracking-widest text-gold">
                {milestone.date}
              </span>
              <h2 className="mt-2 font-serif text-3xl text-ink">{milestone.title}</h2>
              <p className="mt-3 font-sans text-sm leading-relaxed text-ink-soft">
                {milestone.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <section className="mx-auto mt-16 max-w-3xl px-6 text-center">
        <p className="font-sans leading-relaxed text-ink-soft">
          E agora, depois de tantas páginas escritas juntos, chegou a hora de começar mais um
          capítulo — e não podíamos estar mais felizes em compartilhar esse momento com você.
        </p>
      </section>
    </div>
  );
}
