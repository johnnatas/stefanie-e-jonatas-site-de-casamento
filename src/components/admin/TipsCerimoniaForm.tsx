"use client";

import { useActionState, useState } from "react";
import { PhotoUploadField } from "@/components/admin/PhotoUploadField";
import { updateTipsCerimoniaAction } from "@/app/admin/(protected)/conteudo/dicas-cerimonia/actions";
import type { SiteContentActionState } from "@/application/content/actionState";
import type { TipsCerimoniaContent } from "@/application/content/schemas";

interface TipsCerimoniaFormProps {
  defaultValues: TipsCerimoniaContent;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const MAX_ROUTES = 10;

const initialState: SiteContentActionState = { status: "idle" };

interface RouteSlot {
  key: string;
  originLabel: string;
  instructions: string;
  mapUrl: string;
}

function createSlotKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `slot-${Math.random()}`;
}

export function TipsCerimoniaForm({ defaultValues }: TipsCerimoniaFormProps) {
  const [state, formAction, isPending] = useActionState(updateTipsCerimoniaAction, initialState);
  const [routes, setRoutes] = useState<RouteSlot[]>(() =>
    defaultValues.routes.map((route) => ({
      key: createSlotKey(),
      originLabel: route.originLabel,
      instructions: route.instructions,
      mapUrl: route.mapUrl ?? "",
    }))
  );

  function addRoute() {
    setRoutes((current) =>
      current.length >= MAX_ROUTES
        ? current
        : [...current, { key: createSlotKey(), originLabel: "", instructions: "", mapUrl: "" }]
    );
  }

  function removeRoute(key: string) {
    setRoutes((current) => current.filter((route) => route.key !== key));
  }

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
        label="Local da cerimônia"
        className="h-32 w-full rounded-md"
      />

      <fieldset className="flex flex-col gap-3 border-t border-line pt-4">
        <legend className="font-sans text-sm text-forest">Detalhes do evento</legend>
        <div>
          <label htmlFor="eventDateLabel" className="block font-sans text-sm text-forest">
            Data (ex.: 29 de junho de 2027)
          </label>
          <input
            id="eventDateLabel"
            name="eventDateLabel"
            defaultValue={defaultValues.eventDateLabel ?? ""}
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor="eventTimeLabel" className="block font-sans text-sm text-forest">
            Horário (ex.: A realizar-se às 16h)
          </label>
          <input
            id="eventTimeLabel"
            name="eventTimeLabel"
            defaultValue={defaultValues.eventTimeLabel ?? ""}
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor="eventAddress" className="block font-sans text-sm text-forest">
            Endereço
          </label>
          <input
            id="eventAddress"
            name="eventAddress"
            defaultValue={defaultValues.eventAddress ?? ""}
            className={inputClassName}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-t border-line pt-4">
        <legend className="font-sans text-sm text-forest">Rotas de acesso (até {MAX_ROUTES})</legend>

        {routes.length === 0 && (
          <p className="font-sans text-sm text-forest/70">Nenhuma rota adicionada ainda.</p>
        )}

        {routes.map((route, index) => (
          <div key={route.key} className="flex flex-col gap-2 border-b border-line pb-4">
            <input type="hidden" name={`route${index}Marker`} value="1" />
            <div>
              <label htmlFor={`route${index}OriginLabel`} className="block font-sans text-xs text-forest/70">
                Vindo de...
              </label>
              <input
                id={`route${index}OriginLabel`}
                name={`route${index}OriginLabel`}
                defaultValue={route.originLabel}
                required
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor={`route${index}Instructions`} className="block font-sans text-xs text-forest/70">
                Instruções (use **negrito** e *itálico*)
              </label>
              <textarea
                id={`route${index}Instructions`}
                name={`route${index}Instructions`}
                defaultValue={route.instructions}
                required
                rows={4}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor={`route${index}MapUrl`} className="block font-sans text-xs text-forest/70">
                Link do Google Maps (opcional)
              </label>
              <input
                id={`route${index}MapUrl`}
                name={`route${index}MapUrl`}
                defaultValue={route.mapUrl}
                className={inputClassName}
              />
            </div>
            <button
              type="button"
              onClick={() => removeRoute(route.key)}
              className="self-start font-sans text-xs uppercase tracking-widest text-forest/70 hover:text-moss"
            >
              × Remover esta rota
            </button>
          </div>
        ))}

        {routes.length < MAX_ROUTES && (
          <button
            type="button"
            onClick={addRoute}
            className="self-start font-sans text-xs uppercase tracking-widest text-moss hover:text-forest"
          >
            + Adicionar rota
          </button>
        )}
      </fieldset>

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
