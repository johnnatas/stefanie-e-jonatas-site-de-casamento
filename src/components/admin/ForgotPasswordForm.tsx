"use client";

import { useActionState } from "react";
import { requestPasswordResetAction, type ForgotPasswordActionState } from "@/app/admin/esqueci-senha/actions";

const initialState: ForgotPasswordActionState = { status: "idle" };

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, initialState);

  if (state.status === "success") {
    return <p className="text-center font-sans text-sm text-moss">{state.message}</p>;
  }

  return (
    <form action={formAction} className="mx-auto flex max-w-sm flex-col gap-4">
      <div>
        <label htmlFor="email" className="block font-sans text-sm text-forest">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
      >
        {isPending ? "Enviando..." : "Enviar link de redefinição"}
      </button>

      {state.status === "error" && (
        <p role="alert" className="text-center font-sans text-xs text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
