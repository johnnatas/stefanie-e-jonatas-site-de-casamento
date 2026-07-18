"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { MILESTONES } from "@/shared/milestones";

interface StoryTimelineProps {
  showReadMoreLink?: boolean;
  showHeading?: boolean;
}

export function StoryTimeline({ showReadMoreLink = true, showHeading = true }: StoryTimelineProps) {
  return (
    <section className="relative mx-auto max-w-5xl px-6 py-24">
      {showHeading && (
        <>
          <div
            aria-hidden="true"
            className="animate-float-rotate absolute -top-6 right-6 h-16 w-16 rounded-full border border-gold/40 sm:right-16"
          />
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center font-serif text-4xl text-ink"
          >
            Nossa história
          </motion.h2>
          <div aria-hidden="true" className="bg-wave mx-auto mt-6 h-5 w-40" />
        </>
      )}

      <div className="mt-16 flex flex-col gap-16">
        {MILESTONES.map((milestone, index) => (
          <motion.div
            key={milestone.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className={`flex flex-col items-center gap-8 md:flex-row ${
              index % 2 === 1 ? "md:flex-row-reverse" : ""
            }`}
          >
            <PlaceholderImage
              label={`Foto — ${milestone.title}`}
              className="h-64 w-full rounded-lg md:w-1/2"
            />
            <div className="flex flex-col items-center text-center md:w-1/2 md:items-start md:text-left">
              <span className="font-sans text-xs uppercase tracking-widest text-gold">
                {milestone.date}
              </span>
              <h3 className="mt-2 font-serif text-3xl text-ink">{milestone.title}</h3>
              <p className="mt-3 font-sans text-sm leading-relaxed text-ink-soft">
                {milestone.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {showReadMoreLink && (
        <div className="mt-16 text-center">
          <Link
            href="/nossa-historia"
            className="font-sans text-sm uppercase tracking-widest text-gold underline underline-offset-4 hover:text-ink"
          >
            Leia a história completa
          </Link>
        </div>
      )}
    </section>
  );
}
