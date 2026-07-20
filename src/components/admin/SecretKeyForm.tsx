"use client";

import { useActionState } from "react";
import {
  updateSecretKeyAction,
  type UpdateSecretKeyActionState,
} from "@/app/admin/(protected)/integracoes/actions";

interface SecretKeyFormProps {
  hasSecretKey: boolean;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialState: UpdateSecretKeyActionState = { status: "idle" };

export function SecretKeyForm({ hasSecretKey }: SecretKeyFormProps) {
  const [state, formAction, isPending] = useActionState(updateSecretKeyAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h2 className="font-serif text-xl text-forest">Chave secreta de segurança</h2>
        <p className="mt-1 font-sans text-sm text-forest/70">
          Exigida para alterar o valor de um presente já cadastrado e para trocar o Access Token do Mercado
          Pago.
        </p>
      </div>

      {hasSecretKey && (
        <div>
          <label htmlFor="currentKey" className="block font-sans text-sm text-forest">
            Chave atual
          </label>
          <input id="currentKey" name="currentKey" type="password" autoComplete="off" className={inputClassName} />
        </div>
      )}

      <div>
        <label htmlFor="newKey" className="block font-sans text-sm text-forest">
          Nova chave
        </label>
        <input
          id="newKey"
          name="newKey"
          type="password"
          required
          minLength={6}
          autoComplete="off"
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="confirmKey" className="block font-sans text-sm text-forest">
          Confirmar nova chave
        </label>
        <input
          id="confirmKey"
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
        {isPending ? "Salvando..." : hasSecretKey ? "Trocar chave" : "Definir chave"}
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
