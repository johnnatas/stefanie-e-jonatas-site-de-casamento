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
    <section className="bg-paper-soft px-6 py-24">
      <div className="mx-auto flex max-w-5xl flex-col gap-12 md:flex-row md:items-center md:gap-16">
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
