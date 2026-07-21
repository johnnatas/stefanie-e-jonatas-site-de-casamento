"use client";

import { useActionState } from "react";
import { PhotoUploadField } from "@/components/admin/PhotoUploadField";
import { updateTipsTrajeAction } from "@/app/admin/(protected)/conteudo/dicas-traje/actions";
import type { SiteContentActionState } from "@/application/content/actionState";
import type { TipsTrajeContent } from "@/application/content/schemas";

interface TipsTrajeFormProps {
  defaultValues: TipsTrajeContent;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialState: SiteContentActionState = { status: "idle" };

export function TipsTrajeForm({ defaultValues }: TipsTrajeFormProps) {
  const [state, formAction, isPending] = useActionState(updateTipsTrajeAction, initialState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div>
        <label htmlFor="eyebrow" className="block font-sans text-sm text-forest">
          Texto de destaque (opcional)
        </label>
        <input id="eyebrow" name="eyebrow" defaultValue={defaultValues.eyebrow ?? ""} className={inputClassName} />
      </div>

      <div>
        <label htmlFor="title" className="block font-sans text-sm text-forest">
          Título
        </label>
        <input id="title" name="title" defaultValue={defaultValues.title} required className={inputClassName} />
      </div>

      <div>
        <label htmlFor="body" className="block font-sans text-sm text-forest">
          Texto geral (use **negrito** e *itálico*; linha em branco separa parágrafos)
        </label>
        <textarea
          id="body"
          name="body"
          defaultValue={defaultValues.body}
          required
          rows={6}
          className={inputClassName}
        />
      </div>

      <PhotoUploadField
        name="photo"
        currentUrl={defaultValues.photo}
        label="Inspiração de traje"
        className="h-32 w-full rounded-md"
      />

      <div className="border-t border-line pt-4">
        <label htmlFor="forHim" className="block font-sans text-sm text-forest">
          Para ele (opcional)
        </label>
        <textarea
          id="forHim"
          name="forHim"
          defaultValue={defaultValues.forHim ?? ""}
          rows={4}
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="forHer" className="block font-sans text-sm text-forest">
          Para ela (opcional)
        </label>
        <textarea
          id="forHer"
          name="forHer"
          defaultValue={defaultValues.forHer ?? ""}
          rows={4}
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="pinterestBoardUrl" className="block font-sans text-sm text-forest">
          Link do board do Pinterest (opcional)
        </label>
        <input
          id="pinterestBoardUrl"
          name="pinterestBoardUrl"
          defaultValue={defaultValues.pinterestBoardUrl ?? ""}
          placeholder="https://www.pinterest.com/usuario/board/"
          className={inputClassName}
        />
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
