"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

const SLIDE_LABELS = ["Foto do casal 1", "Foto do casal 2", "Foto do casal 3"];
const AUTOPLAY_INTERVAL_MS = 5000;

/**
 * Pure background layer for the home hero: rotating photo carousel, dark
 * overlay, and slide-position dots. Must render inside a `relative`
 * parent — see HomeHero, which composes this with the foreground content.
 */
export function HeroCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    const timeoutId = setTimeout(onSelect, 0);
    return () => clearTimeout(timeoutId);
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi) return;
    const intervalId = setInterval(() => emblaApi.scrollNext(), AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [emblaApi]);

  return (
    <div className="absolute inset-0 overflow-hidden" data-testid="hero-carousel">
      <div className="h-full" ref={emblaRef}>
        <div className="flex h-full">
          {SLIDE_LABELS.map((label) => (
            <div key={label} className="relative h-full min-w-0 flex-[0_0_100%]">
              <PlaceholderImage label={label} className="h-full w-full grayscale" />
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-0 bg-charcoal/50" />

      <div className="absolute bottom-14 left-1/2 flex -translate-x-1/2 gap-2">
        {SLIDE_LABELS.map((label, index) => (
          <span
            key={label}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              index === selectedIndex ? "bg-paper" : "bg-paper/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
