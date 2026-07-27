# Dicas e Instruções — Redesign (menu de temas + conteúdo fiel à referência)

**Data:** 2026-07-27
**Autor:** Jonatas (via Claude Code)

## Contexto e problema

A página "Dicas e Instruções" foi reestruturada em 2026-07-21, mas o resultado ficou aquém: cada
tema é uma **rota separada** (`/dicas-e-instrucoes/cerimonia`, `/codigo-de-vestimenta`,
`/hospedagem`) com **abas no topo**, e cada página apenas empilha conteúdo abaixo de um intro
`SplitPanel`. Isso destoa do modelo de referência fornecido pelo usuário (site
amabillyegabriel.com), que tem um **menu de temas na lateral esquerda (desktop) / topo (mobile)** e
o conteúdo do tema selecionado ocupando a área principal, trocando dinamicamente.

Este spec substitui aquele resultado por uma reprodução fiel da referência, mantendo os tokens de
design e as convenções do próprio projeto.

## Decisões (confirmadas com o usuário)

1. **Troca de temas por URL** (`?tema=`) — uma única página, navegação client-side suave, link
   compartilhável, botão voltar funcional.
2. **Rotas de acesso (Cerimônia)** = modelo `origem + texto livre + link do mapa` (mantém o
   `ceremonyRouteSchema` atual; o texto livre acomoda "ALTERNATIVA 1", passos numerados, etc.).
3. **Mapa (Hospedagem)** = **campo de endereço**, renderizado via embed do Google Maps sem API key
   paga (`https://maps.google.com/maps?q=<endereço>&output=embed`).
4. **Pinterest (Vestimenta)** = **dois boards** (Ele e Ela).
5. **Cerimônia** segue a referência: título → divisor → info principal → rotas. **Sem** parágrafo
   intro livre.
6. **Consolidar** em uma única rota `/dicas-e-instrucoes`, **removendo** as 3 sub-rotas e
   **redirecionando** as URLs antigas; atualizar links internos.

**Fora de escopo:** a refatoração da página de Presentes (spec próprio, em seguida).

## Arquitetura

### Rota única + menu de temas

- `src/app/dicas-e-instrucoes/page.tsx` (Server Component) lê `searchParams.tema`
  (`cerimonia` | `vestimenta` | `hospedagem`).
  - **Redirect de default:** se `tema` estiver **ausente** ou for **inválido**, a página faz
    `redirect("/dicas-e-instrucoes?tema=cerimonia")` (via `next/navigation`). Assim a URL fica
    sempre explícita e o acesso sem parâmetro cai sempre no primeiro tema, "a cerimônia".
  - Busca o conteúdo do tema ativo via `getSiteContentOrDefault(...)` e renderiza o shell.
- O `layout.tsx` atual (heading grande "Dicas e Instruções" + abas) é **removido** — o menu de
  temas passa a ser o elemento de topo, como na referência. `metadata` migra para `page.tsx`.
- **Shell** (dentro de `page.tsx`): grid responsivo
  - **Desktop (lg+):** duas colunas — `TipsThemeMenu` fixo à esquerda (largura estreita) + área de
    conteúdo à direita.
  - **Mobile:** `TipsThemeMenu` empilhado e centralizado no topo, conteúdo abaixo.

### Componentes novos (`src/components/tips/`)

- **`TipsThemeMenu.tsx`** — recebe `active: "cerimonia" | "vestimenta" | "hospedagem"`. Renderiza 3
  `next/link` para `?tema=…`. Item **ativo**: `font-serif italic text-moss` (dourado/script, como a
  referência); **inativos**: `font-sans uppercase tracking-widest text-forest/70 hover:text-moss`.
  Labels: `a cerimônia`, `código de vestimenta`, `hospedagem`.
- **`CeremonyTheme.tsx`** (server) — recebe `content: TipsCerimoniaContent`. Layout: imagem
  (`PhotoOrPlaceholder` com `content.photo`) no topo → título (`font-serif`) → divisor `border-line`
  → bloco de info principal (data, horário, local/venue, endereço; cada linha omitida se vazia) →
  lista de rotas. Cada rota: `originLabel` (heading) + `renderMarkdown(instructions)` + link
  "Ver rota no mapa →" quando `mapUrl`.
