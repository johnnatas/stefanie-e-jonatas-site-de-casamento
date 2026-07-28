"use client";

import { useActionState } from "react";
import {
  resetSecretKeyWithTokenAction,
  type ResetSecretKeyWithTokenActionState,
} from "@/app/admin/(protected)/integracoes/actions";

interface ResetSecretKeyWithTokenFormProps {
  token: string;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialState: ResetSecretKeyWithTokenActionState = { status: "idle" };

export function ResetSecretKeyWithTokenForm({ token }: ResetSecretKeyWithTokenFormProps) {
  const [state, formAction, isPending] = useActionState(resetSecretKeyWithTokenAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-moss/30 bg-moss/5 p-6">
      <input type="hidden" name="token" value={token} />
      <div>
        <h2 className="font-serif text-xl text-forest">Definir nova chave secreta</h2>
        <p className="mt-1 font-sans text-sm text-forest/70">
          Você pediu para redefinir sua chave secreta de segurança. Defina a nova chave abaixo.
        </p>
      </div>

      <div>
        <label htmlFor="reset-newKey" className="block font-sans text-sm text-forest">
          Nova chave
        </label>
        <input
          id="reset-newKey"
          name="newKey"
          type="password"
          required
          minLength={6}
          autoComplete="off"
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="reset-confirmKey" className="block font-sans text-sm text-forest">
          Confirmar nova chave
        </label>
        <input
          id="reset-confirmKey"
          name="confirmKey"
          type="password"
          required
          minLength={6}
          autoComplete="off"
          className={inputClassName}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Redefinir chave"}
      </button>

      {state.status === "error" && (
        <p role="alert" className="text-xs text-danger">
          {state.message}
        </p>
      )}
      {state.status === "success" && <p className="text-xs text-moss">{state.message}</p>}
    </form>
  );
}
