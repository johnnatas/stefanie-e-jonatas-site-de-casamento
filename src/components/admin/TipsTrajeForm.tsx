"use client";

import { useActionState } from "react";
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
        <label htmlFor="title" className="block font-sans text-sm text-forest">
          Título (script)
        </label>
        <input id="title" name="title" defaultValue={defaultValues.title} required className={inputClassName} />
      </div>

      <div>
        <label htmlFor="dressCodeName" className="block font-sans text-sm text-forest">
          Nome do traje (ex.: Passeio completo)
        </label>
        <input
          id="dressCodeName"
          name="dressCodeName"
          defaultValue={defaultValues.dressCodeName}
          required
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="body" className="block font-sans text-sm text-forest">
          Orientações (use **negrito** e *itálico*; linha em branco separa parágrafos)
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

      <div className="border-t border-line pt-4">
        <label htmlFor="pinterestHerUrl" className="block font-sans text-sm text-forest">
          Board do Pinterest — Ela (opcional)
        </label>
        <input
          id="pinterestHerUrl"
          name="pinterestHerUrl"
          defaultValue={defaultValues.pinterestHerUrl ?? ""}
          placeholder="https://www.pinterest.com/usuario/board-ela/"
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="pinterestHimUrl" className="block font-sans text-sm text-forest">
          Board do Pinterest — Ele (opcional)
        </label>
        <input
          id="pinterestHimUrl"
          name="pinterestHimUrl"
          defaultValue={defaultValues.pinterestHimUrl ?? ""}
          placeholder="https://www.pinterest.com/usuario/board-ele/"
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
