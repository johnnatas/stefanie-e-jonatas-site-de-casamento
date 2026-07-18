"use client";

import { useActionState } from "react";
import {
  createGuestAction,
  type CreateGuestActionState,
} from "@/app/admin/(protected)/convidados/actions";

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-ink focus:border-gold focus:outline-none";

const initialCreateGuestActionState: CreateGuestActionState = { status: "idle" };

export function GuestForm() {
  const [state, formAction, isPending] = useActionState(createGuestAction, initialCreateGuestActionState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div>
        <label htmlFor="fullName" className="block font-sans text-sm text-ink">
          Nome completo
        </label>
        <input id="fullName" name="fullName" required className={inputClassName} />
      </div>

      <div>
        <label htmlFor="nickname" className="block font-sans text-sm text-ink">
          Apelido (como aparece na busca, opcional)
        </label>
        <input id="nickname" name="nickname" className={inputClassName} />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-gold px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-gold-soft disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Cadastrar convidado"}
      </button>

      {state.status === "error" && (
        <p role="alert" className="text-xs text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
