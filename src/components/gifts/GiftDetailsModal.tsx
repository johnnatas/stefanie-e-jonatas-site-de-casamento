"use client";

import { useActionState, useRef, useState } from "react";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { GiftDto } from "@/components/gifts/GiftDto";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { shareOrCopyLink } from "@/shared/utils/shareOrCopyLink";
import { ShareIcon, CheckIcon } from "@/components/ui/ShareIcon";
import {
  createGiftContributionAction,
  reserveGiftForLaterAction,
  type CreateGiftContributionActionState,
  type ReserveGiftForLaterActionState,
} from "@/app/presentes/actions";

interface GiftDetailsModalProps {
  gift: GiftDto;
  canReserveForLater: boolean;
  onClose: () => void;
}

const PAYMENT_ICONS = [
  { src: "/images/payment-icons/visa.webp", alt: "Visa" },
  { src: "/images/payment-icons/mastercard.webp", alt: "Mastercard" },
  { src: "/images/payment-icons/boleto.webp", alt: "Boleto" },
  { src: "/images/payment-icons/pix.webp", alt: "Pix" },
];

const initialGiftContributionActionState: CreateGiftContributionActionState = { status: "idle" };
const initialReserveForLaterActionState: ReserveGiftForLaterActionState = { status: "idle" };

const fieldClassName =
  "rounded-md border border-line bg-paper px-3 py-2 font-sans text-sm text-forest focus:border-moss focus:outline-none";
const primaryButtonClassName =
  "min-h-11 rounded-full bg-moss px-4 py-2 font-sans text-xs uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60";
const secondaryButtonClassName =
  "min-h-11 rounded-full border border-moss px-4 py-2 font-sans text-xs uppercase tracking-widest text-moss transition-colors hover:bg-moss/10";

