"use client";

import { useActionState, useState } from "react";
import {
  updatePaymentProviderAction,
  type UpdatePaymentProviderActionState,
} from "@/app/admin/(protected)/integracoes/actions";
import type { PaymentProvider } from "@/domain/entities/PaymentProvider";

interface PaymentProviderFormProps {
  activeProvider: PaymentProvider;
  infinitePayHandle: string | null;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialState: UpdatePaymentProviderActionState = { status: "idle" };

export function PaymentProviderForm({ activeProvider, infinitePayHandle }: PaymentProviderFormProps) {
  const [state, formAction, isPending] = useActionState(updatePaymentProviderAction, initialState);
  const [provider, setProvider] = useState<PaymentProvider>(activeProvider);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h2 className="font-serif text-xl text-forest">Provedor de pagamento</h2>
        <p className="mt-1 font-sans text-sm text-forest/70">Escolha qual integração gera os links de pagamento dos presentes.</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 font-sans text-sm text-forest">
          <input
            type="radio"
            name="provider"
            value="mercado_pago"
            checked={provider === "mercado_pago"}
            onChange={() => setProvider("mercado_pago")}
          />
          Mercado Pago
        </label>
        <label className="flex items-center gap-2 font-sans text-sm text-forest">
          <input
            type="radio"
            name="provider"
            value="infinite_pay"
            checked={provider === "infinite_pay"}
            onChange={() => setProvider("infinite_pay")}
          />
          Infinite Pay
        </label>
      </div>

      {provider === "infinite_pay" && (
        <div>
          <label htmlFor="infinitePayHandle" className="block font-sans text-sm text-forest">
            Handle (InfiniteTag)
          </label>
          <input
            id="infinitePayHandle"
            name="infinitePayHandle"
            defaultValue={infinitePayHandle ?? ""}
            required
            className={inputClassName}
          />
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar provedor"}
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
