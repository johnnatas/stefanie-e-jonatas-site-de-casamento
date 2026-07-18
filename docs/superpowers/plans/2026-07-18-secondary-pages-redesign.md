# Secondary Pages Redesign & Final Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Nossa História, Dicas e Instruções, and Presentes onto the
new design system (arch photo cards, split light/dark panels, new tokens),
restyle the remaining admin surfaces that still use legacy colors, and
finish removing `--color-cream`/`--color-rose` from `globals.css` — the
last plan in the front-end redesign.

**Architecture:** A new shared `SplitPanel` primitive (two-column
photo/text layout, alternating light/dark, optional CTA) joins Plan 1's
`PillButton`/`TornPaperDivider`/`ArchFlipCard` and Plan 2's `Monogram` as
the redesign's UI vocabulary. Nossa História drops the old
`StoryTimeline` (photo-beside-text) component in favor of the same
`ArchFlipCard` used on the Home page, now paired with full descriptive
text underneath each card. Once nothing references the legacy tokens,
`globals.css` drops them for good.

**Tech Stack:** Next.js 16.2.10 (App Router), Tailwind CSS v4, TypeScript,
Vitest + Testing Library.

## Global Constraints

- This Next.js version has breaking changes vs. training data — skim
  `node_modules/next/dist/docs/` for current App Router conventions before
  touching `src/app/` (per `AGENTS.md`).
- New/modified code in this plan must use only: `paper`, `paper-soft`,
  `ink`, `ink-soft`, `charcoal`, `gold`, `gold-soft`, `line`, `line-dark`,
  `danger` — **by the end of this plan, `rose`/`rose-dark`/`cream`/
  `cream-dark` must not appear anywhere in `src/`** (Task 7 verifies this
  with a repo-wide grep).
- Use `PillButton` (`@/components/ui/PillButton`) and `ArchFlipCard`
  (`@/components/ui/ArchFlipCard`) from Plan 1 — don't rebuild them.
- **When committing, always `git add` an explicit file list — never `git
  add -A`.** A Home Page plan fix commit used `git add -A` and swept ~98
  unrelated pre-existing files into it; every task below lists its exact
  files.
- Run `npm run test` and `npm run lint` before every commit.
- Plans 1–4 are already merged: color tokens, shared UI primitives, the
  restyled Header/Footer/Home page, and the RSVP guest-search flow exist.

---

## Task 1: `SplitPanel` shared component

**Files:**
- Create: `src/components/ui/SplitPanel.tsx`
- Create: `src/components/ui/SplitPanel.test.tsx`

**Interfaces:**
- Consumes: `PillButton` (`@/components/ui/PillButton`), `cn`
  (`@/shared/utils/cn`).
- Produces: `SplitPanel(props: { eyebrow?: string; title: string;
  children: ReactNode; image: ReactNode; ctaLabel?: string; ctaHref?:
  string; tone?: "light" | "dark"; imageSide?: "left" | "right";
  className?: string }): JSX.Element` — a full-width two-column section
  (photo one side, eyebrow/title/text/CTA the other), stacking to one
  column on mobile. Tasks 3–4 use this for Dicas e Instruções and
  Presentes.

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/SplitPanel.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SplitPanel } from "@/components/ui/SplitPanel";

