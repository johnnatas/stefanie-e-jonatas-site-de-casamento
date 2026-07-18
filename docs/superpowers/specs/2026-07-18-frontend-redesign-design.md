# Redesign do front-end — Stéfanie & Jonatas

Data: 2026-07-18
Status: aprovado, pronto para plano de implementação

## Contexto

O site atual (Next.js App Router, Tailwind, arquitetura limpa) já reproduz a
estrutura de navegação do site de referência
(`https://www.amabillyegabriel.com/pt`), mas o dono do projeto não gostou do
resultado visual. Este documento especifica um redesign do front-end
inspirado na referência, mantendo a arquitetura de código existente
(`domain` → `application` → `infrastructure` → `app`).

Imagens de referência usadas (pasta local `references/images/`, fora do
repositório, git-ignorada):

- `banner-principal.png` — hero com nomes, data e local
- `save-the-date-e-flip-cards.png` — contador + divisor de papel rasgado +
  seção "SAVE THE DATE!" com 3 cards de foto em arco
- `efeito-papel-rasgado.png` — close do divisor de papel rasgado
- `carrossel-de-scroll-horizontal.png` — painéis split-screen claro/escuro
  (Cerimônia / Lista de Presentes)
- `confirmacao-presenca.png`, `confirmacao-presenca-digitando.png` — fluxo de
  RSVP por busca de nome

## Objetivo

Redesenhar a identidade visual do site inteiro (exceto Álbum de Fotos, que
sai de escopo) para o clima editorial/fotográfico da referência, e trocar o
fluxo de RSVP de autocadastro livre para busca em lista de convidados
pré-cadastrada — mantendo testes (Vitest) e a separação de camadas já
existente.

## Fora de escopo

- Álbum de Fotos: removido do menu e da navegação. A rota
  `/album-de-fotos` é removida.
- Painel administrativo: mantém estrutura e estilo atuais; só recebe a nova
  tela de cadastro de convidados necessária para o novo fluxo de RSVP.
- Integração de pagamento (Mercado Pago) e lógica de presentes: sem mudança
  funcional, só visual (cards).

## 1. Design system

### Paleta de cores

Substituir a paleta rosa/cream atual por uma paleta neutra editorial com
dourado como cor de destaque única (o rosa sai completamente).

```css
--color-paper: #ffffff;       /* fundo claro principal */
--color-paper-soft: #f4f2ee;  /* fundo claro secundário (painéis, seções alternadas) */
--color-ink: #1c1a17;         /* texto principal, quase preto */
--color-ink-soft: #6b655c;    /* texto secundário */
--color-charcoal: #14130f;    /* fundo escuro (painéis, hero overlay) */
--color-gold: #b6924f;        /* cor de destaque única (antes era --color-gold, mantém o token) */
--color-gold-soft: #d8c391;   /* variação clara do dourado (hover, linhas finas) */
--color-line: #e3ddd2;        /* bordas sutis em fundo claro */
--color-line-dark: #3a362f;   /* bordas sutis em fundo escuro */
```

`--color-rose` e `--color-rose-dark` são removidos de `globals.css` e de todo
uso no código (nenhum componente deve mais referenciar `rose`).

### Tipografia

- `font-serif` (Playfair Display, já configurada): títulos, números do
  contador, nav em uppercase, texto de corpo em painéis editoriais.
- `font-script` (Alex Brush, já configurada): subtítulos afetivos, item de
  nav ativo, palavras de destaque ("mal podemos esperar", etc.).
- `font-sans` (Inter, já configurada): parágrafos longos e texto de apoio
  onde a leitura precisa ser mais neutra (ex. descrições de dicas,
  formulários).

Nav e labels uppercase deixam de usar `font-sans` e passam a usar
`font-serif` com `tracking-[0.2em]` — hoje usam `font-sans uppercase
tracking-widest`, isso muda em `Header`, `MobileMenu`, `Footer`,
`InfoCards`, botões de CTA.

### Botões

Novo padrão único de botão pill/outline, substituindo os botões preenchidos
(`bg-rose`) e os outline atuais:

