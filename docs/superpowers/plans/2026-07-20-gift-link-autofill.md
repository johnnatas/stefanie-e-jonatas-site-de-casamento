# Gift Product-Link Autofill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the gift create/edit form, pasting a product URL and clicking "Buscar dados do link" fills in whichever of name, price, and photo the target page's metadata exposes — never blocking manual entry of whatever isn't found.

**Architecture:** A pure, dependency-free HTML metadata extractor (`extractProductMetadata`) plus a pure hostname-blocklist check (`isBlockedHost`) back a new Server Action (`fetchGiftLinkMetadataAction`) that fetches the pasted URL, extracts title/image/price, and — if an image was found — downloads and re-uploads it through the existing `uploadSiteContentPhoto` helper so it lives in this project's own storage. `GiftForm` calls this action directly from a button click (not a form submission), then imperatively fills the Name/Price inputs via refs and updates the photo preview via React state.

**Tech Stack:** Next.js 16.2.10 App Router, TypeScript, Vitest, no new dependencies (HTML metadata extraction done via targeted regex, not a full HTML parser).

## Global Constraints

- Never `git add -A` — stage explicit file lists only.
- `"use server"` files may only export `async function`s — no exported constants; the blocklist/regex-extraction logic must live in plain (non-`"use server"`) modules so it stays independently unit-testable.
- No new npm dependency for HTML parsing — targeted string/regex extraction only, per the spec's explicit scope limit.
- The "Buscar dados do link" button is `type="button"`, never triggers `upsertGiftAction` — filling fields from a link fetch and saving the gift are two fully separate actions.
- Only `http`/`https` URLs are fetched; obviously-internal hosts (`localhost`, `127.0.0.1`, `0.0.0.0`, and the private IP-literal ranges `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`) are rejected before any fetch.
- A fetch timeout applies to both the metadata request and the image download.
- Follow existing code patterns/style exactly (Tailwind class conventions already used in `GiftForm.tsx`, existing `vi.mock`-based Server Action test doubles already used in `GiftCard.test.tsx`).

---

## Task 1: `extractProductMetadata` — pure HTML metadata extraction

**Files:**
- Create: `src/shared/utils/extractProductMetadata.ts`
- Test: `src/shared/utils/extractProductMetadata.test.ts`

**Interfaces:**
- Produces: `interface ExtractedProductMetadata { title?: string; imageUrl?: string; price?: number }`, `function extractProductMetadata(html: string): ExtractedProductMetadata` — consumed by Task 3's Server Action.

- [ ] **Step 1: Write the failing tests**

