"use client";

import { useState } from "react";
import { cn } from "@/shared/utils/cn";
import { PinterestBoardEmbed } from "@/components/ui/PinterestBoardEmbed";

interface DressCodeInspirationProps {
  him: string | null;
  her: string | null;
}

const toggleBase = "px-6 py-2 font-serif text-lg uppercase tracking-wide transition-colors";

export function DressCodeInspiration({ him, her }: DressCodeInspirationProps) {
  const [selected, setSelected] = useState<"him" | "her">(him ? "him" : "her");

  if (!him && !her) return null;

  return (
    <div>
      {/* Mobile: segmented toggle + single board */}
      <div className="lg:hidden">
        <div className="flex justify-center gap-2">
          {him && (
            <button
              type="button"
              aria-pressed={selected === "him"}
              onClick={() => setSelected("him")}
              className={cn(toggleBase, selected === "him" ? "text-moss" : "text-forest/50 hover:text-forest")}
            >
              Ele
            </button>
          )}
          {her && (
            <button
              type="button"
              aria-pressed={selected === "her"}
              onClick={() => setSelected("her")}
              className={cn(toggleBase, selected === "her" ? "text-moss" : "text-forest/50 hover:text-forest")}
            >
              Ela
            </button>
          )}
        </div>
        <div className="mt-6">
          {selected === "him" && him && <PinterestBoardEmbed boardUrl={him} />}
          {selected === "her" && her && <PinterestBoardEmbed boardUrl={her} />}
        </div>
      </div>

      {/* Desktop: Ele | Ela side by side with a central divider */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-8 lg:divide-x lg:divide-line">
        {him && (
          <div className="flex flex-col items-center">
            <h3 className="font-serif text-3xl text-forest">ELE</h3>
            <div className="mt-6 w-full">
              <PinterestBoardEmbed boardUrl={him} />
            </div>
          </div>
        )}
        {her && (
          <div className="flex flex-col items-center lg:pl-8">
            <h3 className="font-serif text-3xl text-forest">ELA</h3>
            <div className="mt-6 w-full">
              <PinterestBoardEmbed boardUrl={her} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
