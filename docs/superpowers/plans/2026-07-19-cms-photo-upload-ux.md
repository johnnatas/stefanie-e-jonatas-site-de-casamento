# CMS Photo Upload UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Hero photo size-limit error via client-side compression,
add a preview after attaching a photo, replace Hero's 5 fixed photo
blocks with a dynamic add/remove list, add a back-to-list link on every
CMS edit page, and convert the Presentes gift photo field from a URL
text input to a real upload.

**Architecture:** A new pure `compressImage` utility (canvas-based resize
+ re-encode, no new dependency) and a new shared `PhotoUploadField`
Client Component (current-photo preview + file input + optional remove
checkbox, wired to compression + instant preview) replace the
hand-duplicated photo-field markup in every admin form. The compressed
file replaces what's in the `<input type="file">` via the `DataTransfer`
API, so every existing Server Action's multipart-form handling needs no
changes except where noted. Hero's photo list becomes client-managed
array state instead of 5 static blocks — the existing Server Action
already tolerates however many indexed fields are present, so it needs
no changes either.

**Tech Stack:** Next.js 16.2.10, React 19, TypeScript, Tailwind CSS v4,
Vitest + Testing Library.

## Global Constraints

- This Next.js version has breaking changes vs. training data — skim
  `node_modules/next/dist/docs/` before writing App Router / Server
  Action code (per `AGENTS.md`).
- `"use server"` files may only export `async function`s — this plan
  does not add any new action files, but Task 6 modifies an existing one
  (`upsertGiftAction`); keep that constraint in mind if touching it.
- `PhotoUploadField` and `compressImage` only ever run in the browser
  (Client Components / browser event handlers) — never imported from a
  Server Component or Server Action.
- **Environment-mocking precedent:** this codebase's test suite has
  already needed to polyfill missing jsdom browser APIs before (see
  `vitest.setup.ts`'s `matchMedia`/`IntersectionObserver`/`ResizeObserver`
  polyfills, added when Embla needed them). If a step's test needs a
  jsdom API this environment doesn't implement (e.g. assigning
  `input.files`, `HTMLCanvasElement.prototype.toBlob`), mock/polyfill it
  the same way — via `vi.spyOn`/`vi.stubGlobal` scoped to that test file,
  or a `vitest.setup.ts` addition if it's needed project-wide. Document
  it in your report the same way prior deviations were documented.
- **When committing, always `git add` an explicit file list — never
  `git add -A`.**
- Run `npm run test` and `npm run lint` before every commit.
- All new admin-facing text is Portuguese, matching the rest of the
  admin panel.

---

## Task 1: `compressImage` utility

**Files:**
- Create: `src/shared/utils/compressImage.ts`
- Create: `src/shared/utils/compressImage.test.ts`

**Interfaces:**
- Consumes: nothing (pure browser-API utility).
- Produces: `CompressImageOptions { maxDimension: number; quality: number }`,
  `BALANCED_COMPRESSION: CompressImageOptions` (`{ maxDimension: 1920,
  quality: 0.82 }`), `compressImage(file: File, options:
  CompressImageOptions): Promise<File>` — resizes/re-encodes as JPEG via
  an off-screen canvas; returns the original file unchanged for
  `image/gif`; falls back to the original file if the compressed result
  isn't smaller.

- [ ] **Step 1: Write the failing tests**

Create `src/shared/utils/compressImage.test.ts`:

```ts
import { describe, expect, it, vi, afterEach } from "vitest";
import { compressImage, BALANCED_COMPRESSION } from "@/shared/utils/compressImage";

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 800;
  height = 600;
  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("compressImage", () => {
  it("returns the original file unchanged for GIFs", async () => {
    const file = new File(["gif-data"], "anim.gif", { type: "image/gif" });

    const result = await compressImage(file, BALANCED_COMPRESSION);

    expect(result).toBe(file);
  });

  it("returns a new compressed JPEG file when compression shrinks the image", async () => {
    vi.stubGlobal("Image", FakeImage);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    const smallerBlob = new Blob(["x"], { type: "image/jpeg" });
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(smallerBlob);
    });
    const original = new File([new Uint8Array(1000)], "photo.png", { type: "image/png" });

    const result = await compressImage(original, BALANCED_COMPRESSION);

    expect(result).not.toBe(original);
    expect(result.type).toBe("image/jpeg");
    expect(result.name).toBe("photo.jpg");
    expect(result.size).toBe(smallerBlob.size);
  });

  it("falls back to the original file when the compressed result is not smaller", async () => {
    vi.stubGlobal("Image", FakeImage);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    const original = new File(["x"], "tiny.png", { type: "image/png" });
    const largerBlob = new Blob([new Uint8Array(1000)], { type: "image/jpeg" });
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(largerBlob);
    });

    const result = await compressImage(original, BALANCED_COMPRESSION);

    expect(result).toBe(original);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/shared/utils/compressImage.test.ts`
