# Guests & Gifts Admin Overhaul

Date: 2026-07-20
Status: approved, ready for implementation plan

## Context

This is sub-project A of a 3-part batch of admin panel fixes/improvements
(the other two — photo upload UX and Content page reorganization — are
planned separately). Today, the admin Convidados (guests) and Presentes
(gifts) pages are minimal: guests can only be created one at a time with
no edit/delete; gifts can be edited but clicking "Editar" currently
errors; neither list has search/filtering; and the Dashboard's stat cards
are static, non-interactive tiles.

## Goal

Let the couple manage their guest list and gift registry at real-world
scale: bulk-import via a CSV spreadsheet, edit and delete individual
entries, filter both lists, fix the broken gift-edit page, and make the
Dashboard's stats clickable shortcuts into the filtered lists they
summarize.

## 1. Spreadsheet import

### Shared architecture

Both imports follow the same shape: a new page per list
(`/admin/convidados/importar`, `/admin/presentes/importar`) with a
"Baixar modelo" link to a static CSV template and a file-upload form
(`<input type="file" accept=".csv">` inside a `useActionState` Server
Action form, matching the existing form conventions).

A new shared CSV utility, `src/shared/utils/parseCsv.ts`, wraps
**`papaparse`** (new npm dependency — the one exception to this
project's zero-new-dependency-for-parsing norm, because hand-rolled CSV
parsing reliably breaks on quoted fields containing commas and the
UTF-8 BOM Excel adds to CSV exports on Windows, both of which are
realistic here):

```ts
interface ParsedCsvRow {
  [column: string]: string;
}

function parseCsv(fileContent: string): ParsedCsvRow[]
```

Each import Server Action: reads the uploaded file's text, calls
`parseCsv`, validates each row against that entity's Zod schema,
**skips** rows whose name exactly matches (case-insensitive) an
existing record (reported separately from hard errors, not as a
failure), creates the rest via the existing single-entity use case
(`CreateGuestUseCase` / a new `CreateGiftUseCase`-equivalent — gifts
currently only have `UpsertGiftUseCase`, reused here with no `id`),
and returns a structured result: `{ created: number; skipped: number;
errors: { row: number; message: string }[] }`, rendered as a summary
list on the page after submit (no redirect — the admin needs to see the
per-row errors).

### Guests template

Columns: `Nome completo` (required, matches `guestFormSchema`'s
existing 3-character minimum), `Apelido` (optional). One header row +
one example data row in the static template file
(`public/templates/convidados-modelo.csv`).

### Gifts template

Columns: `Nome`, `Descrição`, `Categoria`, `Valor` (all required,
matching `giftFormSchema`'s existing rules — `Valor` parsed as a
positive number, accepting comma or dot as the decimal separator since
Brazilian spreadsheet software defaults to comma). Imported gifts get
`imageUrl: null` → rendered via the existing `PhotoOrPlaceholder`
fallback until the admin edits the gift and uploads a real photo.
Template file: `public/templates/presentes-modelo.csv`.

## 2. Guest edit + delete

`GuestForm` becomes a shared create/edit component, following the exact
pattern `GiftForm` already established (`defaultValues?: GuestFormValues`
prop, hidden `id` field when editing). `guestFormSchema` expands to
cover every field on the `Guest` domain entity:

```ts
export const guestFormSchema = z.object({
  id: z.string().optional(),
  fullName: z.string().min(3, "Informe o nome completo."),
  nickname: z.string().optional(),
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  phone: z.string().min(8, "Telefone inválido.").optional().or(z.literal("")),
  companionsCount: z.coerce.number().int().min(0).default(0),
  attendanceStatus: z.enum(["pending", "confirmed", "declined"]).default("pending"),
  message: z.string().optional(),
});
```

All fields except `fullName` stay optional on create (an admin
pre-registering a guest usually only knows the name); edit exposes the
same fields with the guest's current values pre-filled.

**New domain/application work**: `GuestRepository` gains `update(guest:
Guest): Promise<Guest>` and `delete(id: string): Promise<void>`;
`SupabaseGuestRepository` implements both; new `UpdateGuestUseCase` and
`DeleteGuestUseCase` in `src/application/use-cases/admin/`.

