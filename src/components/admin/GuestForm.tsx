"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  upsertGuestAction,
  type UpsertGuestActionState,
} from "@/app/admin/(protected)/convidados/actions";
import { GuestFormValues } from "@/components/admin/guestFormSchema";

interface GuestFormProps {
  defaultValues?: GuestFormValues;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialUpsertGuestActionState: UpsertGuestActionState = { status: "idle" };

export function GuestForm({ defaultValues }: GuestFormProps) {
  const [state, formAction, isPending] = useActionState(upsertGuestAction, initialUpsertGuestActionState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-8">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

      <div className="flex flex-col gap-4">
        <span className="font-sans text-xs uppercase tracking-[0.2em] text-forest/70">Sobre o convidado</span>

        <div>
          <label htmlFor="fullName" className="block font-sans text-sm text-forest">
            Nome completo
          </label>
          <input
            id="fullName"
            name="fullName"
            defaultValue={defaultValues?.fullName}
            required
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="nickname" className="block font-sans text-sm text-forest">
            Apelido (como aparece na busca, opcional)
          </label>
          <input id="nickname" name="nickname" defaultValue={defaultValues?.nickname} className={inputClassName} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <span className="font-sans text-xs uppercase tracking-[0.2em] text-forest/70">Contato</span>

        <div>
          <label htmlFor="email" className="block font-sans text-sm text-forest">
            E-mail (opcional)
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultValues?.email}
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="phone" className="block font-sans text-sm text-forest">
            Telefone (opcional)
          </label>
          <input id="phone" name="phone" defaultValue={defaultValues?.phone} className={inputClassName} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <span className="font-sans text-xs uppercase tracking-[0.2em] text-forest/70">Presença</span>

        <div>
          <label htmlFor="companionsCount" className="block font-sans text-sm text-forest">
            Acompanhantes
          </label>
          <input
            id="companionsCount"
            name="companionsCount"
            type="number"
            min={0}
            defaultValue={defaultValues?.companionsCount ?? 0}
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="attendanceStatus" className="block font-sans text-sm text-forest">
            Status de presença
          </label>
          <select
            id="attendanceStatus"
            name="attendanceStatus"
            defaultValue={defaultValues?.attendanceStatus ?? "pending"}
            className={inputClassName}
          >
            <option value="pending">Pendente</option>
            <option value="confirmed">Confirmado</option>
            <option value="declined">Recusado</option>
          </select>
        </div>

        <div>
          <label htmlFor="message" className="block font-sans text-sm text-forest">
            Mensagem (opcional)
          </label>
          <textarea
            id="message"
            name="message"
            defaultValue={defaultValues?.message}
            rows={3}
            className={inputClassName}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "Salvar convidado"}
        </button>
        <Link
          href="/admin/convidados"
          className="font-sans text-sm uppercase tracking-widest text-forest/70 hover:text-moss"
        >
          Cancelar
        </Link>
      </div>

      {state.status === "error" && (
        <p role="alert" className="text-xs text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