Expected: FAIL — `Cannot find module '@/shared/utils/compressImage'`

- [ ] **Step 3: Implement `compressImage`**

Create `src/shared/utils/compressImage.ts`:

```ts
export interface CompressImageOptions {
  maxDimension: number;
  quality: number;
}

export const BALANCED_COMPRESSION: CompressImageOptions = { maxDimension: 1920, quality: 0.82 };

export async function compressImage(file: File, options: CompressImageOptions): Promise<File> {
  if (file.type === "image/gif") {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const { width, height } = scaledDimensions(image.width, image.height, options.maxDimension);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", options.quality));
    if (!blob || blob.size >= file.size) {
      return file;
    }

    const compressedName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], compressedName, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image for compression"));
    image.src = src;
  });
}

function scaledDimensions(width: number, height: number, maxDimension: number): { width: number; height: number } {
  const longestSide = Math.max(width, height);
  if (longestSide <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / longestSide;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/shared/utils/compressImage.test.ts`
Expected: PASS (3 tests). If `vi.stubGlobal("Image", FakeImage)` or the
canvas mocks don't behave as jsdom expects, apply the Global Constraints'
environment-mocking guidance and document the adjustment.

- [ ] **Step 5: Commit**

```bash
git add src/shared/utils/compressImage.ts src/shared/utils/compressImage.test.ts
git commit -m "feat(admin): add client-side image compression utility"
```

---

## Task 2: `PhotoUploadField` shared component + raise the server-side cap

**Files:**
- Create: `src/components/admin/PhotoUploadField.tsx`
- Create: `src/components/admin/PhotoUploadField.test.tsx`
- Modify: `src/infrastructure/supabase/uploadSiteContentPhoto.ts`

**Interfaces:**
- Consumes: `compressImage`, `BALANCED_COMPRESSION` (Task 1);
  `PhotoOrPlaceholder` (existing, `@/components/ui/PhotoOrPlaceholder`).
- Produces: `PhotoUploadField({ name: string; currentUrl: string | null;
  label: string; className?: string; showRemoveCheckbox?: boolean }):
  JSX.Element` — renders the exact same field names every existing
  Server Action already expects (`${name}CurrentUrl`, `${name}File`,
  and — when `showRemoveCheckbox` is true (default) — `${name}Remove`),
  so no Server Action changes are required for any single-photo section.
  `uploadSiteContentPhoto`'s hard cap raised from 5MB to 15MB (defense
  in depth now that client-side compression normally keeps uploads well
  under 1MB).

- [ ] **Step 1: Raise the server-side cap**

In `src/infrastructure/supabase/uploadSiteContentPhoto.ts`, change:

```ts
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
```

to:

```ts
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
```

- [ ] **Step 2: Write the failing `PhotoUploadField` tests**

Create `src/components/admin/PhotoUploadField.test.tsx`:

```tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { PhotoUploadField } from "@/components/admin/PhotoUploadField";

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 800;
  height = 600;
  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("PhotoUploadField", () => {
  it("renders the current photo when nothing new is chosen", () => {
    render(<PhotoUploadField name="photo" currentUrl="https://example.com/a.jpg" label="Foto" />);

    expect(screen.getByAltText("Foto")).toHaveAttribute("src", "https://example.com/a.jpg");
  });

  it("shows the remove checkbox only when a current photo exists and showRemoveCheckbox is true", () => {
    const { rerender } = render(
      <PhotoUploadField name="photo" currentUrl="https://example.com/a.jpg" label="Foto" />
    );
    expect(screen.getByText("Remover esta foto")).toBeInTheDocument();

    rerender(<PhotoUploadField name="photo" currentUrl={null} label="Foto" />);
    expect(screen.queryByText("Remover esta foto")).not.toBeInTheDocument();

    rerender(
      <PhotoUploadField name="photo" currentUrl="https://example.com/a.jpg" label="Foto" showRemoveCheckbox={false} />
    );
    expect(screen.queryByText("Remover esta foto")).not.toBeInTheDocument();
  });

  it("shows a preview after a file is selected", async () => {
    vi.stubGlobal("Image", FakeImage);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(new Blob(["x"], { type: "image/jpeg" }));
    });
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();

    const { container } = render(<PhotoUploadField name="photo" currentUrl={null} label="Foto" />);
    const file = new File(["data"], "photo.png", { type: "image/png" });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByAltText("Foto")).toHaveAttribute("src", "blob:preview");
    });
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/components/admin/PhotoUploadField.test.tsx`
Expected: FAIL — `Cannot find module '@/components/admin/PhotoUploadField'`