- Primário: cápsula, borda `--color-gold`, texto `--color-gold` em
  `font-serif italic`, hover preenche com `--color-gold` e texto vira
  `--color-paper`.
- Secundário: mesma forma, borda `--color-line`/`--color-ink-soft`, texto
  `--color-ink-soft`, para ações negativas ("Não poderei ir") ou links
  secundários.

Implementar como componente compartilhado `src/components/ui/PillButton.tsx`
(`variant: "primary" | "secondary"`, aceita `href` ou `onClick`/`type`) para
não duplicar classes entre Hero, RSVP, InfoCards e painéis split-screen.

### Divisor de papel rasgado

Novo componente `src/components/ui/TornPaperDivider.tsx`:

- SVG full-width, `viewBox` largo (ex. `0 0 1440 120`), path irregular
  gerado uma vez (pontos fixos, não aleatório a cada render, para não gerar
  hydration mismatch) simulando uma borda rasgada orgânica.
- Cor de preenchimento igual ao fundo da seção seguinte (`--color-paper` por
  padrão, prop `fill` para permitir outra cor).
- Textura sutil de fibra usando um filtro SVG (`feTurbulence` +
  `feDisplacementMap`) leve, aplicado só no traço da borda, para lembrar
  fibra de papel sem pesar no arquivo.
- Posicionado com `absolute bottom-0` sobre a seção escura anterior
  (hero/contador), com altura responsiva (`h-16 sm:h-24 md:h-32`).

### Cards em arco com flip

Novo componente `src/components/ui/ArchFlipCard.tsx`, generalizando o
`.flip-card` que já existe em `globals.css`:

- Frente: foto (ou `PlaceholderImage`) com `border-radius` assimétrico
  (topo bem arredondado tipo arco, base reta) e número grande sobreposto
  (`01.`, `02.`, `03.`) no canto inferior, dessaturada por padrão
  (`grayscale`, remove no hover).
- Verso: mesma silhueta em arco, fundo `--color-charcoal`, título + data +
  descrição em texto claro.
- Reaproveita as classes `.flip-card`/`.flip-card-inner` já existentes em
  `globals.css` (mantidas), só muda o conteúdo/forma do card.

Usado em dois lugares: seção "Save the date" da Home (3 marcos da história)
e página Nossa História (mesmos 3 marcos, versão maior/com texto completo
abaixo em vez de só no verso do card).

### Header / navegação

- Logo: substitui o texto script solto "S & J" por um monograma dentro de
  contorno oval fino (SVG simples com as iniciais "S & J" em `font-script`
  pequeno dentro de um traço oval), ecoando o monograma em gota da
  referência.
- Nav desktop: links em `font-serif uppercase tracking-[0.2em] text-sm`,
  cor `--color-ink-soft`, hover/ativo em `--color-gold`; o item da rota
  ativa usa `font-script` maiúsculo/minúsculo normal (itálico cursivo) no
  lugar do uppercase, como "confirme presença" na referência.
- Header fica transparente sobre o hero (texto branco) e ganha fundo
  `--color-paper/90` + blur ao rolar ou em páginas sem hero escuro — mesma
  ideia do `sticky` atual, só recalculando cores.
- `MobileMenu` recebe a mesma tipografia serif/script e paleta nova.

## 2. Home (`/`)

Nova ordem de seções, substituindo a atual:

1. **Header** transparente sobre o hero.
2. **Hero** (`HeroCarousel`, mantém Embla): overlay mais escuro/dessaturado
   sobre as fotos, nomes do casal em `font-serif` grande com "&" central
   maior/itálico, linha fina dourada abaixo do nome, subtítulo em
   `font-script`, data/local em `font-serif uppercase` pequeno. CTA "Confirme
   sua presença" vira `PillButton` primário.
3. **Contador**: continua sobre a mesma imagem do hero/mesma seção visual
   (não é mais bloco separado com fundo cream) — título "Casados há:" /
   "Faltam:" (dependendo se a data já passou) em `font-script`, números
   grandes `font-serif` leve, labels `font-serif uppercase` pequenas, linhas
   verticais finas douradas entre unidades.
