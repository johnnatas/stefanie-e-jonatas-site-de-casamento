"use client";

import { useActionState } from "react";
import { updateHomeHeroAction } from "@/app/admin/(protected)/conteudo/hero/actions";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import type { SiteContentActionState } from "@/application/content/actionState";
import type { HomeHeroContent } from "@/application/content/schemas";

interface HomeHeroFormProps {
  defaultValues: HomeHeroContent;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const MAX_PHOTOS = 5;

const initialHomeHeroActionState: SiteContentActionState = { status: "idle" };

export function HomeHeroForm({ defaultValues }: HomeHeroFormProps) {
  const [state, formAction, isPending] = useActionState(updateHomeHeroAction, initialHomeHeroActionState);
  const existingPhotos = defaultValues.photos;

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

        {Array.from({ length: MAX_PHOTOS }, (_, index) => {
          const currentUrl = existingPhotos[index] ?? null;
          return (
            <div key={index} className="flex flex-col gap-2 border-b border-line pb-4">
              <input type="hidden" name={`photo${index}CurrentUrl`} value={currentUrl ?? ""} />
              <PhotoOrPlaceholder src={currentUrl} label={`Foto ${index + 1}`} className="h-24 w-full rounded-md" />
              <input
                type="file"
                name={`photo${index}File`}
                accept="image/*"
                className="font-sans text-sm text-forest"
              />
              {currentUrl && (
                <label className="flex items-center gap-2 font-sans text-xs text-forest/70">
                  <input type="checkbox" name={`photo${index}Remove`} />
                  Remover esta foto
                </label>
              )}
            </div>
          );
        })}
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
