"use client";

import { useState } from "react";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { GiftDto } from "@/components/gifts/GiftDto";
import { GiftDetailsModal } from "@/components/gifts/GiftDetailsModal";

interface GiftCardProps {
  gift: GiftDto;
  canReserveForLater: boolean;
}

const STATUS_LABEL: Record<Exclude<GiftDto["status"], "available">, string> = {
  reserved: "Reservado",
  paid: "Presenteado",
};

export function GiftCard({ gift, canReserveForLater }: GiftCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isAvailable = gift.status === "available";

  return (
    <div className="flex flex-col items-center rounded-lg border border-line bg-paper p-4 text-center">
      <PhotoOrPlaceholder src={gift.imageUrl} label={gift.name} className="h-40 w-full rounded-md" />
      <h3 className="mt-4 font-serif text-sm uppercase tracking-wide text-forest">{gift.name}</h3>
      <p className="mt-2 font-serif text-base text-forest">{formatCurrency(gift.price)}</p>

      {isAvailable ? (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="mt-4 min-h-11 rounded-full border border-line px-6 py-2 font-serif text-sm italic text-forest transition-colors hover:border-moss hover:text-moss"
        >
          Ver detalhes
        </button>
      ) : (
        <span className="mt-4 inline-block rounded-full bg-line px-4 py-2 text-center font-sans text-xs uppercase tracking-widest text-forest/70">
          {STATUS_LABEL[gift.status]}
        </span>
      )}

      {isModalOpen && (
        <GiftDetailsModal gift={gift} canReserveForLater={canReserveForLater} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}
