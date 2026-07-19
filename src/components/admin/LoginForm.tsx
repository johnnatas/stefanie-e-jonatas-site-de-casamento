"use client";

import { useActionState } from "react";
import { loginAction, type LoginActionState } from "@/app/admin/login/actions";

const initialLoginActionState: LoginActionState = { status: "idle" };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialLoginActionState);

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

      <div>
        <label htmlFor="password" className="block font-sans text-sm text-forest">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
      >
        {isPending ? "Entrando..." : "Entrar"}
      </button>

      {state.status === "error" && (
        <p role="alert" className="text-center font-sans text-xs text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
