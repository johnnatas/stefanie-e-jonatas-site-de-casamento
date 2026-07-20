"use client";

import { useActionState } from "react";
import {
  updateMercadoPagoTokenAction,
  type UpdateMercadoPagoTokenActionState,
} from "@/app/admin/(protected)/integracoes/actions";

interface MercadoPagoTokenFormProps {
  currentTokenLast4: string | null;
  hasSecretKey: boolean;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialState: UpdateMercadoPagoTokenActionState = { status: "idle" };

export function MercadoPagoTokenForm({ currentTokenLast4, hasSecretKey }: MercadoPagoTokenFormProps) {
  const [state, formAction, isPending] = useActionState(updateMercadoPagoTokenAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h2 className="font-serif text-xl text-forest">Mercado Pago</h2>
        <p className="mt-1 font-sans text-sm text-forest/70">
          {currentTokenLast4
            ? `Access Token atual: termina em ${currentTokenLast4}`
            : "Access Token não configurado."}
        </p>
      </div>

      <div>
        <label htmlFor="token" className="block font-sans text-sm text-forest">
          Novo Access Token
        </label>
        <input id="token" name="token" type="password" required autoComplete="off" className={inputClassName} />
      </div>

      {hasSecretKey && (
        <div>
          <label htmlFor="mpSecretKey" className="block font-sans text-sm text-forest">
            Chave secreta
          </label>
          <input id="mpSecretKey" name="secretKey" type="password" autoComplete="off" className={inputClassName} />
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar Access Token"}
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
