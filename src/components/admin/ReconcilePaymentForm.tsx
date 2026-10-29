"use client";

import { useActionState, useState } from "react";
import {
  reconcileGiftContributionPaymentAction,
  type ReconcileGiftContributionPaymentActionState,
} from "@/app/admin/(protected)/pagamentos/reconcileGiftContributionPaymentAction";

interface ReconcilePaymentFormProps {
  contributionId: string;
  giftId: string;
}

const initialState: ReconcileGiftContributionPaymentActionState = { status: "idle" };

export function ReconcilePaymentForm({ contributionId, giftId }: ReconcilePaymentFormProps) {
  const [state, formAction, isPending] = useActionState(reconcileGiftContributionPaymentAction, initialState);
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="font-sans text-xs uppercase tracking-widest text-moss underline hover:text-moss/80"
      >
        Marcar como aprovado
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="contributionId" value={contributionId} />
      <input type="hidden" name="giftId" value={giftId} />
      <input
        name="transactionNsu"
        placeholder="NSU da transação (painel Infinite Pay)"
        required
        className="w-56 rounded-md border border-line bg-paper px-3 py-1.5 font-sans text-xs text-forest focus:border-moss focus:outline-none"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-moss px-4 py-1.5 font-sans text-xs uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
        >
          {isPending ? "Confirmando..." : "Confirmar"}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="font-sans text-xs text-forest/60 underline hover:text-forest"
        >
          Cancelar
        </button>
      </div>
      {state.status === "error" && (
        <p role="alert" className="font-sans text-xs text-danger">
          {state.message}
        </p>
      )}
      {state.status === "success" && <p className="font-sans text-xs text-moss">{state.message}</p>}
    </form>
  );
}
