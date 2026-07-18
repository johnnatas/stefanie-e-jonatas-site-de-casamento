"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { rsvpFormSchema, RsvpFormInput, RsvpFormValues } from "@/components/rsvp/rsvpFormSchema";
import { confirmRsvpAction } from "@/app/confirmar-presenca/actions";

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-cream px-4 py-2 font-sans text-ink focus:border-rose focus:outline-none";

export function RsvpForm() {
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RsvpFormInput, unknown, RsvpFormValues>({
    resolver: zodResolver(rsvpFormSchema),
    defaultValues: { companionsCount: 0, attendanceConfirmed: "yes", message: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFeedback(null);
    const result = await confirmRsvpAction(values);
    setFeedback(result);
    if (result.success) {
      reset();
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto flex max-w-md flex-col gap-5">
      <div>
        <label htmlFor="fullName" className="block font-sans text-sm text-ink">
          Nome completo
        </label>
        <input id="fullName" {...register("fullName")} className={inputClassName} />
        {errors.fullName && <p className="mt-1 text-xs text-rose-dark">{errors.fullName.message}</p>}
      </div>

      <div>
        <label htmlFor="email" className="block font-sans text-sm text-ink">
          E-mail
        </label>
        <input id="email" type="email" {...register("email")} className={inputClassName} />
        {errors.email && <p className="mt-1 text-xs text-rose-dark">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="phone" className="block font-sans text-sm text-ink">
          Telefone
        </label>
        <input id="phone" {...register("phone")} className={inputClassName} />
        {errors.phone && <p className="mt-1 text-xs text-rose-dark">{errors.phone.message}</p>}
      </div>

      <fieldset>
        <legend className="font-sans text-sm text-ink">Você vai comparecer?</legend>
        <div className="mt-2 flex gap-6">
          <label className="flex items-center gap-2 font-sans text-sm text-ink-soft">
            <input type="radio" value="yes" {...register("attendanceConfirmed")} defaultChecked />
            Sim
          </label>
          <label className="flex items-center gap-2 font-sans text-sm text-ink-soft">
            <input type="radio" value="no" {...register("attendanceConfirmed")} />
            Não
          </label>
        </div>
        {errors.attendanceConfirmed && (
          <p className="mt-1 text-xs text-rose-dark">{errors.attendanceConfirmed.message}</p>
        )}
      </fieldset>

      <div>
        <label htmlFor="companionsCount" className="block font-sans text-sm text-ink">
          Número de acompanhantes
        </label>
        <input
          id="companionsCount"
          type="number"
          min={0}
          max={10}
          {...register("companionsCount")}
          className={inputClassName}
        />
        {errors.companionsCount && (
          <p className="mt-1 text-xs text-rose-dark">{errors.companionsCount.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="message" className="block font-sans text-sm text-ink">
          Mensagem para o casal (opcional)
        </label>
        <textarea id="message" rows={3} {...register("message")} className={inputClassName} />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full bg-rose px-8 py-3 font-sans text-sm uppercase tracking-widest text-white transition-colors hover:bg-rose-dark disabled:opacity-60"
      >
        {isSubmitting ? "Enviando..." : "Confirmar presença"}
      </button>

      {feedback && (
        <p
          role="status"
          className={`text-center font-sans text-sm ${feedback.success ? "text-ink" : "text-rose-dark"}`}
        >
          {feedback.message}
        </p>
      )}
    </form>
  );
}