**UI**: the Convidados table gets two more header/row cells, "Editar"
(links to `/admin/convidados/[id]`, a new edit page mirroring
`presentes/[id]/page.tsx`) and "Excluir" (a small form with a
`DeleteGuestButton` Client Component that shows a native `confirm()`
prompt before submitting — no custom modal, matching this project's
"simple" bias). `/admin/convidados/novo` gets a "Cancelar" link back to
`/admin/convidados`, matching the CMS pages' back-link pattern from the
previous sub-project.

## 3. Gift edit bug fix + delete

**Bug fix**: `src/app/admin/(protected)/presentes/[id]/page.tsx`
currently calls `createListGiftsUseCase().execute()` directly with no
`isBackendConfigured()` check and no try/catch — unlike
`presentes/page.tsx`, which guards both. This is the prime suspect for
the reported error. The implementing task must first **reproduce the
error locally** (start the dev server, log in as admin, click Editar on
a real gift) to confirm this is the actual cause before fixing it —
per `systematic-debugging`, not a guessed fix. The fix itself: apply the
same guard/try-catch pattern already used on the list page, showing
`ConfigurationNotice` on failure instead of crashing.

**Delete**: new `DeleteGiftUseCase` + `delete(id: string): Promise<void>`
on `GiftRepository`/`SupabaseGiftRepository`. Because
`gift_contributions.gift_id` references `gifts.id` with no cascade,
Postgres will reject deleting a gift that already has contributions —
`DeleteGiftUseCase` catches that foreign-key violation and returns a
domain-level error ("Não é possível excluir: este presente já tem
contribuições registradas.") rather than letting a raw Postgres error
surface. Presentes list gets the same Editar/Excluir pattern as
Convidados.

## 4. Dynamic filters

A new shared pattern: each list page's Server Component still fetches
the full list server-side (both lists are small — a real guest list and
gift registry, not thousands of rows — so client-side filtering is the
right tradeoff over adding query-aware repository methods), then hands
it to a new Client Component (`GuestsTable`, `GiftsTable`) that owns the
filter UI and does the filtering in the browser.

- **`GuestsTable`**: text input (matches fullName or nickname,
  case-insensitive substring) + a status `<select>` (Todos / Pendente /
  Confirmado / Recusado).
- **`GiftsTable`**: text input (matches name) + categoria `<select>`
  (populated from the distinct categories present in the current list)
  + status `<select>` (Todos / Disponível / Reservado / Presenteado).

Both read their initial filter values from `useSearchParams` on mount
and push filter changes back to the URL via `router.replace` (so
filtering is shareable/bookmarkable and is what makes dashboard
deep-linking possible) — no debounce needed given the in-memory,
client-side filter is instant.

## 5. Dashboard clickable cards

`DashboardStats` items become links where a specific filter value makes
sense:

| Card | Links to |
|---|---|
| Confirmados | `/admin/convidados?status=confirmed` |
| Pendentes | `/admin/convidados?status=pending` |
| Não vão | `/admin/convidados?status=declined` |
| Total de pessoas | `/admin/convidados` (no single filter applies) |
| Presentes cadastrados | `/admin/presentes` (no single filter applies) |
| Presentes recebidos | `/admin/presentes?status=paid` |
| Valor arrecadado | `/admin/presentes?status=paid` |

## Testing

- Domain/application: unit tests for `Guest`'s updated validation (if
  any changes needed), `UpdateGuestUseCase`, `DeleteGuestUseCase`,
  `DeleteGiftUseCase` (including the foreign-key-violation → domain
  error path), following the existing in-memory-repository test
  pattern.
- `parseCsv`: unit tests covering quoted fields with commas, a BOM
  prefix, and malformed rows.
- Import Server Actions: tests covering create/skip-duplicate/error-row
  counting for both guests and gifts.
- Component tests: `GuestsTable`/`GiftsTable` filtering logic (text +
  status/category), `DeleteGuestButton`/delete-gift confirmation flow.
- The gift-edit bug fix is verified by reproducing the original error
  first, then confirming the fix resolves it — not just adding a test
  that happens to pass.

## What this does NOT do

- Does not add bulk edit/delete (select multiple rows) — one at a time.
- Does not add XLSX import — CSV only, per the approved decision.
- Does not add photo import via spreadsheet — gift photos stay a
  post-import manual step via the existing upload field.
- Does not change the public-facing RSVP or gift-contribution flows —
  this is admin-panel-only.
- Does not add pagination to the lists — filtering happens over the
  full in-memory list, consistent with the expected data scale.
