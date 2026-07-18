# Stéfanie & Jonatas — Site de Casamento

Site do casamento de Stéfanie e Jonatas: confirmação de presença (RSVP), lista de presentes com
pagamento via Mercado Pago e painel administrativo para acompanhar convidados e presentes.

## Stack

- **Next.js** (App Router, TypeScript, Tailwind CSS) — Mobile First
- **Arquitetura Limpa**: `src/domain` (entidades e ports) → `src/application` (casos de uso,
  testados com repositórios fake) → `src/infrastructure` (Supabase, Mercado Pago) → `app/`
  (rotas, Server Actions e componentes)
- **Supabase** (Postgres + Auth) como backend
- **Mercado Pago (Checkout Pro)** para os pagamentos da lista de presentes
- **Vitest + Testing Library** para os testes unitários (TDD)

## Como rodar localmente

```bash
npm install
npm run test      # suíte de testes (unitária)
npm run lint       # lint
npm run dev        # servidor de desenvolvimento em http://localhost:3000
```

Sem as variáveis de ambiente configuradas, o site funciona normalmente (Home, Nossa História,
Dicas e Instruções, Álbum de Fotos) e as páginas que dependem do backend (Lista de Presentes,
RSVP, Painel Administrativo) mostram um aviso de "configuração pendente" em vez de quebrar.

## Configurando o backend

1. Copie `.env.example` para `.env.local` e preencha os valores.
2. **Supabase**: crie um projeto em [supabase.com](https://supabase.com), rode o SQL de
   `supabase/migrations/0001_init.sql` (SQL Editor do projeto) e copie a URL, a `anon key` e a
   `service_role key` (Project Settings → API) para o `.env.local`.
3. Crie o primeiro usuário administrador: em Authentication → Users, crie um usuário (e-mail e
   senha) e depois insira uma linha em `admin_users` com o mesmo `id` desse usuário — só quem
   estiver nessa tabela consegue entrar em `/admin`.
4. **Mercado Pago**: crie uma aplicação em
   [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers), copie o
   *Access Token* de produção para `MERCADOPAGO_ACCESS_TOKEN`.
5. Defina `NEXT_PUBLIC_SITE_URL` com a URL pública do site (usada nas URLs de retorno e no
   webhook do Mercado Pago).

## Domínio e deploy

O domínio planejado é `sjcasamento.site` ou `stefaniejonatas.site`. Recomendado fazer o deploy na
[Vercel](https://vercel.com) (suporte nativo a Next.js/Server Actions): importe o repositório,
configure as mesmas variáveis do `.env.local` no painel do projeto e aponte o domínio nas
configurações de Domains do projeto na Vercel.

## O que falta preencher

- Fotos reais do casal (hoje há placeholders em todo o site)
- Textos definitivos da história, data/local da cerimônia e endereços de hospedagem
- Lista de presentes definitiva (cadastrada pelo painel `/admin/presentes`)
