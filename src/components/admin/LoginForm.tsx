"use client";

import { useActionState } from "react";
import { initialLoginActionState, loginAction } from "@/app/admin/login/actions";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialLoginActionState);

  return (
    <form action={formAction} className="mx-auto flex max-w-sm flex-col gap-4">
      <div>
        <label htmlFor="email" className="block font-sans text-sm text-ink">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-md border border-line bg-cream px-4 py-2 font-sans text-ink focus:border-rose focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="password" className="block font-sans text-sm text-ink">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="mt-1 w-full rounded-md border border-line bg-cream px-4 py-2 font-sans text-ink focus:border-rose focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-rose px-8 py-3 font-sans text-sm uppercase tracking-widest text-white transition-colors hover:bg-rose-dark disabled:opacity-60"
      >
        {isPending ? "Entrando..." : "Entrar"}
      </button>

      {state.status === "error" && (
        <p role="alert" className="text-center font-sans text-xs text-rose-dark">
          {state.message}
        </p>
      )}
    </form>
  );
}
