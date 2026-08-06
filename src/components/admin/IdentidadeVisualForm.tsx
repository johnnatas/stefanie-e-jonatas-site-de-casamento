"use client";

import { useActionState } from "react";
import { updateIdentidadeVisualAction } from "@/app/admin/(protected)/conteudo/identidade-visual/actions";
import { PhotoUploadField } from "@/components/admin/PhotoUploadField";
import type { SiteContentActionState } from "@/application/content/actionState";
import type { IdentidadeVisualContent } from "@/application/content/schemas";

interface IdentidadeVisualFormProps {
  defaultValues: IdentidadeVisualContent;
}

const initialIdentidadeVisualActionState: SiteContentActionState = { status: "idle" };

export function IdentidadeVisualForm({ defaultValues }: IdentidadeVisualFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateIdentidadeVisualAction,
    initialIdentidadeVisualActionState
  );

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-6">
      <div>
        <span className="block font-sans text-sm text-forest">Logo (versão escura)</span>
        <p className="mt-1 font-sans text-xs text-forest/60">
          Usada no cabeçalho do site sobre fundo claro e no menu mobile.
        </p>
        <div className="mt-1">
          <PhotoUploadField
            name="logoDark"
            currentUrl={defaultValues.logoDark}
            label="Logo (versão escura)"
            className="h-24 w-full rounded-md"
          />
        </div>
      </div>

      <div>
        <span className="block font-sans text-sm text-forest">Logo (versão clara)</span>
        <p className="mt-1 font-sans text-xs text-forest/60">
          Usada no cabeçalho sobre a foto do topo da Home, antes de rolar a página.
        </p>
        <div className="mt-1">
          <PhotoUploadField
            name="logoLight"
            currentUrl={defaultValues.logoLight}
            label="Logo (versão clara)"
            className="h-24 w-full rounded-md bg-forest"
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
