import type { Metadata } from "next";
import { PolaroidGallery } from "@/components/ui/PolaroidGallery";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export const metadata: Metadata = {
  title: "Nossa História | Stéfanie & Jonatas",
};

export default async function OurStoryPage() {
  const gallery = await getSiteContentOrDefault("home-gallery");

  return (
    <div className="pb-20">
      <section className="mx-auto max-w-3xl px-6 pt-20 text-center">
        <span className="font-serif text-xs uppercase tracking-widest text-moss">Nossa história</span>
        <h1 className="mt-3 font-serif text-4xl text-forest sm:text-5xl">Como tudo começou</h1>
        <p className="mt-6 font-sans leading-relaxed text-forest/70">
          Toda grande história de amor começa de um jeito simples. A nossa não foi diferente — um
          encontro despretensioso que, com o tempo, se transformou em cumplicidade, parceria e um
          amor que a gente quer celebrar ao lado de quem a gente ama.
        </p>
      </section>

      <div className="mx-auto mt-16 max-w-3xl px-6">
        <PolaroidGallery items={gallery.items} />
      </div>

      <section className="mx-auto mt-16 max-w-3xl px-6 text-center">
        <p className="font-sans leading-relaxed text-forest/70">
          E agora, depois de tantas páginas escritas juntos, chegou a hora de começar mais um
          capítulo — e não podíamos estar mais felizes em compartilhar esse momento com você.
        </p>
      </section>
    </div>
  );
}
