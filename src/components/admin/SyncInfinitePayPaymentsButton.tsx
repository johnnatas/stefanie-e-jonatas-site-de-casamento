"use client";

import { useActionState } from "react";
import {
  syncInfinitePayPaymentsAction,
  type SyncInfinitePayPaymentsActionState,
} from "@/app/admin/(protected)/syncInfinitePayPaymentsAction";

const initialState: SyncInfinitePayPaymentsActionState = { status: "idle" };

export function SyncInfinitePayPaymentsButton() {
  const [state, action, isPending] = useActionState(syncInfinitePayPaymentsAction, initialState);

  return (
    <form action={action}>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full border border-moss px-5 py-2 font-sans text-xs uppercase tracking-widest text-moss transition-colors hover:bg-moss/10 disabled:opacity-60"
      >
        {isPending ? "Atualizando..." : "Atualizar status de pagamento"}
      </button>
      {state.status === "success" && <p className="mt-2 font-sans text-xs text-moss">{state.message}</p>}
      {state.status === "error" && (
        <p role="alert" className="mt-2 font-sans text-xs text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