- **`DressCodeTheme.tsx`** (server) — recebe `content: TipsTrajeContent`. Layout: título script
  (`title`) → nome do traje em serifado grande (`dressCodeName`) → `renderMarkdown(body)` →
  `<DressCodeInspiration him={pinterestHimUrl} her={pinterestHerUrl} />`.
- **`DressCodeInspiration.tsx`** (client) — seletor Ele/Ela.
  - **Mobile:** toggle segmentado `[ Ele | Ela ]` (`useState`), mostra um board por vez.
  - **Desktop (lg+):** "ELE" e "ELA" lado a lado com divisor vertical central, ambos os boards
    visíveis (toggle oculto).
  - Cada board via `PinterestBoardEmbed`. Se um dos URLs for nulo, oculta aquela coluna/aba.
- **`LodgingTheme.tsx`** (server) — recebe `content: TipsHospedagemContent`. Layout desktop: mapa
  (`GoogleMapEmbed` com `mapAddress`) à esquerda, listas à direita; mobile empilhado. Ordem das
  seções segue a referência: mapa → título script → DISTÂNCIAS → HOTÉIS → aviso (disclaimer) →
  AEROPORTOS. Cada lista some se vazia; o mapa some se `mapAddress` for nulo.

### Componente novo (`src/components/ui/`)

- **`GoogleMapEmbed.tsx`** — recebe `address: string`. Renderiza um `<iframe>` com
  `src="https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=12&output=embed"`,
  `loading="lazy"`, `referrerPolicy="no-referrer-when-downgrade"`, sem `box-shadow`
  (borda `border-line`), `aria-label` descritivo. Container responsivo com `aspect-*`.

### Reuso

- `PinterestBoardEmbed` (existente) — reutilizado nos dois boards de Vestimenta.
- `renderMarkdown`, `PhotoOrPlaceholder` — reutilizados.
- `SplitPanel` — **deixa de ser usado** nesta página (não é removido do projeto; pode ser usado
  em outras telas).

## Mudanças de schema (`src/application/content/schemas.ts`)

Renomear/remover campos é **seguro**: o Zod ignora chaves desconhecidas do JSON armazenado e aplica
`default` nas novas. Nenhuma migração destrutiva. Confirmar via `execute_sql` em prod/QA se há linhas
`tips-*` antes de finalizar (esperado: possivelmente vazias).

### `tipsCerimoniaContentSchema`

- **Mantém:** `photo`, `title`, `eventDateLabel`, `eventTimeLabel`, `eventAddress`, `routes`.
- **Adiciona:** `eventVenueLabel: z.string().min(1).nullable().default(null)`.
- **Remove:** `eyebrow`, `body`.
- `title` default → `"Informações sobre o grande dia!"`.

### `tipsTrajeContentSchema`

- **Mantém:** `title`, `body`.
- **Adiciona:** `dressCodeName: z.string().min(1).default("Passeio completo")`,
  `pinterestHimUrl: z.string().min(1).nullable().default(null)`,
  `pinterestHerUrl: z.string().min(1).nullable().default(null)`.
- **Remove:** `eyebrow`, `photo`, `forHim`, `forHer`, `pinterestBoardUrl`.
- `title` default → `"Convidados, preparem suas vestimentas!"`.
- `body` default → orientações incluindo a nota "Mulheres: …".

### `tipsHospedagemContentSchema`

- **Mantém:** `distances`, `hotels`, `airports`, `disclaimer`.
- **Adiciona:** `mapAddress: z.string().min(1).nullable().default(null)`.
- **Remove:** `eyebrow`, `photo`, `body`.
- `title` default → `"Dicas de hospedagem e locomoção"`.

Atualizar `SITE_CONTENT_SLUGS` / `SITE_CONTENT_SCHEMAS`: **inalterados** (slugs e chaves permanecem).
Atualizar `schemas.test.ts` para os novos defaults/campos.

## Painel administrativo

Ajustar os 3 forms/actions existentes aos campos novos/removidos. Padrão de listas dinâmicas
(marker `item{i}Marker`) inalterado. Todo `revalidatePath(...)` **deve** apontar para a nova rota
única `/dicas-e-instrucoes` (não mais para as sub-rotas), antes do `redirect`.

- **`TipsCerimoniaForm` / `dicas-cerimonia/actions.ts`:** remover `eyebrow`/`body`; adicionar
  `eventVenueLabel`; label do upload = "Imagem do local (topo)". `revalidatePath("/dicas-e-instrucoes")`.
