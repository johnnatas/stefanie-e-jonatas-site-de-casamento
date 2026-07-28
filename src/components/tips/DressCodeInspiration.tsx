"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/shared/utils/cn";
import { PinterestPinGrid } from "@/components/tips/PinterestPinGrid";
import type { PinterestPin } from "@/infrastructure/pinterest/fetchPinterestBoardPins";

interface DressCodeInspirationProps {
  himPins: PinterestPin[];
  herPins: PinterestPin[];
}

interface Board {
  key: "her" | "him";
  title: string;
  toggleLabel: string;
  pins: PinterestPin[];
}

const toggleBase = "flex-1 rounded-full px-6 py-3 font-serif text-sm uppercase tracking-wide transition-colors";

export function DressCodeInspiration({ himPins, herPins }: DressCodeInspirationProps) {
  const boards: Board[] = [
    ...(herPins.length > 0 ? [{ key: "her" as const, title: "ELA", toggleLabel: "Ela", pins: herPins }] : []),
    ...(himPins.length > 0 ? [{ key: "him" as const, title: "ELE", toggleLabel: "Ele", pins: himPins }] : []),
  ];

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start" });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      emblaApi?.scrollTo(index);
    },
    [emblaApi]
  );

  if (boards.length === 0) return null;

  return (
    <div>
      {/* Mobile: full-width swipeable (or tap-to-select) carousel with a slide transition */}
      <div className="lg:hidden">
        {boards.length > 1 && (
          <div
            role="group"
            aria-label="Escolha entre Ela e Ele"
            className="flex w-full rounded-full border border-line bg-paper p-1"
          >
            {boards.map((board, index) => (
              <button
                key={board.key}
                type="button"
                aria-pressed={selectedIndex === index}
                onClick={() => scrollTo(index)}
                className={cn(
                  toggleBase,
                  selectedIndex === index ? "bg-moss text-paper" : "text-forest/70 hover:text-forest"
                )}
              >
                {board.toggleLabel}
              </button>
            ))}
          </div>
        )}

        {boards.length === 1 && (
          <div className="mt-6">
            <PinterestPinGrid pins={boards[0].pins} />
          </div>
        )}

        {boards.length > 1 && (
          <div className="mt-6 w-full overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {boards.map((board) => (
                <div key={board.key} className="min-w-0 flex-[0_0_100%] px-1">
                  <PinterestPinGrid pins={board.pins} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desktop: Ela | Ele side by side with a central divider (single column if only one board exists) */}
      <div className={cn("hidden lg:block", boards.length > 1 && "lg:grid lg:grid-cols-2 lg:gap-16 lg:divide-x lg:divide-line")}>
        {boards.map((board, index) => (
          <div key={board.key} className={index === 0 ? "lg:pr-8" : "lg:pl-8"}>
            <h3 className="text-center font-serif text-3xl text-forest">{board.title}</h3>
            <div className="mt-6">
              <PinterestPinGrid pins={board.pins} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