Create `src/shared/utils/extractProductMetadata.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { extractProductMetadata } from "@/shared/utils/extractProductMetadata";

describe("extractProductMetadata", () => {
  it("extracts title, image, and price when all are present", () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Liquidificador Turbo 3000">
        <meta property="og:image" content="https://loja.example.com/img/liquidificador.jpg">
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"Product","name":"Liquidificador Turbo 3000","offers":{"@type":"Offer","price":"249.90","priceCurrency":"BRL"}}
        </script>
      </head><body></body></html>
    `;

    const result = extractProductMetadata(html);

    expect(result).toEqual({
      title: "Liquidificador Turbo 3000",
      imageUrl: "https://loja.example.com/img/liquidificador.jpg",
      price: 249.9,
    });
  });

  it("falls back to the <title> tag when og:title is absent", () => {
    const html = `<html><head><title> Panela de Pressão Elétrica </title></head><body></body></html>`;

    const result = extractProductMetadata(html);

    expect(result.title).toBe("Panela de Pressão Elétrica");
    expect(result.imageUrl).toBeUndefined();
    expect(result.price).toBeUndefined();
  });

  it("does not extract a price from JSON-LD whose @type is not Product", () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Blog Post">
        <script type="application/ld+json">{"@type":"Article","name":"Como escolher panelas"}</script>
      </head></html>
    `;

    const result = extractProductMetadata(html);

    expect(result.title).toBe("Blog Post");
    expect(result.price).toBeUndefined();
  });

  it("returns all fields undefined when no metadata is present", () => {
    const html = `<html><head></head><body><p>Sem nada aqui</p></body></html>`;

    const result = extractProductMetadata(html);

    expect(result).toEqual({ title: undefined, imageUrl: undefined, price: undefined });
  });

  it("does not throw on malformed JSON-LD content", () => {
    const html = `<html><head><script type="application/ld+json">{ not valid json </script></head></html>`;

    expect(() => extractProductMetadata(html)).not.toThrow();
    expect(extractProductMetadata(html).price).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/shared/utils/extractProductMetadata.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/shared/utils/extractProductMetadata.ts`:

```ts
export interface ExtractedProductMetadata {
  title?: string;
  imageUrl?: string;
  price?: number;
}

function extractMetaContent(html: string, property: string): string | undefined {
  const propertyFirst = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, "i");
  const contentFirst = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, "i");
  const match = html.match(propertyFirst) ?? html.match(contentFirst);
  return match ? match[1].trim() || undefined : undefined;
}

function extractTitleTag(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() || undefined : undefined;
}

function extractJsonLdPrice(html: string): number | undefined {
  const scriptMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

  for (const scriptMatch of scriptMatches) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(scriptMatch[1]);
    } catch {
      continue;
    }

    const candidates = Array.isArray(parsed) ? parsed : [parsed];

    for (const candidate of candidates) {
      if (typeof candidate !== "object" || candidate === null) continue;
      const record = candidate as Record<string, unknown>;
      const types = Array.isArray(record["@type"]) ? record["@type"] : [record["@type"]];
      if (!types.includes("Product")) continue;

      const offers = Array.isArray(record.offers) ? record.offers[0] : record.offers;
      const price = (offers as Record<string, unknown> | undefined)?.price;
      const numericPrice = typeof price === "string" ? Number(price) : price;

      if (typeof numericPrice === "number" && Number.isFinite(numericPrice) && numericPrice > 0) {
        return numericPrice;
      }
    }
  }

  return undefined;
}

export function extractProductMetadata(html: string): ExtractedProductMetadata {
  return {
    title: extractMetaContent(html, "og:title") ?? extractTitleTag(html),
    imageUrl: extractMetaContent(html, "og:image"),
    price: extractJsonLdPrice(html),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/shared/utils/extractProductMetadata.test.ts`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add src/shared/utils/extractProductMetadata.ts src/shared/utils/extractProductMetadata.test.ts
git commit -m "feat(gifts): add extractProductMetadata pure HTML metadata extractor"
```

---

## Task 2: `isBlockedHost` — private/internal host guard

**Files:**
- Create: `src/shared/utils/isBlockedHost.ts`
- Test: `src/shared/utils/isBlockedHost.test.ts`

**Interfaces:**
- Produces: `function isBlockedHost(hostname: string): boolean` — consumed by Task 3's Server Action.

- [ ] **Step 1: Write the failing test**

Create `src/shared/utils/isBlockedHost.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isBlockedHost } from "@/shared/utils/isBlockedHost";

describe("isBlockedHost", () => {
  it("blocks localhost and loopback addresses", () => {
    expect(isBlockedHost("localhost")).toBe(true);
    expect(isBlockedHost("127.0.0.1")).toBe(true);
    expect(isBlockedHost("0.0.0.0")).toBe(true);
  });

  it("blocks private IP-literal ranges", () => {
    expect(isBlockedHost("10.0.0.5")).toBe(true);
    expect(isBlockedHost("172.16.0.1")).toBe(true);
    expect(isBlockedHost("172.31.255.255")).toBe(true);
    expect(isBlockedHost("192.168.1.1")).toBe(true);
    expect(isBlockedHost("169.254.1.1")).toBe(true);
  });

  it("allows public hosts and IPs outside the private ranges", () => {
    expect(isBlockedHost("www.loja.example.com")).toBe(false);
    expect(isBlockedHost("8.8.8.8")).toBe(false);
    expect(isBlockedHost("172.32.0.1")).toBe(false);
    expect(isBlockedHost("172.15.255.255")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/utils/isBlockedHost.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/shared/utils/isBlockedHost.ts`:

```ts
const LITERAL_BLOCKED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"];

export function isBlockedHost(hostname: string): boolean {
  if (LITERAL_BLOCKED_HOSTS.includes(hostname)) {
    return true;
  }
  if (/^10\./.test(hostname)) {
    return true;
  }
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) {
    return true;
  }
  if (/^192\.168\./.test(hostname)) {
    return true;
  }
  if (/^169\.254\./.test(hostname)) {
    return true;
  }
  return false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/utils/isBlockedHost.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add src/shared/utils/isBlockedHost.ts src/shared/utils/isBlockedHost.test.ts
git commit -m "feat(gifts): add isBlockedHost guard against internal/private hosts"
```

---

## Task 3: `fetchGiftLinkMetadataAction` — the Server Action

**Files:**
- Create: `src/app/admin/(protected)/presentes/linkAutofillAction.ts`
- Test: `src/app/admin/(protected)/presentes/linkAutofillAction.test.ts`

**Interfaces:**
- Consumes: `extractProductMetadata` (Task 1), `isBlockedHost` (Task 2), `uploadSiteContentPhoto` (existing, exported from `@/infrastructure/composition`).
- Produces: `interface GiftLinkAutofillResult { status: "success" | "error"; title?: string; price?: number; imageUrl?: string; message?: string }`, `async function fetchGiftLinkMetadataAction(productUrl: string): Promise<GiftLinkAutofillResult>` — consumed by Task 4's `GiftForm`.

- [ ] **Step 1: Write the failing tests**

Create `src/app/admin/(protected)/presentes/linkAutofillAction.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGiftLinkMetadataAction } from "@/app/admin/(protected)/presentes/linkAutofillAction";

vi.mock("@/infrastructure/composition", () => ({
  uploadSiteContentPhoto: vi.fn().mockResolvedValue("https://storage.example.com/gifts/link-import-123.jpg"),
}));

describe("fetchGiftLinkMetadataAction", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns title, price, and an uploaded image url on full success", async () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Liquidificador Turbo 3000">
        <meta property="og:image" content="https://loja.example.com/img.jpg">
        <script type="application/ld+json">{"@type":"Product","offers":{"price":"249.90"}}</script>
      </head></html>
    `;

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, text: async () => html })
        .mockResolvedValueOnce({
          ok: true,
          blob: async () => new Blob(["fake-image-bytes"], { type: "image/jpeg" }),
          headers: new Headers({ "content-type": "image/jpeg" }),
        })
    );

    const result = await fetchGiftLinkMetadataAction("https://loja.example.com/produto/123");

    expect(result.status).toBe("success");
    expect(result.title).toBe("Liquidificador Turbo 3000");
    expect(result.price).toBe(249.9);
    expect(result.imageUrl).toBe("https://storage.example.com/gifts/link-import-123.jpg");
  });

  it("returns whatever was found when no image is present", async () => {
    const html = `<html><head><title>Produto Simples</title></head></html>`;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: true, text: async () => html }));

    const result = await fetchGiftLinkMetadataAction("https://loja.example.com/produto/456");

    expect(result.status).toBe("success");
    expect(result.title).toBe("Produto Simples");
    expect(result.price).toBeUndefined();
    expect(result.imageUrl).toBeUndefined();
  });

  it("returns an error when nothing at all is found", async () => {
    const html = `<html><head></head><body></body></html>`;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: true, text: async () => html }));

    const result = await fetchGiftLinkMetadataAction("https://loja.example.com/produto/empty");

    expect(result.status).toBe("error");
  });

  it("returns an error when the metadata fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("network error")));

    const result = await fetchGiftLinkMetadataAction("https://loja.example.com/produto/789");

    expect(result.status).toBe("error");
  });

  it("returns an error when the metadata response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false }));

    const result = await fetchGiftLinkMetadataAction("https://loja.example.com/produto/404");

    expect(result.status).toBe("error");
  });

  it("rejects a blocked/internal host without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchGiftLinkMetadataAction("http://localhost:3000/admin");

    expect(result.status).toBe("error");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a non-http(s) URL without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchGiftLinkMetadataAction("javascript:alert(1)");

    expect(result.status).toBe("error");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid URL string", async () => {
    const result = await fetchGiftLinkMetadataAction("not-a-url");

    expect(result.status).toBe("error");
  });

  it("still returns title/price when the image download fails", async () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Cafeteira">
        <meta property="og:image" content="https://loja.example.com/broken.jpg">
        <script type="application/ld+json">{"@type":"Product","offers":{"price":"199"}}</script>
      </head></html>
    `;

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, text: async () => html })
        .mockResolvedValueOnce({ ok: false })
    );

    const result = await fetchGiftLinkMetadataAction("https://loja.example.com/produto/cafeteira");

    expect(result.status).toBe("success");
    expect(result.title).toBe("Cafeteira");
    expect(result.price).toBe(199);
    expect(result.imageUrl).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run "src/app/admin/(protected)/presentes/linkAutofillAction.test.ts"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/app/admin/(protected)/presentes/linkAutofillAction.ts`:

```ts
"use server";

import { uploadSiteContentPhoto } from "@/infrastructure/composition";
import { extractProductMetadata } from "@/shared/utils/extractProductMetadata";
import { isBlockedHost } from "@/shared/utils/isBlockedHost";

const FETCH_TIMEOUT_MS = 8000;
const GENERIC_ERROR_MESSAGE = "Não foi possível buscar dados desse link.";

export interface GiftLinkAutofillResult {
  status: "success" | "error";
  title?: string;
  price?: number;
  imageUrl?: string;
  message?: string;
}

export async function fetchGiftLinkMetadataAction(productUrl: string): Promise<GiftLinkAutofillResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(productUrl);
  } catch {
    return { status: "error", message: "Link inválido." };
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return { status: "error", message: "Link inválido." };
  }

  if (isBlockedHost(parsedUrl.hostname)) {
    return { status: "error", message: GENERIC_ERROR_MESSAGE };
  }

  let html: string;
  try {
    const response = await fetch(parsedUrl.toString(), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StefanieJonatasSite/1.0)" },
    });
    if (!response.ok) {
      return { status: "error", message: GENERIC_ERROR_MESSAGE };
    }
    html = await response.text();
  } catch {
    return { status: "error", message: GENERIC_ERROR_MESSAGE };
  }

  const metadata = extractProductMetadata(html);

  if (!metadata.title && !metadata.imageUrl && !metadata.price) {
    return { status: "error", message: "Não foi possível encontrar dados nesse link." };
  }

  let uploadedImageUrl: string | undefined;
  if (metadata.imageUrl) {
    try {
      const imageResponse = await fetch(metadata.imageUrl, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (imageResponse.ok) {
        const blob = await imageResponse.blob();
        const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";
        const extension = contentType.split("/")[1] ?? "jpg";
        const file = new File([blob], `link-import.${extension}`, { type: contentType });
        uploadedImageUrl = await uploadSiteContentPhoto("gifts", "link-import", file);
      }
    } catch {
      // Image download/upload failed — keep whatever title/price were found.
    }
  }

  return {
    status: "success",
    title: metadata.title,
    price: metadata.price,
    imageUrl: uploadedImageUrl,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run "src/app/admin/(protected)/presentes/linkAutofillAction.test.ts"`
Expected: PASS (9/9).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "src/app/admin/(protected)/presentes/linkAutofillAction.ts" "src/app/admin/(protected)/presentes/linkAutofillAction.test.ts"
git commit -m "feat(gifts): add fetchGiftLinkMetadataAction"
```

---

## Task 4: `GiftForm` — the "Buscar dados do link" UI

**Files:**
- Modify: `src/components/admin/GiftForm.tsx`
- Test: `src/components/admin/GiftForm.test.tsx` (new — no test currently exists for this component)

**Interfaces:**
- Consumes: `fetchGiftLinkMetadataAction` (Task 3).
- Produces: no change to `GiftFormProps` — the new field is entirely internal to `GiftForm`, so `presentes/novo/page.tsx` and `presentes/[id]/page.tsx` need no changes.

- [ ] **Step 1: Write the failing tests**

Create `src/components/admin/GiftForm.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GiftForm } from "@/components/admin/GiftForm";

const upsertGiftActionMock = vi.fn();
const fetchGiftLinkMetadataActionMock = vi.fn();

vi.mock("@/app/admin/(protected)/presentes/actions", () => ({
  upsertGiftAction: (...args: unknown[]) => upsertGiftActionMock(...args),
}));

vi.mock("@/app/admin/(protected)/presentes/linkAutofillAction", () => ({
  fetchGiftLinkMetadataAction: (...args: unknown[]) => fetchGiftLinkMetadataActionMock(...args),
}));

describe("GiftForm", () => {
  it("fills name, price, and photo preview when the link fetch succeeds", async () => {
    fetchGiftLinkMetadataActionMock.mockResolvedValue({
      status: "success",
      title: "Liquidificador Turbo 3000",
      price: 249.9,
      imageUrl: "https://storage.example.com/gifts/link-import.jpg",
    });
    const user = userEvent.setup();
    render(<GiftForm />);

    await user.type(screen.getByLabelText("Link do produto (opcional)"), "https://loja.example.com/produto/1");
    await user.click(screen.getByRole("button", { name: "Buscar dados do link" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Nome")).toHaveValue("Liquidificador Turbo 3000");
    });
    expect(screen.getByLabelText("Valor (R$)")).toHaveValue(249.9);
    expect(screen.getByText("Título, valor e imagem encontrados.")).toBeInTheDocument();
  });

  it("shows an error message when the link fetch fails, without touching the form fields", async () => {
    fetchGiftLinkMetadataActionMock.mockResolvedValue({
      status: "error",
      message: "Não foi possível buscar dados desse link.",
    });
    const user = userEvent.setup();
    render(<GiftForm />);

    await user.type(screen.getByLabelText("Link do produto (opcional)"), "https://loja.example.com/produto/2");
    await user.click(screen.getByRole("button", { name: "Buscar dados do link" }));

    await waitFor(() => {
      expect(screen.getByText("Não foi possível buscar dados desse link.")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Nome")).toHaveValue("");
    expect(upsertGiftActionMock).not.toHaveBeenCalled();
  });

  it("fills only what was found and reports what's missing", async () => {
    fetchGiftLinkMetadataActionMock.mockResolvedValue({
      status: "success",
      title: "Produto Simples",
    });
    const user = userEvent.setup();
    render(<GiftForm />);

    await user.type(screen.getByLabelText("Link do produto (opcional)"), "https://loja.example.com/produto/3");
    await user.click(screen.getByRole("button", { name: "Buscar dados do link" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Nome")).toHaveValue("Produto Simples");
    });
    expect(screen.getByText(/Preencha valor, imagem manualmente\./)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/admin/GiftForm.test.tsx`
Expected: FAIL — `screen.getByLabelText("Link do produto (opcional)")` throws, since `GiftForm.tsx` doesn't render that field yet.

- [ ] **Step 3: Implement**

Replace the full content of `src/components/admin/GiftForm.tsx`:

```tsx
"use client";

import { useActionState, useRef, useState } from "react";
import {
  upsertGiftAction,
  type UpsertGiftActionState,
} from "@/app/admin/(protected)/presentes/actions";
import { fetchGiftLinkMetadataAction } from "@/app/admin/(protected)/presentes/linkAutofillAction";
import { GiftFormValues } from "@/components/admin/giftFormSchema";
import { PhotoUploadField } from "@/components/admin/PhotoUploadField";

interface GiftFormProps {
  defaultValues?: GiftFormValues;
  checkoutUrl?: string | null;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialUpsertGiftActionState: UpsertGiftActionState = { status: "idle" };

interface LinkFetchState {
  status: "idle" | "pending" | "success" | "error";
  message?: string;
}

const initialLinkFetchState: LinkFetchState = { status: "idle" };

export function GiftForm({ defaultValues, checkoutUrl }: GiftFormProps) {
  const [state, formAction, isPending] = useActionState(upsertGiftAction, initialUpsertGiftActionState);
  const [imageUrl, setImageUrl] = useState<string | null>(defaultValues?.imageUrl ?? null);
  const [linkFetchState, setLinkFetchState] = useState<LinkFetchState>(initialLinkFetchState);

  const productLinkRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  async function handleFetchLinkMetadata() {
    const url = productLinkRef.current?.value.trim();
    if (!url) return;

    setLinkFetchState({ status: "pending" });
    const result = await fetchGiftLinkMetadataAction(url);

    if (result.status === "error") {
      setLinkFetchState({ status: "error", message: result.message ?? "Não foi possível buscar dados desse link." });
      return;
    }

    const found: string[] = [];
    if (result.title && nameInputRef.current) {
      nameInputRef.current.value = result.title;
      found.push("título");
    }
    if (result.price !== undefined && priceInputRef.current) {
      priceInputRef.current.value = String(result.price);
      found.push("valor");
    }
    if (result.imageUrl) {
      setImageUrl(result.imageUrl);
      found.push("imagem");
    }

    const allFields = ["título", "valor", "imagem"];
    const missing = allFields.filter((field) => !found.includes(field));
    const message =
      missing.length === 0
        ? "Título, valor e imagem encontrados."
        : `${found.length > 0 ? found.join(", ") + " encontrado(s). " : ""}Preencha ${missing.join(", ")} manualmente.`;

    setLinkFetchState({ status: "success", message });
  }

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

      <div>
        <label htmlFor="productLink" className="block font-sans text-sm text-forest">
          Link do produto (opcional)
        </label>
        <div className="mt-1 flex items-center gap-2">
          <input
            id="productLink"
            ref={productLinkRef}
            type="url"
            placeholder="Cole o link do produto"
            className={inputClassName}
          />
          <button
            type="button"
            onClick={handleFetchLinkMetadata}
            disabled={linkFetchState.status === "pending"}
            className="shrink-0 rounded-full border border-line px-4 py-2 font-sans text-xs uppercase tracking-widest text-forest transition-colors hover:border-moss disabled:opacity-60"
          >
            {linkFetchState.status === "pending" ? "Buscando..." : "Buscar dados do link"}
          </button>
        </div>
        {linkFetchState.message && (
          <p
            className={`mt-1 font-sans text-xs ${linkFetchState.status === "error" ? "text-danger" : "text-moss"}`}
          >
            {linkFetchState.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="name" className="block font-sans text-sm text-forest">
          Nome
        </label>
        <input
          id="name"
          name="name"
          ref={nameInputRef}
          defaultValue={defaultValues?.name}
          required
          className={inputClassName}
        />
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
        currentUrl={imageUrl}
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
          ref={priceInputRef}
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

      {defaultValues?.id && (
        <div>
          <label htmlFor="secretKey" className="block font-sans text-sm text-forest">
            Chave secreta (obrigatória se alterar o valor)
          </label>
          <input
            id="secretKey"
            name="secretKey"
            type="password"
            autoComplete="off"
            className={inputClassName}
          />
        </div>
      )}

      {defaultValues?.id && checkoutUrl && (
        <div>
          <label htmlFor="checkoutUrl" className="block font-sans text-sm text-forest">
            Link de pagamento
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              id="checkoutUrl"
              type="text"
              readOnly
              value={checkoutUrl}
              onFocus={(event) => event.target.select()}
              className={inputClassName}
            />
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(checkoutUrl)}
              className="shrink-0 rounded-full border border-line px-4 py-2 font-sans text-xs uppercase tracking-widest text-forest transition-colors hover:border-moss"
            >
              Copiar link
            </button>
          </div>
        </div>
      )}

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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/admin/GiftForm.test.tsx`
Expected: PASS (3/3).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/GiftForm.tsx src/components/admin/GiftForm.test.tsx
git commit -m "feat(gifts): add product-link autofill UI to GiftForm"
```

---

## Task 5: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all test files PASS, no failures.

- [ ] **Step 2: Run the full typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run the linter**

Run: `npm run lint`
Expected: no errors (the 3 pre-existing `<img>` warnings are fine).

- [ ] **Step 4: Run the production build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Manual smoke test**

Run `npm run dev`, log into `/admin`, then:
- Go to `/admin/presentes/novo`. Paste a real product URL from a store known to expose Open Graph tags and JSON-LD `Product` data (e.g. a typical Brazilian e-commerce product page). Click "Buscar dados do link". Confirm the Nome/Valor fields fill in and the photo preview updates, or — if the target site doesn't expose one of these — confirm the status message correctly says what's missing rather than silently doing nothing.
- Try a URL that returns 404 or doesn't resolve; confirm a clear error message appears and no fields change.
- Try pasting `http://localhost:3000` as the link (self-referential test of the blocked-host guard); confirm it's rejected with an error message and no request is visibly attempted.
- Confirm clicking "Buscar dados do link" never triggers the gift-save flow (no redirect, no "Presente salvo" happens) — only clicking "Salvar presente" does that.
- Save a gift after autofilling to confirm the whole flow (including the already-uploaded photo) round-trips correctly through `upsertGiftAction` exactly like a manually-filled gift would.

- [ ] **Step 6: Report results**

No commit for this task — it is a verification gate. If any smoke-test step fails, return to the relevant task, fix, and re-run this task's steps before considering the plan complete.