- **`TipsTrajeForm` / `dicas-traje/actions.ts`:** remover `eyebrow`, `photo` (upload), `forHim`,
  `forHer`, `pinterestBoardUrl`; adicionar `dressCodeName`, `pinterestHimUrl`, `pinterestHerUrl`
  (dois campos de link dedicados). `revalidatePath("/dicas-e-instrucoes")`.
- **`TipsHospedagemForm` / `dicas-hospedagem/actions.ts`:** remover `eyebrow`, `photo`, `body`;
  adicionar `mapAddress` (campo de endereço). `revalidatePath("/dicas-e-instrucoes")`.

O índice `/admin/conteudo` continua com as mesmas 3 entradas de link — inalterado.

## Consolidação de rotas e redirects

- **Remover:** `src/app/dicas-e-instrucoes/cerimonia/`, `.../codigo-de-vestimenta/`,
  `.../hospedagem/` e o `layout.tsx`.
- **Redirects** em `next.config.ts` (permanentes):
  - `/dicas-e-instrucoes/cerimonia` → `/dicas-e-instrucoes?tema=cerimonia`
  - `/dicas-e-instrucoes/codigo-de-vestimenta` → `/dicas-e-instrucoes?tema=vestimenta`
  - `/dicas-e-instrucoes/hospedagem` → `/dicas-e-instrucoes?tema=hospedagem`
- **Links internos — carrossel da home:** `src/components/home/TopicsCarousel.tsx` tem
  `TOPIC_HREFS` apontando para as 3 sub-rotas antigas. Reapontar:
  - `cerimonia` → `/dicas-e-instrucoes?tema=cerimonia`
  - `traje` → `/dicas-e-instrucoes?tema=vestimenta`
  - `hospedagem` → `/dicas-e-instrucoes?tema=hospedagem`
  Atualizar também as expectativas em `src/components/home/TopicsCarousel.test.tsx` (linhas 14–17).
- **Outros links internos:** `grep -r "dicas-e-instrucoes/"` para garantir que não restou nenhuma
  referência às sub-rotas removidas (nav/menu/rodapé). O `layout.tsx` removido continha o outro uso
  conhecido.

## Constraints globais (do projeto)

- Sem `box-shadow` ("Regra do Chapado") — usar `border border-line`.
- Toda action mutadora chama `revalidatePath` da(s) rota(s) pública(s) afetada(s) antes do `redirect`.
- Somente tokens existentes: `moss`, `forest`, `paper`, `paper-soft`, `line`, `danger`;
  fontes `font-serif` (Playfair) / `font-sans` (Inter). Nenhuma cor/fonte nova.
- Reproduzir a **estrutura** da referência, nunca o estilo visual (cores/fontes/cards) dela.
- Imagem = campo de upload dedicado; embed/link = campo de link dedicado (requisito do usuário).

## Testes

- `schemas.test.ts`: atualizar blocos `tips-*` para novos defaults, campos e limites de array.
- `TipsCerimoniaForm.test.tsx` e `TipsHospedagemForm.test.tsx`: atualizar aos campos novos; manter
  cobertura de adicionar/remover itens dinâmicos.
- Novo `DressCodeInspiration.test.tsx`: toggle Ele/Ela no mobile; oculta coluna quando URL nulo.
- Verificação manual/e2e: navegação por `?tema=`, redirects das URLs antigas, embeds (Pinterest +
  Maps) carregando, responsividade mobile/desktop conforme as imagens de referência.

## Arquivos afetados (resumo)

**Criar:** `src/components/tips/TipsThemeMenu.tsx`, `CeremonyTheme.tsx`, `DressCodeTheme.tsx`,
`DressCodeInspiration.tsx` (+ teste), `LodgingTheme.tsx`; `src/components/ui/GoogleMapEmbed.tsx`.
**Modificar:** `schemas.ts` (+ teste); `src/app/dicas-e-instrucoes/page.tsx`; os 3
`Tips*Form.tsx`; os 3 `dicas-*/actions.ts` e `page.tsx` do admin; `next.config.ts`;
`src/components/home/TopicsCarousel.tsx` (+ teste).
**Remover:** `src/app/dicas-e-instrucoes/{cerimonia,codigo-de-vestimenta,hospedagem}/`,
`src/app/dicas-e-instrucoes/layout.tsx`.
