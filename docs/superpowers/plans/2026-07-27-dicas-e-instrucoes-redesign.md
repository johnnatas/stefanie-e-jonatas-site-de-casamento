# Dicas e Instruções Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3-separate-route "Dicas e Instruções" page with a single `/dicas-e-instrucoes?tema=…` page whose left-sidebar (desktop) / top (mobile) theme menu swaps between Cerimônia, Código de Vestimenta and Hospedagem content, reproducing the reference layout faithfully and keeping every field admin-editable.

**Architecture:** One Server Component page reads `searchParams.tema`, redirects to `?tema=cerimonia` when absent/invalid, and renders one of three theme components fed by `getSiteContentOrDefault(...)`. The 3 `tips-*` Zod schemas are reshaped (fields removed/renamed/added — non-destructive because Zod strips unknown keys and applies defaults). The 3 existing admin forms/actions are updated to the new fields; the 3 old public sub-routes and the old `layout.tsx` are deleted with permanent redirects; the home carousel links are re-pointed.

**Tech Stack:** Next.js 16.2.x App Router (async `searchParams`, `next.config.ts` `redirects()`), TypeScript, Zod v4, Vitest + Testing Library, existing helpers (`renderMarkdown`, `PhotoOrPlaceholder`, `PinterestBoardEmbed`, `cn`).

## Global Constraints

- **This is NOT the Next.js you know** (per AGENTS.md): before writing routing/config code, read the relevant guide under `node_modules/next/dist/docs/` — specifically for async `searchParams` in a page and for `redirects()` in `next.config.ts`. Heed deprecation notices.
- No `box-shadow` anywhere ("Regra do Chapado") — use `border border-line` for edge definition.
- Every content-mutating server action MUST call `revalidatePath("/dicas-e-instrucoes")` before its `redirect()` (the single consolidated public route; do NOT revalidate the deleted sub-routes).
- Use only existing design tokens: `moss`, `forest`, `paper`, `paper-soft`, `line`, `danger`; fonts `font-serif` (Playfair), `font-sans` (Inter), `font-script` (Alex Brush). No new colors/fonts.
- Script-style titles and the active menu item use the project idiom `font-script ... italic text-moss` (as in `Header.tsx`/`MobileMenu.tsx`).
- Reproduce the reference **structure** only — never its colors/fonts/card styling.
- Image = dedicated upload field; embed/link = dedicated link field.
- Field renames are non-destructive: `.parse()` strips unknown stored keys and applies new defaults. No data migration.

---

### Task 1: Reshape the 3 `tips-*` schemas

**Files:**
- Modify: `src/application/content/schemas.ts:69-144`
- Modify: `src/application/content/schemas.test.ts:103-211`

**Interfaces:**
- Produces:
  - `CeremonyRoute` = `{ originLabel: string; instructions: string; mapUrl: string | null }` (unchanged).
  - `TipsCerimoniaContent` = `{ title: string; photo: string | null; eventDateLabel: string | null; eventTimeLabel: string | null; eventVenueLabel: string | null; eventAddress: string | null; routes: CeremonyRoute[] }`.
  - `TipsTrajeContent` = `{ title: string; dressCodeName: string; body: string; pinterestHimUrl: string | null; pinterestHerUrl: string | null }`.
  - `TipsHospedagemContent` = `{ title: string; mapAddress: string | null; distances: DistanceEntry[]; hotels: HotelEntry[]; airports: AirportEntry[]; disclaimer: string }`.
  - `DistanceEntry`, `HotelEntry`, `AirportEntry` unchanged.

- [ ] **Step 1: Replace the 3 tips `describe` blocks in `schemas.test.ts`**

Replace lines 103-211 (the three `describe("tips*ContentSchema", ...)` blocks, leaving the `SITE_CONTENT_SLUGS / SITE_CONTENT_SCHEMAS` block below untouched) with:

```ts
describe("tipsCerimoniaContentSchema", () => {
  it("defaults to the reference copy with no event details or routes", () => {
    const result = tipsCerimoniaContentSchema.parse({});

    expect(result.title).toBe("Informações sobre o grande dia!");
    expect(result.photo).toBeNull();
    expect(result.eventDateLabel).toBeNull();
    expect(result.eventTimeLabel).toBeNull();
    expect(result.eventVenueLabel).toBeNull();
    expect(result.eventAddress).toBeNull();
    expect(result.routes).toEqual([]);
  });

  it("strips legacy eyebrow/body keys from stored content", () => {
    const result = tipsCerimoniaContentSchema.parse({ eyebrow: "x", body: "y" });
    expect(result).not.toHaveProperty("eyebrow");
    expect(result).not.toHaveProperty("body");
  });

  it("accepts event details (incl. venue) and a list of routes", () => {
    const result = tipsCerimoniaContentSchema.safeParse({
      eventDateLabel: "29 de junho de 2027",
      eventTimeLabel: "A realizar-se às 16h",
      eventVenueLabel: "Cerimônia e recepção — Ville La Rochelle",
      eventAddress: "Estrada Municipal do Bairro Caioçara 1100, Jarinu - SP",
      routes: [
        { originLabel: "Para quem vem de SP Zona Sul", instructions: "1. Pela **Via Anhanguera**...", mapUrl: "https://maps.google.com/x" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a route missing required fields", () => {
    const result = tipsCerimoniaContentSchema.safeParse({ routes: [{ originLabel: "Vindo de BH" }] });
    expect(result.success).toBe(false);
  });

  it("rejects more than 10 routes", () => {
    const routes = Array.from({ length: 11 }, (_, i) => ({
      originLabel: `Origem ${i}`,
      instructions: "Siga em frente.",
      mapUrl: null,
    }));
    const result = tipsCerimoniaContentSchema.safeParse({ routes });
    expect(result.success).toBe(false);
  });
});

describe("tipsTrajeContentSchema", () => {
  it("defaults to the reference copy with two null Pinterest boards", () => {
    const result = tipsTrajeContentSchema.parse({});

    expect(result.title).toBe("Convidados, preparem suas vestimentas!");
    expect(result.dressCodeName).toBe("Passeio completo");
    expect(result.body).toContain("inverno");
    expect(result.pinterestHimUrl).toBeNull();
    expect(result.pinterestHerUrl).toBeNull();
  });

  it("strips legacy forHim/forHer/pinterestBoardUrl keys", () => {
    const result = tipsTrajeContentSchema.parse({ forHim: "a", forHer: "b", pinterestBoardUrl: "c" });
    expect(result).not.toHaveProperty("forHim");
    expect(result).not.toHaveProperty("forHer");
    expect(result).not.toHaveProperty("pinterestBoardUrl");
  });

  it("accepts two Pinterest board URLs", () => {
    const result = tipsTrajeContentSchema.safeParse({
      pinterestHimUrl: "https://www.pinterest.com/stefanie/ele",
      pinterestHerUrl: "https://www.pinterest.com/stefanie/ela",
    });
    expect(result.success).toBe(true);
  });
});

describe("tipsHospedagemContentSchema", () => {
  it("defaults to the reference copy with empty lists, no map, and the boilerplate disclaimer", () => {
    const result = tipsHospedagemContentSchema.parse({});

    expect(result.title).toBe("Dicas de hospedagem e locomoção");
    expect(result.mapAddress).toBeNull();
    expect(result.distances).toEqual([]);
    expect(result.hotels).toEqual([]);
    expect(result.airports).toEqual([]);
    expect(result.disclaimer).toBe("Não temos vínculo, parceria ou comissão com as indicações acima.");
  });

  it("accepts a map address, distances, hotels, and airports", () => {
    const result = tipsHospedagemContentSchema.safeParse({
      mapAddress: "Ville La Rochelle, Jarinu - SP",
      distances: [{ label: "São Paulo", km: "75 km" }],
      hotels: [{ name: "La Maison Caiçara", distanceLabel: "500m", url: "https://example.com" }],
      airports: [{ name: "Viracopos", distanceLabel: "69,5 km", driveTimeLabel: "1h10" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a hotel entry missing its required name", () => {
    const result = tipsHospedagemContentSchema.safeParse({ hotels: [{ distanceLabel: "500m" }] });
    expect(result.success).toBe(false);
  });

  it("rejects more than 15 hotels", () => {
    const hotels = Array.from({ length: 16 }, (_, i) => ({ name: `Hotel ${i}`, distanceLabel: null, url: null }));
    const result = tipsHospedagemContentSchema.safeParse({ hotels });
    expect(result.success).toBe(false);
  });

  it("rejects more than 6 airports", () => {
    const airports = Array.from({ length: 7 }, (_, i) => ({ name: `Aeroporto ${i}`, distanceLabel: null, driveTimeLabel: null }));
    const result = tipsHospedagemContentSchema.safeParse({ airports });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/application/content/schemas.test.ts`
