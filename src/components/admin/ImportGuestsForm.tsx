"use client";

import { useActionState } from "react";
import {
  importGuestsAction,
  type ImportGuestsActionState,
} from "@/app/admin/(protected)/convidados/importar/actions";

const initialImportGuestsActionState: ImportGuestsActionState = { status: "idle" };

export function ImportGuestsForm() {
  const [state, formAction, isPending] = useActionState(importGuestsAction, initialImportGuestsActionState);

  return (
    <div className="flex max-w-md flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <label htmlFor="file" className="block font-sans text-sm text-forest">
            Arquivo Excel (.xlsx)
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".xlsx"
            required
            className="mt-1 w-full font-sans text-sm text-forest"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
        >
          {isPending ? "Importando..." : "Importar convidados"}
        </button>
      </form>

      {state.status === "error" && (
        <p role="alert" className="text-xs text-danger">
          {state.message}
        </p>
      )}

      {state.status === "done" && state.result && (
        <div className="rounded-md border border-line bg-paper p-4 font-sans text-sm text-forest">
          <p>{state.result.created} convidado(s) importado(s).</p>
          <p>{state.result.skipped} ignorado(s) por já existir.</p>
          {state.result.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-danger">{state.result.errors.length} linha(s) com erro:</p>
              <ul className="mt-1 list-disc pl-5 text-forest/70">
                {state.result.errors.map((error) => (
                  <li key={error.row}>
                    Linha {error.row + 1}: {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
