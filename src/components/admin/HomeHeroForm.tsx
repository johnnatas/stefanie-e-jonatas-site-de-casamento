"use client";

import { useActionState, useState } from "react";
import { updateHomeHeroAction } from "@/app/admin/(protected)/conteudo/hero/actions";
import { PhotoUploadField } from "@/components/admin/PhotoUploadField";
import type { SiteContentActionState } from "@/application/content/actionState";
import type { HomeHeroContent } from "@/application/content/schemas";

interface HomeHeroFormProps {
  defaultValues: HomeHeroContent;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const MAX_PHOTOS = 5;

const initialHomeHeroActionState: SiteContentActionState = { status: "idle" };

interface Slot {
  key: string;
  currentUrl: string | null;
}

function createSlotKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `slot-${Math.random()}`;
}

function initialSlots(photos: string[]): Slot[] {
  if (photos.length === 0) {
    return [{ key: createSlotKey(), currentUrl: null }];
  }
  return photos.map((url) => ({ key: createSlotKey(), currentUrl: url }));
}

export function HomeHeroForm({ defaultValues }: HomeHeroFormProps) {
  const [state, formAction, isPending] = useActionState(updateHomeHeroAction, initialHomeHeroActionState);
  const [slots, setSlots] = useState<Slot[]>(() => initialSlots(defaultValues.photos));

  function addSlot() {
    setSlots((current) =>
      current.length >= MAX_PHOTOS ? current : [...current, { key: createSlotKey(), currentUrl: null }]
    );
  }

  function removeSlot(key: string) {
    setSlots((current) => current.filter((slot) => slot.key !== key));
  }

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div>
        <label htmlFor="eyebrow" className="block font-sans text-sm text-forest">
          Texto de destaque
        </label>
        <input
          id="eyebrow"
          name="eyebrow"
          defaultValue={defaultValues.eyebrow}
          required
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="tagline" className="block font-sans text-sm text-forest">
          Frase de efeito
        </label>
        <input
          id="tagline"
          name="tagline"
          defaultValue={defaultValues.tagline}
          required
          className={inputClassName}
        />
      </div>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-sans text-sm text-forest">Fotos do carrossel (1 a {MAX_PHOTOS})</legend>

        {slots.map((slot, index) => (
          <div key={slot.key} className="flex flex-col gap-2 border-b border-line pb-4">
            <PhotoUploadField
              name={`photo${index}`}
              currentUrl={slot.currentUrl}
              label={`Foto ${index + 1}`}
              showRemoveCheckbox={false}
            />
            {index > 0 && (
              <button
                type="button"
                onClick={() => removeSlot(slot.key)}
                className="self-start font-sans text-xs uppercase tracking-widest text-forest/70 hover:text-moss"
              >
                × Remover esta foto
              </button>
            )}
          </div>
        ))}

        {slots.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={addSlot}
            className="self-start font-sans text-xs uppercase tracking-widest text-moss hover:text-forest"
          >
            + Adicionar foto
          </button>
        )}
      </fieldset>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar"}
      </button>

      {state.status === "error" && (
        <p role="alert" className="text-xs text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