Expected: FAIL — new fields (`eventVenueLabel`, `dressCodeName`, `pinterestHimUrl`, `pinterestHerUrl`, `mapAddress`) and new default titles don't exist yet; legacy-strip tests fail because old fields still parse through.

- [ ] **Step 3: Replace the 3 schemas in `schemas.ts`**

Replace lines 69-144 (from `export const ceremonyRouteSchema` through `export type TipsHospedagemContent = ...`) with:

```ts
export const ceremonyRouteSchema = z.object({
  originLabel: z.string().min(1),
  instructions: z.string().min(1),
  mapUrl: z.string().min(1).nullable().default(null),
});
export type CeremonyRoute = z.output<typeof ceremonyRouteSchema>;

export const tipsCerimoniaContentSchema = z.object({
  title: z.string().min(1).default("Informações sobre o grande dia!"),
  photo: z.string().min(1).nullable().default(null),
  eventDateLabel: z.string().min(1).nullable().default(null),
  eventTimeLabel: z.string().min(1).nullable().default(null),
  eventVenueLabel: z.string().min(1).nullable().default(null),
  eventAddress: z.string().min(1).nullable().default(null),
  routes: z.array(ceremonyRouteSchema).max(10).default([]),
});
export type TipsCerimoniaContent = z.output<typeof tipsCerimoniaContentSchema>;

export const tipsTrajeContentSchema = z.object({
  title: z.string().min(1).default("Convidados, preparem suas vestimentas!"),
  dressCodeName: z.string().min(1).default("Passeio completo"),
  body: z
    .string()
    .min(1)
    .default(
      "Lembrem-se de que nosso casamento será no inverno (frio). Indicamos investir em uma terceira peça ou em mangas longas.\n\nMulheres: a cerimônia será no gramado, opte por um salto bloco."
    ),
  pinterestHimUrl: z.string().min(1).nullable().default(null),
  pinterestHerUrl: z.string().min(1).nullable().default(null),
});
export type TipsTrajeContent = z.output<typeof tipsTrajeContentSchema>;

export const distanceEntrySchema = z.object({
  label: z.string().min(1),
  km: z.string().min(1),
});
export type DistanceEntry = z.output<typeof distanceEntrySchema>;

export const hotelEntrySchema = z.object({
  name: z.string().min(1),
  distanceLabel: z.string().min(1).nullable().default(null),
  url: z.string().min(1).nullable().default(null),
});
export type HotelEntry = z.output<typeof hotelEntrySchema>;

export const airportEntrySchema = z.object({
  name: z.string().min(1),
  distanceLabel: z.string().min(1).nullable().default(null),
  driveTimeLabel: z.string().min(1).nullable().default(null),
});
export type AirportEntry = z.output<typeof airportEntrySchema>;

export const tipsHospedagemContentSchema = z.object({
  title: z.string().min(1).default("Dicas de hospedagem e locomoção"),
  mapAddress: z.string().min(1).nullable().default(null),
  distances: z.array(distanceEntrySchema).max(15).default([]),
  hotels: z.array(hotelEntrySchema).max(15).default([]),
  airports: z.array(airportEntrySchema).max(6).default([]),
  disclaimer: z.string().min(1).default("Não temos vínculo, parceria ou comissão com as indicações acima."),
});
export type TipsHospedagemContent = z.output<typeof tipsHospedagemContentSchema>;
```

Leave `SITE_CONTENT_SLUGS` and `SITE_CONTENT_SCHEMAS` (lines 146-165) unchanged — slugs and keys don't change.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/application/content/schemas.test.ts`
Expected: PASS (all blocks, including the untouched `SITE_CONTENT_SLUGS / SITE_CONTENT_SCHEMAS`).

> Note: `npx tsc --noEmit` will now fail across the old public pages and admin forms/actions that still reference removed fields. That is expected and is repaired by Tasks 2–4 (admin) and Task 11 (public). Do not run a full typecheck until Task 11.

- [ ] **Step 5: Commit**

```bash
git add src/application/content/schemas.ts src/application/content/schemas.test.ts
git commit -m "feat: reshape tips-* schemas for the theme-menu redesign"
```

---

### Task 2: Update Cerimônia admin form + action

**Files:**
- Modify: `src/components/admin/TipsCerimoniaForm.tsx`
- Modify: `src/app/admin/(protected)/conteudo/dicas-cerimonia/actions.ts`
- Test: `src/components/admin/TipsCerimoniaForm.test.tsx` (already passing; re-run only)

