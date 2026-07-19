"use client";

import { motion } from "framer-motion";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { CountdownTimer } from "@/components/home/CountdownTimer";
import { PillButton } from "@/components/ui/PillButton";
import { formatWeddingDateLabel } from "@/shared/utils/formatWeddingDateLabel";
import { COUPLE_NAMES } from "@/shared/navigation";
import type { HomeHeroContent, SettingsContent } from "@/application/content/schemas";

interface HomeHeroProps {
  heroContent: HomeHeroContent;
  settings: SettingsContent;
}

export function HomeHero({ heroContent, settings }: HomeHeroProps) {
  return (
    <section
      className="relative -mt-[72px] overflow-hidden after:pointer-events-none after:absolute after:inset-x-0
        after:bottom-0 after:h-16 after:w-full after:bg-[url('/images/torn-paper.png')] after:bg-[length:100%_auto]
        after:bg-bottom after:bg-no-repeat after:content-[''] sm:after:h-24 md:after:h-32"
    >
      <HeroCarousel photos={heroContent.photos} />

      <div className="relative flex flex-col items-center gap-12 px-6 pb-28 pt-[136px] text-center text-paper">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="flex flex-col items-center gap-6"
        >
          <span className="font-sans text-xs uppercase tracking-[0.3em] text-paper/90">{heroContent.eyebrow}</span>
          <h1 className="font-serif text-5xl sm:text-7xl">{COUPLE_NAMES}</h1>
          <span aria-hidden="true" className="h-px w-16 bg-moss" />
          <p className="font-script text-2xl text-paper/90">{heroContent.tagline}</p>
          <p className="font-serif text-sm uppercase tracking-widest text-paper/90">
            {formatWeddingDateLabel(settings.weddingDateIso)} · {settings.weddingLocationLabel}
          </p>
          <PillButton href="/confirmar-presenca">Confirme sua presença</PillButton>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <CountdownTimer weddingDateIso={settings.weddingDateIso} />
        </motion.div>
      </div>
    </section>
  );
}
