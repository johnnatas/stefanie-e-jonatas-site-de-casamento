"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/shared/utils/cn";
import { PinterestBoardEmbed } from "@/components/ui/PinterestBoardEmbed";

interface DressCodeInspirationProps {
  him: string | null;
  her: string | null;
  himLabel?: string | null;
  herLabel?: string | null;
}

interface Board {
  key: "her" | "him";
  title: string;
  toggleLabel: string;
  url: string;
  label?: string | null;
}

const toggleBase = "rounded-full px-6 py-2 font-serif text-sm uppercase tracking-wide transition-colors";

export function DressCodeInspiration({ him, her, himLabel, herLabel }: DressCodeInspirationProps) {
  const boards: Board[] = [
    ...(her ? [{ key: "her" as const, title: "ELA", toggleLabel: "Ela", url: her, label: herLabel }] : []),
    ...(him ? [{ key: "him" as const, title: "ELE", toggleLabel: "Ele", url: him, label: himLabel }] : []),
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
            className="mx-auto inline-flex rounded-full border border-line bg-paper p-1"
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
        <div className="mx-auto mt-6 flex justify-center">
          {boards.length === 1 && <PinterestBoardEmbed boardUrl={boards[0].url} label={boards[0].label} />}
        </div>
        {boards.length > 1 && (
          <div className="mt-6 w-full overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {boards.map((board) => (
                <div key={board.key} className="min-w-0 flex-[0_0_100%]">
                  <div className="flex justify-center px-1">
                    <PinterestBoardEmbed boardUrl={board.url} label={board.label} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desktop: Ela | Ele side by side with a central divider (single column if only one board exists) */}
      <div
        className={cn(
          "hidden lg:flex lg:justify-center",
          boards.length > 1 && "lg:grid lg:grid-cols-2 lg:gap-8 lg:divide-x lg:divide-line"
        )}
      >
        {boards.map((board, index) => (
          <div key={board.key} className={cn("flex flex-col items-center", index === 1 && "lg:pl-8")}>
            <h3 className="font-serif text-3xl text-forest">{board.title}</h3>
            <div className="mt-6 flex w-full justify-center">
              <PinterestBoardEmbed boardUrl={board.url} label={board.label} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