- [ ] **Step 4: Implement `PhotoUploadField`**

Create `src/components/admin/PhotoUploadField.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { compressImage, BALANCED_COMPRESSION } from "@/shared/utils/compressImage";

interface PhotoUploadFieldProps {
  name: string;
  currentUrl: string | null;
  label: string;
  className?: string;
  showRemoveCheckbox?: boolean;
}

export function PhotoUploadField({
  name,
  currentUrl,
  label,
  className = "h-24 w-full rounded-md",
  showRemoveCheckbox = true,
}: PhotoUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const removeCheckboxRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressed = await compressImage(file, BALANCED_COMPRESSION);

      try {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(compressed);
        if (fileInputRef.current) {
          fileInputRef.current.files = dataTransfer.files;
        }
      } catch {
        // Some environments don't support assigning input.files
        // programmatically — the preview still updates below, but the
        // original (uncompressed) file remains what actually submits.
      }

      if (removeCheckboxRef.current) {
        removeCheckboxRef.current.checked = false;
      }

      setPreviewUrl((existing) => {
        if (existing) URL.revokeObjectURL(existing);
        return URL.createObjectURL(compressed);
      });
    } finally {
      setIsCompressing(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={`${name}CurrentUrl`} value={currentUrl ?? ""} />
      {previewUrl ? (
        <img src={previewUrl} alt={label} className={`object-cover ${className}`} />
      ) : (
        <PhotoOrPlaceholder src={currentUrl} label={label} className={className} />
      )}
      <input
        ref={fileInputRef}
        type="file"
        name={`${name}File`}
        accept="image/*"
        onChange={handleFileChange}
        className="font-sans text-sm text-forest"
      />
      {isCompressing && <span className="font-sans text-xs text-forest/70">Comprimindo...</span>}
      {showRemoveCheckbox && (currentUrl || previewUrl) && (
        <label className="flex items-center gap-2 font-sans text-xs text-forest/70">
          <input ref={removeCheckboxRef} type="checkbox" name={`${name}Remove`} />
          Remover esta foto
        </label>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/components/admin/PhotoUploadField.test.tsx`
Expected: PASS (3 tests). Apply the Global Constraints' environment-mocking
guidance if `DataTransfer`/`input.files` assignment or the canvas mocks
don't behave as jsdom expects — the component's own `try/catch` around
the `DataTransfer` assignment already tolerates that specific case
without failing the test, but document any additional adjustment.

- [ ] **Step 6: Run the full test suite, lint, and build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/PhotoUploadField.tsx src/components/admin/PhotoUploadField.test.tsx src/infrastructure/supabase/uploadSiteContentPhoto.ts
git commit -m "feat(admin): add shared PhotoUploadField (compression + preview), raise photo size cap to 15MB"
```

---

## Task 3: Sweep single-photo forms to use `PhotoUploadField`

**Files:**
- Modify: `src/components/admin/HomeMilestonePhotosForm.tsx`
- Modify: `src/components/admin/HomeTopicsForm.tsx`
- Modify: `src/components/admin/TipsContentForm.tsx`

**Interfaces:**
- Consumes: `PhotoUploadField` (Task 2).
- Produces: no prop/behavior changes to any of these 3 components (same
  `defaultValues`/`action`/`photoLabel` props as before) — each photo
  field's markup swaps from the hand-written "hidden CurrentUrl +
  PhotoOrPlaceholder + file input + conditional remove checkbox" block
  to a single `<PhotoUploadField>` call, with identical field names, so
  none of the 3 sections' Server Actions need any change.

- [ ] **Step 1: Update `HomeMilestonePhotosForm.tsx`**

Replace the full contents of `src/components/admin/HomeMilestonePhotosForm.tsx`:

```tsx
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
```

- [ ] **Step 2: Update `HomeTopicsForm.tsx`**

Replace the full contents of `src/components/admin/HomeTopicsForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { updateHomeTopicsAction } from "@/app/admin/(protected)/conteudo/carrossel/actions";
import { PhotoUploadField } from "@/components/admin/PhotoUploadField";
import type { SiteContentActionState } from "@/application/content/actionState";
import type { HomeTopicsContent } from "@/application/content/schemas";

interface HomeTopicsFormProps {
  defaultValues: HomeTopicsContent;
}

