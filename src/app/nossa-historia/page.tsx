import type { Metadata } from "next";
import { StoryTimeline } from "@/components/home/StoryTimeline";

export const metadata: Metadata = {
  title: "Nossa História | Stéfanie & Jonatas",
};

export default function OurStoryPage() {
  return (
    <div className="pb-12">
      <section className="mx-auto max-w-3xl px-6 pt-20 text-center">
        <span className="font-sans text-xs uppercase tracking-widest text-rose">Nossa história</span>
        <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">Como tudo começou</h1>
        <p className="mt-6 font-sans leading-relaxed text-ink-soft">
          Toda grande história de amor começa de um jeito simples. A nossa não foi diferente — um
          encontro despretensioso que, com o tempo, se transformou em cumplicidade, parceria e um
          amor que a gente quer celebrar ao lado de quem a gente ama.
        </p>
      </section>

      <StoryTimeline showHeading={false} showReadMoreLink={false} />

      <section className="mx-auto max-w-3xl px-6 text-center">
        <p className="font-sans leading-relaxed text-ink-soft">
          E agora, depois de tantas páginas escritas juntos, chegou a hora de começar mais um
          capítulo — e não podíamos estar mais felizes em compartilhar esse momento com você.
        </p>
      </section>
    </div>
  );
}