**Interfaces:**
- Consumes: `TipsCerimoniaContent`, `tipsCerimoniaContentSchema` (Task 1); `PhotoUploadField`, `resolvePhotoField`, `createUpdateSiteContentUseCase`, `SiteContentActionState` (unchanged).
- Produces: `TipsCerimoniaForm({ defaultValues })`, `updateTipsCerimoniaAction(prevState, formData)` (signatures unchanged).

- [ ] **Step 1: Remove eyebrow/body inputs and add the venue input in `TipsCerimoniaForm.tsx`**

Delete the `eyebrow` `<div>` (lines 56-61) and the `body` `<div>` (lines 70-82). Change the `PhotoUploadField` `label` from `"Local da cerimônia"` to `"Imagem do local (topo)"`. Inside the "Detalhes do evento" `<fieldset>`, add a venue field between the `eventTimeLabel` and `eventAddress` `<div>`s:

```tsx
        <div>
          <label htmlFor="eventVenueLabel" className="block font-sans text-sm text-forest">
            Local (ex.: Cerimônia e recepção — Ville La Rochelle)
          </label>
          <input
            id="eventVenueLabel"
            name="eventVenueLabel"
            defaultValue={defaultValues.eventVenueLabel ?? ""}
            className={inputClassName}
          />
        </div>
```

(The `title`, `PhotoUploadField`, the whole "Rotas de acesso" fieldset, submit button and error block stay as they are.)

- [ ] **Step 2: Rewrite `dicas-cerimonia/actions.ts`**

Replace the full contents with:

```ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createUpdateSiteContentUseCase, resolvePhotoField } from "@/infrastructure/composition";
import { tipsCerimoniaContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

const MAX_ROUTES = 10;

export async function updateTipsCerimoniaAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const currentUrl = (formData.get("photoCurrentUrl") as string) || null;
  const photo = await resolvePhotoField("tips-cerimonia", "photo", formData, currentUrl, "photoFile", "photoRemove");

  const routes: { originLabel: string; instructions: string; mapUrl: string | null }[] = [];
  for (let index = 0; index < MAX_ROUTES; index++) {
    const field = `route${index}`;
    if (!formData.has(`${field}Marker`)) continue;

    routes.push({
      originLabel: (formData.get(`${field}OriginLabel`) as string) ?? "",
      instructions: (formData.get(`${field}Instructions`) as string) ?? "",
      mapUrl: (formData.get(`${field}MapUrl`) as string) || null,
    });
  }

  const parsed = tipsCerimoniaContentSchema.safeParse({
    title: formData.get("title"),
    photo,
    eventDateLabel: formData.get("eventDateLabel") || null,
    eventTimeLabel: formData.get("eventTimeLabel") || null,
    eventVenueLabel: formData.get("eventVenueLabel") || null,
    eventAddress: formData.get("eventAddress") || null,
    routes,
  });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("tips-cerimonia", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  revalidatePath("/dicas-e-instrucoes");
  redirect("/admin/conteudo");
}
```

- [ ] **Step 3: Run the Cerimônia form test + typecheck its files**

