"use client";

import { useActionState } from "react";
import { updateSettingsAction } from "@/app/admin/(protected)/conteudo/configuracoes/actions";
import type { SiteContentActionState } from "@/application/content/actionState";
import type { SettingsContent } from "@/application/content/schemas";

interface SettingsFormProps {
  defaultValues: SettingsContent;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialSettingsActionState: SiteContentActionState = { status: "idle" };

function toDatetimeLocalValue(iso: string): string {
  return iso.slice(0, 16);
}

export function SettingsForm({ defaultValues }: SettingsFormProps) {
  const [state, formAction, isPending] = useActionState(updateSettingsAction, initialSettingsActionState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div>
        <label htmlFor="weddingDate" className="block font-sans text-sm text-forest">
          Data e horário do casamento
        </label>
        <input
          id="weddingDate"
          name="weddingDate"
          type="datetime-local"
          defaultValue={toDatetimeLocalValue(defaultValues.weddingDateIso)}
          required
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="weddingLocationLabel" className="block font-sans text-sm text-forest">
          Local (texto exibido no site)
        </label>
        <input
          id="weddingLocationLabel"
          name="weddingLocationLabel"
          defaultValue={defaultValues.weddingLocationLabel}
          required
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
