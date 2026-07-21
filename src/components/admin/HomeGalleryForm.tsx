"use client";

import { useActionState, useState } from "react";
import { updateHomeGalleryAction } from "@/app/admin/(protected)/conteudo/marcos/actions";
import { MediaUploadField } from "@/components/admin/MediaUploadField";
import type { SiteContentActionState } from "@/application/content/actionState";
import type { HomeGalleryContent } from "@/application/content/schemas";
import type { MediaKind } from "@/infrastructure/supabase/resolveMediaField";

interface HomeGalleryFormProps {
  defaultValues: HomeGalleryContent;
}

const MAX_ITEMS = 20;

const initialHomeGalleryActionState: SiteContentActionState = { status: "idle" };

interface Slot {
  key: string;
  currentUrl: string | null;
  type: MediaKind;
}

function createSlotKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `slot-${Math.random()}`;
}

function initialSlots(items: HomeGalleryContent["items"]): Slot[] {
  return items.map((item) => ({ key: createSlotKey(), currentUrl: item.url, type: item.type }));
}

export function HomeGalleryForm({ defaultValues }: HomeGalleryFormProps) {
  const [state, formAction, isPending] = useActionState(updateHomeGalleryAction, initialHomeGalleryActionState);
  const [slots, setSlots] = useState<Slot[]>(() => initialSlots(defaultValues.items));

  function addSlot() {
    setSlots((current) =>
      current.length >= MAX_ITEMS ? current : [...current, { key: createSlotKey(), currentUrl: null, type: "photo" }]
    );
  }

  function removeSlot(key: string) {
    setSlots((current) => current.filter((slot) => slot.key !== key));
  }

  function setSlotType(key: string, type: MediaKind) {
    // Switching type invalidates whatever URL was saved for the previous
    // type — force picking a new file instead of silently resubmitting a
    // mismatched type+url pair (e.g. type: "video" pointing at a photo).
    setSlots((current) => current.map((slot) => (slot.key === key ? { ...slot, type, currentUrl: null } : slot)));
  }

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <fieldset className="flex flex-col gap-4">
        <legend className="font-sans text-sm text-forest">Fotos e vídeos (até {MAX_ITEMS})</legend>

        {slots.length === 0 && (
          <p className="font-sans text-sm text-forest/70">Nenhuma foto ou vídeo adicionado ainda.</p>
        )}

        {slots.map((slot, index) => (
          <div key={slot.key} className="flex flex-col gap-2 border-b border-line pb-4">
            <MediaUploadField
              key={`${slot.key}-${slot.type}`}
              name={`item${index}`}
              currentUrl={slot.currentUrl}
              currentType={slot.type}
              label={`Item ${index + 1}`}
              onTypeChange={(type) => setSlotType(slot.key, type)}
            />
            <button
              type="button"
              onClick={() => removeSlot(slot.key)}
              className="self-start font-sans text-xs uppercase tracking-widest text-forest/70 hover:text-moss"
            >
              × Remover este item
            </button>
          </div>
        ))}

        {slots.length < MAX_ITEMS && (
          <button
            type="button"
            onClick={addSlot}
            className="self-start font-sans text-xs uppercase tracking-widest text-moss hover:text-forest"
          >
            + Adicionar foto ou vídeo
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