export function GiftDetailsModal({ gift, canReserveForLater, onClose }: GiftDetailsModalProps) {
  const [activeForm, setActiveForm] = useState<"none" | "now" | "later">("none");
  const [confirmationDismissed, setConfirmationDismissed] = useState(false);

  const [nowState, nowFormAction, isNowPending] = useActionState(
    createGiftContributionAction,
    initialGiftContributionActionState
  );
  const [laterState, laterFormAction, isLaterPending] = useActionState(
    reserveGiftForLaterAction,
    initialReserveForLaterActionState
  );

  const showConfirmation = laterState.status === "success" && !confirmationDismissed;

  function dismissConfirmation() {
    setConfirmationDismissed(true);
    setActiveForm("none");
  }

  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true, showConfirmation ? dismissConfirmation : onClose);

  const [copyFeedback, setCopyFeedback] = useState(false);

  async function handleShare() {
    const url = new URL(window.location.href);
    url.searchParams.set("presente", gift.id);
    const result = await shareOrCopyLink({ title: gift.name, url: url.toString() });
    if (result === "copied") {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`gift-modal-title-${gift.id}`}
        onClick={(event) => event.stopPropagation()}
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-y-auto rounded-lg bg-paper sm:flex-row sm:overflow-hidden"
      >
        <div className="absolute right-4 top-4 z-10 flex items-center gap-4">
          <button
            type="button"
            onClick={handleShare}
            aria-label={copyFeedback ? "Link copiado!" : "Compartilhar"}
            className="text-forest/60 hover:text-forest"
          >
            {copyFeedback ? <CheckIcon /> : <ShareIcon />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="font-sans text-2xl leading-none text-forest/60 hover:text-forest"
          >
            &times;
          </button>
        </div>

        <div className="relative h-56 w-full flex-shrink-0 bg-mist sm:h-auto sm:w-1/2">
          <PhotoOrPlaceholder
            src={gift.imageUrl}
            label={gift.name}
            className="absolute inset-0 h-full w-full object-contain p-6"
          />
        </div>

        <div className="flex flex-1 flex-col items-center gap-4 p-6 text-center sm:p-10">
          <h2 id={`gift-modal-title-${gift.id}`} className="font-serif text-2xl uppercase tracking-wide text-forest">
            {gift.name}
          </h2>

          {showConfirmation ? (
            <>
              <h3 className="font-serif text-lg text-forest">Presente reservado!</h3>
              <p className="font-sans text-sm text-forest/70">
                Reservamos <strong>{gift.name}</strong> para {laterState.guestName}, com pagamento previsto para{" "}
                {laterState.expectedPaymentDate?.split("-").reverse().join("/")}.
              </p>
              <p className="font-sans text-sm text-forest/70">
                Se preferir, você já pode pagar agora clicando no botão abaixo, ou voltar e pagar depois.
              </p>
              <div className="flex w-full max-w-xs flex-col gap-2">
                <a href={laterState.checkoutUrl} className={`flex items-center justify-center ${primaryButtonClassName}`}>
                  Ir para pagamento
                </a>
                <button
                  type="button"
                  onClick={dismissConfirmation}
                  className="min-h-11 rounded-full border border-line px-4 py-2 font-sans text-xs uppercase tracking-widest text-forest transition-colors hover:border-moss"
                >
                  Voltar
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="font-serif text-lg italic text-forest/80">Seu presente: {formatCurrency(gift.price)}</p>

              {activeForm === "none" && (
                <div className="flex w-full max-w-xs flex-col items-center gap-2">
                  <button type="button" onClick={() => setActiveForm("now")} className={`w-full ${primaryButtonClassName}`}>
                    Presentear agora
                  </button>
                  {canReserveForLater && (
                    <button
                      type="button"
                      onClick={() => setActiveForm("later")}
                      className={`w-full ${secondaryButtonClassName}`}
                    >
                      Reservar para depois
                    </button>
                  )}

                  <div className="mt-4 flex items-center justify-center gap-3">
                    {PAYMENT_ICONS.map((icon) => (
                      <img key={icon.alt} src={icon.src} alt={icon.alt} className="h-6 w-auto" />
                    ))}
                  </div>
                  <p className="font-serif text-xs italic text-forest/60">Parcelamento disponível</p>
                </div>
              )}

              {activeForm === "now" && (
                <form action={nowFormAction} className="flex w-full max-w-xs flex-col gap-2">
                  <input type="hidden" name="giftId" value={gift.id} />
                  <label htmlFor={`guestName-now-${gift.id}`} className="sr-only">
                    Seu nome
                  </label>
                  <input
                    id={`guestName-now-${gift.id}`}
                    name="guestName"
                    placeholder="Seu nome"
                    required
                    minLength={3}
                    className={fieldClassName}
                  />
                  <label htmlFor={`guestEmail-now-${gift.id}`} className="sr-only">
                    Seu e-mail
                  </label>
                  <input
                    id={`guestEmail-now-${gift.id}`}
                    name="guestEmail"
                    type="email"
                    placeholder="Seu e-mail"
                    required
                    className={fieldClassName}
                  />
                  <button type="submit" disabled={isNowPending} className={primaryButtonClassName}>
                    {isNowPending ? "Redirecionando..." : "Ir para pagamento"}
                  </button>
                  {nowState.status === "error" && (
                    <p role="alert" className="text-xs text-danger">
                      {nowState.message}
                    </p>
                  )}
                </form>
              )}

              {activeForm === "later" && (
                <form action={laterFormAction} className="flex w-full max-w-xs flex-col gap-2">
                  <input type="hidden" name="giftId" value={gift.id} />
                  <label htmlFor={`guestName-later-${gift.id}`} className="sr-only">
                    Seu nome
                  </label>
                  <input
                    id={`guestName-later-${gift.id}`}
                    name="guestName"
                    placeholder="Seu nome"
                    required
                    minLength={3}
                    className={fieldClassName}
                  />
                  <label htmlFor={`guestEmail-later-${gift.id}`} className="sr-only">
                    Seu e-mail
                  </label>
                  <input
                    id={`guestEmail-later-${gift.id}`}
                    name="guestEmail"
                    type="email"
                    placeholder="Seu e-mail"
                    required
                    className={fieldClassName}
                  />
                  <label htmlFor={`expected-payment-date-${gift.id}`} className="font-sans text-xs text-forest/70">
                    Quando pretende pagar?
                  </label>
                  <input
                    id={`expected-payment-date-${gift.id}`}
                    name="expectedPaymentDate"
                    type="date"
                    required
                    className={fieldClassName}
                  />
                  <button type="submit" disabled={isLaterPending} className={primaryButtonClassName}>
                    {isLaterPending ? "Reservando..." : "Reservar presente"}
                  </button>
                  {laterState.status === "error" && (
                    <p role="alert" className="text-xs text-danger">
                      {laterState.message}
                    </p>
                  )}
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
