"use client";

import { useState } from "react";
import { cn } from "@/shared/utils/cn";
import { PinterestBoardEmbed } from "@/components/ui/PinterestBoardEmbed";

interface DressCodeInspirationProps {
  him: string | null;
  her: string | null;
  himLabel?: string | null;
  herLabel?: string | null;
}

const toggleBase =
  "rounded-full px-6 py-2 font-serif text-sm uppercase tracking-wide transition-colors";

export function DressCodeInspiration({ him, her, himLabel, herLabel }: DressCodeInspirationProps) {
  const [selected, setSelected] = useState<"him" | "her">(her ? "her" : "him");

  if (!him && !her) return null;

  return (
    <div>
      {/* Mobile: segmented toggle + single board */}
      <div className="lg:hidden">
        <div
          role="group"
          aria-label="Escolha entre Ela e Ele"
          className="inline-flex rounded-full border border-line bg-paper p-1"
        >
          {her && (
            <button
              type="button"
              aria-pressed={selected === "her"}
              onClick={() => setSelected("her")}
              className={cn(toggleBase, selected === "her" ? "bg-moss text-paper" : "text-forest/70 hover:text-forest")}
            >
              Ela
            </button>
          )}
          {him && (
            <button
              type="button"
              aria-pressed={selected === "him"}
              onClick={() => setSelected("him")}
              className={cn(toggleBase, selected === "him" ? "bg-moss text-paper" : "text-forest/70 hover:text-forest")}
            >
              Ele
            </button>
          )}
        </div>
        <div className="mt-6 flex justify-center">
          {selected === "her" && her && <PinterestBoardEmbed boardUrl={her} label={herLabel} />}
          {selected === "him" && him && <PinterestBoardEmbed boardUrl={him} label={himLabel} />}
        </div>
      </div>

      {/* Desktop: Ela | Ele side by side with a central divider */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-8 lg:divide-x lg:divide-line">
        {her && (
          <div className="flex flex-col items-center">
            <h3 className="font-serif text-3xl text-forest">ELA</h3>
            <div className="mt-6 w-full">
              <PinterestBoardEmbed boardUrl={her} label={herLabel} />
            </div>
          </div>
        )}
        {him && (
          <div className="flex flex-col items-center lg:pl-8">
            <h3 className="font-serif text-3xl text-forest">ELE</h3>
            <div className="mt-6 w-full">
              <PinterestBoardEmbed boardUrl={him} label={himLabel} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
