"use client";

import { useEffect, useRef, useState } from "react";
import type { PinterestPin } from "@/infrastructure/pinterest/fetchPinterestBoardPins";

interface PinterestPinGridProps {
  pins: PinterestPin[];
}

const BATCH_SIZE = 8;

/**
 * Masonry-style grid of real Pinterest pin images (fetched server-side via
 * the board's RSS feed — see fetchPinterestBoardPins), revealing more pins
 * in batches as the user scrolls near the bottom, for an infinite-scroll
 * feel without loading every image up front.
 */
export function PinterestPinGrid({ pins }: PinterestPinGridProps) {
  const [visibleCount, setVisibleCount] = useState(Math.min(BATCH_SIZE, pins.length));
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((count) => Math.min(count + BATCH_SIZE, pins.length));
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [pins.length]);

  if (pins.length === 0) return null;

  const visiblePins = pins.slice(0, visibleCount);

  return (
    <div>
      <div className="columns-2 gap-4">
        {visiblePins.map((pin) => (
          <a
            key={pin.pinUrl}
            href={pin.pinUrl}
            target="_blank"
            rel="noreferrer"
            className="group relative mb-4 block break-inside-avoid overflow-hidden rounded-lg border border-line"
          >
            <img src={pin.imageUrl} alt="" loading="lazy" className="block w-full" />
            <span className="absolute right-2 top-2 rounded-full bg-forest/80 px-3 py-1 font-sans text-xs text-paper opacity-0 transition-opacity group-hover:opacity-100">
              Ver no Pinterest
            </span>
          </a>
        ))}
      </div>
      {visibleCount < pins.length && <div ref={sentinelRef} data-testid="pin-grid-sentinel" className="h-1" />}
    </div>
  );
}
