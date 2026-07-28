"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ResetPasswordActionState } from "@/app/admin/redefinir-senha/actions";

const initialState: ResetPasswordActionState = { status: "idle" };

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState);

  return (
    <form action={formAction} className="mx-auto flex max-w-sm flex-col gap-4">
      <div>
        <label htmlFor="password" className="block font-sans text-sm text-forest">
          Nova senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block font-sans text-sm text-forest">
          Confirmar nova senha
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Redefinir senha"}
      </button>

      {state.status === "error" && (
        <p role="alert" className="text-center font-sans text-xs text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
