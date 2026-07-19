"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";

const AUTOPLAY_INTERVAL_MS = 5000;
const FALLBACK_SLIDE_COUNT = 3;

interface HeroCarouselProps {
  photos: string[];
}

/**
 * Pure background layer for the home hero: rotating photo carousel (shown
 * at its original colors, no tint/filter) and slide-position dots. Must
 * render inside a `relative` parent — see HomeHero, which composes this
 * with the foreground content. Renders exactly `photos.length` slides, or
 * `FALLBACK_SLIDE_COUNT` placeholder slides when no photos have been
 * uploaded yet.
 */
export function HeroCarousel({ photos }: HeroCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const slides: (string | null)[] = photos.length > 0 ? photos : Array.from({ length: FALLBACK_SLIDE_COUNT }, () => null);

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
          {slides.map((photo, index) => (
            <div key={index} className="relative h-full min-w-0 flex-[0_0_100%]">
              <PhotoOrPlaceholder src={photo} label={`Foto do casal ${index + 1}`} className="h-full w-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-14 left-1/2 flex -translate-x-1/2 gap-2">
        {slides.map((_, index) => (
          <span
            key={index}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              index === selectedIndex ? "bg-paper" : "bg-paper/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
