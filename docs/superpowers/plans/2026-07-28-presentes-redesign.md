# Presentes Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Presentes page's intro panel + inline-form gift cards with a denser card grid (image, name, price, "Ver detalhes") and a new details modal that hosts the existing pay-now/reserve-for-later flow, matching the reference layout on both desktop and mobile.

**Architecture:** Extract the interactive state machine currently inline in `GiftCard` (buttons → forms → reservation-confirmation) into a new `GiftDetailsModal` client component, unchanged in business logic (same two Server Actions, same field names/validation). `GiftCard` shrinks to a purely presentational card that opens/closes the modal via local `isModalOpen` state. `GiftGrid` gets denser columns. `page.tsx` drops its `SplitPanel` intro. No schema, Server Action, or domain changes.

**Tech Stack:** Next.js 16.2.10 App Router, TypeScript, Zod v4 (unaffected here), Vitest + Testing Library, existing `useFocusTrap` hook.

## Global Constraints

- No `box-shadow` anywhere (project's "Regra do Chapado") — use `border border-line` for edge definition.
- Only existing design tokens: `moss`, `forest`, `paper`, `paper-soft`, `line`, `danger`; fonts `font-serif` (Playfair), `font-sans` (Inter), `font-script` (Alex Brush). No new colors/fonts.
- Reproduce the reference **structure** only (grid density, modal layout) — never its own visual styling.
- No changes to `src/app/presentes/actions.ts`, `GiftDto.ts`, `formatCurrency`, `useFocusTrap`, `giftReservationWindow` — this is a presentation-only refactor of already-working functionality.
- Payment icon assets already exist at `public/images/payment-icons/{visa,mastercard,boleto,pix}.webp` (added in the design/spec step) — reference them via plain `<img>`, matching the codebase's existing convention for non-`next/image` assets (`Monogram`, `PhotoOrPlaceholder`).
- `gift.description` is not rendered anywhere in the new card or modal (confirmed with the user) — the field stays in `GiftDto`, simply unused here.

---

### Task 1: `GiftDetailsModal` component

**Files:**
- Create: `src/components/gifts/GiftDetailsModal.tsx`
- Create: `src/components/gifts/GiftDetailsModal.test.tsx`

**Interfaces:**
- Consumes: `GiftDto` (unchanged, `@/components/gifts/GiftDto`), `formatCurrency` (unchanged, `@/shared/utils/formatCurrency`), `PhotoOrPlaceholder` (unchanged, `@/components/ui/PhotoOrPlaceholder`), `useFocusTrap` (unchanged, `@/hooks/useFocusTrap`), `createGiftContributionAction` / `reserveGiftForLaterAction` and their `*ActionState` types (unchanged, `@/app/presentes/actions`).
- Produces (for Task 2): `GiftDetailsModal({ gift: GiftDto; canReserveForLater: boolean; onClose: () => void })`.

- [ ] **Step 1: Write the failing test**

Create `src/components/gifts/GiftDetailsModal.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GiftDetailsModal } from "@/components/gifts/GiftDetailsModal";
import { GiftDto } from "@/components/gifts/GiftDto";
import { formatCurrency } from "@/shared/utils/formatCurrency";

const createGiftContributionActionMock = vi.fn();
const reserveGiftForLaterActionMock = vi.fn();

vi.mock("@/app/presentes/actions", () => ({
  createGiftContributionAction: (...args: unknown[]) => createGiftContributionActionMock(...args),
  reserveGiftForLaterAction: (...args: unknown[]) => reserveGiftForLaterActionMock(...args),
}));

const gift: GiftDto = {
  id: "gift-1",
  name: "Air fryer",
  description: "Air fryer 5L",
  imageUrl: null,
  price: 450,
  category: "cozinha",
  status: "available",
};

describe("GiftDetailsModal", () => {
  beforeEach(() => {
    createGiftContributionActionMock.mockReset();
    reserveGiftForLaterActionMock.mockReset();
  });

  it("shows the gift name, price, both action buttons, and the payment icons in the initial view", () => {
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={vi.fn()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Air fryer")).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(450), { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /presentear agora/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reservar para depois/i })).toBeInTheDocument();
    expect(screen.getByAltText("Visa")).toBeInTheDocument();
    expect(screen.getByAltText("Mastercard")).toBeInTheDocument();
    expect(screen.getByAltText("Boleto")).toBeInTheDocument();
    expect(screen.getByAltText("Pix")).toBeInTheDocument();
    expect(screen.getByText("Parcelamento disponível")).toBeInTheDocument();
  });

  it("hides the 'Reservar para depois' button when canReserveForLater is false", () => {
    render(<GiftDetailsModal gift={gift} canReserveForLater={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /reservar para depois/i })).not.toBeInTheDocument();
  });

  it("reveals the immediate-checkout form when 'Presentear agora' is clicked, hiding the payment icons", async () => {
    const user = userEvent.setup();
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /presentear agora/i }));

    expect(screen.getByLabelText("Seu nome")).toBeInTheDocument();
    expect(screen.getByLabelText("Seu e-mail")).toBeInTheDocument();
    expect(screen.queryByAltText("Visa")).not.toBeInTheDocument();
  });

  it("shows the error message returned by the action when the immediate contribution fails", async () => {
    createGiftContributionActionMock.mockResolvedValue({
      status: "error",
      message: "Esse presente já foi escolhido por outra pessoa.",
    });
    const user = userEvent.setup();
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /presentear agora/i }));
    await user.type(screen.getByPlaceholderText("Seu nome"), "Carla Nunes");
    await user.type(screen.getByPlaceholderText("Seu e-mail"), "carla@example.com");
    await user.click(screen.getByRole("button", { name: /ir para pagamento/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Esse presente já foi escolhido por outra pessoa."
    );
  });

  it("associates a label with the name and email fields in the reserve-for-later form", async () => {
    const user = userEvent.setup();
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /reservar para depois/i }));
    expect(screen.getByLabelText("Seu nome")).toBeInTheDocument();
    expect(screen.getByLabelText("Seu e-mail")).toBeInTheDocument();
  });

  it("shows a confirmation view with a payment link after reserving for later; 'Voltar' returns to the initial view without closing the modal", async () => {
    reserveGiftForLaterActionMock.mockResolvedValue({
      status: "success",
      checkoutUrl: "https://mercadopago.test/checkout",
      guestName: "Carla Nunes",
      expectedPaymentDate: "2027-05-01",
    });
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /reservar para depois/i }));
    await user.type(screen.getByPlaceholderText("Seu nome"), "Carla Nunes");
    await user.type(screen.getByPlaceholderText("Seu e-mail"), "carla@example.com");
    fireEvent.change(screen.getByLabelText("Quando pretende pagar?"), { target: { value: "2027-05-01" } });
    await user.click(screen.getByRole("button", { name: /reservar presente/i }));

    expect(await screen.findByText("Presente reservado!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ir para pagamento/i })).toHaveAttribute(
      "href",
      "https://mercadopago.test/checkout"
    );

    await user.click(screen.getByRole("button", { name: /voltar/i }));

    expect(screen.queryByText("Presente reservado!")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /presentear agora/i })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when the close control is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Fechar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={onClose} />);

    await user.click(screen.getByRole("dialog").parentElement!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes the modal on Escape when no confirmation is showing", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={onClose} />);

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("dismisses the confirmation on Escape instead of closing the modal", async () => {
    reserveGiftForLaterActionMock.mockResolvedValue({
      status: "success",
      checkoutUrl: "https://mercadopago.test/checkout",
      guestName: "Carla Nunes",
      expectedPaymentDate: "2027-05-01",
    });
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /reservar para depois/i }));
    await user.type(screen.getByPlaceholderText("Seu nome"), "Carla Nunes");
    await user.type(screen.getByPlaceholderText("Seu e-mail"), "carla@example.com");
    fireEvent.change(screen.getByLabelText("Quando pretende pagar?"), { target: { value: "2027-05-01" } });
    await user.click(screen.getByRole("button", { name: /reservar presente/i }));

    expect(await screen.findByText("Presente reservado!")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByText("Presente reservado!")).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/gifts/GiftDetailsModal.test.tsx`
Expected: FAIL with "Cannot find module '@/components/gifts/GiftDetailsModal'"

- [ ] **Step 3: Create `GiftDetailsModal.tsx`**

```tsx
"use client";

import { useActionState, useRef, useState } from "react";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { GiftDto } from "@/components/gifts/GiftDto";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import {
  createGiftContributionAction,
  reserveGiftForLaterAction,
  type CreateGiftContributionActionState,
  type ReserveGiftForLaterActionState,
} from "@/app/presentes/actions";

interface GiftDetailsModalProps {
  gift: GiftDto;
  canReserveForLater: boolean;
  onClose: () => void;
}

const PAYMENT_ICONS = [
  { src: "/images/payment-icons/visa.webp", alt: "Visa" },
  { src: "/images/payment-icons/mastercard.webp", alt: "Mastercard" },
  { src: "/images/payment-icons/boleto.webp", alt: "Boleto" },
  { src: "/images/payment-icons/pix.webp", alt: "Pix" },
];

const initialGiftContributionActionState: CreateGiftContributionActionState = { status: "idle" };
const initialReserveForLaterActionState: ReserveGiftForLaterActionState = { status: "idle" };

const fieldClassName =
  "rounded-md border border-line bg-paper px-3 py-2 font-sans text-sm text-forest focus:border-moss focus:outline-none";
const primaryButtonClassName =
  "min-h-11 rounded-full bg-moss px-4 py-2 font-sans text-xs uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60";
const secondaryButtonClassName =
  "min-h-11 rounded-full border border-moss px-4 py-2 font-sans text-xs uppercase tracking-widest text-moss transition-colors hover:bg-moss/10";

export function GiftDetailsModal({ gift, canReserveForLater, onClose }: GiftDetailsModalProps) {
  const [activeForm, setActiveForm] = useState<"none" | "now" | "later">("none");
  const [confirmationDismissed, setConfirmationDismissed] = useState(false);

  const [nowState, nowFormAction, isNowPending] = useActionState(
    createGiftContributionAction,
    initialGiftContributionActionState
  );
  const [laterState, laterFormAction, isLaterPending] = useActionState(
    reserveGiftForLaterAction,
    initialReserveForLaterActionState
  );

  const showConfirmation = laterState.status === "success" && !confirmationDismissed;

  function dismissConfirmation() {
    setConfirmationDismissed(true);
    setActiveForm("none");
  }

  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true, showConfirmation ? dismissConfirmation : onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`gift-modal-title-${gift.id}`}
        onClick={(event) => event.stopPropagation()}
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-y-auto rounded-lg bg-paper sm:flex-row sm:overflow-hidden"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 z-10 font-sans text-2xl leading-none text-forest/60 hover:text-forest"
        >
          &times;
        </button>

        <div className="relative h-56 w-full flex-shrink-0 sm:h-auto sm:w-1/2">
          <PhotoOrPlaceholder src={gift.imageUrl} label={gift.name} className="absolute inset-0 h-full w-full" />
        </div>

        <div className="flex flex-1 flex-col items-center gap-4 p-6 text-center sm:p-10">
          <h2 id={`gift-modal-title-${gift.id}`} className="font-serif text-2xl uppercase tracking-wide text-forest">
            {gift.name}
          </h2>

          {showConfirmation ? (
            <>
              <h3 className="font-serif text-lg text-forest">Presente reservado!</h3>
              <p className="font-sans text-sm text-forest/70">
                Reservamos <strong>{gift.name}</strong> para {laterState.guestName}, com pagamento previsto para{" "}
                {laterState.expectedPaymentDate?.split("-").reverse().join("/")}.
              </p>
              <p className="font-sans text-sm text-forest/70">
                Se preferir, você já pode pagar agora clicando no botão abaixo, ou voltar e pagar depois.
              </p>
              <div className="flex w-full max-w-xs flex-col gap-2">
                <a href={laterState.checkoutUrl} className={`flex items-center justify-center ${primaryButtonClassName}`}>
                  Ir para pagamento
                </a>
                <button
                  type="button"
                  onClick={dismissConfirmation}
                  className="min-h-11 rounded-full border border-line px-4 py-2 font-sans text-xs uppercase tracking-widest text-forest transition-colors hover:border-moss"
                >
                  Voltar
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="font-serif text-lg italic text-forest/80">Seu presente: {formatCurrency(gift.price)}</p>

              {activeForm === "none" && (
                <div className="flex w-full max-w-xs flex-col items-center gap-2">
                  <button type="button" onClick={() => setActiveForm("now")} className={`w-full ${primaryButtonClassName}`}>
                    Presentear agora
                  </button>
                  {canReserveForLater && (
                    <button
                      type="button"
                      onClick={() => setActiveForm("later")}
                      className={`w-full ${secondaryButtonClassName}`}
                    >
                      Reservar para depois
                    </button>
                  )}

                  <div className="mt-4 flex items-center justify-center gap-3">
                    {PAYMENT_ICONS.map((icon) => (
                      <img key={icon.alt} src={icon.src} alt={icon.alt} className="h-6 w-auto" />
                    ))}
                  </div>
                  <p className="font-serif text-xs italic text-forest/60">Parcelamento disponível</p>
                </div>
              )}

              {activeForm === "now" && (
                <form action={nowFormAction} className="flex w-full max-w-xs flex-col gap-2">
                  <input type="hidden" name="giftId" value={gift.id} />
                  <label htmlFor={`guestName-now-${gift.id}`} className="sr-only">
                    Seu nome
                  </label>
                  <input
                    id={`guestName-now-${gift.id}`}
                    name="guestName"
                    placeholder="Seu nome"
                    required
                    minLength={3}
                    className={fieldClassName}
                  />
                  <label htmlFor={`guestEmail-now-${gift.id}`} className="sr-only">
                    Seu e-mail
                  </label>
                  <input
                    id={`guestEmail-now-${gift.id}`}
                    name="guestEmail"
                    type="email"
                    placeholder="Seu e-mail"
                    required
                    className={fieldClassName}
                  />
                  <button type="submit" disabled={isNowPending} className={primaryButtonClassName}>
                    {isNowPending ? "Redirecionando..." : "Ir para pagamento"}
                  </button>
                  {nowState.status === "error" && (
                    <p role="alert" className="text-xs text-danger">
                      {nowState.message}
                    </p>
                  )}
                </form>
              )}

              {activeForm === "later" && (
                <form action={laterFormAction} className="flex w-full max-w-xs flex-col gap-2">
                  <input type="hidden" name="giftId" value={gift.id} />
                  <label htmlFor={`guestName-later-${gift.id}`} className="sr-only">
                    Seu nome
                  </label>
                  <input
                    id={`guestName-later-${gift.id}`}
                    name="guestName"
                    placeholder="Seu nome"
                    required
                    minLength={3}
                    className={fieldClassName}
                  />
                  <label htmlFor={`guestEmail-later-${gift.id}`} className="sr-only">
                    Seu e-mail
                  </label>
                  <input
                    id={`guestEmail-later-${gift.id}`}
                    name="guestEmail"
                    type="email"
                    placeholder="Seu e-mail"
                    required
                    className={fieldClassName}
                  />
                  <label htmlFor={`expected-payment-date-${gift.id}`} className="font-sans text-xs text-forest/70">
                    Quando pretende pagar?
                  </label>
                  <input
                    id={`expected-payment-date-${gift.id}`}
                    name="expectedPaymentDate"
                    type="date"
                    required
                    className={fieldClassName}
                  />
                  <button type="submit" disabled={isLaterPending} className={primaryButtonClassName}>
                    {isLaterPending ? "Reservando..." : "Reservar presente"}
                  </button>
                  {laterState.status === "error" && (
                    <p role="alert" className="text-xs text-danger">
                      {laterState.message}
                    </p>
                  )}
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/gifts/GiftDetailsModal.test.tsx`
Expected: PASS, all 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/gifts/GiftDetailsModal.tsx src/components/gifts/GiftDetailsModal.test.tsx
git commit -m "feat: add GiftDetailsModal hosting the pay-now/reserve-for-later flow"
```

---

### Task 2: Simplify `GiftCard`

**Files:**
- Modify: `src/components/gifts/GiftCard.tsx`
- Modify: `src/components/gifts/GiftCard.test.tsx`

**Interfaces:**
- Consumes: `GiftDetailsModal` (Task 1), `GiftDto`, `formatCurrency`, `PhotoOrPlaceholder` (all unchanged).
- Produces: `GiftCard({ gift: GiftDto; canReserveForLater: boolean })` — same signature as before, callers (`GiftGrid`) need no changes.

- [ ] **Step 1: Replace `GiftCard.test.tsx`**

Replace the full contents of `src/components/gifts/GiftCard.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GiftCard } from "@/components/gifts/GiftCard";
import { GiftDto } from "@/components/gifts/GiftDto";
import { formatCurrency } from "@/shared/utils/formatCurrency";

