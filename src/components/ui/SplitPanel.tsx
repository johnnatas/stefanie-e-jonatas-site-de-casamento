import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";
import { PillButton } from "@/components/ui/PillButton";

interface SplitPanelProps {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  image: ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
  tone?: "light" | "dark";
  imageSide?: "left" | "right";
  className?: string;
}

/**
 * Full-width two-column panel (photo one side, text + optional CTA the
 * other), alternating light/dark tone — used for Dicas e Instruções and
 * the Presentes intro, matching the reference site's split sections.
 */
export function SplitPanel({
  eyebrow,
  title,
  children,
  image,
  ctaLabel,
  ctaHref,
  tone = "light",
  imageSide = "right",
  className,
}: SplitPanelProps) {
  const isDark = tone === "dark";

  return (
    <section
      className={cn(
        "grid grid-cols-1 md:grid-cols-2",
        isDark ? "bg-forest text-paper" : "bg-paper-soft text-forest",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-col justify-center gap-4 px-6 py-16 sm:px-12",
          imageSide === "right" ? "md:order-1" : "md:order-2"
        )}
      >
        {eyebrow && (
          <span
            className={cn(
              "font-serif text-xs uppercase tracking-[0.2em]",
              isDark ? "text-moss" : "text-moss"
            )}
          >
            {eyebrow}
          </span>
        )}
        <h2 className="font-serif text-3xl sm:text-4xl">{title}</h2>
        <div className={cn("font-sans text-sm leading-relaxed", isDark ? "text-paper/80" : "text-forest/70")}>
          {children}
        </div>
        {ctaLabel && ctaHref && (
          <div>
            <PillButton
              href={ctaHref}
              variant={isDark ? "secondary" : "primary"}
              className={isDark ? "border-paper/40 text-paper hover:bg-paper hover:text-forest" : undefined}
            >
              {ctaLabel}
            </PillButton>
          </div>
        )}
      </div>
      <div
        className={cn("relative min-h-[280px]", imageSide === "right" ? "md:order-2" : "md:order-1")}
      >
        {image}
      </div>
    </section>
  );
}
