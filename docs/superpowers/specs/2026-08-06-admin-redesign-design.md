# Painel Administrativo — Redesign de layout, logo configurável e Integrações em abas

**Data:** 2026-08-06
**Autor:** Jonatas (via Claude Code)

## Contexto e problema

O painel administrativo (`/admin/(protected)/*`) hoje é funcional mas visualmente simples: uma
sidebar de texto puro sem ícones, sem header de usuário, e páginas de formulário soltas direto no
fundo da página, sem separação visual em blocos. O usuário quer uma "cara de admin" mais forte,
inspirada na referência visual do Pedido Mobile (sidebar por módulos com ícones, header com
usuário, conteúdo em cards) — mas mantendo a identidade visual do site (paleta forest/moss/paper,
tipografia Playfair/Inter), não um tema genérico escuro de SaaS.

Além do redesign de layout, dois pontos específicos do conteúdo do painel entraram no escopo:

1. **Logo configurável.** Hoje o logo (`Monogram.tsx`) é um arquivo estático
   (`public/images/logo.png` / `logo-light.png`). O admin quer poder trocar essa imagem pelo
   painel, sem depender de deploy.
2. **Integrações desorganizadas.** A página `/admin/integracoes` empilha verticalmente todos os
   formulários (provedor de pagamento, token Mercado Pago, API key Resend, chave secreta),
   independentemente de qual provedor de pagamento está ativo — ou seja, o formulário do Mercado
   Pago aparece mesmo quando o provedor ativo é Infinite Pay, e vice-versa.

**Fora de escopo (adiado para projetos futuros, descartado nesta rodada de brainstorming):**

- Perfis de acesso / múltiplos usuários admin com permissões (RBAC). Hoje há um único usuário
  admin via Supabase Auth; isso vira um projeto próprio depois.
- Cores do site configuráveis pelo admin (texto/fundo × primária/secundária). As cores continuam
  fixas no Tailwind (`forest`, `moss`, `paper` etc.) — tornar isso dinâmico exigiria ler cores do
  banco e aplicá-las via CSS custom properties em todo o site público, escopo maior que não foi
  aprovado agora.
- Favicon (`src/app/icon.tsx`) e imagem de preview de link (`src/app/opengraph-image.tsx`)
  continuam gerados a partir do arquivo estático atual — não passam a usar o logo enviado pelo
  admin.
- Novos módulos de menu além dos já existentes (ex.: relatórios). O usuário confirmou que não quer
  nenhum módulo raiz novo nesta rodada.

## Decisões (confirmadas com o usuário)

1. **Paleta:** manter forest/moss/paper e tipografia atuais — não adotar o visual escuro da
   referência, só a estrutura (sidebar com ícones + módulos, header, cards).
2. **Módulos do menu lateral:** mesmos grupos de hoje (Início, Convidados, Presentes, Conteúdo do
   site, Integrações), cada um com ícone. Nenhum módulo raiz novo.
3. **Logo configurável**, escopo:
   - Duas variantes enviáveis: logo escuro (uso padrão) e logo claro (sobre o hero).
   - Vale para **header do site + e-mails**. Favicon e OG image ficam de fora por agora.
   - Reaproveita a infraestrutura de upload de foto já existente (Supabase Storage +
     `PhotoUploadField` + `resolvePhotoField`), sem novo state acessório: URL nula = usa o arquivo
     estático atual como fallback (o site nunca fica sem logo).
4. **Integrações reorganizadas em abas** (não accordion): Pagamento / Notificações / Segurança.
   Dentro da aba Pagamento, o formulário específico do provedor (Mercado Pago ou Infinite Pay) só
   aparece se aquele for o provedor ativo.

## Arquitetura

### 1. Layout do painel (`src/app/admin/(protected)/layout.tsx`)

- Mantém a estrutura de dados atual (`ADMIN_NAV_GROUPS`), acrescentando um campo `icon` (SVG inline,
  sem nova dependência de pacote de ícones — o projeto não usa nenhuma hoje e as demais telas do
  admin já usam SVGs inline, ex. `PhotoUploadField.tsx`) a cada `AdminNavItem`.