vi.mock("@/app/presentes/actions", () => ({
  createGiftContributionAction: vi.fn(),
  reserveGiftForLaterAction: vi.fn(),
}));

const availableGift: GiftDto = {
  id: "gift-1",
  name: "Air fryer",
  description: "Air fryer 5L",
  imageUrl: null,
  price: 450,
  category: "cozinha",
  status: "available",
};

describe("GiftCard", () => {
  it("shows the name, price, and a 'Ver detalhes' button for an available gift", () => {
    render(<GiftCard gift={availableGift} canReserveForLater />);

    expect(screen.getByText("Air fryer")).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(450), { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver detalhes" })).toBeInTheDocument();
  });

  it("shows a status badge instead of the button when the gift is not available", () => {
    render(<GiftCard gift={{ ...availableGift, status: "paid" }} canReserveForLater />);

    expect(screen.getByText("Presenteado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver detalhes" })).not.toBeInTheDocument();
  });

  it("does not render the modal until 'Ver detalhes' is clicked", () => {
    render(<GiftCard gift={availableGift} canReserveForLater />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the details modal when 'Ver detalhes' is clicked", async () => {
    const user = userEvent.setup();
    render(<GiftCard gift={availableGift} canReserveForLater />);

    await user.click(screen.getByRole("button", { name: "Ver detalhes" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes the modal when its close control is clicked", async () => {
    const user = userEvent.setup();
    render(<GiftCard gift={availableGift} canReserveForLater />);

    await user.click(screen.getByRole("button", { name: "Ver detalhes" }));
    await user.click(screen.getByRole("button", { name: "Fechar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/gifts/GiftCard.test.tsx`
Expected: FAIL — current `GiftCard` has no "Ver detalhes" button and no modal, so several assertions fail (e.g. `getByRole("button", { name: "Ver detalhes" })` not found).

- [ ] **Step 3: Replace `GiftCard.tsx`**

Replace the full contents of `src/components/gifts/GiftCard.tsx`:

```tsx
"use client";

import { useState } from "react";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { GiftDto } from "@/components/gifts/GiftDto";
import { GiftDetailsModal } from "@/components/gifts/GiftDetailsModal";

interface GiftCardProps {
  gift: GiftDto;
  canReserveForLater: boolean;
}

const STATUS_LABEL: Record<Exclude<GiftDto["status"], "available">, string> = {
  reserved: "Reservado",
  paid: "Presenteado",
};

export function GiftCard({ gift, canReserveForLater }: GiftCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isAvailable = gift.status === "available";

  return (
    <div className="flex flex-col items-center rounded-lg border border-line bg-paper p-4 text-center">
      <PhotoOrPlaceholder src={gift.imageUrl} label={gift.name} className="h-40 w-full rounded-md" />
      <h3 className="mt-4 font-serif text-sm uppercase tracking-wide text-forest">{gift.name}</h3>
      <p className="mt-2 font-serif text-base text-forest">{formatCurrency(gift.price)}</p>

      {isAvailable ? (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="mt-4 min-h-11 rounded-full border border-line px-6 py-2 font-serif text-sm italic text-forest transition-colors hover:border-moss hover:text-moss"
        >
          Ver detalhes
        </button>
      ) : (
        <span className="mt-4 inline-block rounded-full bg-line px-4 py-2 text-center font-sans text-xs uppercase tracking-widest text-forest/70">
          {STATUS_LABEL[gift.status]}
        </span>
      )}

      {isModalOpen && (
        <GiftDetailsModal gift={gift} canReserveForLater={canReserveForLater} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/gifts/GiftCard.test.tsx`
Expected: PASS, all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/gifts/GiftCard.tsx src/components/gifts/GiftCard.test.tsx
git commit -m "feat: simplify GiftCard to image+name+price+Ver detalhes, open GiftDetailsModal"
```

---

### Task 3: Denser `GiftGrid` columns

**Files:**
- Modify: `src/components/gifts/GiftGrid.tsx`

**Interfaces:**
- No signature change — `GiftGrid({ gifts: GiftDto[]; canReserveForLater: boolean })` unchanged.

- [ ] **Step 1: Edit the grid's column classes**

In `src/components/gifts/GiftGrid.tsx`, change:

```tsx
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
```

to:

```tsx
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
```

- [ ] **Step 2: Typecheck (no test file exists for this component)**

Run: `npx tsc --noEmit`
Expected: no new errors from this file (other files may still show pre-existing gaps if earlier tasks in this plan haven't landed yet — not applicable here since Tasks 1–2 are already committed by this point).

- [ ] **Step 3: Commit**

```bash
git add src/components/gifts/GiftGrid.tsx
git commit -m "feat: denser Presentes grid (2/3/5 columns) matching the reference layout"
```

---

### Task 4: Remove the Presentes page intro panel

**Files:**
- Modify: `src/app/presentes/page.tsx`

**Interfaces:**
- No exported interface change — this is a page component.

- [ ] **Step 1: Rewrite `page.tsx`**

Replace the full contents of `src/app/presentes/page.tsx`:

```tsx
import type { Metadata } from "next";
import { createListGiftsUseCase, getSiteContentOrDefault } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { mapGiftToDto, GiftDto } from "@/components/gifts/GiftDto";
import { GiftGrid } from "@/components/gifts/GiftGrid";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { canReserveForLater } from "@/shared/utils/giftReservationWindow";

export const metadata: Metadata = {
  title: "Lista de Presentes | Stéfanie & Jonatas",
};

interface GiftsPageProps {
  searchParams: Promise<{ status?: string }>;
}

const STATUS_MESSAGES: Record<string, string> = {
  sucesso: "Pagamento aprovado! Muito obrigado pelo carinho.",
  pendente: "Pagamento em processamento. Assim que for aprovado, atualizaremos a lista.",
  falha: "Não foi possível concluir o pagamento. Você pode tentar novamente.",
};

export default async function GiftsPage({ searchParams }: GiftsPageProps) {
  const { status } = await searchParams;

  let gifts: GiftDto[] = [];
  let loadError = false;
  let allowReserveForLater = false;

  if (isBackendConfigured()) {
    try {
      const [result, settings] = await Promise.all([
        createListGiftsUseCase().execute(),
        getSiteContentOrDefault("settings"),
      ]);
      gifts = result.map(mapGiftToDto);
      allowReserveForLater = canReserveForLater(new Date(settings.weddingDateIso));
    } catch {
      loadError = true;
    }
  }

  return (
    <div className="pb-20 pt-16">
      <h1 className="sr-only">Lista de Presentes</h1>

      {status && STATUS_MESSAGES[status] && (
        <div className="mx-auto max-w-2xl px-6">
          <p className="rounded-md border border-moss/40 bg-moss/10 px-4 py-3 text-center font-sans text-sm text-forest">
            {STATUS_MESSAGES[status]}
          </p>
        </div>
      )}

      <div className="mx-auto mt-8 max-w-6xl px-6">
        {!isBackendConfigured() || loadError ? (
          <ConfigurationNotice message="A lista de presentes será exibida assim que o backend (Supabase) estiver configurado." />
        ) : (
          <GiftGrid gifts={gifts} canReserveForLater={allowReserveForLater} />
        )}
      </div>
    </div>
  );
}
```

Notes on this rewrite:
- `SplitPanel` and `PlaceholderImage` imports are dropped (no longer used on this page).
- `pt-16` added to the outer wrapper so the grid doesn't sit flush under the fixed header (the removed `SplitPanel` previously provided that top spacing implicitly).
- `max-w-5xl` → `max-w-6xl` on the grid wrapper, matching the wider 5-column grid from Task 3 (keeps card width reasonable at the new column count).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/presentes/page.tsx
git commit -m "feat: remove Presentes intro panel, grid starts directly under the nav"
```

---

### Task 5: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Confirm no dangling references to removed card internals**

Run: `grep -rn "activeForm\|modalDismissed" src/components/gifts/GiftCard.tsx`
Expected: no matches (that state now lives only in `GiftDetailsModal.tsx`).

Run: `grep -rn "SplitPanel\|PlaceholderImage" src/app/presentes/page.tsx`
Expected: no matches.

- [ ] **Step 2: Full typecheck, lint, and test suite**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: all PASS, 0 lint errors (pre-existing `<img>` warnings are expected and unrelated).

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: builds clean, `/presentes` still listed in the route output.

- [ ] **Step 4: Manual browser smoke check**

With the dev server running, visit `/presentes` and verify:
- No intro panel; the grid starts directly below the nav.
- Desktop: 5 columns; tablet: 3; mobile: 2.
- An available gift's card shows image, name, price, "Ver detalhes" (no description text anywhere).
- Clicking "Ver detalhes" opens the modal: desktop shows image on the left half / details on the right half; mobile shows image on top, details stacked below.
- The four payment icons (Visa, Mastercard, Boleto, Pix) and "Parcelamento disponível" appear under the buttons in the initial view, and disappear once "Presentear agora" or "Reservar para depois" is clicked.
- "Presentear agora" → fill name/email → submits (will error client-side if Mercado Pago isn't configured locally; confirm the request is attempted, matching prior behavior).
- "Reservar para depois" → fill fields → confirmation view appears with "Ir para pagamento" / "Voltar"; "Voltar" returns to the two-button view within the same modal (does not close it).
- Clicking the backdrop, the "×" close control, or Escape (when not on the confirmation view) closes the modal.
- A reserved/paid gift (if any test data exists) shows its status badge, no "Ver detalhes" button.

---

## Self-Review

**Spec coverage:**
- Intro panel removed → Task 4. ✓
- Card simplified to image/name/price/"Ver detalhes", no description → Task 2. ✓
- Reserved/paid gifts keep status badge, no modal → Task 2 (unchanged branch). ✓
- Reservation flow fully preserved, same actions/validation, relocated to modal → Task 1. ✓
- Modal desktop (image left half / content right half) and mobile (stacked) layout → Task 1 (`sm:flex-row` split). ✓
- Payment icons + "Parcelamento disponível", shown only in the initial view → Task 1. ✓
- Denser grid (2/3/5 cols) → Task 3. ✓
- No Server Action / schema changes → confirmed, no task touches `actions.ts` or `GiftDto.ts`. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type consistency:** `GiftDetailsModal({ gift, canReserveForLater, onClose })` defined in Task 1, consumed identically in Task 2's `GiftCard`. `GiftDto`, `CreateGiftContributionActionState`, `ReserveGiftForLaterActionState` all imported from their existing, unchanged locations in both tasks. ✓