Run: `npx vitest run src/components/admin/TipsCerimoniaForm.test.tsx`
Expected: PASS (the test only touches routes UI and the "Nenhuma rota adicionada ainda." copy — both unchanged).

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/TipsCerimoniaForm.tsx "src/app/admin/(protected)/conteudo/dicas-cerimonia/actions.ts"
git commit -m "feat: cerimonia admin form/action gain venue field, drop eyebrow/body"
```

---

### Task 3: Update Traje admin form + action

**Files:**
- Modify: `src/components/admin/TipsTrajeForm.tsx`
- Modify: `src/app/admin/(protected)/conteudo/dicas-traje/actions.ts`

**Interfaces:**
- Consumes: `TipsTrajeContent`, `tipsTrajeContentSchema` (Task 1).
- Produces: `TipsTrajeForm({ defaultValues })`, `updateTipsTrajeAction(prevState, formData)` (signatures unchanged).

No dynamic lists → no dedicated test (matches the codebase precedent for static forms).

- [ ] **Step 1: Rewrite `TipsTrajeForm.tsx`**

Replace the full contents with:

```tsx
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

      <div>
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
```

- [ ] **Step 2: Rewrite `dicas-traje/actions.ts`**

Replace the full contents with:

```ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createUpdateSiteContentUseCase } from "@/infrastructure/composition";
import { tipsTrajeContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

export async function updateTipsTrajeAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const parsed = tipsTrajeContentSchema.safeParse({
    title: formData.get("title"),
    dressCodeName: formData.get("dressCodeName"),
    body: formData.get("body"),
    pinterestHimUrl: formData.get("pinterestHimUrl") || null,
    pinterestHerUrl: formData.get("pinterestHerUrl") || null,
  });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("tips-traje", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  revalidatePath("/dicas-e-instrucoes");
  redirect("/admin/conteudo");
}
```

- [ ] **Step 3: Typecheck the two files compile against the new schema**

Run: `npx vitest run src/application/content/schemas.test.ts` (sanity — schema unchanged since Task 1) then visually confirm no removed field remains referenced. Full `tsc` still deferred to Task 11.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/TipsTrajeForm.tsx "src/app/admin/(protected)/conteudo/dicas-traje/actions.ts"
git commit -m "feat: traje admin form/action switch to dress-code name + two Pinterest boards"
```

---

### Task 4: Update Hospedagem admin form + action

**Files:**
- Modify: `src/components/admin/TipsHospedagemForm.tsx`
- Modify: `src/app/admin/(protected)/conteudo/dicas-hospedagem/actions.ts`
- Test: `src/components/admin/TipsHospedagemForm.test.tsx` (already passing; re-run only)

**Interfaces:**
- Consumes: `TipsHospedagemContent`, `tipsHospedagemContentSchema` (Task 1).
- Produces: `TipsHospedagemForm({ defaultValues })`, `updateTipsHospedagemAction(prevState, formData)` (signatures unchanged).

- [ ] **Step 1: Edit `TipsHospedagemForm.tsx`**

1. Remove the `PhotoUploadField` import (line 4).
2. Remove the `eyebrow` `<div>` (lines 71-76), the `body` `<div>` (lines 85-97), and the `<PhotoUploadField .../>` block (lines 99-104).
3. Immediately after the `title` `<div>` (the block ending at line 83), insert the map-address field:

```tsx
      <div>
        <label htmlFor="mapAddress" className="block font-sans text-sm text-forest">
          Endereço do local (para o mapa do Google Maps)
        </label>
        <input
          id="mapAddress"
          name="mapAddress"
          defaultValue={defaultValues.mapAddress ?? ""}
          placeholder="Ville La Rochelle, Jarinu - SP"
          className={inputClassName}
        />
      </div>
```

(The Distâncias / Hotéis / Aeroportos fieldsets, the disclaimer `<textarea>`, submit button and error block are unchanged.)

- [ ] **Step 2: Rewrite `dicas-hospedagem/actions.ts`**

Replace the full contents with:

```ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createUpdateSiteContentUseCase } from "@/infrastructure/composition";
import { tipsHospedagemContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

const MAX_DISTANCES = 15;
const MAX_HOTELS = 15;
const MAX_AIRPORTS = 6;

export async function updateTipsHospedagemAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const distances: { label: string; km: string }[] = [];
  for (let index = 0; index < MAX_DISTANCES; index++) {
    const field = `dist${index}`;
    if (!formData.has(`${field}Marker`)) continue;
    distances.push({
      label: (formData.get(`${field}Label`) as string) ?? "",
      km: (formData.get(`${field}Km`) as string) ?? "",
    });
  }

  const hotels: { name: string; distanceLabel: string | null; url: string | null }[] = [];
  for (let index = 0; index < MAX_HOTELS; index++) {
    const field = `hotel${index}`;
    if (!formData.has(`${field}Marker`)) continue;
    hotels.push({
      name: (formData.get(`${field}Name`) as string) ?? "",
      distanceLabel: (formData.get(`${field}DistanceLabel`) as string) || null,
      url: (formData.get(`${field}Url`) as string) || null,
    });
  }

  const airports: { name: string; distanceLabel: string | null; driveTimeLabel: string | null }[] = [];
  for (let index = 0; index < MAX_AIRPORTS; index++) {
    const field = `airport${index}`;
    if (!formData.has(`${field}Marker`)) continue;
    airports.push({
      name: (formData.get(`${field}Name`) as string) ?? "",
      distanceLabel: (formData.get(`${field}DistanceLabel`) as string) || null,
      driveTimeLabel: (formData.get(`${field}DriveTimeLabel`) as string) || null,
    });
  }

  const parsed = tipsHospedagemContentSchema.safeParse({
    title: formData.get("title"),
    mapAddress: formData.get("mapAddress") || null,
    distances,
    hotels,
    airports,
    disclaimer: formData.get("disclaimer"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("tips-hospedagem", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  revalidatePath("/dicas-e-instrucoes");
  redirect("/admin/conteudo");
}
```

- [ ] **Step 3: Run the Hospedagem form test**

Run: `npx vitest run src/components/admin/TipsHospedagemForm.test.tsx`
Expected: PASS (the test only touches distance/hotel/airport add/remove — all unchanged).

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/TipsHospedagemForm.tsx "src/app/admin/(protected)/conteudo/dicas-hospedagem/actions.ts"
git commit -m "feat: hospedagem admin form/action gain map address, drop eyebrow/body/photo"
```

---

### Task 5: `GoogleMapEmbed` UI component

**Files:**
- Create: `src/components/ui/GoogleMapEmbed.tsx`
- Create: `src/components/ui/GoogleMapEmbed.test.tsx`

**Interfaces:**
- Produces: `GoogleMapEmbed({ address: string })`.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/GoogleMapEmbed.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GoogleMapEmbed } from "@/components/ui/GoogleMapEmbed";

describe("GoogleMapEmbed", () => {
  it("renders a titled iframe whose src embeds the URL-encoded address", () => {
    render(<GoogleMapEmbed address="Ville La Rochelle, Jarinu - SP" />);

    const frame = screen.getByTitle("Mapa: Ville La Rochelle, Jarinu - SP");
    expect(frame).toHaveAttribute(
      "src",
      expect.stringContaining("q=Ville%20La%20Rochelle%2C%20Jarinu%20-%20SP")
    );
    expect(frame).toHaveAttribute("src", expect.stringContaining("output=embed"));
    expect(frame).toHaveAttribute("loading", "lazy");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/GoogleMapEmbed.test.tsx`
Expected: FAIL with "Cannot find module '@/components/ui/GoogleMapEmbed'"

- [ ] **Step 3: Create `GoogleMapEmbed.tsx`**

```tsx
interface GoogleMapEmbedProps {
  address: string;
}

/**
 * Interactive Google Maps embed driven by a plain address string — uses the
 * keyless `output=embed` endpoint (no billing/API key). No box-shadow per the
 * project's flat design rule; edge defined with a border.
 */
export function GoogleMapEmbed({ address }: GoogleMapEmbedProps) {
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=12&output=embed`;

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-line">
      <iframe
        title={`Mapa: ${address}`}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/GoogleMapEmbed.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/GoogleMapEmbed.tsx src/components/ui/GoogleMapEmbed.test.tsx
git commit -m "feat: keyless GoogleMapEmbed component driven by an address string"
```

---

### Task 6: `TipsThemeMenu` component

**Files:**
- Create: `src/components/tips/TipsThemeMenu.tsx`
- Create: `src/components/tips/TipsThemeMenu.test.tsx`

**Interfaces:**
- Produces: `type TipsTheme = "cerimonia" | "vestimenta" | "hospedagem"`; `TipsThemeMenu({ active: TipsTheme })`.

- [ ] **Step 1: Write the failing test**

Create `src/components/tips/TipsThemeMenu.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TipsThemeMenu } from "@/components/tips/TipsThemeMenu";

