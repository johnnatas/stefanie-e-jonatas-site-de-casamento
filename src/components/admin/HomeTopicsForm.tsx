"use client";

import { useActionState } from "react";
import { updateHomeTopicsAction } from "@/app/admin/(protected)/conteudo/carrossel/actions";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import type { SiteContentActionState } from "@/application/content/actionState";
import type { HomeTopicsContent } from "@/application/content/schemas";

interface HomeTopicsFormProps {
  defaultValues: HomeTopicsContent;
}

const TOPIC_KEYS = ["cerimonia", "presentes", "traje", "hospedagem", "nossaHistoria"] as const;
const TOPIC_LABELS: Record<(typeof TOPIC_KEYS)[number], string> = {
  cerimonia: "Cerimônia",
  presentes: "Lista de presentes",
  traje: "Traje",
  hospedagem: "Hospedagem",
  nossaHistoria: "Nossa história",
};

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialHomeTopicsActionState: SiteContentActionState = { status: "idle" };

export function HomeTopicsForm({ defaultValues }: HomeTopicsFormProps) {
  const [state, formAction, isPending] = useActionState(updateHomeTopicsAction, initialHomeTopicsActionState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-6">
      {TOPIC_KEYS.map((key) => {
        const entry = defaultValues[key];
        return (
          <fieldset key={key} className="flex flex-col gap-3 border-b border-line pb-6">
            <legend className="font-sans text-sm uppercase tracking-widest text-moss">{TOPIC_LABELS[key]}</legend>

            <div>
              <label htmlFor={`${key}Title`} className="block font-sans text-sm text-forest">
                Título
              </label>
              <input
                id={`${key}Title`}
                name={`${key}Title`}
                defaultValue={entry.title}
                required
                className={inputClassName}
              />
            </div>

            <div>
              <label htmlFor={`${key}Description`} className="block font-sans text-sm text-forest">
                Descrição
              </label>
              <input
                id={`${key}Description`}
                name={`${key}Description`}
                defaultValue={entry.description}
                required
                className={inputClassName}
              />
            </div>

            <input type="hidden" name={`${key}CurrentUrl`} value={entry.photo ?? ""} />
            <PhotoOrPlaceholder
              src={entry.photo}
              label={`Foto — ${TOPIC_LABELS[key]}`}
              className="h-24 w-full rounded-md"
            />
            <input type="file" name={`${key}File`} accept="image/*" className="font-sans text-sm text-forest" />
            {entry.photo && (
              <label className="flex items-center gap-2 font-sans text-xs text-forest/70">
                <input type="checkbox" name={`${key}Remove`} />
                Remover esta foto
              </label>
            )}
          </fieldset>
        );
      })}

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
