"use client";

import { useActionState } from "react";
import {
  updateResendApiKeyAction,
  type UpdateResendApiKeyActionState,
} from "@/app/admin/(protected)/integracoes/actions";

interface ResendApiKeyFormProps {
  currentApiKeyLast4: string | null;
  hasSecretKey: boolean;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialState: UpdateResendApiKeyActionState = { status: "idle" };

export function ResendApiKeyForm({ currentApiKeyLast4, hasSecretKey }: ResendApiKeyFormProps) {
  const [state, formAction, isPending] = useActionState(updateResendApiKeyAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h2 className="font-serif text-xl text-forest">Resend (e-mails)</h2>
        <p className="mt-1 font-sans text-sm text-forest/70">
          {currentApiKeyLast4 ? `API Key atual: termina em ${currentApiKeyLast4}` : "API Key não configurada."}
        </p>
      </div>

      <div>
        <label htmlFor="apiKey" className="block font-sans text-sm text-forest">
          Nova API Key
        </label>
        <input id="apiKey" name="apiKey" type="password" required autoComplete="off" className={inputClassName} />
      </div>

      {hasSecretKey && (
        <div>
          <label htmlFor="resendSecretKey" className="block font-sans text-sm text-forest">
            Chave secreta
          </label>
          <input
            id="resendSecretKey"
            name="secretKey"
            type="password"
            autoComplete="off"
            className={inputClassName}
          />
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar API Key"}
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
