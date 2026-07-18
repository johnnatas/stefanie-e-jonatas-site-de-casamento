"use client";

import { useActionState, useState } from "react";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { GiftDto } from "@/components/gifts/GiftDto";
import {
  createGiftContributionAction,
  initialGiftContributionActionState,
} from "@/app/presentes/actions";

interface GiftCardProps {
  gift: GiftDto;
}

const STATUS_LABEL: Record<Exclude<GiftDto["status"], "available">, string> = {
  reserved: "Reservado",
  paid: "Presenteado",
};

export function GiftCard({ gift }: GiftCardProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createGiftContributionAction,
    initialGiftContributionActionState
  );

  const isAvailable = gift.status === "available";

  return (
    <div className="flex flex-col rounded-lg border border-line bg-paper p-5">
      <PlaceholderImage label={gift.name} className="h-40 w-full rounded-md" />
      <h3 className="mt-4 font-serif text-xl text-ink">{gift.name}</h3>
      <p className="mt-1 flex-1 font-sans text-sm text-ink-soft">{gift.description}</p>
      <p className="mt-3 font-serif text-lg text-gold">{formatCurrency(gift.price)}</p>

      {gift.status !== "available" && (
        <span className="mt-4 inline-block rounded-full bg-line px-4 py-2 text-center font-sans text-xs uppercase tracking-widest text-ink-soft">
          {STATUS_LABEL[gift.status]}
        </span>
      )}

      {isAvailable && !isFormOpen && (
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="mt-4 rounded-full bg-gold px-4 py-2 font-sans text-xs uppercase tracking-widest text-paper transition-colors hover:bg-gold-soft"
        >
          Presentear
        </button>
      )}

      {isAvailable && isFormOpen && (
        <form action={formAction} className="mt-4 flex flex-col gap-2">
          <input type="hidden" name="giftId" value={gift.id} />
          <input
            name="guestName"
            placeholder="Seu nome"
            required
            minLength={3}
            className="rounded-md border border-line bg-paper px-3 py-2 font-sans text-sm text-ink focus:border-gold focus:outline-none"
          />
          <input
            name="guestEmail"
            type="email"
            placeholder="Seu e-mail"
            required
            className="rounded-md border border-line bg-paper px-3 py-2 font-sans text-sm text-ink focus:border-gold focus:outline-none"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-gold px-4 py-2 font-sans text-xs uppercase tracking-widest text-paper transition-colors hover:bg-gold-soft disabled:opacity-60"
          >
            {isPending ? "Redirecionando..." : "Ir para pagamento"}
          </button>
          {state.status === "error" && (
            <p role="alert" className="text-xs text-danger">
              {state.message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
