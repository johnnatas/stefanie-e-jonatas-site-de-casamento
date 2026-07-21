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
      className="relative -mt-[72px] min-h-dvh overflow-hidden after:pointer-events-none after:absolute
        after:inset-x-0 after:bottom-0 after:h-24 after:w-full after:bg-[url('/images/torn-paper.png')]
        after:bg-cover after:bg-top after:bg-no-repeat after:content-[''] sm:after:h-32 md:after:h-40"
    >
      <HeroCarousel photos={heroContent.photos} />

      <div className="relative flex min-h-dvh flex-col items-center justify-center gap-12 px-6 pt-[136px] pb-28 text-center text-paper">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="flex flex-col items-center gap-6"
        >
          <h1 className="font-serif text-5xl sm:text-7xl">{COUPLE_NAMES}</h1>
          <span aria-hidden="true" className="h-px w-16 bg-paper" />
          <p className="font-script text-2xl text-paper/90">{heroContent.tagline}</p>
          <p className="font-serif text-sm uppercase tracking-widest text-paper/90">
            {formatWeddingDateLabel(settings.weddingDateIso)} · {settings.weddingLocationLabel}
          </p>
          <PillButton
            href="/confirmar-presenca"
            className="border-paper text-paper hover:bg-paper hover:text-forest"
          >
            Confirme sua presença
          </PillButton>
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
