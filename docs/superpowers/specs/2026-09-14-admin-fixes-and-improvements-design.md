# Ajustes no RSVP e no painel administrativo — Design

Data: 2026-09-14

## Contexto

Lista de 7 ajustes solicitados pelo usuário, cobrindo um bug de exibição no RSVP público e seis melhorias no painel administrativo (`/admin`). Itens são independentes entre si e podem ser implementados em paralelo.

## 1. Bug de exibição no RSVP (apelido antes do nome)

**Onde:** `src/components/rsvp/RsvpSearch.tsx`

Hoje, em três lugares o apelido (`nickname`) aparece como texto principal e o nome completo (`fullName`) aparece pequeno entre parênteses — o usuário quer o inverso, para conseguir diferenciar convidados de mesmo nome pelo apelido, mas com o nome completo como referência principal.

- **Lista de sugestões principal** (linhas ~205-219): trocar para nome completo em tamanho normal, seguido do apelido pequeno e discreto (só quando existir e for diferente do nome).
- **Lista de sugestões de acompanhante** (`CompanionNameField`, linhas ~66-82): mesma troca.
- **Tela de saudação pós-seleção** (linhas ~228-241): hoje mostra o apelido em destaque (`font-script text-2xl`) e depois "`{displayName}`? Que bom que você apareceu!" onde `displayName` prioriza o apelido. Por pedido explícito do usuário, essa tela **não deve mais exibir o apelido** — usar sempre o primeiro nome do `fullName` (mesma lógica de fallback que já existe quando não há apelido).

Função `displayNameFor` continua existindo para os outros usos (ex: input de busca após seleção), mas os pontos de exibição em lista passam a montar `fullName` + apelido pequeno diretamente, e a tela de saudação usa só o primeiro nome.

## 2. Sincronização manual e automática de pagamentos Infinite Pay

**Problema real:** em produção, um pagamento foi confirmado na Infinite Pay mas o webhook não atualizou nosso sistema — nem o status do presente nem o da contribuição foram atualizados.

**API confirmada:** `POST https://api.checkout.infinitepay.io/payment_check` com corpo `{ handle, order_nsu }` (nosso `order_nsu` é sempre o id do presente, já armazenado em `gifts.infinite_pay_order_nsu`). Resposta inclui `{ success, paid, paid_amount, ... }`.

⚠️ **Risco assumido:** a documentação pública sugere que `transaction_nsu`/`slug` também podem ser aceitos/necessários em alguns casos (múltiplas tentativas de pagamento pro mesmo pedido). Como não temos certeza absoluta e o caso de uso principal é justamente contribuições que nunca chegaram a gravar `transaction_nsu` (porque o webhook falhou), a implementação vai chamar com `order_nsu` apenas. Cada contribuição é processada de forma isolada — uma falha em uma não impede as demais, e cada erro é logado com o id da contribuição para investigação rápida.

**Componentes:**
- `InfinitePayGateway.checkPaymentStatus(orderNsu): Promise<{ paid: boolean; paidAmount?: number }>` — novo método.
- `SyncInfinitePayPaymentsUseCase`: busca todas as `gift_contributions` com `status = pending` e `paymentProvider = infinite_pay` (via `findAll()` + filtro, escala é pequena), consulta cada uma, e quando `paid: true` delega para o `ConfirmGiftPaymentUseCase` já existente (reaproveita toda a lógica de e-mail de agradecimento, marcação do presente como pago, revalidação de cache). Retorna um resumo (`{ checked, updated, errors }`) para feedback na UI.
- **Botão "Atualizar status de pagamento"** nas páginas **Pagamentos** e **Presentes** (mesmo texto nos dois lugares), disparando a rotina sob demanda via server action e mostrando o resumo do resultado.
- **Rota de cron** `/api/cron/sync-infinitepay-payments`, seguindo o mesmo padrão de autenticação do cron existente (header `Authorization: Bearer ${CRON_SECRET}`), registrada em `vercel.json`:
  ```json
  { "path": "/api/cron/sync-infinitepay-payments", "schedule": "0 * * * *" }
  ```

## 3. Convidados confirmados ordenados por data de confirmação

- Nova coluna `confirmed_at timestamptz` na tabela `guests` (migration nova).
- `ConfirmRsvpUseCase` grava essa data quando `attendanceStatus` passa a `confirmed` (não altera em outras transições).
- Repositório (`SupabaseGuestRepository`) expõe `confirmedAt` na entidade `Guest` e na listagem.
- `GuestsTable` (admin): quando o filtro de status é "Confirmado" (ou sempre, como coluna adicional ordenável), permite ordenar por data de confirmação, mais recente primeiro por padrão.

## 4. Coluna de comprador + data de compra na tabela de Presentes

- Ao montar a lista de presentes para o admin, juntar a contribuição **aprovada** de cada presente `paid` (via `GiftContributionRepository.findApproved()`, já existe) para obter `guestName` e `createdAt` da contribuição.
- `GiftsTable`: novas colunas "Comprado por" e "Data da compra" (vazias/"—" quando o presente não foi pago).
- Nova opção de ordenação "Data do presente recebido" (além da ordenação atual por data de cadastro do presente).

## 5. Convidados: ordenar por nome, nome como link, edição rápida de Acompanhantes

- Cabeçalho "Nome" na `GuestsTable` vira clicável, alternando ordenação asc/desc por `fullName`.
- O nome do convidado (hoje texto puro) vira `<Link href="/admin/convidados/[id]">`, igual ao padrão já usado na coluna "Nome" de `GiftsTable`.
- Coluna "Acompanhantes": duplo clique na célula troca para um `<input type="number">` inline com dois ícones ao lado — ✓ (salvar) e ✕ (cancelar). Salvar chama uma nova server action `updateGuestCompanionsCountAction(guestId, count)` que atualiza só esse campo (sem passar pelo formulário completo de edição) e revalida a lista.

## 6. Mensagens ordenadas por mais recente, com opção de ordenar

- A página de Mensagens usa `guest.confirmed_at` (novo campo do item 3) como data da mensagem, já que a mensagem é deixada no momento da confirmação.
- Lista ordenada por padrão da mais nova para a mais antiga, com um controle para inverter a ordem.

## 7. Dashboard mobile: cards ocupando a largura total

- `DashboardStats.tsx`: `StatGrid` troca `grid-cols-2 sm:grid-cols-3` por `grid-cols-1 sm:grid-cols-3`. No mobile cada card ocupa 100% da largura (1 coluna); a partir do breakpoint `sm` volta a 3 colunas, como hoje.

## Escopo fora deste spec

- Não inclui alteração no fluxo de criação de link de pagamento nem no webhook existente da Infinite Pay — a sincronização é um mecanismo complementar de reconciliação.
- Não inclui paginação/infinite scroll novo nas tabelas além do que já existe.