const TOPIC_KEYS = ["cerimonia", "presentes", "traje", "hospedagem", "nossaHistoria"] as const;
const TOPIC_LABELS: Record<(typeof TOPIC_KEYS)[number], string> = {
  cerimonia: "Cerimônia",
  presentes: "Lista de presentes",
  traje: "Traje",
  hospedagem: "Hospedagem",
  nossaHistoria: "Nossa história",
};

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialHomeTopicsActionState: SiteContentActionState = { status: "idle" };

export function HomeTopicsForm({ defaultValues }: HomeTopicsFormProps) {
  const [state, formAction, isPending] = useActionState(updateHomeTopicsAction, initialHomeTopicsActionState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-6">
      {TOPIC_KEYS.map((key) => {
        const entry = defaultValues[key];
        return (
          <fieldset key={key} className="flex flex-col gap-3 border-b border-line pb-6">
            <legend className="font-sans text-sm uppercase tracking-widest text-moss">{TOPIC_LABELS[key]}</legend>

            <div>
              <label htmlFor={`${key}Title`} className="block font-sans text-sm text-forest">
                Título
              </label>
              <input
                id={`${key}Title`}
                name={`${key}Title`}
                defaultValue={entry.title}
                required
                className={inputClassName}
              />
            </div>

            <div>
              <label htmlFor={`${key}Description`} className="block font-sans text-sm text-forest">
                Descrição
              </label>
              <input
                id={`${key}Description`}
                name={`${key}Description`}
                defaultValue={entry.description}
                required
                className={inputClassName}
              />
            </div>

            <PhotoUploadField name={key} currentUrl={entry.photo} label={`Foto — ${TOPIC_LABELS[key]}`} />
          </fieldset>
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
```

- [ ] **Step 3: Update `TipsContentForm.tsx`**

Replace the full contents of `src/components/admin/TipsContentForm.tsx`:

```tsx
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
```

- [ ] **Step 4: Run the full test suite, lint, and build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass — no existing tests assert on these 3 components'
internal photo-field markup, only on rendered text/labels, which are
unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/HomeMilestonePhotosForm.tsx src/components/admin/HomeTopicsForm.tsx src/components/admin/TipsContentForm.tsx
git commit -m "feat(admin): sweep Milestone/Topics/Tips forms to use PhotoUploadField"
```

---

## Task 4: Hero's dynamic add/remove photo list

**Files:**
- Modify: `src/components/admin/HomeHeroForm.tsx`
- Create: `src/components/admin/HomeHeroForm.test.tsx`

**Interfaces:**
- Consumes: `PhotoUploadField` (Task 2); `updateHomeHeroAction` (existing,
  unchanged — it already loops indices 0-4 reading whatever indexed
  fields are present, so no Server Action change is needed here).
- Produces: no change to `HomeHeroForm`'s external prop signature
  (`{ defaultValues: HomeHeroContent }`). Internally, replaces the 5
  always-rendered static blocks with client-managed slot state: 1 slot
  per existing photo (minimum 1), a "+ Adicionar foto" button (hidden at
  5 slots) that appends an empty slot, and a "× Remover esta foto" button
  on every slot except the first that removes that slot outright.

- [ ] **Step 1: Write the failing tests**

Create `src/components/admin/HomeHeroForm.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomeHeroForm } from "@/components/admin/HomeHeroForm";
import { homeHeroContentSchema } from "@/application/content/schemas";

describe("HomeHeroForm", () => {
  it("renders one slot per existing photo, with no remove control on the first slot", () => {
    const content = homeHeroContentSchema.parse({
      photos: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
    });
    render(<HomeHeroForm defaultValues={content} />);

    expect(screen.getByAltText("Foto 1")).toBeInTheDocument();
    expect(screen.getByAltText("Foto 2")).toBeInTheDocument();
    expect(screen.getAllByText("× Remover esta foto")).toHaveLength(1);
  });

  it("renders a single empty slot when there are no existing photos", () => {
    const content = homeHeroContentSchema.parse({ photos: [] });
    render(<HomeHeroForm defaultValues={content} />);

    expect(screen.getByText("Foto 1")).toBeInTheDocument();
    expect(screen.queryByText("× Remover esta foto")).not.toBeInTheDocument();
  });

  it("adds a new slot when clicking + Adicionar foto, up to the 5-slot cap", async () => {
    const user = userEvent.setup();
    const content = homeHeroContentSchema.parse({ photos: [] });
    render(<HomeHeroForm defaultValues={content} />);

    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByText("+ Adicionar foto"));
    }

    expect(screen.getByText("Foto 5")).toBeInTheDocument();
    expect(screen.queryByText("+ Adicionar foto")).not.toBeInTheDocument();
  });

  it("removes a slot when clicking its × Remover esta foto button", async () => {
    const user = userEvent.setup();
    const content = homeHeroContentSchema.parse({
      photos: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
    });
    render(<HomeHeroForm defaultValues={content} />);

    await user.click(screen.getAllByText("× Remover esta foto")[0]);

    expect(screen.queryByAltText("Foto 2")).not.toBeInTheDocument();
    expect(screen.getByAltText("Foto 1")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/admin/HomeHeroForm.test.tsx`
Expected: FAIL — the current `HomeHeroForm` always renders exactly 5
slots with a remove checkbox on any slot that has a `currentUrl`
(including slot 1), so the "single empty slot"/"no remove on first
slot"/"+ Adicionar foto" assertions all fail against the old
implementation.

- [ ] **Step 3: Implement the dynamic slot list**

Replace the full contents of `src/components/admin/HomeHeroForm.tsx`:

```tsx
"use client";

import { useActionState, useState } from "react";
import { updateHomeHeroAction } from "@/app/admin/(protected)/conteudo/hero/actions";
import { PhotoUploadField } from "@/components/admin/PhotoUploadField";
import type { SiteContentActionState } from "@/application/content/actionState";
import type { HomeHeroContent } from "@/application/content/schemas";

interface HomeHeroFormProps {
  defaultValues: HomeHeroContent;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const MAX_PHOTOS = 5;

const initialHomeHeroActionState: SiteContentActionState = { status: "idle" };

interface Slot {
  key: string;
  currentUrl: string | null;
}

function createSlotKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `slot-${Math.random()}`;
}

function initialSlots(photos: string[]): Slot[] {
  if (photos.length === 0) {
    return [{ key: createSlotKey(), currentUrl: null }];
  }
  return photos.map((url) => ({ key: createSlotKey(), currentUrl: url }));
}

export function HomeHeroForm({ defaultValues }: HomeHeroFormProps) {
  const [state, formAction, isPending] = useActionState(updateHomeHeroAction, initialHomeHeroActionState);
  const [slots, setSlots] = useState<Slot[]>(() => initialSlots(defaultValues.photos));

  function addSlot() {
    setSlots((current) =>
      current.length >= MAX_PHOTOS ? current : [...current, { key: createSlotKey(), currentUrl: null }]
    );
  }

  function removeSlot(key: string) {
    setSlots((current) => current.filter((slot) => slot.key !== key));
  }

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div>
        <label htmlFor="eyebrow" className="block font-sans text-sm text-forest">
          Texto de destaque
        </label>
        <input
          id="eyebrow"
          name="eyebrow"
          defaultValue={defaultValues.eyebrow}
          required
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="tagline" className="block font-sans text-sm text-forest">
          Frase de efeito
        </label>
        <input
          id="tagline"
          name="tagline"
          defaultValue={defaultValues.tagline}
          required
          className={inputClassName}
        />
      </div>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-sans text-sm text-forest">Fotos do carrossel (1 a {MAX_PHOTOS})</legend>

        {slots.map((slot, index) => (
          <div key={slot.key} className="flex flex-col gap-2 border-b border-line pb-4">
            <PhotoUploadField
              name={`photo${index}`}
              currentUrl={slot.currentUrl}
              label={`Foto ${index + 1}`}
              showRemoveCheckbox={false}
            />
            {index > 0 && (
              <button
                type="button"
                onClick={() => removeSlot(slot.key)}
                className="self-start font-sans text-xs uppercase tracking-widest text-forest/70 hover:text-moss"
              >
                × Remover esta foto
              </button>
            )}
          </div>
        ))}

        {slots.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={addSlot}
            className="self-start font-sans text-xs uppercase tracking-widest text-moss hover:text-forest"
          >
            + Adicionar foto
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/admin/HomeHeroForm.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Run the full test suite, lint, and build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/HomeHeroForm.tsx src/components/admin/HomeHeroForm.test.tsx
git commit -m "feat(admin): replace Hero's 5 fixed photo blocks with a dynamic add/remove list"
```

---

## Task 5: Back-to-list link on every CMS edit page

**Files:**
- Modify: `src/app/admin/(protected)/conteudo/configuracoes/page.tsx`
- Modify: `src/app/admin/(protected)/conteudo/hero/page.tsx`
- Modify: `src/app/admin/(protected)/conteudo/marcos/page.tsx`
- Modify: `src/app/admin/(protected)/conteudo/carrossel/page.tsx`
- Modify: `src/app/admin/(protected)/conteudo/dicas-cerimonia/page.tsx`
- Modify: `src/app/admin/(protected)/conteudo/dicas-traje/page.tsx`
- Modify: `src/app/admin/(protected)/conteudo/dicas-hospedagem/page.tsx`

**Interfaces:**
- Consumes: `Link` (existing, `next/link`).
- Produces: no prop/behavior changes — each page gains a `← Voltar` link
  to `/admin/conteudo` above its `<h1>`.

- [ ] **Step 1: Update `configuracoes/page.tsx`**

Replace the full contents of `src/app/admin/(protected)/conteudo/configuracoes/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export const metadata: Metadata = {
  title: "Configurações | Painel Administrativo",
};

export default async function SettingsContentPage() {
  const content = await getSiteContentOrDefault("settings");

  return (
    <div>
      <Link href="/admin/conteudo" className="mb-4 inline-block font-sans text-sm text-forest/70 hover:text-moss">
        ← Voltar
      </Link>
      <h1 className="font-serif text-3xl text-forest">Configurações</h1>
      <div className="mt-6">
        <SettingsForm defaultValues={content} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `hero/page.tsx`**

Replace the full contents of `src/app/admin/(protected)/conteudo/hero/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { HomeHeroForm } from "@/components/admin/HomeHeroForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export const metadata: Metadata = {
  title: "Hero da Home | Painel Administrativo",
};

export default async function HomeHeroContentPage() {
  const content = await getSiteContentOrDefault("home-hero");

  return (
    <div>
      <Link href="/admin/conteudo" className="mb-4 inline-block font-sans text-sm text-forest/70 hover:text-moss">
        ← Voltar
      </Link>
      <h1 className="font-serif text-3xl text-forest">Hero da Home</h1>
      <div className="mt-6">
        <HomeHeroForm defaultValues={content} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update `marcos/page.tsx`**

Replace the full contents of `src/app/admin/(protected)/conteudo/marcos/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { HomeMilestonePhotosForm } from "@/components/admin/HomeMilestonePhotosForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export const metadata: Metadata = {
  title: "Fotos dos Marcos | Painel Administrativo",
};

export default async function MilestonePhotosContentPage() {
  const content = await getSiteContentOrDefault("home-milestone-photos");

  return (
    <div>
      <Link href="/admin/conteudo" className="mb-4 inline-block font-sans text-sm text-forest/70 hover:text-moss">
        ← Voltar
      </Link>
      <h1 className="font-serif text-3xl text-forest">Fotos dos Marcos (Save the Date)</h1>
      <div className="mt-6">
        <HomeMilestonePhotosForm defaultValues={content} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update `carrossel/page.tsx`**

Replace the full contents of `src/app/admin/(protected)/conteudo/carrossel/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { HomeTopicsForm } from "@/components/admin/HomeTopicsForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export const metadata: Metadata = {
  title: "Carrossel da Home | Painel Administrativo",
};

export default async function TopicsContentPage() {
  const content = await getSiteContentOrDefault("home-topics");

  return (
    <div>
      <Link href="/admin/conteudo" className="mb-4 inline-block font-sans text-sm text-forest/70 hover:text-moss">
        ← Voltar
      </Link>
      <h1 className="font-serif text-3xl text-forest">Carrossel da Home</h1>
      <div className="mt-6">
        <HomeTopicsForm defaultValues={content} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update `dicas-cerimonia/page.tsx`**

Replace the full contents of `src/app/admin/(protected)/conteudo/dicas-cerimonia/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { TipsContentForm } from "@/components/admin/TipsContentForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";
import { updateTipsCerimoniaAction } from "./actions";

export const metadata: Metadata = {
  title: "Dicas — Cerimônia | Painel Administrativo",
};

export default async function TipsCerimoniaContentPage() {
  const content = await getSiteContentOrDefault("tips-cerimonia");

  return (
    <div>
      <Link href="/admin/conteudo" className="mb-4 inline-block font-sans text-sm text-forest/70 hover:text-moss">
        ← Voltar
      </Link>
      <h1 className="font-serif text-3xl text-forest">Dicas — Cerimônia</h1>
      <div className="mt-6">
        <TipsContentForm defaultValues={content} action={updateTipsCerimoniaAction} photoLabel="Local da cerimônia" />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Update `dicas-traje/page.tsx`**

Replace the full contents of `src/app/admin/(protected)/conteudo/dicas-traje/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { TipsContentForm } from "@/components/admin/TipsContentForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";
import { updateTipsTrajeAction } from "./actions";

export const metadata: Metadata = {
  title: "Dicas — Traje | Painel Administrativo",
};

export default async function TipsTrajeContentPage() {
  const content = await getSiteContentOrDefault("tips-traje");

  return (
    <div>
      <Link href="/admin/conteudo" className="mb-4 inline-block font-sans text-sm text-forest/70 hover:text-moss">
        ← Voltar
      </Link>
      <h1 className="font-serif text-3xl text-forest">Dicas — Traje</h1>
      <div className="mt-6">
        <TipsContentForm defaultValues={content} action={updateTipsTrajeAction} photoLabel="Inspiração de traje" />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Update `dicas-hospedagem/page.tsx`**

Replace the full contents of `src/app/admin/(protected)/conteudo/dicas-hospedagem/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { TipsContentForm } from "@/components/admin/TipsContentForm";
import { getSiteContentOrDefault } from "@/infrastructure/composition";
import { updateTipsHospedagemAction } from "./actions";

export const metadata: Metadata = {
  title: "Dicas — Hospedagem | Painel Administrativo",
};

export default async function TipsHospedagemContentPage() {
  const content = await getSiteContentOrDefault("tips-hospedagem");

  return (
    <div>
      <Link href="/admin/conteudo" className="mb-4 inline-block font-sans text-sm text-forest/70 hover:text-moss">
        ← Voltar
      </Link>
      <h1 className="font-serif text-3xl text-forest">Dicas — Hospedagem</h1>
      <div className="mt-6">
        <TipsContentForm defaultValues={content} action={updateTipsHospedagemAction} photoLabel="Hospedagem" />
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Run the full test suite, lint, and build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass; all 7 routes still build.

- [ ] **Step 9: Commit**

```bash
git add "src/app/admin/(protected)/conteudo/configuracoes/page.tsx" "src/app/admin/(protected)/conteudo/hero/page.tsx" "src/app/admin/(protected)/conteudo/marcos/page.tsx" "src/app/admin/(protected)/conteudo/carrossel/page.tsx" "src/app/admin/(protected)/conteudo/dicas-cerimonia/page.tsx" "src/app/admin/(protected)/conteudo/dicas-traje/page.tsx" "src/app/admin/(protected)/conteudo/dicas-hospedagem/page.tsx"
git commit -m "feat(admin): add a back-to-list link on every CMS edit page"
```

---

## Task 6: Presentes gift photo upload

**Files:**
- Modify: `src/components/admin/GiftForm.tsx`
- Modify: `src/app/admin/(protected)/presentes/actions.ts`
- Create: `src/app/admin/(protected)/presentes/actions.test.ts`

**Interfaces:**
- Consumes: `PhotoUploadField` (Task 2); `resolvePhotoField`,
  `createUpsertGiftUseCase` (existing, both already exported from
  `@/infrastructure/composition`).
- Produces: no change to `GiftForm`'s external prop signature
  (`{ defaultValues?: GiftFormValues }`). `upsertGiftAction` resolves the
  gift photo the same way every CMS Server Action resolves a photo field
  (`resolvePhotoField("gifts", "image", formData, currentImageUrl,
  "imageFile", "imageRemove")`), uploading through the same
  `site-content` bucket under a `gifts/` path — no new bucket, no new
  migration. A submission with no photo (new gift, nothing selected)
  returns `{ status: "error", message: "Selecione uma foto para o
  presente." }` without calling `createUpsertGiftUseCase`.

- [ ] **Step 1: Update `GiftForm.tsx`**

Replace the full contents of `src/components/admin/GiftForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import {
  upsertGiftAction,
  type UpsertGiftActionState,
} from "@/app/admin/(protected)/presentes/actions";
import { GiftFormValues } from "@/components/admin/giftFormSchema";
import { PhotoUploadField } from "@/components/admin/PhotoUploadField";

interface GiftFormProps {
  defaultValues?: GiftFormValues;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialUpsertGiftActionState: UpsertGiftActionState = { status: "idle" };

export function GiftForm({ defaultValues }: GiftFormProps) {
  const [state, formAction, isPending] = useActionState(upsertGiftAction, initialUpsertGiftActionState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

      <div>
        <label htmlFor="name" className="block font-sans text-sm text-forest">
          Nome
        </label>
        <input id="name" name="name" defaultValue={defaultValues?.name} required className={inputClassName} />
      </div>

      <div>
        <label htmlFor="description" className="block font-sans text-sm text-forest">
          Descrição
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={defaultValues?.description}
          required
          rows={3}
          className={inputClassName}
        />
      </div>

      <PhotoUploadField
        name="image"
        currentUrl={defaultValues?.imageUrl ?? null}
        label="Foto do presente"
        className="h-40 w-full rounded-md"
        showRemoveCheckbox={false}
      />

      <div>
        <label htmlFor="price" className="block font-sans text-sm text-forest">
          Valor (R$)
        </label>
        <input
          id="price"
          name="price"
          type="number"
          min={0}
          step="0.01"
          defaultValue={defaultValues?.price}
          required
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="category" className="block font-sans text-sm text-forest">
          Categoria
        </label>
        <input
          id="category"
          name="category"
          defaultValue={defaultValues?.category}
          required
          className={inputClassName}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar presente"}
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

- [ ] **Step 2: Write the failing test for the "no photo" error case**

Create `src/app/admin/(protected)/presentes/actions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { upsertGiftAction } from "./actions";

describe("upsertGiftAction", () => {
  it("returns an error state without saving when no photo is provided or already on file", async () => {
    const formData = new FormData();
    formData.set("name", "Jogo de panelas");
    formData.set("description", "Um belo jogo de panelas antiaderentes.");
    formData.set("price", "250");
    formData.set("category", "Cozinha");

    const result = await upsertGiftAction({ status: "idle" }, formData);

    expect(result).toEqual({ status: "error", message: "Selecione uma foto para o presente." });
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run "src/app/admin/(protected)/presentes/actions.test.ts"`
Expected: FAIL — the current `upsertGiftAction` doesn't check for a
missing photo before validating other fields; it would instead fail Zod
validation on the missing `imageUrl` with the generic "Verifique os
campos do formulário." message, not the specific one this test expects.

- [ ] **Step 4: Update `upsertGiftAction`**

Replace the full contents of `src/app/admin/(protected)/presentes/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createUpsertGiftUseCase, resolvePhotoField } from "@/infrastructure/composition";
import { giftFormSchema } from "@/components/admin/giftFormSchema";

export interface UpsertGiftActionState {
  status: "idle" | "error";
  message?: string;
}

export async function upsertGiftAction(
  _prevState: UpsertGiftActionState,
  formData: FormData
): Promise<UpsertGiftActionState> {
  const currentImageUrl = (formData.get("imageCurrentUrl") as string) || null;
  const imageUrl = await resolvePhotoField("gifts", "image", formData, currentImageUrl, "imageFile", "imageRemove");

  if (!imageUrl) {
    return { status: "error", message: "Selecione uma foto para o presente." };
  }

  const parsed = giftFormSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    description: formData.get("description"),
    imageUrl,
    price: formData.get("price"),
    category: formData.get("category"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createUpsertGiftUseCase().execute(parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar o presente agora." };
  }

  redirect("/admin/presentes");
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run "src/app/admin/(protected)/presentes/actions.test.ts"`
Expected: PASS (1 test)

- [ ] **Step 6: Run the full test suite, lint, and build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass. Confirm `src/app/admin/(protected)/presentes/novo/page.tsx`
and `src/app/admin/(protected)/presentes/[id]/page.tsx` still build
without changes — neither needs updates, since `GiftForm`'s prop
contract (`defaultValues?: GiftFormValues`) is unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/GiftForm.tsx "src/app/admin/(protected)/presentes/actions.ts" "src/app/admin/(protected)/presentes/actions.test.ts"
git commit -m "feat(admin): convert the Presentes gift photo field from a URL input to a real upload"
```

---

## Task 7: Final verification

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Confirm no stray references to the old photo-field markup remain**

Run: `grep -rln "PhotoOrPlaceholder" src/components/admin/`
Expected: no output — every admin form's photo field now goes through
`PhotoUploadField`, which is the only remaining consumer of
`PhotoOrPlaceholder` in `src/components/`.

- [ ] **Step 2: Confirm the raised size cap took effect**

Run: `grep -n "MAX_PHOTO_BYTES" src/infrastructure/supabase/uploadSiteContentPhoto.ts`
Expected: `const MAX_PHOTO_BYTES = 15 * 1024 * 1024;`

- [ ] **Step 3: Run the full test suite, lint, and build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass. Confirm the build's route list is unchanged from
before this plan (same routes, including all 7 `/admin/conteudo/*`
routes and the 2 Presentes admin routes).

- [ ] **Step 4: No commit needed for this task** — it is verification
  only. If any step above surfaces an issue, fix it in a follow-up
  commit with an explicit file list and re-run this task's steps.

## What this plan intentionally does NOT do

- Does not add drag-and-drop upload, multi-file batch selection, or
  cropping/rotation tools.
- Does not add per-section compression tuning — one preset
  (`BALANCED_COMPRESSION`), used everywhere.
- Does not change how photos are stored or served once uploaded (same
  `site-content` public Storage bucket, same public-URL scheme).
- Does not change Milestone Photos, Home Topics, or the 3 Dicas pages'
  fixed-cardinality structure — only their existing single-photo fields
  gain compression/preview via `PhotoUploadField`.
- Does not add a "back" link anywhere outside the 7 CMS edit pages (the
  Presentes admin pages already have their own navigation).
