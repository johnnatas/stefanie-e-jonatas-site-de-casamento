"use client";

import { useActionState } from "react";
import { updateHomeMilestonePhotosAction } from "@/app/admin/(protected)/conteudo/marcos/actions";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { MILESTONES } from "@/shared/milestones";
import type { SiteContentActionState } from "@/application/content/actionState";
import type { HomeMilestonePhotosContent } from "@/application/content/schemas";

interface HomeMilestonePhotosFormProps {
  defaultValues: HomeMilestonePhotosContent;
}

const MILESTONE_KEYS = ["beginning", "proposal", "wedding"] as const;

const initialMilestonePhotosActionState: SiteContentActionState = { status: "idle" };

export function HomeMilestonePhotosForm({ defaultValues }: HomeMilestonePhotosFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateHomeMilestonePhotosAction,
    initialMilestonePhotosActionState
  );

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      {MILESTONE_KEYS.map((key, index) => {
        const currentUrl = defaultValues[key];
        const milestone = MILESTONES[index];
        return (
          <div key={key} className="flex flex-col gap-2 border-b border-line pb-4">
            <span className="font-sans text-sm text-forest">{milestone.title}</span>
            <input type="hidden" name={`${key}CurrentUrl`} value={currentUrl ?? ""} />
            <PhotoOrPlaceholder
              src={currentUrl}
              label={`Foto — ${milestone.title}`}
              className="h-24 w-full rounded-md"
            />
            <input type="file" name={`${key}File`} accept="image/*" className="font-sans text-sm text-forest" />
            {currentUrl && (
              <label className="flex items-center gap-2 font-sans text-xs text-forest/70">
                <input type="checkbox" name={`${key}Remove`} />
                Remover esta foto
              </label>
            )}
          </div>
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
