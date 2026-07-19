"use client";

import { useActionState, useState } from "react";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { GiftDto } from "@/components/gifts/GiftDto";
import {
  createGiftContributionAction,
  type CreateGiftContributionActionState,
} from "@/app/presentes/actions";

interface GiftCardProps {
  gift: GiftDto;
}

const STATUS_LABEL: Record<Exclude<GiftDto["status"], "available">, string> = {
  reserved: "Reservado",
  paid: "Presenteado",
};

const initialGiftContributionActionState: CreateGiftContributionActionState = { status: "idle" };

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
      <h3 className="mt-4 font-serif text-xl text-forest">{gift.name}</h3>
      <p className="mt-1 flex-1 font-sans text-sm text-forest/70">{gift.description}</p>
      <p className="mt-3 font-serif text-lg text-moss">{formatCurrency(gift.price)}</p>

      {gift.status !== "available" && (
        <span className="mt-4 inline-block rounded-full bg-line px-4 py-2 text-center font-sans text-xs uppercase tracking-widest text-forest/70">
          {STATUS_LABEL[gift.status]}
        </span>
      )}

      {isAvailable && !isFormOpen && (
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="mt-4 rounded-full bg-moss px-4 py-2 font-sans text-xs uppercase tracking-widest text-paper transition-colors hover:bg-moss/80"
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
            className="rounded-md border border-line bg-paper px-3 py-2 font-sans text-sm text-forest focus:border-moss focus:outline-none"
          />
          <input
            name="guestEmail"
            type="email"
            placeholder="Seu e-mail"
            required
            className="rounded-md border border-line bg-paper px-3 py-2 font-sans text-sm text-forest focus:border-moss focus:outline-none"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-moss px-4 py-2 font-sans text-xs uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
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
