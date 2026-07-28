"use client";

import { useEffect, useRef, useState } from "react";
import { GiftDto } from "@/components/gifts/GiftDto";
import { GiftCard } from "@/components/gifts/GiftCard";

interface GiftGridProps {
  gifts: GiftDto[];
  canReserveForLater: boolean;
  openGiftId?: string | null;
  emptyMessage?: string;
}

const PAGE_SIZE = 12;

export function GiftGrid({ gifts, canReserveForLater, openGiftId = null, emptyMessage }: GiftGridProps) {
  const openGiftIndex = openGiftId ? gifts.findIndex((gift) => gift.id === openGiftId) : -1;
  const initialCount = Math.min(Math.max(PAGE_SIZE, openGiftIndex + 1), gifts.length);

  const [visibleCount, setVisibleCount] = useState(initialCount);
  const [previousGifts, setPreviousGifts] = useState(gifts);
  const sentinelRef = useRef<HTMLDivElement>(null);

  if (previousGifts !== gifts) {
    setPreviousGifts(gifts);
    setVisibleCount(initialCount);
  }

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisibleCount((count) => Math.min(count + PAGE_SIZE, gifts.length));
      }
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [gifts.length]);

  if (gifts.length === 0) {
    return (
      <p className="text-center font-sans text-forest/70">
        {emptyMessage ?? "A lista de presentes ainda está sendo preparada."}
      </p>
    );
  }

  const visibleGifts = gifts.slice(0, visibleCount);

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {visibleGifts.map((gift) => (
          <GiftCard
            key={gift.id}
            gift={gift}
            canReserveForLater={canReserveForLater}
            autoOpen={gift.id === openGiftId}
          />
        ))}
      </div>
      {visibleCount < gifts.length && <div ref={sentinelRef} aria-hidden="true" className="h-10" />}
    </div>
  );
}
