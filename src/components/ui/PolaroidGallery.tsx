"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { GalleryMediaItem } from "@/application/content/schemas";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { cn } from "@/shared/utils/cn";

const ROTATION_PATTERN_DEG = [-6, 4, -8, 5, -4, 7, -5, 3];

interface PolaroidGalleryProps {
  items: GalleryMediaItem[];
  className?: string;
}

/**
 * A scattered "photos tossed on the table" gallery — each item is a
 * polaroid-framed card at a fixed small rotation that straightens up and
 * lifts on hover. Clicking any item opens a full-screen lightbox with
 * prev/next navigation across every item. Shared between the Home page's
 * Save the Date section and Nossa História.
 */
export function PolaroidGallery({ items, className }: PolaroidGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-6 sm:gap-8", className)}>
      {items.map((item, index) => (
        <PolaroidCard
          key={item.url}
          item={item}
          rotation={ROTATION_PATTERN_DEG[index % ROTATION_PATTERN_DEG.length]}
          index={index}
          prefersReducedMotion={prefersReducedMotion}
          onSelect={() => setActiveIndex(index)}
        />
      ))}

      {activeIndex !== null && (
        <MediaLightbox items={items} initialIndex={activeIndex} onClose={() => setActiveIndex(null)} />
      )}
    </div>
  );
}

function PolaroidCard({
  item,
  rotation,
  index,
  prefersReducedMotion,
  onSelect,
}: {
  item: GalleryMediaItem;
  rotation: number;
  index: number;
  prefersReducedMotion: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      aria-label={item.type === "video" ? "Abrir vídeo em tela cheia" : "Abrir foto em tela cheia"}
      className="relative w-36 shrink-0 rounded-sm border border-line bg-mist p-2 pb-6 sm:w-44"
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.6, rotate: rotation }}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, scale: 1, rotate: rotation }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: index * 0.08 }}
      style={prefersReducedMotion ? { transform: `rotate(${rotation}deg)` } : undefined}
      whileHover={prefersReducedMotion ? undefined : { rotate: 0, scale: 1.08, zIndex: 10 }}
      whileFocus={prefersReducedMotion ? undefined : { rotate: 0, scale: 1.08, zIndex: 10 }}
    >
      <span className="relative block aspect-square w-full overflow-hidden bg-line">
        {item.type === "video" ? (
          <video
            src={item.url}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt="" className="h-full w-full object-cover" />
        )}
      </span>
    </motion.button>
  );
}

function MediaLightbox({
  items,
  initialIndex,
  onClose,
}: {
  items: GalleryMediaItem[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, true, onClose);

  const canGoPrev = index > 0;
  const canGoNext = index < items.length - 1;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") setIndex((current) => Math.max(current - 1, 0));
      if (event.key === "ArrowRight") setIndex((current) => Math.min(current + 1, items.length - 1));
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [items.length]);

  const item = items[index];

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Visualização de foto ou vídeo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-forest/90 px-4 py-12"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="absolute top-4 right-4 flex min-h-11 min-w-11 items-center justify-center text-3xl leading-none text-paper"
      >
        &times;
      </button>

      <button
        type="button"
        onClick={() => setIndex((current) => Math.max(current - 1, 0))}
        disabled={!canGoPrev}
        aria-label="Foto ou vídeo anterior"
        className="absolute left-2 flex min-h-11 min-w-11 items-center justify-center text-4xl text-paper disabled:opacity-30 sm:left-6"
      >
        ‹
      </button>

      <div className="flex max-h-full max-w-full items-center justify-center">
        {item.type === "video" ? (
          <video
            key={item.url}
            src={item.url}
            controls
            autoPlay
            playsInline
            className="max-h-[80vh] max-w-full"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={item.url} src={item.url} alt="" className="max-h-[80vh] max-w-full object-contain" />
        )}
      </div>

      <button
        type="button"
        onClick={() => setIndex((current) => Math.min(current + 1, items.length - 1))}
        disabled={!canGoNext}
        aria-label="Próxima foto ou vídeo"
        className="absolute right-2 flex min-h-11 min-w-11 items-center justify-center text-4xl text-paper disabled:opacity-30 sm:right-6"
      >
        ›
      </button>
    </div>
  );
}
