"use client";

import { useActionState } from "react";
import {
  upsertGiftAction,
  type UpsertGiftActionState,
} from "@/app/admin/(protected)/presentes/actions";
import { GiftFormValues } from "@/components/admin/giftFormSchema";
import { PhotoUploadField } from "@/components/admin/PhotoUploadField";

interface GiftFormProps {
  defaultValues?: GiftFormValues;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialUpsertGiftActionState: UpsertGiftActionState = { status: "idle" };

export function GiftForm({ defaultValues }: GiftFormProps) {
  const [state, formAction, isPending] = useActionState(upsertGiftAction, initialUpsertGiftActionState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

      <div>
        <label htmlFor="name" className="block font-sans text-sm text-forest">
          Nome
        </label>
        <input id="name" name="name" defaultValue={defaultValues?.name} required className={inputClassName} />
      </div>

      <div>
        <label htmlFor="description" className="block font-sans text-sm text-forest">
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

      <PhotoUploadField
        name="image"
        currentUrl={defaultValues?.imageUrl ?? null}
        label="Foto do presente"
        className="h-40 w-full rounded-md"
        showRemoveCheckbox={false}
      />

      <div>
        <label htmlFor="price" className="block font-sans text-sm text-forest">
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
        <label htmlFor="category" className="block font-sans text-sm text-forest">
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
        className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar presente"}
      </button>

      {state.status === "error" && (
        <p role="alert" className="text-xs text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