describe("SplitPanel", () => {
  it("renders the eyebrow, title, and children text", () => {
    render(
      <SplitPanel eyebrow="O grande dia" title="Local e horário" image={<span>foto</span>}>
        <p>Chegue com antecedência.</p>
      </SplitPanel>
    );

    expect(screen.getByText("O grande dia")).toBeInTheDocument();
    expect(screen.getByText("Local e horário")).toBeInTheDocument();
    expect(screen.getByText("Chegue com antecedência.")).toBeInTheDocument();
    expect(screen.getByText("foto")).toBeInTheDocument();
  });

  it("renders a CTA link when ctaLabel/ctaHref are provided", () => {
    render(
      <SplitPanel title="Lista de Presentes" image={<span>foto</span>} ctaLabel="Ver lista" ctaHref="/presentes">
        <p>Texto</p>
      </SplitPanel>
    );

    const link = screen.getByRole("link", { name: "Ver lista" });
    expect(link).toHaveAttribute("href", "/presentes");
  });

  it("omits the CTA when ctaLabel/ctaHref are not provided", () => {
    render(
      <SplitPanel title="Onde se hospedar" image={<span>foto</span>}>
        <p>Texto</p>
      </SplitPanel>
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("applies the dark tone classes when tone='dark'", () => {
    render(
      <SplitPanel title="Título" tone="dark" image={<span>foto</span>}>
        <p>Texto</p>
      </SplitPanel>
    );

    expect(screen.getByText("Título").closest("section")).toHaveClass("bg-charcoal", "text-paper");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/ui/SplitPanel.test.tsx`
Expected: FAIL — `Cannot find module '@/components/ui/SplitPanel'`

- [ ] **Step 3: Write the implementation**

Create `src/components/ui/SplitPanel.tsx`:

```tsx
import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";
import { PillButton } from "@/components/ui/PillButton";

interface SplitPanelProps {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  image: ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
  tone?: "light" | "dark";
  imageSide?: "left" | "right";
  className?: string;
}

/**
 * Full-width two-column panel (photo one side, text + optional CTA the
 * other), alternating light/dark tone — used for Dicas e Instruções and
 * the Presentes intro, matching the reference site's split sections.
 */
export function SplitPanel({
  eyebrow,
  title,
  children,
  image,
  ctaLabel,
  ctaHref,
  tone = "light",
  imageSide = "right",
  className,
}: SplitPanelProps) {
  const isDark = tone === "dark";

  return (
    <section
      className={cn(
        "grid grid-cols-1 md:grid-cols-2",
        isDark ? "bg-charcoal text-paper" : "bg-paper-soft text-ink",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-col justify-center gap-4 px-6 py-16 sm:px-12",
          imageSide === "right" ? "md:order-1" : "md:order-2"
        )}
      >
        {eyebrow && (
          <span
            className={cn(
              "font-serif text-xs uppercase tracking-[0.2em]",
              isDark ? "text-gold-soft" : "text-gold"
            )}
          >
            {eyebrow}
          </span>
        )}
        <h2 className="font-serif text-3xl sm:text-4xl">{title}</h2>
        <div className={cn("font-sans text-sm leading-relaxed", isDark ? "text-paper/80" : "text-ink-soft")}>
          {children}
        </div>
        {ctaLabel && ctaHref && (
          <div>
            <PillButton
              href={ctaHref}
              variant={isDark ? "secondary" : "primary"}
              className={isDark ? "border-paper/40 text-paper hover:bg-paper hover:text-charcoal" : undefined}
            >
              {ctaLabel}
            </PillButton>
          </div>
        )}
      </div>
      <div
        className={cn("relative min-h-[280px]", imageSide === "right" ? "md:order-2" : "md:order-1")}
      >
        {image}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/ui/SplitPanel.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/SplitPanel.tsx src/components/ui/SplitPanel.test.tsx
git commit -m "feat(design-system): add SplitPanel shared component"
```

---

## Task 2: Rebuild Nossa História, delete `StoryTimeline`

**Files:**
- Modify: `src/app/nossa-historia/page.tsx`
- Delete: `src/components/home/StoryTimeline.tsx`

**Interfaces:**
- Consumes: `ArchFlipCard` (`@/components/ui/ArchFlipCard`, Plan 1),
  `PlaceholderImage` (`@/components/ui/PlaceholderImage`), `MILESTONES`
  (`@/shared/milestones`, Plan 3).
- Produces: `OurStoryPage` (default export, unchanged route
  `/nossa-historia`) renders the 3 milestones as `ArchFlipCard`s with full
  descriptive text underneath each one, instead of `StoryTimeline`'s
  photo-beside-text layout. `StoryTimeline` is deleted — this is its last
  consumer (the Home page stopped using it in Plan 3's `SaveTheDateSection`
  rework).

- [ ] **Step 1: Confirm `StoryTimeline` has no other consumers**

Run: `grep -rln "StoryTimeline" src/ --include=*.tsx --include=*.ts`
Expected: exactly two files — `src/components/home/StoryTimeline.tsx`
itself and `src/app/nossa-historia/page.tsx`. If any other file appears,
STOP and report BLOCKED — do not delete `StoryTimeline` if something else
still depends on it.

- [ ] **Step 2: Rebuild the page**

Replace the full contents of `src/app/nossa-historia/page.tsx` with:

```tsx
import type { Metadata } from "next";
import { ArchFlipCard } from "@/components/ui/ArchFlipCard";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { MILESTONES } from "@/shared/milestones";

export const metadata: Metadata = {
  title: "Nossa História | Stéfanie & Jonatas",
};

export default function OurStoryPage() {
  return (
    <div className="pb-20">
      <section className="mx-auto max-w-3xl px-6 pt-20 text-center">
        <span className="font-serif text-xs uppercase tracking-widest text-gold">Nossa história</span>
        <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">Como tudo começou</h1>
        <p className="mt-6 font-sans leading-relaxed text-ink-soft">
          Toda grande história de amor começa de um jeito simples. A nossa não foi diferente — um
          encontro despretensioso que, com o tempo, se transformou em cumplicidade, parceria e um
          amor que a gente quer celebrar ao lado de quem a gente ama.
        </p>
      </section>

      <div className="mx-auto mt-16 flex max-w-3xl flex-col gap-16 px-6">
        {MILESTONES.map((milestone, index) => (
          <div key={milestone.title} className="flex flex-col items-center gap-6 text-center">
            <ArchFlipCard
              className="h-72 w-full max-w-xs"
              number={`0${index + 1}.`}
              image={
                <PlaceholderImage
                  label={`Foto — ${milestone.title}`}
                  className="absolute inset-0 h-full w-full"
                />
              }
              title={milestone.title}
              date={milestone.date}
              description={milestone.description}
            />
            <div>
              <span className="font-sans text-xs uppercase tracking-widest text-gold">
                {milestone.date}
              </span>
              <h2 className="mt-2 font-serif text-3xl text-ink">{milestone.title}</h2>
              <p className="mt-3 font-sans text-sm leading-relaxed text-ink-soft">
                {milestone.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <section className="mx-auto mt-16 max-w-3xl px-6 text-center">
        <p className="font-sans leading-relaxed text-ink-soft">
          E agora, depois de tantas páginas escritas juntos, chegou a hora de começar mais um
          capítulo — e não podíamos estar mais felizes em compartilhar esse momento com você.
        </p>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Delete `StoryTimeline`**

```bash
git rm src/components/home/StoryTimeline.tsx
```

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: all tests pass (no test file targets `StoryTimeline` or
`nossa-historia/page.tsx` directly).

- [ ] **Step 5: Run the build**

Run: `npm run build`
Expected: build succeeds — confirms nothing else imports the deleted file.

- [ ] **Step 6: Commit**

```bash
git add src/app/nossa-historia/page.tsx
git commit -m "feat(nossa-historia): rebuild page with ArchFlipCard, remove StoryTimeline"
```

(The `git rm` from Step 3 stages the deletion; this commit captures both
the deletion and the page rewrite together.)

---

## Task 3: Dicas e Instruções → `SplitPanel`

**Files:**
- Modify: `src/app/dicas-e-instrucoes/layout.tsx`
- Modify: `src/app/dicas-e-instrucoes/cerimonia/page.tsx`
- Modify: `src/app/dicas-e-instrucoes/codigo-de-vestimenta/page.tsx`
- Modify: `src/app/dicas-e-instrucoes/hospedagem/page.tsx`

**Interfaces:**
- Consumes: `SplitPanel` (Task 1), `PlaceholderImage`.
- Produces: the shared tab layout keeps its header/tabs bar (restyled to
  new tokens) but no longer constrains `{children}` to `max-w-3xl` — each
  tab page now renders a full-width `SplitPanel` instead of centered
  plain text.

- [ ] **Step 1: Update the shared layout**

Replace the full contents of `src/app/dicas-e-instrucoes/layout.tsx`
with:

```tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dicas e Instruções | Stéfanie & Jonatas",
};

const TABS = [
  { label: "Cerimônia", href: "/dicas-e-instrucoes/cerimonia" },
  { label: "Traje", href: "/dicas-e-instrucoes/codigo-de-vestimenta" },
  { label: "Hospedagem", href: "/dicas-e-instrucoes/hospedagem" },
];

export default function TipsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-20">
      <section className="mx-auto max-w-3xl px-6 pt-20 text-center">
        <span className="font-serif text-xs uppercase tracking-widest text-gold">Para os convidados</span>
        <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">Dicas e Instruções</h1>
      </section>

      <nav className="mx-auto mt-10 flex max-w-3xl justify-center gap-8 border-b border-line px-6">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="pb-4 font-serif text-sm uppercase tracking-widest text-ink-soft hover:text-gold"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="mt-12">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Rebuild the Cerimônia page**

Replace the full contents of
`src/app/dicas-e-instrucoes/cerimonia/page.tsx` with:

```tsx
import { SplitPanel } from "@/components/ui/SplitPanel";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

export default function CeremonyPage() {
  return (
    <SplitPanel
      eyebrow="O grande dia"
      title="Local e horário"
      tone="dark"
      image={<PlaceholderImage label="Local da cerimônia" className="absolute inset-0 h-full w-full" />}
    >
      <p>
        A cerimônia acontecerá às <strong className="text-paper">16h</strong>, seguida da recepção
        no mesmo local. Chegue com 30 minutos de antecedência para aproveitar cada instante.
      </p>
      <p className="mt-3 italic">Endereço a confirmar.</p>
    </SplitPanel>
  );
}
```

- [ ] **Step 3: Rebuild the Traje page**

Replace the full contents of
`src/app/dicas-e-instrucoes/codigo-de-vestimenta/page.tsx` with:

```tsx
import { SplitPanel } from "@/components/ui/SplitPanel";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

export default function DressCodePage() {
  return (
    <SplitPanel
      eyebrow="Como se vestir"
      title="Traje esporte fino"
      tone="light"
      imageSide="left"
      image={<PlaceholderImage label="Inspiração de traje" className="absolute inset-0 h-full w-full" />}
    >
      <p>
        Pedimos que evitem branco e tons muito claros, para não competir com o vestido da noiva.
        Tons terrosos, pastéis e clássicos são muito bem-vindos.
      </p>
      <p className="mt-3">
        A festa acontece em ambiente misto (aberto e fechado) — leve um casaco leve para a noite.
      </p>
    </SplitPanel>
  );
}
```

- [ ] **Step 4: Rebuild the Hospedagem page**

Replace the full contents of
`src/app/dicas-e-instrucoes/hospedagem/page.tsx` with:

```tsx
import { SplitPanel } from "@/components/ui/SplitPanel";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

export default function LodgingPage() {
  return (
    <SplitPanel
      eyebrow="Fique por perto"
      title="Onde se hospedar"
      tone="dark"
      image={<PlaceholderImage label="Hospedagem" className="absolute inset-0 h-full w-full" />}
    >
      <p>
        Separamos algumas sugestões de hotéis e pousadas próximas ao local da cerimônia, com
        conforto para todos os orçamentos.
      </p>
      <p className="mt-3 italic">Lista de hospedagens a confirmar.</p>
    </SplitPanel>
  );
}
```

- [ ] **Step 5: Run the full test suite and build**

Run: `npm run test && npm run build`
Expected: all tests pass, build succeeds, and the build's route list still
shows all 3 `/dicas-e-instrucoes/*` routes.

- [ ] **Step 6: Grep-sweep for old tokens**

Run: `grep -rn "rose\|cream" src/app/dicas-e-instrucoes/`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/app/dicas-e-instrucoes/layout.tsx src/app/dicas-e-instrucoes/cerimonia/page.tsx src/app/dicas-e-instrucoes/codigo-de-vestimenta/page.tsx src/app/dicas-e-instrucoes/hospedagem/page.tsx
git commit -m "feat(dicas): rebuild Dicas e Instruções pages with SplitPanel"
```

---

## Task 4: Presentes → `SplitPanel` intro + restyle `GiftCard`

**Files:**
- Modify: `src/app/presentes/page.tsx`
- Modify: `src/components/gifts/GiftCard.tsx`

**Interfaces:**
- Consumes: `SplitPanel` (Task 1).
- Produces: the Presentes page's header becomes a dark `SplitPanel`
  (matching the reference's "Lista de Presentes" black panel) instead of
  plain centered text; the status-message banner and `GiftGrid` below it
  are unchanged in structure, only token classes change. `GiftCard`'s
  tokens are swapped (card background, price color, buttons, inputs,
  error text).

- [ ] **Step 1: Rebuild the Presentes page header**

Replace the full contents of `src/app/presentes/page.tsx` with:

```tsx
import type { Metadata } from "next";
import { createListGiftsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { mapGiftToDto, GiftDto } from "@/components/gifts/GiftDto";
import { GiftGrid } from "@/components/gifts/GiftGrid";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { SplitPanel } from "@/components/ui/SplitPanel";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

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

  if (isBackendConfigured()) {
    try {
      const result = await createListGiftsUseCase().execute();
      gifts = result.map(mapGiftToDto);
    } catch {
      loadError = true;
    }
  }

  return (
    <div className="pb-20">
      <SplitPanel
        eyebrow="Com carinho"
        title="Lista de Presentes"
        tone="dark"
        image={<PlaceholderImage label="Lista de presentes" className="absolute inset-0 h-full w-full" />}
      >
        <p>
          Sua presença já é o nosso maior presente. Mas se quiser nos ajudar a começar essa nova
          fase da vida, preparamos esta lista com muito carinho.
        </p>
      </SplitPanel>

      {status && STATUS_MESSAGES[status] && (
        <div className="mx-auto mt-8 max-w-2xl px-6">
          <p className="rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-center font-sans text-sm text-ink">
            {STATUS_MESSAGES[status]}
          </p>
        </div>
      )}

      <div className="mx-auto mt-12 max-w-5xl px-6">
        {!isBackendConfigured() || loadError ? (
          <ConfigurationNotice message="A lista de presentes será exibida assim que o backend (Supabase) estiver configurado." />
        ) : (
          <GiftGrid gifts={gifts} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Restyle `GiftCard`**

Replace the full contents of `src/components/gifts/GiftCard.tsx` with:

```tsx
"use client";

import { useActionState, useState } from "react";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { GiftDto } from "@/components/gifts/GiftDto";
import {
  createGiftContributionAction,
  initialGiftContributionActionState,
} from "@/app/presentes/actions";

interface GiftCardProps {
  gift: GiftDto;
}

const STATUS_LABEL: Record<Exclude<GiftDto["status"], "available">, string> = {
  reserved: "Reservado",
  paid: "Presenteado",
};

export function GiftCard({ gift }: GiftCardProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createGiftContributionAction,
    initialGiftContributionActionState
  );

  const isAvailable = gift.status === "available";

  return (
    <div className="flex flex-col rounded-lg border border-line bg-paper p-5">
      <PlaceholderImage label={gift.name} className="h-40 w-full rounded-md" />
      <h3 className="mt-4 font-serif text-xl text-ink">{gift.name}</h3>
      <p className="mt-1 flex-1 font-sans text-sm text-ink-soft">{gift.description}</p>
      <p className="mt-3 font-serif text-lg text-gold">{formatCurrency(gift.price)}</p>

      {gift.status !== "available" && (
        <span className="mt-4 inline-block rounded-full bg-line px-4 py-2 text-center font-sans text-xs uppercase tracking-widest text-ink-soft">
          {STATUS_LABEL[gift.status]}
        </span>
      )}

      {isAvailable && !isFormOpen && (
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="mt-4 rounded-full bg-gold px-4 py-2 font-sans text-xs uppercase tracking-widest text-paper transition-colors hover:bg-gold-soft"
        >
          Presentear
        </button>
      )}

      {isAvailable && isFormOpen && (
        <form action={formAction} className="mt-4 flex flex-col gap-2">
          <input type="hidden" name="giftId" value={gift.id} />
          <input
            name="guestName"
            placeholder="Seu nome"
            required
            minLength={3}
            className="rounded-md border border-line bg-paper px-3 py-2 font-sans text-sm text-ink focus:border-gold focus:outline-none"
          />
          <input
            name="guestEmail"
            type="email"
            placeholder="Seu e-mail"
            required
            className="rounded-md border border-line bg-paper px-3 py-2 font-sans text-sm text-ink focus:border-gold focus:outline-none"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-gold px-4 py-2 font-sans text-xs uppercase tracking-widest text-paper transition-colors hover:bg-gold-soft disabled:opacity-60"
          >
            {isPending ? "Redirecionando..." : "Ir para pagamento"}
          </button>
          {state.status === "error" && (
            <p role="alert" className="text-xs text-danger">
              {state.message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: all tests pass, including the existing `GiftCard.test.tsx` (it
asserts behavior — button/form presence, error text — not classNames, so
it should be unaffected by the token swap; if it fails, the behavior
changed, not just styling — investigate before proceeding).

- [ ] **Step 4: Grep-sweep for old tokens**

Run: `grep -n "rose\|cream" src/app/presentes/page.tsx src/components/gifts/GiftCard.tsx`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/app/presentes/page.tsx src/components/gifts/GiftCard.tsx
git commit -m "feat(presentes): rebuild page intro with SplitPanel, restyle GiftCard"
```

---

## Task 5: Restyle remaining admin surfaces

**Files:**
- Modify: `src/components/admin/GiftForm.tsx`
- Modify: `src/components/admin/LoginForm.tsx`
- Modify: `src/app/admin/(protected)/layout.tsx`
- Modify: `src/app/admin/(protected)/presentes/page.tsx`
- Modify: `src/components/ui/ConfigurationNotice.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: no behavior change anywhere — this is a pure token sweep
  (`bg-cream`→`bg-paper`, `border-rose`/`focus:border-rose`→`gold`,
  `bg-rose`→`bg-gold`, `hover:bg-rose-dark`→`hover:bg-gold-soft`,
  `text-rose`→`text-gold`, `text-rose-dark` on error/alert text→
  `text-danger`, `bg-cream-dark/30`→`bg-paper-soft`) across the admin
  panel's remaining surfaces. Per the design spec, the admin panel's
  structure/layout is explicitly NOT being redesigned — only its leftover
  legacy colors are swapped so `globals.css` can drop those tokens in
  Task 6.

- [ ] **Step 1: Restyle `GiftForm`**

In `src/components/admin/GiftForm.tsx`, change:

```tsx
const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-cream px-4 py-2 font-sans text-ink focus:border-rose focus:outline-none";
```

to:

```tsx
const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-ink focus:border-gold focus:outline-none";
```

And change the submit button's className from:

```tsx
        className="rounded-full bg-rose px-8 py-3 font-sans text-sm uppercase tracking-widest text-white transition-colors hover:bg-rose-dark disabled:opacity-60"
```

to:

```tsx
        className="rounded-full bg-gold px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-gold-soft disabled:opacity-60"
```

And change the error message's className from `text-rose-dark` to
`text-danger`:

```tsx
        <p role="alert" className="text-xs text-danger">
```

Leave every other line in the file unchanged.

- [ ] **Step 2: Restyle `LoginForm`**

In `src/components/admin/LoginForm.tsx`, apply the same 4 substitutions:
both input fields' `bg-cream`→`bg-paper` and `focus:border-rose`→
`focus:border-gold`; the submit button's `bg-rose`→`bg-gold`,
`hover:bg-rose-dark`→`hover:bg-gold-soft`, `text-white`→`text-paper`; the
error message's `text-rose-dark`→`text-danger`. The full replacement
file:

```tsx
"use client";

import { useActionState } from "react";
import { initialLoginActionState, loginAction } from "@/app/admin/login/actions";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialLoginActionState);

  return (
    <form action={formAction} className="mx-auto flex max-w-sm flex-col gap-4">
      <div>
        <label htmlFor="email" className="block font-sans text-sm text-ink">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-ink focus:border-gold focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="password" className="block font-sans text-sm text-ink">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-ink focus:border-gold focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-gold px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-gold-soft disabled:opacity-60"
      >
        {isPending ? "Entrando..." : "Entrar"}
      </button>

      {state.status === "error" && (
        <p role="alert" className="text-center font-sans text-xs text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 3: Restyle the admin protected layout**

In `src/app/admin/(protected)/layout.tsx`, change both occurrences of
`hover:text-rose` to `hover:text-gold` (the nav links and the "Sair"
button). Leave everything else unchanged.

- [ ] **Step 4: Restyle the admin gifts list page**

In `src/app/admin/(protected)/presentes/page.tsx`, change the "Novo
presente" link's className from:

```tsx
          className="rounded-full bg-rose px-5 py-2 font-sans text-xs uppercase tracking-widest text-white transition-colors hover:bg-rose-dark"
```

to:

```tsx
          className="rounded-full bg-gold px-5 py-2 font-sans text-xs uppercase tracking-widest text-paper transition-colors hover:bg-gold-soft"
```

And the "Editar" link's className from `"text-rose hover:text-rose-dark"`
to `"text-gold hover:text-gold-soft"`. Leave everything else unchanged.

- [ ] **Step 5: Restyle `ConfigurationNotice`**

Replace the full contents of `src/components/ui/ConfigurationNotice.tsx`
with:

```tsx
interface ConfigurationNoticeProps {
  message: string;
}

export function ConfigurationNotice({ message }: ConfigurationNoticeProps) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-paper-soft px-6 py-10 text-center">
      <p className="font-sans text-sm text-ink-soft">{message}</p>
    </div>
  );
}
```

- [ ] **Step 6: Run the full test suite**

Run: `npm run test`
Expected: all tests pass (including `DashboardStats.test.tsx`,
`GiftCard.test.tsx` — none of these assert on the classes being changed
here).

- [ ] **Step 7: Grep-sweep for old tokens**

Run: `grep -rn "rose\|cream" src/components/admin/ "src/app/admin/(protected)/layout.tsx" "src/app/admin/(protected)/presentes/page.tsx" src/components/ui/ConfigurationNotice.tsx`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/GiftForm.tsx src/components/admin/LoginForm.tsx "src/app/admin/(protected)/layout.tsx" "src/app/admin/(protected)/presentes/page.tsx" src/components/ui/ConfigurationNotice.tsx
git commit -m "feat(admin): restyle remaining admin surfaces with new tokens"
```

---

## Task 6: Remove legacy tokens from `globals.css`

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: nothing.
- Produces: `--color-cream`, `--color-cream-dark`, `--color-rose`,
  `--color-rose-dark` and their `@theme inline` mappings are removed.
  `--color-background` now maps to `var(--color-paper)`. Decorative CSS
  (`.bg-wave`, `.bg-wave-reverse`, `.animate-nav-bounce` and their
  keyframes) is removed **only if** Step 1 confirms zero remaining
  consumers — `.flip-card`/`.flip-card-inner`/`.flip-card-front`/
  `.flip-card-back` and `.animate-float-rotate` stay regardless (still
  used by `ArchFlipCard`/`InfoCards`).

- [ ] **Step 1: Confirm which decorative classes are still used**

Run:

```bash
grep -rln "bg-wave\b" src/ --include=*.tsx
grep -rln "bg-wave-reverse" src/ --include=*.tsx
grep -rln "animate-nav-bounce" src/ --include=*.tsx
grep -rln "animate-float-rotate" src/ --include=*.tsx
```

`StoryTimeline.tsx` (the only consumer of `.bg-wave` and
`.animate-float-rotate`) was deleted in Task 2, and the old
`HeroCarousel`'s scroll-cue arrow (the only consumer of
`.animate-nav-bounce`) was removed in the Home Page plan. Expect the
first three commands to return **no output** (confirming they're truly
unused now) and the fourth to also return no output (since
`StoryTimeline` was its only consumer too). If any command DOES return a
file, do not remove that class's CSS in Step 2 — note it in your report
instead and keep it.

- [ ] **Step 2: Update the token block**

In `src/app/globals.css`, replace the `:root` block:

```css
:root {
  --color-cream: #faf7f2;
  --color-cream-dark: #f1e6d8;
  --color-ink: #2a2622;
  --color-ink-soft: #5c554d;
  --color-rose: #b76e79;
  --color-rose-dark: #995563;
  --color-gold: #c9a66b;
  --color-line: #e4dcd1;
  --color-paper: #ffffff;
  --color-paper-soft: #f4f2ee;
  --color-charcoal: #14130f;
  --color-gold-soft: #d8c391;
  --color-line-dark: #3a362f;
  --color-danger: #b3413a;
}
```

with:

```css
:root {
  --color-ink: #2a2622;
  --color-ink-soft: #5c554d;
  --color-gold: #c9a66b;
  --color-line: #e4dcd1;
  --color-paper: #ffffff;
  --color-paper-soft: #f4f2ee;
  --color-charcoal: #14130f;
  --color-gold-soft: #d8c391;
  --color-line-dark: #3a362f;
  --color-danger: #b3413a;
}
```

And replace the `@theme inline` block:

```css
@theme inline {
  --color-background: var(--color-cream);
  --color-foreground: var(--color-ink);
  --color-cream: var(--color-cream);
  --color-cream-dark: var(--color-cream-dark);
  --color-ink: var(--color-ink);
  --color-ink-soft: var(--color-ink-soft);
  --color-rose: var(--color-rose);
  --color-rose-dark: var(--color-rose-dark);
  --color-gold: var(--color-gold);
  --color-line: var(--color-line);
  --color-paper: var(--color-paper);
  --color-paper-soft: var(--color-paper-soft);
  --color-charcoal: var(--color-charcoal);
  --color-gold-soft: var(--color-gold-soft);
  --color-line-dark: var(--color-line-dark);
  --color-danger: var(--color-danger);
  --font-serif: var(--font-playfair);
  --font-sans: var(--font-inter);
  --font-script: var(--font-alex-brush);
}
```

with:

```css
@theme inline {
  --color-background: var(--color-paper);
  --color-foreground: var(--color-ink);
  --color-ink: var(--color-ink);
  --color-ink-soft: var(--color-ink-soft);
  --color-gold: var(--color-gold);
  --color-line: var(--color-line);
  --color-paper: var(--color-paper);
  --color-paper-soft: var(--color-paper-soft);
  --color-charcoal: var(--color-charcoal);
  --color-gold-soft: var(--color-gold-soft);
  --color-line-dark: var(--color-line-dark);
  --color-danger: var(--color-danger);
  --font-serif: var(--font-playfair);
  --font-sans: var(--font-inter);
  --font-script: var(--font-alex-brush);
}
```

- [ ] **Step 3: Remove now-dead decorative CSS, if Step 1 confirmed it's dead**

If (and only if) all of Step 1's `bg-wave`/`bg-wave-reverse`/
`animate-nav-bounce` greps returned no output, delete these blocks from
`src/app/globals.css`: the `@keyframes wave-scroll` and `@keyframes
wave-scroll-reverse` blocks, the `.bg-wave` and `.bg-wave-reverse` rule
blocks, the `@keyframes nav-bounce` block, and the `.animate-nav-bounce`
rule block. Do NOT touch `@keyframes float-rotate`,
`.animate-float-rotate`, or any of the `.flip-card*` rules — those stay.

- [ ] **Step 4: Run the full test suite, lint, and build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass. If the build fails referencing an undefined color
utility, it means some file still uses a removed token — search for it
(`grep -rn "rose\|cream" src/`) and stop; that means an earlier task in
this plan (or a prior plan) missed a file. Report BLOCKED with the exact
grep output rather than trying to guess a fix.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(design-system): remove legacy cream/rose tokens from globals.css"
```

---

## Task 7: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all tests pass, including every new/rewritten suite from Tasks
1–6.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: build succeeds. Confirm the printed route list still includes
every expected route (`/`, `/nossa-historia`, `/confirmar-presenca`,
`/presentes`, `/dicas-e-instrucoes/cerimonia`,
`/dicas-e-instrucoes/codigo-de-vestimenta`,
`/dicas-e-instrucoes/hospedagem`, `/admin/*`) and that `/album-de-fotos`
is still absent (removed in Plan 2).

- [ ] **Step 4: Repo-wide grep-sweep for legacy tokens**

Run: `grep -rn "rose\|cream" src/`
Expected: **no output at all**. This is the plan's whole point — if
anything shows up here, it means a file was missed across this or an
earlier plan.

- [ ] **Step 5: If Step 4 found something, fix it with an explicit file list**

```bash
git add <only the specific files you changed to fix the issue — never git add -A>
git commit -m "chore(design-system): remove remaining legacy token references"
```

- [ ] **Step 6: If everything in Steps 1-4 passed cleanly, make no commit**

Just report the results.

---

## What this plan intentionally does NOT do

- Does not add real photos, real ceremony address, or a real lodging
  list — `PlaceholderImage` and "a confirmar" copy stay until Stéfanie
  and Jonatas provide the real content (see the project README's "O que
  falta preencher" section).
- Does not restructure the admin panel's information architecture —
  Task 5 is a pure token swap, no new admin pages/layout changes beyond
  what Plan 4 already added for guest pre-registration.
- Does not add authentication/authorization to the public RSVP flow — see
  the accepted-tradeoff addendum in the RSVP plan.
