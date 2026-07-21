"use client";

import { useActionState, useState } from "react";
import { PhotoUploadField } from "@/components/admin/PhotoUploadField";
import { updateTipsHospedagemAction } from "@/app/admin/(protected)/conteudo/dicas-hospedagem/actions";
import type { SiteContentActionState } from "@/application/content/actionState";
import type { TipsHospedagemContent } from "@/application/content/schemas";

interface TipsHospedagemFormProps {
  defaultValues: TipsHospedagemContent;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const MAX_DISTANCES = 15;
const MAX_HOTELS = 15;
const MAX_AIRPORTS = 6;

const initialState: SiteContentActionState = { status: "idle" };

function createSlotKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `slot-${Math.random()}`;
}

interface DistanceSlot {
  key: string;
  label: string;
  km: string;
}

interface HotelSlot {
  key: string;
  name: string;
  distanceLabel: string;
  url: string;
}

interface AirportSlot {
  key: string;
  name: string;
  distanceLabel: string;
  driveTimeLabel: string;
}

export function TipsHospedagemForm({ defaultValues }: TipsHospedagemFormProps) {
  const [state, formAction, isPending] = useActionState(updateTipsHospedagemAction, initialState);

  const [distances, setDistances] = useState<DistanceSlot[]>(() =>
    defaultValues.distances.map((d) => ({ key: createSlotKey(), label: d.label, km: d.km }))
  );
  const [hotels, setHotels] = useState<HotelSlot[]>(() =>
    defaultValues.hotels.map((h) => ({
      key: createSlotKey(),
      name: h.name,
      distanceLabel: h.distanceLabel ?? "",
      url: h.url ?? "",
    }))
  );
  const [airports, setAirports] = useState<AirportSlot[]>(() =>
    defaultValues.airports.map((a) => ({
      key: createSlotKey(),
      name: a.name,
      distanceLabel: a.distanceLabel ?? "",
      driveTimeLabel: a.driveTimeLabel ?? "",
    }))
  );

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
        label="Hospedagem"
        className="h-32 w-full rounded-md"
      />

      <fieldset className="flex flex-col gap-4 border-t border-line pt-4">
        <legend className="font-sans text-sm text-forest">Distâncias (até {MAX_DISTANCES})</legend>

        {distances.map((distance, index) => (
          <div key={distance.key} className="flex flex-col gap-2 border-b border-line pb-4">
            <input type="hidden" name={`dist${index}Marker`} value="1" />
            <div>
              <label htmlFor={`dist${index}Label`} className="block font-sans text-xs text-forest/70">
                Cidade/local
              </label>
              <input
                id={`dist${index}Label`}
                name={`dist${index}Label`}
                defaultValue={distance.label}
                required
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor={`dist${index}Km`} className="block font-sans text-xs text-forest/70">
                Distância (ex.: 120 km)
              </label>
              <input
                id={`dist${index}Km`}
                name={`dist${index}Km`}
                defaultValue={distance.km}
                required
                className={inputClassName}
              />
            </div>
            <button
              type="button"
              onClick={() => setDistances((current) => current.filter((d) => d.key !== distance.key))}
              className="self-start font-sans text-xs uppercase tracking-widest text-forest/70 hover:text-moss"
            >
              × Remover esta distância
            </button>
          </div>
        ))}

        {distances.length < MAX_DISTANCES && (
          <button
            type="button"
            onClick={() => setDistances((current) => [...current, { key: createSlotKey(), label: "", km: "" }])}
            className="self-start font-sans text-xs uppercase tracking-widest text-moss hover:text-forest"
          >
            + Adicionar distância
          </button>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-t border-line pt-4">
        <legend className="font-sans text-sm text-forest">Hotéis e pousadas (até {MAX_HOTELS})</legend>

        {hotels.map((hotel, index) => (
          <div key={hotel.key} className="flex flex-col gap-2 border-b border-line pb-4">
            <input type="hidden" name={`hotel${index}Marker`} value="1" />
            <div>
              <label htmlFor={`hotel${index}Name`} className="block font-sans text-xs text-forest/70">
                Nome
              </label>
              <input
                id={`hotel${index}Name`}
                name={`hotel${index}Name`}
                defaultValue={hotel.name}
                required
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor={`hotel${index}DistanceLabel`} className="block font-sans text-xs text-forest/70">
                Distância (opcional, ex.: 500m)
              </label>
              <input
                id={`hotel${index}DistanceLabel`}
                name={`hotel${index}DistanceLabel`}
                defaultValue={hotel.distanceLabel}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor={`hotel${index}Url`} className="block font-sans text-xs text-forest/70">
                Link de reserva/contato (opcional)
              </label>
              <input
                id={`hotel${index}Url`}
                name={`hotel${index}Url`}
                defaultValue={hotel.url}
                className={inputClassName}
              />
            </div>
            <button
              type="button"
              onClick={() => setHotels((current) => current.filter((h) => h.key !== hotel.key))}
              className="self-start font-sans text-xs uppercase tracking-widest text-forest/70 hover:text-moss"
            >
              × Remover este hotel
            </button>
          </div>
        ))}

        {hotels.length < MAX_HOTELS && (
          <button
            type="button"
            onClick={() =>
              setHotels((current) => [...current, { key: createSlotKey(), name: "", distanceLabel: "", url: "" }])
            }
            className="self-start font-sans text-xs uppercase tracking-widest text-moss hover:text-forest"
          >
            + Adicionar hotel
          </button>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-t border-line pt-4">
        <legend className="font-sans text-sm text-forest">Aeroportos (até {MAX_AIRPORTS})</legend>

        {airports.map((airport, index) => (
          <div key={airport.key} className="flex flex-col gap-2 border-b border-line pb-4">
            <input type="hidden" name={`airport${index}Marker`} value="1" />
            <div>
              <label htmlFor={`airport${index}Name`} className="block font-sans text-xs text-forest/70">
                Nome
              </label>
              <input
                id={`airport${index}Name`}
                name={`airport${index}Name`}
                defaultValue={airport.name}
                required
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor={`airport${index}DistanceLabel`} className="block font-sans text-xs text-forest/70">
                Distância (opcional, ex.: 90 km)
              </label>
              <input
                id={`airport${index}DistanceLabel`}
                name={`airport${index}DistanceLabel`}
                defaultValue={airport.distanceLabel}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor={`airport${index}DriveTimeLabel`} className="block font-sans text-xs text-forest/70">
                Tempo de viagem (opcional, ex.: 1h20)
              </label>
              <input
                id={`airport${index}DriveTimeLabel`}
                name={`airport${index}DriveTimeLabel`}
                defaultValue={airport.driveTimeLabel}
                className={inputClassName}
              />
            </div>
            <button
              type="button"
              onClick={() => setAirports((current) => current.filter((a) => a.key !== airport.key))}
              className="self-start font-sans text-xs uppercase tracking-widest text-forest/70 hover:text-moss"
            >
              × Remover este aeroporto
            </button>
          </div>
        ))}

        {airports.length < MAX_AIRPORTS && (
          <button
            type="button"
            onClick={() =>
              setAirports((current) => [
                ...current,
                { key: createSlotKey(), name: "", distanceLabel: "", driveTimeLabel: "" },
              ])
            }
            className="self-start font-sans text-xs uppercase tracking-widest text-moss hover:text-forest"
          >
            + Adicionar aeroporto
          </button>
        )}
      </fieldset>

      <div className="border-t border-line pt-4">
        <label htmlFor="disclaimer" className="block font-sans text-sm text-forest">
          Aviso de isenção
        </label>
        <textarea
          id="disclaimer"
          name="disclaimer"
          defaultValue={defaultValues.disclaimer}
          required
          rows={2}
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