4. **`TornPaperDivider`** fechando a seção escura do hero/contador.
5. **"SAVE THE DATE!"**: título grande empilhado (`SAVE` / `THE` / `DATE!`)
   em `font-serif`, com gradiente de opacidade/cor letra a letra (`ink` →
   `ink-soft` → `line`), ao lado os 3 `ArchFlipCard` (O Começo, O Pedido, O
   Casamento) vindos de `StoryTimeline` — os dados/milestones continuam os
   mesmos, só muda a apresentação.
6. **InfoCards**: grid com os 5 cards restantes (Cerimônia, Traje,
   Hospedagem, Presentes, Nossa História — remove Álbum de Fotos), mantém
   `.flip-card` 3D no hover, recebe só a tipografia/paleta novas.

`StoryTimeline` deixa de ser usada como está (layout foto+texto lado a
lado) na Home; vira a fonte dos dados para os `ArchFlipCard`. A versão
"foto ao lado do texto" continua existindo na página Nossa História (ver
seção 4), reaproveitando os mesmos milestones.

## 3. RSVP (`/confirmar-presenca`) — mudança de domínio

### Modelo de dados

`Guest` (`src/domain/entities/Guest.ts`) muda de "autocadastro livre" para
"convidado pré-cadastrado, atualizado pelo RSVP":

- Novo campo `nickname?: string` (como a pessoa prefere ser chamada/como o
  nome aparece na busca).
- `attendanceConfirmed: boolean` vira `attendanceStatus: "pending" |
  "confirmed" | "declined"` (todo convidado nasce `"pending"`).
- `email`/`phone` deixam de ser obrigatórios na criação (o admin pode
  cadastrar só nome + apelido); continuam podendo ser preenchidos depois,
  se quiserem manter contato.
- `companionsCount` e `message` continuam preenchidos só na confirmação.

`GuestRepository` ganha:

- `findAllPublicNames(): Promise<{ id: string; fullName: string; nickname?: string }[]>`
  — usado pela busca pública, nunca retorna email/telefone/mensagem.
- `findById(id: string): Promise<Guest | null>`.
- `update(id: string, patch: Partial<GuestProps>): Promise<Guest>` (ou
  equivalente) para o RSVP atualizar o convidado existente em vez de criar
  um novo.

Novo caso de uso `application/use-cases/rsvp/SearchGuestsUseCase.ts` (busca
pública, retorna só nome/apelido/id) e `ConfirmRsvpUseCase` é reescrito para
receber `guestId` + `attendanceStatus` + `companionsCount?` + `message?` e
atualizar o convidado, em vez de criar um `Guest` novo a partir de dados
livres.

Novo caso de uso no admin `application/use-cases/admin/CreateGuestUseCase.ts`
para pré-cadastrar convidados (nome + apelido), com tela nova em
`/admin/(protected)/convidados/novo`.

Migration nova em `supabase/migrations/` adicionando `nickname` e trocando
a coluna de confirmação por um enum/status (com migração dos dados
existentes, se houver).

### Fluxo público

1. Página carrega (Server Component busca a lista pública de nomes via
   `SearchGuestsUseCase`, hidrata um Client Component com a lista já pronta
   — sem round-trip extra por teclado).
2. Fundo decorativo: todos os nomes com as letras embaralhadas
   (determinístico por render, não por keystroke) em texto grande de baixa
   opacidade atrás do campo — puramente visual, nunca mostra nomes reais no
   fundo.
3. Campo "Digite seu nome": Client Component com `useState`, sem
   `react-hook-form` nessa etapa (é busca, não formulário). A cada
   alteração, roda um matcher local (normaliza acento/caixa, tolera
   pequenos erros de digitação e casa contra `fullName` e `nickname`) sobre
   a lista já carregada e mostra o melhor resultado abaixo do campo, em
   `font-script italic`.
