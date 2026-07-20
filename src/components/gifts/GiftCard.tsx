"use client";

import { useActionState, useEffect, useState } from "react";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { GiftDto } from "@/components/gifts/GiftDto";
import {
  createGiftContributionAction,
  reserveGiftForLaterAction,
  type CreateGiftContributionActionState,
  type ReserveGiftForLaterActionState,
} from "@/app/presentes/actions";

interface GiftCardProps {
  gift: GiftDto;
  canReserveForLater: boolean;
}

const STATUS_LABEL: Record<Exclude<GiftDto["status"], "available">, string> = {
  reserved: "Reservado",
  paid: "Presenteado",
};

const initialGiftContributionActionState: CreateGiftContributionActionState = { status: "idle" };
const initialReserveForLaterActionState: ReserveGiftForLaterActionState = { status: "idle" };

export function GiftCard({ gift, canReserveForLater }: GiftCardProps) {
  const [activeForm, setActiveForm] = useState<"none" | "now" | "later">("none");
  const [modalOpen, setModalOpen] = useState(false);

  const [nowState, nowFormAction, isNowPending] = useActionState(
    createGiftContributionAction,
    initialGiftContributionActionState
  );
  const [laterState, laterFormAction, isLaterPending] = useActionState(
    reserveGiftForLaterAction,
    initialReserveForLaterActionState
  );

  useEffect(() => {
    if (laterState.status === "success") {
      setModalOpen(true);
    }
  }, [laterState]);

  const isAvailable = gift.status === "available";

  return (
    <div className="flex flex-col rounded-lg border border-line bg-paper p-5">
      <PhotoOrPlaceholder src={gift.imageUrl} label={gift.name} className="h-40 w-full rounded-md" />
      <h3 className="mt-4 font-serif text-xl text-forest">{gift.name}</h3>
      <p className="mt-1 flex-1 font-sans text-sm text-forest/70">{gift.description}</p>
      <p className="mt-3 font-serif text-lg text-moss">{formatCurrency(gift.price)}</p>

      {gift.status !== "available" && (
        <span className="mt-4 inline-block rounded-full bg-line px-4 py-2 text-center font-sans text-xs uppercase tracking-widest text-forest/70">
          {STATUS_LABEL[gift.status]}
        </span>
      )}

      {isAvailable && activeForm === "none" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveForm("now")}
            className="rounded-full bg-moss px-4 py-2 font-sans text-xs uppercase tracking-widest text-paper transition-colors hover:bg-moss/80"
          >
            Presentear agora
          </button>
          {canReserveForLater && (
            <button
              type="button"
              onClick={() => setActiveForm("later")}
              className="rounded-full border border-moss px-4 py-2 font-sans text-xs uppercase tracking-widest text-moss transition-colors hover:bg-moss/10"
            >
              Reservar para depois
            </button>
          )}
        </div>
      )}

      {isAvailable && activeForm === "now" && (
        <form action={nowFormAction} className="mt-4 flex flex-col gap-2">
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
            disabled={isNowPending}
            className="rounded-full bg-moss px-4 py-2 font-sans text-xs uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
          >
            {isNowPending ? "Redirecionando..." : "Ir para pagamento"}
          </button>
          {nowState.status === "error" && (
            <p role="alert" className="text-xs text-danger">
              {nowState.message}
            </p>
          )}
        </form>
      )}

      {isAvailable && activeForm === "later" && (
        <form action={laterFormAction} className="mt-4 flex flex-col gap-2">
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
          <label htmlFor={`expected-payment-date-${gift.id}`} className="font-sans text-xs text-forest/70">
            Quando pretende pagar?
          </label>
          <input
            id={`expected-payment-date-${gift.id}`}
            name="expectedPaymentDate"
            type="date"
            required
            className="rounded-md border border-line bg-paper px-3 py-2 font-sans text-sm text-forest focus:border-moss focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLaterPending}
            className="rounded-full bg-moss px-4 py-2 font-sans text-xs uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
          >
            {isLaterPending ? "Reservando..." : "Reservar presente"}
          </button>
          {laterState.status === "error" && (
            <p role="alert" className="text-xs text-danger">
              {laterState.message}
            </p>
          )}
        </form>
      )}

      {modalOpen && laterState.status === "success" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-paper p-6">
            <h4 className="font-serif text-lg text-forest">Presente reservado!</h4>
            <p className="mt-2 font-sans text-sm text-forest/70">
              Reservamos <strong>{gift.name}</strong> para {laterState.guestName}, com pagamento previsto
              para {laterState.expectedPaymentDate?.split("-").reverse().join("/")}.
            </p>
            <p className="mt-2 font-sans text-sm text-forest/70">
              Se preferir, você já pode pagar agora clicando no botão abaixo, ou voltar e pagar depois.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href={laterState.checkoutUrl}
                className="rounded-full bg-moss px-4 py-2 text-center font-sans text-xs uppercase tracking-widest text-paper transition-colors hover:bg-moss/80"
              >
                Ir para pagamento
              </a>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setActiveForm("none");
                }}
                className="rounded-full border border-line px-4 py-2 font-sans text-xs uppercase tracking-widest text-forest transition-colors hover:border-moss"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
