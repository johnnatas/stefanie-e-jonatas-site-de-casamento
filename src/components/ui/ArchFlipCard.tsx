import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

interface ArchFlipCardProps {
  number: string;
  image: ReactNode;
  title: string;
  date: string;
  description: string;
  className?: string;
}

/**
 * Arch-shaped (rounded top, square base) photo card that flips on
 * hover/focus to reveal the milestone details — reuses the .flip-card
 * mechanics already used by InfoCards, just with the arch silhouette and
 * photo-forward front face from the reference site's "Save the date"
 * timeline.
 */
export function ArchFlipCard({ number, image, title, date, description, className }: ArchFlipCardProps) {
  return (
    <div className={cn("flip-card h-80 w-full", className)}>
      <div className="flip-card-inner h-full w-full">
        <div className="flip-card-front relative h-full w-full overflow-hidden rounded-t-[999px] rounded-b-lg grayscale transition-[filter] duration-500 hover:grayscale-0">
          {image}
          <span className="absolute bottom-3 right-4 font-serif text-3xl text-paper">{number}</span>
        </div>
        <div className="flip-card-back flex h-full w-full flex-col items-center justify-center gap-2 rounded-t-[999px] rounded-b-lg bg-charcoal px-6 text-center">
          <span className="font-sans text-xs uppercase tracking-widest text-gold-soft">{date}</span>
          <h3 className="font-serif text-2xl text-paper">{title}</h3>
          <p className="font-sans text-sm leading-relaxed text-paper/80">{description}</p>
        </div>
      </div>
    </div>
  );
}
