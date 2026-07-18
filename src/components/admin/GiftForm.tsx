"use client";

import { useActionState } from "react";
import {
  initialUpsertGiftActionState,
  upsertGiftAction,
} from "@/app/admin/(protected)/presentes/actions";
import { GiftFormValues } from "@/components/admin/giftFormSchema";

interface GiftFormProps {
  defaultValues?: GiftFormValues;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-cream px-4 py-2 font-sans text-ink focus:border-rose focus:outline-none";

export function GiftForm({ defaultValues }: GiftFormProps) {
  const [state, formAction, isPending] = useActionState(upsertGiftAction, initialUpsertGiftActionState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

      <div>
        <label htmlFor="name" className="block font-sans text-sm text-ink">
          Nome
        </label>
        <input id="name" name="name" defaultValue={defaultValues?.name} required className={inputClassName} />
      </div>

      <div>
        <label htmlFor="description" className="block font-sans text-sm text-ink">
          Descrição
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={defaultValues?.description}
          required
          rows={3}
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="imageUrl" className="block font-sans text-sm text-ink">
          URL da imagem
        </label>
        <input
          id="imageUrl"
          name="imageUrl"
          defaultValue={defaultValues?.imageUrl ?? "/placeholder-gift.jpg"}
          required
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="price" className="block font-sans text-sm text-ink">
          Valor (R$)
        </label>
        <input
          id="price"
          name="price"
          type="number"
          min={0}
          step="0.01"
          defaultValue={defaultValues?.price}
          required
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="category" className="block font-sans text-sm text-ink">
          Categoria
        </label>
        <input
          id="category"
          name="category"
          defaultValue={defaultValues?.category}
          required
          className={inputClassName}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-rose px-8 py-3 font-sans text-sm uppercase tracking-widest text-white transition-colors hover:bg-rose-dark disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar presente"}
      </button>

      {state.status === "error" && (
        <p role="alert" className="text-xs text-rose-dark">
          {state.message}
        </p>
      )}
    </form>
  );
}
