"use client";

import { motion } from "framer-motion";
import { ArchFlipCard } from "@/components/ui/ArchFlipCard";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { MILESTONES } from "@/shared/milestones";
import type { HomeMilestonePhotosContent } from "@/application/content/schemas";

const HEADING_LINES = [
  { text: "Save", color: "var(--color-forest)", opacity: 1 },
  { text: "the", color: "var(--color-forest)", opacity: 0.7 },
  { text: "date!", color: "var(--color-moss)", opacity: 1 },
];

const MILESTONE_KEYS = ["beginning", "proposal", "wedding"] as const;

interface SaveTheDateSectionProps {
  milestonePhotos: HomeMilestonePhotosContent;
}

export function SaveTheDateSection({ milestonePhotos }: SaveTheDateSectionProps) {
  return (
    <section
      className="relative overflow-hidden bg-mist px-6 py-32 before:pointer-events-none before:absolute
        before:inset-x-0 before:top-0 before:h-24 before:w-full before:bg-[url('/images/torn-paper.png')]
        before:bg-cover before:bg-top before:bg-no-repeat before:content-[''] sm:before:h-32 md:before:h-40"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-16 md:flex-row md:items-center md:gap-24">
        <h2 className="flex flex-col items-center gap-1 text-center md:items-start md:text-left">
          {HEADING_LINES.map((line) => (
            <span
              key={line.text}
              className="font-serif text-6xl uppercase leading-none sm:text-7xl"
              style={{ color: line.color, opacity: line.opacity }}
            >
              {line.text}
            </span>
          ))}
        </h2>

        <div className="grid flex-1 grid-cols-1 gap-8 md:grid-cols-3">
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
                  <PhotoOrPlaceholder
                    src={milestonePhotos[MILESTONE_KEYS[index]]}
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