describe("TipsThemeMenu", () => {
  it("links each theme to its ?tema= URL", () => {
    render(<TipsThemeMenu active="cerimonia" />);

    expect(screen.getByRole("link", { name: "a cerimônia" })).toHaveAttribute(
      "href",
      "/dicas-e-instrucoes?tema=cerimonia"
    );
    expect(screen.getByRole("link", { name: "código de vestimenta" })).toHaveAttribute(
      "href",
      "/dicas-e-instrucoes?tema=vestimenta"
    );
    expect(screen.getByRole("link", { name: "hospedagem" })).toHaveAttribute(
      "href",
      "/dicas-e-instrucoes?tema=hospedagem"
    );
  });

  it("marks the active theme with aria-current and the script style", () => {
    render(<TipsThemeMenu active="vestimenta" />);

    const active = screen.getByRole("link", { name: "código de vestimenta" });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active).toHaveClass("font-script", "italic", "text-moss");

    const inactive = screen.getByRole("link", { name: "a cerimônia" });
    expect(inactive).not.toHaveAttribute("aria-current");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/tips/TipsThemeMenu.test.tsx`
Expected: FAIL with "Cannot find module '@/components/tips/TipsThemeMenu'"

- [ ] **Step 3: Create `TipsThemeMenu.tsx`**

```tsx
import Link from "next/link";
import { cn } from "@/shared/utils/cn";

export type TipsTheme = "cerimonia" | "vestimenta" | "hospedagem";

const THEMES: { theme: TipsTheme; label: string }[] = [
  { theme: "cerimonia", label: "a cerimônia" },
  { theme: "vestimenta", label: "código de vestimenta" },
  { theme: "hospedagem", label: "hospedagem" },
];

export function TipsThemeMenu({ active }: { active: TipsTheme }) {
  return (
    <nav className="flex flex-col items-center gap-5 lg:sticky lg:top-28 lg:items-start">
      {THEMES.map(({ theme, label }) => {
        const isActive = theme === active;
        return (
          <Link
            key={theme}
            href={`/dicas-e-instrucoes?tema=${theme}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              isActive
                ? "font-script text-xl italic text-moss"
                : "font-sans text-sm uppercase tracking-widest text-forest/70 transition-colors hover:text-moss"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/tips/TipsThemeMenu.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/tips/TipsThemeMenu.tsx src/components/tips/TipsThemeMenu.test.tsx
git commit -m "feat: TipsThemeMenu sidebar/top theme navigation"
```

---

### Task 7: `CeremonyTheme` component

**Files:**
- Create: `src/components/tips/CeremonyTheme.tsx`
- Create: `src/components/tips/CeremonyTheme.test.tsx`

**Interfaces:**
- Consumes: `TipsCerimoniaContent` (Task 1), `PhotoOrPlaceholder`, `renderMarkdown`.
- Produces: `CeremonyTheme({ content: TipsCerimoniaContent })`.

- [ ] **Step 1: Write the failing test**

Create `src/components/tips/CeremonyTheme.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CeremonyTheme } from "@/components/tips/CeremonyTheme";
import { tipsCerimoniaContentSchema } from "@/application/content/schemas";

describe("CeremonyTheme", () => {
  it("renders the title, event info lines, and each route with its map link", () => {
    const content = tipsCerimoniaContentSchema.parse({
      eventDateLabel: "29 de junho de 2027",
      eventVenueLabel: "Cerimônia e recepção — Ville La Rochelle",
      routes: [
        { originLabel: "Para quem vem de SP Zona Sul", instructions: "1. Pela Via Anhanguera.", mapUrl: "https://maps.google.com/x" },
      ],
    });
    render(<CeremonyTheme content={content} />);

    expect(screen.getByText("Informações sobre o grande dia!")).toBeInTheDocument();
    expect(screen.getByText("29 de junho de 2027")).toBeInTheDocument();
    expect(screen.getByText("Cerimônia e recepção — Ville La Rochelle")).toBeInTheDocument();
    expect(screen.getByText("Para quem vem de SP Zona Sul")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver rota no mapa →" })).toHaveAttribute(
      "href",
      "https://maps.google.com/x"
    );
  });

  it("omits the route map link when no mapUrl is set", () => {
    const content = tipsCerimoniaContentSchema.parse({
      routes: [{ originLabel: "Vindo de BH", instructions: "Siga em frente.", mapUrl: null }],
    });
    render(<CeremonyTheme content={content} />);

    expect(screen.queryByRole("link", { name: "Ver rota no mapa →" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/tips/CeremonyTheme.test.tsx`
Expected: FAIL with "Cannot find module '@/components/tips/CeremonyTheme'"

- [ ] **Step 3: Create `CeremonyTheme.tsx`**

```tsx
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { renderMarkdown } from "@/shared/utils/renderMarkdown";
import type { TipsCerimoniaContent } from "@/application/content/schemas";

export function CeremonyTheme({ content }: { content: TipsCerimoniaContent }) {
  const infoLines = [
    content.eventDateLabel,
    content.eventTimeLabel,
    content.eventVenueLabel,
    content.eventAddress,
  ].filter((line): line is string => Boolean(line));

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-64 w-full max-w-xl overflow-hidden rounded-lg border border-line">
        <PhotoOrPlaceholder
          src={content.photo}
          label="Local da cerimônia"
          className="absolute inset-0 h-full w-full"
        />
      </div>

      <h1 className="mt-10 text-center font-script text-4xl italic text-forest sm:text-5xl">{content.title}</h1>

      {infoLines.length > 0 && (
        <>
          <div className="mt-6 h-px w-16 bg-line" />
          <div className="mt-6 flex flex-col items-center gap-1 text-center font-sans text-sm uppercase tracking-widest text-forest">
            {infoLines.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </>
      )}

      {content.routes.length > 0 && (
        <div className="mt-14 flex w-full max-w-2xl flex-col gap-12">
          {content.routes.map((route, index) => (
            <div key={index}>
              <h2 className="font-serif text-2xl text-forest">{route.originLabel}</h2>
              <div className="mt-3 font-sans text-sm leading-relaxed text-forest/80">
                {renderMarkdown(route.instructions)}
              </div>
              {route.mapUrl && (
                <a
                  href={route.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block font-sans text-sm text-moss hover:text-forest"
                >
                  Ver rota no mapa →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/tips/CeremonyTheme.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/tips/CeremonyTheme.tsx src/components/tips/CeremonyTheme.test.tsx
git commit -m "feat: CeremonyTheme with venue image, event info, and routes"
```

---

### Task 8: `DressCodeInspiration` (Ele/Ela selector)

**Files:**
- Create: `src/components/tips/DressCodeInspiration.tsx`
- Create: `src/components/tips/DressCodeInspiration.test.tsx`

**Interfaces:**
- Consumes: `PinterestBoardEmbed` (unchanged).
- Produces: `DressCodeInspiration({ him: string | null; her: string | null })`.

- [ ] **Step 1: Write the failing test**

Create `src/components/tips/DressCodeInspiration.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DressCodeInspiration } from "@/components/tips/DressCodeInspiration";

describe("DressCodeInspiration", () => {
  it("shows both toggles and selects Ele first when both boards are provided", () => {
    render(<DressCodeInspiration him="https://pin/ele" her="https://pin/ela" />);

    const ele = screen.getByRole("button", { name: "Ele" });
    const ela = screen.getByRole("button", { name: "Ela" });
    expect(ele).toHaveAttribute("aria-pressed", "true");
    expect(ela).toHaveAttribute("aria-pressed", "false");
  });

  it("switches the pressed toggle on click", async () => {
    const user = userEvent.setup();
    render(<DressCodeInspiration him="https://pin/ele" her="https://pin/ela" />);

    await user.click(screen.getByRole("button", { name: "Ela" }));

    expect(screen.getByRole("button", { name: "Ela" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Ele" })).toHaveAttribute("aria-pressed", "false");
  });

  it("hides the Ela toggle when only the him board is provided", () => {
    render(<DressCodeInspiration him="https://pin/ele" her={null} />);
    expect(screen.queryByRole("button", { name: "Ela" })).not.toBeInTheDocument();
  });

  it("renders nothing when neither board is provided", () => {
    const { container } = render(<DressCodeInspiration him={null} her={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/tips/DressCodeInspiration.test.tsx`
Expected: FAIL with "Cannot find module '@/components/tips/DressCodeInspiration'"

- [ ] **Step 3: Create `DressCodeInspiration.tsx`**

```tsx
"use client";

import { useState } from "react";
import { cn } from "@/shared/utils/cn";
import { PinterestBoardEmbed } from "@/components/ui/PinterestBoardEmbed";

interface DressCodeInspirationProps {
  him: string | null;
  her: string | null;
}

const toggleBase = "px-6 py-2 font-serif text-lg uppercase tracking-wide transition-colors";

export function DressCodeInspiration({ him, her }: DressCodeInspirationProps) {
  const [selected, setSelected] = useState<"him" | "her">(him ? "him" : "her");

  if (!him && !her) return null;

  return (
    <div>
      {/* Mobile: segmented toggle + single board */}
      <div className="lg:hidden">
        <div className="flex justify-center gap-2">
          {him && (
            <button
              type="button"
              aria-pressed={selected === "him"}
              onClick={() => setSelected("him")}
              className={cn(toggleBase, selected === "him" ? "text-moss" : "text-forest/50 hover:text-forest")}
            >
              Ele
            </button>
          )}
          {her && (
            <button
              type="button"
              aria-pressed={selected === "her"}
              onClick={() => setSelected("her")}
              className={cn(toggleBase, selected === "her" ? "text-moss" : "text-forest/50 hover:text-forest")}
            >
              Ela
            </button>
          )}
        </div>
        <div className="mt-6">
          {selected === "him" && him && <PinterestBoardEmbed boardUrl={him} />}
          {selected === "her" && her && <PinterestBoardEmbed boardUrl={her} />}
        </div>
      </div>

      {/* Desktop: Ele | Ela side by side with a central divider */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-8 lg:divide-x lg:divide-line">
        {him && (
          <div className="flex flex-col items-center">
            <h3 className="font-serif text-3xl text-forest">ELE</h3>
            <div className="mt-6 w-full">
              <PinterestBoardEmbed boardUrl={him} />
            </div>
          </div>
        )}
        {her && (
          <div className="flex flex-col items-center lg:pl-8">
            <h3 className="font-serif text-3xl text-forest">ELA</h3>
            <div className="mt-6 w-full">
              <PinterestBoardEmbed boardUrl={her} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/tips/DressCodeInspiration.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/tips/DressCodeInspiration.tsx src/components/tips/DressCodeInspiration.test.tsx
git commit -m "feat: DressCodeInspiration Ele/Ela selector with dual Pinterest boards"
```

---

### Task 9: `DressCodeTheme` component

**Files:**
- Create: `src/components/tips/DressCodeTheme.tsx`
- Create: `src/components/tips/DressCodeTheme.test.tsx`

**Interfaces:**
- Consumes: `TipsTrajeContent` (Task 1), `renderMarkdown`, `DressCodeInspiration` (Task 8).
- Produces: `DressCodeTheme({ content: TipsTrajeContent })`.

- [ ] **Step 1: Write the failing test**

Create `src/components/tips/DressCodeTheme.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DressCodeTheme } from "@/components/tips/DressCodeTheme";
import { tipsTrajeContentSchema } from "@/application/content/schemas";

describe("DressCodeTheme", () => {
  it("renders the title, dress-code name, guidance, and Ele/Ela toggles", () => {
    const content = tipsTrajeContentSchema.parse({
      pinterestHimUrl: "https://pin/ele",
      pinterestHerUrl: "https://pin/ela",
    });
    render(<DressCodeTheme content={content} />);

    expect(screen.getByText("Convidados, preparem suas vestimentas!")).toBeInTheDocument();
    expect(screen.getByText("Passeio completo")).toBeInTheDocument();
    expect(screen.getByText(/inverno/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ele" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/tips/DressCodeTheme.test.tsx`
Expected: FAIL with "Cannot find module '@/components/tips/DressCodeTheme'"

- [ ] **Step 3: Create `DressCodeTheme.tsx`**

```tsx
import { renderMarkdown } from "@/shared/utils/renderMarkdown";
import { DressCodeInspiration } from "@/components/tips/DressCodeInspiration";
import type { TipsTrajeContent } from "@/application/content/schemas";

export function DressCodeTheme({ content }: { content: TipsTrajeContent }) {
  return (
    <div className="flex flex-col items-center">
      <h1 className="text-center font-script text-4xl italic text-forest sm:text-5xl">{content.title}</h1>
      <h2 className="mt-8 text-center font-serif text-4xl uppercase tracking-wide text-forest sm:text-5xl">
        {content.dressCodeName}
      </h2>
      <div className="mt-6 max-w-xl text-center font-sans text-sm leading-relaxed text-forest/80">
        {renderMarkdown(content.body)}
      </div>
      <div className="mt-12 w-full max-w-4xl">
        <DressCodeInspiration him={content.pinterestHimUrl} her={content.pinterestHerUrl} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/tips/DressCodeTheme.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/tips/DressCodeTheme.tsx src/components/tips/DressCodeTheme.test.tsx
git commit -m "feat: DressCodeTheme composing title, dress-code name, and inspiration"
```

---

### Task 10: `LodgingTheme` component

**Files:**
- Create: `src/components/tips/LodgingTheme.tsx`
- Create: `src/components/tips/LodgingTheme.test.tsx`

**Interfaces:**
- Consumes: `TipsHospedagemContent` (Task 1), `GoogleMapEmbed` (Task 5).
- Produces: `LodgingTheme({ content: TipsHospedagemContent })`.

- [ ] **Step 1: Write the failing test**

Create `src/components/tips/LodgingTheme.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LodgingTheme } from "@/components/tips/LodgingTheme";
import { tipsHospedagemContentSchema } from "@/application/content/schemas";

describe("LodgingTheme", () => {
  it("renders the map, title, lists, and disclaimer", () => {
    const content = tipsHospedagemContentSchema.parse({
      mapAddress: "Ville La Rochelle, Jarinu - SP",
      distances: [{ label: "São Paulo", km: "75 km" }],
      hotels: [{ name: "La Maison Caiçara", distanceLabel: "500m", url: "https://example.com" }],
      airports: [{ name: "Viracopos", distanceLabel: "69,5 km", driveTimeLabel: "1h10" }],
    });
    render(<LodgingTheme content={content} />);

    expect(screen.getByTitle("Mapa: Ville La Rochelle, Jarinu - SP")).toBeInTheDocument();
    expect(screen.getByText("Dicas de hospedagem e locomoção")).toBeInTheDocument();
    expect(screen.getByText("São Paulo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "La Maison Caiçara" })).toHaveAttribute("href", "https://example.com");
    expect(screen.getByText("Viracopos")).toBeInTheDocument();
    expect(
      screen.getByText("Não temos vínculo, parceria ou comissão com as indicações acima.")
    ).toBeInTheDocument();
  });

  it("omits the map when no address is set", () => {
    const content = tipsHospedagemContentSchema.parse({});
    render(<LodgingTheme content={content} />);
    expect(screen.queryByTitle(/^Mapa:/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/tips/LodgingTheme.test.tsx`
Expected: FAIL with "Cannot find module '@/components/tips/LodgingTheme'"

- [ ] **Step 3: Create `LodgingTheme.tsx`**

```tsx
import { GoogleMapEmbed } from "@/components/ui/GoogleMapEmbed";
import type { TipsHospedagemContent } from "@/application/content/schemas";

export function LodgingTheme({ content }: { content: TipsHospedagemContent }) {
  return (
    <div className="flex flex-col gap-10 lg:grid lg:grid-cols-2 lg:gap-12">
      {content.mapAddress && (
        <div className="lg:order-1">
          <GoogleMapEmbed address={content.mapAddress} />
        </div>
      )}

      <div className="lg:order-2">
        <h1 className="font-script text-4xl italic text-forest sm:text-5xl">{content.title}</h1>

        {content.distances.length > 0 && (
          <section className="mt-8">
            <h2 className="font-serif text-2xl uppercase tracking-wide text-forest">Distâncias</h2>
            <ol className="mt-4 flex flex-col gap-2 font-sans text-sm text-forest/80">
              {content.distances.map((distance, index) => (
                <li key={index} className="flex justify-between border-b border-line py-2">
                  <span>{distance.label}</span>
                  <span className="text-forest/60">{distance.km}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {content.hotels.length > 0 && (
          <section className="mt-10">
            <h2 className="font-serif text-2xl uppercase tracking-wide text-forest">Hotéis</h2>
            <ol className="mt-4 flex flex-col gap-2 font-sans text-sm text-forest/80">
              {content.hotels.map((hotel, index) => (
                <li key={index} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line py-2">
                  {hotel.url ? (
                    <a href={hotel.url} target="_blank" rel="noreferrer" className="text-moss hover:text-forest">
                      {hotel.name}
                    </a>
                  ) : (
                    <span>{hotel.name}</span>
                  )}
                  {hotel.distanceLabel && <span className="text-forest/60">{hotel.distanceLabel}</span>}
                </li>
              ))}
            </ol>
          </section>
        )}

        <p className="mt-8 font-sans text-xs font-semibold text-forest/60">{content.disclaimer}</p>

        {content.airports.length > 0 && (
          <section className="mt-10">
            <h2 className="font-serif text-2xl uppercase tracking-wide text-forest">Aeroportos</h2>
            <ol className="mt-4 flex flex-col gap-2 font-sans text-sm text-forest/80">
              {content.airports.map((airport, index) => (
                <li key={index} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line py-2">
                  <span>{airport.name}</span>
                  <span className="text-forest/60">
                    {[airport.distanceLabel, airport.driveTimeLabel].filter(Boolean).join(" · ")}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/tips/LodgingTheme.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/tips/LodgingTheme.tsx src/components/tips/LodgingTheme.test.tsx
git commit -m "feat: LodgingTheme with keyless map, distances, hotels, airports"
```

---

### Task 11: New consolidated page + delete old sub-routes/layout

**Files:**
- Create: `src/app/dicas-e-instrucoes/page.tsx`
- Delete: `src/app/dicas-e-instrucoes/layout.tsx`
- Delete: `src/app/dicas-e-instrucoes/cerimonia/page.tsx`
- Delete: `src/app/dicas-e-instrucoes/codigo-de-vestimenta/page.tsx`
- Delete: `src/app/dicas-e-instrucoes/hospedagem/page.tsx`

**Interfaces:**
- Consumes: `TipsThemeMenu`, `type TipsTheme` (Task 6); `CeremonyTheme` (Task 7); `DressCodeTheme` (Task 9); `LodgingTheme` (Task 10); `getSiteContentOrDefault`.

> Before writing the page, read `node_modules/next/dist/docs/` for the current App Router `searchParams` contract (in Next 16 it is an async prop — `Promise<...>`). Match whatever the installed version documents.

- [ ] **Step 1: Delete the old layout and three sub-route pages**

```bash
git rm src/app/dicas-e-instrucoes/layout.tsx \
  src/app/dicas-e-instrucoes/cerimonia/page.tsx \
  src/app/dicas-e-instrucoes/codigo-de-vestimenta/page.tsx \
  src/app/dicas-e-instrucoes/hospedagem/page.tsx
```

- [ ] **Step 2: Create `src/app/dicas-e-instrucoes/page.tsx`**

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TipsThemeMenu, type TipsTheme } from "@/components/tips/TipsThemeMenu";
import { CeremonyTheme } from "@/components/tips/CeremonyTheme";
import { DressCodeTheme } from "@/components/tips/DressCodeTheme";
import { LodgingTheme } from "@/components/tips/LodgingTheme";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export const metadata: Metadata = {
  title: "Dicas e Instruções | Stéfanie & Jonatas",
};

const VALID_THEMES: TipsTheme[] = ["cerimonia", "vestimenta", "hospedagem"];

export default async function TipsPage({
  searchParams,
}: {
  searchParams: Promise<{ tema?: string }>;
}) {
  const { tema } = await searchParams;

  if (!tema || !VALID_THEMES.includes(tema as TipsTheme)) {
    redirect("/dicas-e-instrucoes?tema=cerimonia");
  }
  const active = tema as TipsTheme;

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 lg:grid lg:grid-cols-[220px_1fr] lg:gap-16">
      <TipsThemeMenu active={active} />
      <div className="mt-12 lg:mt-0">
        {active === "cerimonia" && <CeremonyTheme content={await getSiteContentOrDefault("tips-cerimonia")} />}
        {active === "vestimenta" && <DressCodeTheme content={await getSiteContentOrDefault("tips-traje")} />}
        {active === "hospedagem" && <LodgingTheme content={await getSiteContentOrDefault("tips-hospedagem")} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Full typecheck — the whole tree should now compile**

Run: `npx tsc --noEmit`
Expected: no errors (all removed-field references are gone; new components/schemas line up).

- [ ] **Step 4: Full test suite**

Run: `npx vitest run`
Expected: PASS (note: `TopicsCarousel.test.tsx` still asserts the OLD hrefs and will FAIL here — that is fixed in Task 13; if running the whole suite, expect exactly that one file red and proceed. To keep this task green, run instead: `npx vitest run src/components/tips src/components/ui/GoogleMapEmbed.test.tsx src/application/content/schemas.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/app/dicas-e-instrucoes/page.tsx
git commit -m "feat: single Dicas e Instrucoes page with ?tema= theme switching, remove sub-routes"
```

---

### Task 12: Redirects for the old URLs

**Files:**
- Modify: `next.config.ts`

> Read `node_modules/next/dist/docs/` for the `redirects()` config API (source/destination/permanent) before editing.

- [ ] **Step 1: Add a `redirects()` function to `next.config.ts`**

Replace the file with:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB, which is too small for admin content forms that
      // can submit several compressed photos in one save (e.g. the Home
      // Hero carousel, up to 5 photos), or several videos at once (the
      // Save the Date gallery allows up to 20 photo/video items, each
      // video up to 25MB).
      bodySizeLimit: "150mb",
    },
  },
  async redirects() {
    return [
      {
        source: "/dicas-e-instrucoes/cerimonia",
        destination: "/dicas-e-instrucoes?tema=cerimonia",
        permanent: true,
      },
      {
        source: "/dicas-e-instrucoes/codigo-de-vestimenta",
        destination: "/dicas-e-instrucoes?tema=vestimenta",
        permanent: true,
      },
      {
        source: "/dicas-e-instrucoes/hospedagem",
        destination: "/dicas-e-instrucoes?tema=hospedagem",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Verify the config loads (build-config parse)**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat: permanent redirects from old dicas sub-routes to ?tema= URLs"
```

---

### Task 13: Re-point the home carousel links

**Files:**
- Modify: `src/components/home/TopicsCarousel.tsx:20-26`
- Modify: `src/components/home/TopicsCarousel.test.tsx:13-19`

- [ ] **Step 1: Update the test hrefs (they should fail first)**

In `src/components/home/TopicsCarousel.test.tsx`, change the three tip rows in the `expected` array (lines 14, 16, 17) to:

```tsx
      ["Cerimônia Custom", "Veja os detalhes", "/dicas-e-instrucoes?tema=cerimonia"],
      ["Lista de presentes", "Ajude a construir o começo da nossa nova casa", "/presentes"],
      ["Traje", "Código de vestimenta para o grande dia", "/dicas-e-instrucoes?tema=vestimenta"],
      ["Hospedagem", "Sugestões de hotéis e pousadas próximas", "/dicas-e-instrucoes?tema=hospedagem"],
      ["Nossa história", "Como tudo começou até chegarmos aqui", "/nossa-historia"],
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/home/TopicsCarousel.test.tsx`
Expected: FAIL — the component still emits the old `/dicas-e-instrucoes/cerimonia` style hrefs.

- [ ] **Step 3: Update `TOPIC_HREFS` in `TopicsCarousel.tsx`**

Replace lines 20-26 with:

```tsx
const TOPIC_HREFS: Record<(typeof TOPIC_KEYS)[number], string> = {
  cerimonia: "/dicas-e-instrucoes?tema=cerimonia",
  presentes: "/presentes",
  traje: "/dicas-e-instrucoes?tema=vestimenta",
  hospedagem: "/dicas-e-instrucoes?tema=hospedagem",
  nossaHistoria: "/nossa-historia",
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/home/TopicsCarousel.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/home/TopicsCarousel.tsx src/components/home/TopicsCarousel.test.tsx
git commit -m "feat: point home carousel tips links to the new ?tema= URLs"
```

---

### Task 14: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Confirm no dangling references to the old sub-routes**

Run: `grep -rn "dicas-e-instrucoes/cerimonia\|dicas-e-instrucoes/codigo-de-vestimenta\|dicas-e-instrucoes/hospedagem" src`
Expected: no matches (only `next.config.ts` `source` strings, which are intentional, live outside `src`). If any `src` match appears, fix it to `/dicas-e-instrucoes?tema=…`.

- [ ] **Step 2: Full typecheck, lint, and test suite**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: all PASS.

- [ ] **Step 3: Manual e2e smoke (dev server)**

Run: `npm run dev`, then verify in a browser:
- `/dicas-e-instrucoes` (no query) → redirects to `?tema=cerimonia`.
- `/dicas-e-instrucoes?tema=xpto` (invalid) → redirects to `?tema=cerimonia`.
- Clicking each menu item swaps content and updates the URL; browser Back works.
- Old URLs (`/dicas-e-instrucoes/cerimonia`, `/codigo-de-vestimenta`, `/hospedagem`) 308-redirect to the matching `?tema=`.
- Desktop: menu on the left, content on the right. Mobile: menu stacked on top.
- Vestimenta: mobile toggle swaps boards; desktop shows Ele | Ela side by side.
- Hospedagem: the Google Maps iframe loads for a saved address.
- Admin: saving each of the three Dicas forms updates the corresponding public theme (revalidation).

- [ ] **Step 4: Update memory**

Update the `[[feedback_dicas_restructure_incomplete]]` memory to record that the fuller restructure (theme menu + reference-faithful layout) shipped, so it isn't flagged as outstanding.

---

## Self-Review

**Spec coverage:**
- Rota única + `?tema=` + default redirect → Task 11 (page) + Task 12 (old-URL redirects). ✓
- Menu lateral/topo, ativo em script → Task 6. ✓
- Cerimônia (imagem, título, info + venue, rotas) → Task 1 (schema) + Task 2 (admin) + Task 7 (public). ✓
- Vestimenta (título, dress-code name, orientações, 2 boards, seletor Ele/Ela) → Task 1 + Task 3 + Tasks 8–9. ✓
- Hospedagem (mapa por endereço, título, listas, disclaimer) → Task 1 + Task 4 + Tasks 5 & 10. ✓
- Imagem/embed em campos dedicados → Tasks 2/3/4 admin forms. ✓
- `revalidatePath("/dicas-e-instrucoes")` em todas as actions → Tasks 2/3/4. ✓
- Deletar sub-rotas + layout, atualizar carousel → Tasks 11 & 13. ✓
- Migração não-destrutiva → verified by "strips legacy keys" tests in Task 1. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type consistency:** `TipsTheme` defined in Task 6 and imported in Task 11; `GoogleMapEmbed({address})` used identically in Tasks 5 & 10; `DressCodeInspiration({him,her})` defined in Task 8, consumed in Task 9; schema field names (`eventVenueLabel`, `dressCodeName`, `pinterestHimUrl`, `pinterestHerUrl`, `mapAddress`) consistent across schema/admin/public tasks. ✓
