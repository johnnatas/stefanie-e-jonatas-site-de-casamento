"use client";

import { motion } from "framer-motion";
import { ArchFlipCard } from "@/components/ui/ArchFlipCard";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { MILESTONES } from "@/shared/milestones";

const HEADING_LINES = [
  { text: "Save", color: "var(--color-forest)" },
  { text: "the", color: "var(--color-moss)" },
  { text: "date!", color: "var(--color-moss)" },
];

export function SaveTheDateSection() {
  return (
    <section className="bg-[#f3f3f3] px-6 py-24">
      <div className="mx-auto flex max-w-5xl flex-col gap-12 md:flex-row md:items-center md:gap-16">
        <h2 className="flex flex-col items-center gap-1 text-center md:items-start md:text-left">
          {HEADING_LINES.map((line) => (
            <span
              key={line.text}
              className="font-serif text-6xl uppercase leading-none sm:text-7xl"
              style={{ color: line.color }}
            >
              {line.text}
            </span>
          ))}
        </h2>

        <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-3">
          {MILESTONES.map((milestone, index) => (
            <motion.div
              key={milestone.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <ArchFlipCard
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
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
