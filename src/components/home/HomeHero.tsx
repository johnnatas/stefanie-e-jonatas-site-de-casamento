"use client";

import { motion } from "framer-motion";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { CountdownTimer } from "@/components/home/CountdownTimer";
import { PillButton } from "@/components/ui/PillButton";
import { Monogram } from "@/components/ui/Monogram";
import { WEDDING_DATE_LABEL, WEDDING_LOCATION_LABEL } from "@/shared/navigation";

export function HomeHero() {
  return (
    <section
      className="relative -mt-[72px] overflow-hidden after:pointer-events-none after:absolute after:inset-0
        after:h-full after:w-full after:bg-[url('/images/torn-paper.png')] after:bg-contain after:bg-bottom
        after:bg-no-repeat after:content-['']"
    >
      <HeroCarousel />

      <div className="relative flex flex-col items-center gap-20 px-6 pb-28 pt-[136px] text-center text-paper">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="flex flex-col items-center gap-6"
        >
          <span className="font-sans text-xs uppercase tracking-[0.3em] text-paper/90">
            Estamos nos casando
          </span>
          <h1>
            <Monogram light className="h-32 w-auto sm:h-44" />
          </h1>
          <span aria-hidden="true" className="h-px w-16 bg-moss" />
          <p className="font-script text-2xl text-paper/90">nas ditas linhas em que nos encontramos</p>
          <p className="font-serif text-sm uppercase tracking-widest text-paper/90">
            {WEDDING_DATE_LABEL} · {WEDDING_LOCATION_LABEL}
          </p>
          <PillButton href="/confirmar-presenca">Confirme sua presença</PillButton>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <CountdownTimer />
        </motion.div>
      </div>
    </section>
  );
}