- Sidebar desktop: mesma largura/comportamento, cada link ganha ícone à esquerda do rótulo.
- Novo **header** acima do conteúdo (desktop e mobile): breadcrumb (`Início / <Seção atual>`,
  reaproveitando `findCurrentSectionLabel`) à esquerda; e-mail do admin logado + botão "Sair" à
  direita. Busca o e-mail via `supabase.auth.getUser()` — como o layout é Client Component hoje,
  isso implica buscar o e-mail em `page.tsx`/`layout` de nível servidor e passar como prop, ou
  extrair um pequeno Server Component `AdminHeader` que envolve o layout atual. Decisão de
  implementação: introduzir `src/app/admin/(protected)/layout.tsx` como Server Component que busca
  o e-mail e renderiza um novo Client Component `AdminShell` (sidebar + header + mobile nav),
  mantendo toda a lógica client atual dentro dele.
- Conteúdo das páginas internas não muda de lógica; um novo wrapper de card (`bg-paper`, borda
  `border-line`, `rounded-lg`, padding) passa a envolver o `children` no shell, para dar a
  separação visual em blocos sem precisar editar cada página individualmente.

### 2. Logo configurável

- Novo slug de conteúdo `"identidade-visual"` em `SITE_CONTENT_SLUGS` /
  `SITE_CONTENT_SCHEMAS`, com schema:
  ```ts
  export const identidadeVisualContentSchema = z.object({
    logoDark: z.string().min(1).nullable().default(null),
    logoLight: z.string().min(1).nullable().default(null),
  });
  ```
- Nova página `/admin/conteudo/identidade-visual` (grupo "Configurações gerais" na página-índice de
  Conteúdo), com dois `PhotoUploadField` (um por variante), seguindo exatamente o padrão de
  `conteudo/presentes/actions.ts` (`resolvePhotoField` por campo, `updateSiteContentUseCase`,
  `revalidatePath` nas rotas afetadas: `/`, `/admin/conteudo/identidade-visual`).
- `Monogram.tsx` deixa de ser puramente estático: passa a receber `logoDark`/`logoLight` (URLs ou
  `null`) como props, resolvidas no server (via `getSiteContentOrDefault("identidade-visual", ...)`)
  nos pontos onde é usado (`Header`, `MobileMenu`, `Footer` — os que hoje importam `Monogram`
  diretamente passam a buscar o conteúdo, ou recebem via um Server Component pai que já carrega
  layout data). Fallback: `logoDark ?? "/images/logo.png"`, `logoLight ?? "/images/logo-light.png"`.
- `ResendEmailGateway`/`templates.ts` (uso do logo nos e-mails) passa a receber a URL do logo
  escuro resolvida da mesma forma, com o mesmo fallback estático.

### 3. Integrações em abas

- `src/app/admin/(protected)/integracoes/page.tsx` passa a renderizar um novo Client Component
  `IntegracoesTabs` que recebe todos os dados já carregados (`summary`) e decide o que mostrar por
  aba via `useState` local (sem mudar rota — não precisa de URL param, é troca simples de estado
  client, já que não há necessidade de link direto para uma aba específica) **exceto** quando
  `resetToken` está presente na URL, caso em que a aba "Segurança" abre por padrão.
- Abas e conteúdo:
  - **Pagamento:** `PaymentProviderForm` sempre; abaixo, `MercadoPagoTokenForm` só se
    `summary.activePaymentProvider === "mercado_pago"`. (Infinite Pay já não tem um form de token
    separado — o campo de handle já vive dentro do próprio `PaymentProviderForm`, condicionado à
    escolha do radio; nada muda aí.)
  - **Notificações:** `ResendApiKeyForm`.
  - **Segurança:** `ResetSecretKeyWithTokenForm` (se `resetToken` presente) + `SecretKeyForm`.
- Nenhuma mudança nas server actions existentes — é puramente reorganização de apresentação.

## Testes

- `layout.test.tsx` existente é atualizado para cobrir o novo `AdminShell`/header (e-mail do
  usuário, breadcrumb) sem quebrar as asserções de navegação já cobertas.
- Novo teste para a página/action de identidade visual, seguindo o padrão de
  `conteudo/presentes` (upload, remoção, fallback quando nulo).
- `Monogram.test.tsx` ganha casos para prop de URL custom vs. fallback estático.
- Novo teste para `IntegracoesTabs` cobrindo: exibição condicional do form do provedor ativo, e
  abertura automática da aba Segurança quando `resetToken` está na URL.
