"use client";

import { useActionState } from "react";
import { updatePresentesAction } from "@/app/admin/(protected)/conteudo/presentes/actions";
import { PhotoUploadField } from "@/components/admin/PhotoUploadField";
import type { SiteContentActionState } from "@/application/content/actionState";
import type { PresentesContent } from "@/application/content/schemas";

interface PresentesFormProps {
  defaultValues: PresentesContent;
}

const initialPresentesActionState: SiteContentActionState = { status: "idle" };

export function PresentesForm({ defaultValues }: PresentesFormProps) {
  const [state, formAction, isPending] = useActionState(updatePresentesAction, initialPresentesActionState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div>
        <span className="block font-sans text-sm text-forest">Imagem de fundo</span>
        <div className="mt-1">
          <PhotoUploadField
            name="backgroundImage"
            currentUrl={defaultValues.backgroundImage}
            label="Imagem de fundo"
            className="h-40 w-full rounded-md"
          />
        </div>
      </div>

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
