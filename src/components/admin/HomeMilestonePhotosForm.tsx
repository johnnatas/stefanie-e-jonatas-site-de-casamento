"use client";

import { useActionState } from "react";
import { updateHomeMilestonePhotosAction } from "@/app/admin/(protected)/conteudo/marcos/actions";
import { PhotoUploadField } from "@/components/admin/PhotoUploadField";
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
            <PhotoUploadField name={key} currentUrl={currentUrl} label={`Foto — ${milestone.title}`} />
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
