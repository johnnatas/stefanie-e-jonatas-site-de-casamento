"use client";

import { useActionState } from "react";
import { PhotoUploadField } from "@/components/admin/PhotoUploadField";
import type { SiteContentActionState } from "@/application/content/actionState";
import type { TipsContent } from "@/application/content/schemas";

interface TipsContentFormProps {
  defaultValues: TipsContent;
  action: (prevState: SiteContentActionState, formData: FormData) => Promise<SiteContentActionState>;
  photoLabel: string;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialTipsActionState: SiteContentActionState = { status: "idle" };

export function TipsContentForm({ defaultValues, action, photoLabel }: TipsContentFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialTipsActionState);

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
          Texto (use **negrito** e *itálico*; linha em branco separa parágrafos)
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
        label={photoLabel}
        className="h-32 w-full rounded-md"
      />

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