4. Ao haver um resultado com confiança suficiente, mostra a mensagem
   personalizada e dois `PillButton` ("Confirmar presença" / "Não poderei
   ir"). Nenhum resultado suficientemente próximo → mensagem pedindo para
   checar a grafia ou chamar o casal (sem fallback de autocadastro).
5. Confirmando presença, expande um mini-formulário só com "Número de
   acompanhantes" (opcional, default 0) e "Mensagem" (opcional) — sem
   repetir nome/e-mail/telefone. Envia via Server Action chamando
   `ConfirmRsvpUseCase` com o `guestId` já resolvido.
6. Recusando, confirma direto (sem campos extra) e chama a mesma Server
   Action com `attendanceStatus: "declined"`.

O matcher de nomes é implementado como utilitário puro em
`src/shared/utils/matchGuestName.ts` (testável isoladamente com Vitest, sem
dependência nova — normalização + distância de edição simples, suficiente
para listas de até algumas centenas de convidados).

### Painel administrativo

`/admin/(protected)/convidados`:

- Lista existente ganha coluna de status (`pendente/confirmado/recusado`)
  no lugar do booleano atual.
- Nova página `/admin/(protected)/convidados/novo` com formulário simples
  (nome completo + apelido) para pré-cadastrar convidados antes do envio do
  site, usando `react-hook-form` + `zod`, no mesmo padrão do `GiftForm`
  existente.

## 4. Demais páginas

- **Nossa História** (`/nossa-historia`): mesmos 3 `ArchFlipCard`
  reaproveitados da Home, layout centralizado, mais texto de apoio abaixo
  de cada card (a versão completa da história, hoje já existente na
  página, mantém o conteúdo textual, só troca a apresentação visual).
- **Dicas e Instruções** (`cerimonia`, `codigo-de-vestimenta`,
  `hospedagem`) e a entrada da **Lista de Presentes**: novo componente
  `src/components/ui/SplitPanel.tsx` — duas colunas (foto grande de um
  lado, texto + `PillButton` do outro), alternando fundo claro
  (`--color-paper-soft`) e escuro (`--color-charcoal`) por seção, no
  mesmo espírito do painel "A Cerimônia / Lista de Presentes" da
  referência. Em mobile, empilha (foto em cima, texto embaixo).
- **Presentes** (`/presentes`): grid de `GiftCard` mantido, recebe só a
  tipografia/paleta novas e cantos mais retos (menos `rounded-lg`, mais
  editorial).
- **Álbum de Fotos**: removido de `NAV_ITEMS`, `InfoCards` e do
  `app/album-de-fotos`; a rota é apagada.

## 5. Testes

Seguindo o padrão TDD já usado no projeto (Vitest + Testing Library):

- `matchGuestName.ts`: testes unitários cobrindo match exato, por apelido,
  tolerância a acento/caixa e a pequenos erros de digitação, e "nenhum
  resultado".
- `Guest.ts`: testes atualizados para o novo `attendanceStatus` e criação
  sem email/telefone obrigatórios.
- `SearchGuestsUseCase`, `ConfirmRsvpUseCase` (reescrito), `CreateGuestUseCase`:
  testados com repositório fake, como os demais casos de uso já são.
- Componentes visuais novos (`TornPaperDivider`, `ArchFlipCard`,
  `PillButton`, `SplitPanel`) recebem pelo menos um teste de smoke/render
  (Testing Library), seguindo o padrão de `Header.test.tsx` /
  `DashboardStats.test.tsx`.

## 6. Riscos / pontos de atenção

- Mudar `attendanceConfirmed: boolean` → `attendanceStatus` é uma mudança
  de schema; se já existirem confirmações reais em produção, a migration
  precisa converter `true → "confirmed"`, `false → "declined"` (sem dados
  reais hoje, conforme README, então o risco é baixo).
- A busca pública de nomes expõe nome completo + apelido de todos os
  convidados a qualquer visitante da página (sem exigir login) — aceitável
  para um site de casamento com lista fechada, mas nunca deve incluir
  email/telefone/mensagem nessa lista pública.
- O Next.js instalado (16.2.10) é uma versão com mudanças de breaking
  change em relação ao treinamento do modelo (conforme `AGENTS.md`); antes
  de implementar, revisar `node_modules/next/dist/docs/` para padrões de
  Server Actions/Server Components atuais.
- As imagens reais do casal (hoje placeholders) continuam pendentes — o
  redesign é construído para funcionar com `PlaceholderImage` e trocar por
  fotos reais depois, sem mudança estrutural.
