---
target: /admin/presentes + /admin/presentes/novo
total_score: 27
p0_count: 0
p1_count: 2
timestamp: 2026-07-21T02-09-44Z
slug: src-app-admin-protected-presentes
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Nenhuma contagem de resultados no filtro da lista; nenhuma confirmação visível pós-salvar na tela de criação além do redirect implícito |
| 2 | Match System / Real World | 4 | Linguagem em português claro, sem jargão não explicado |
| 3 | User Control and Freedom | 2 | Formulário de criação não tem "Cancelar" — só volta pelo navegador ou clicando na nav |
| 4 | Consistency and Standards | 4 | Toda página de lista/formulário segue exatamente o mesmo padrão visual |
| 5 | Error Prevention | 3 | Gate de chave secreta para trocar preço é forte prevenção; falta aviso de alterações não salvas ao sair |
| 6 | Recognition Rather Than Recall | 2 | Campo "Categoria" é texto livre — obriga o admin a lembrar a grafia exata, mesmo o app já sabendo a lista completa (usada no próprio filtro de `GiftsTable`) |
| 7 | Flexibility and Efficiency of Use | 2 | Sem duplicar/bulk-create para presentes similares; aceitável dado o porte da lista, mas é uma lacuna real |
| 8 | Aesthetic and Minimalist Design | 4 | Limpo, sem ruído, consistente com "delicados porém confiantes" do DESIGN.md |
| 9 | Error Recovery | 3 | Mensagens de erro específicas (ex: chave secreta inválida), mas posicionadas genericamente no fim do form, não junto ao campo |
| 10 | Help and Documentation | 1 | Zero ajuda contextual em qualquer lugar (ex: por que a chave secreta existe) |
| **Total** | | **27/40** | **Acceptable — no topo da faixa, perto de Good** |

## Anti-Patterns Verdict

**LLM assessment**: Não é "AI slop" no sentido clássico (sem gradiente em texto, sem hero-metric template, sem glassmorphism, sem card grid genérico). É funcional e consistente com o design system documentado. Mas é genérico no sentido produto: nenhuma página tem estados de carregamento além de um "Carregando..." em texto plano, o formulário de criação não tem nenhuma seção/agrupamento visual, e a lista não confirma quantos resultados foram encontrados. Isso não é "parece feito por IA" — é "parece o primeiro rascunho, não a versão polida".

**Deterministic scan**: `detect.mjs` retornou `[]` (zero achados) nos 4 arquivos-alvo, e a busca manual por valores de espaçamento arbitrário (`gap-[`, `p-[`, `m-[`, `z-[`) também não encontrou nada. Confirma que o problema aqui é de hierarquia/agrupamento/interação, não de CSS malformado — exatamente o tipo de coisa que o scanner mecânico não consegue pegar sozinho.

**Visual overlays**: não disponíveis nesta execução — degradado para single-context (ver banner no início), sem navegador/servidor de visualização acionado.

## Overall Impression

O fluxo funciona e é visualmente consistente com o resto do painel, mas trata um formulário de 6-7 campos como uma lista plana sem nenhuma pausa visual, e desperdiça uma oportunidade real: o app já sabe a lista de categorias existentes (usada no próprio filtro da tabela) mas não a reaproveita no formulário, forçando o admin a lembrar a grafia exata. A maior oportunidade única é dar ao campo "Chave secreta" — o momento de maior risco de toda a superfície admin — um tratamento visual e explicativo condizente com sua importância, hoje ele é indistinguível de "Categoria".

## What's Working

- **O gate de chave secreta para alteração de preço** é uma prevenção de erro genuína e incomum — a maioria das ferramentas admin nem tenta isso.
- **Progressive disclosure real**: o campo de chave secreta e o link de pagamento só aparecem ao editar um presente existente, nunca ao criar um novo. Não é um formulário copiado/colado sem pensar.
- **O autopreenchimento por link de produto** reduz de verdade a carga da tarefa "cadastrar presente" — cola o link, o formulário se preenche sozinho. Feature genuinamente boa, não table-stakes.

## Priority Issues

**[P1] Campo "Categoria" força recall ao invés de reconhecimento**
- **Por que importa**: O admin precisa lembrar a grafia exata de categorias já usadas (ex: "cozinha" vs "Cozinha" vs "Cozinha "), arriscando duplicar categorias por erro de digitação — e o `GiftsTable` já prova que o app sabe a lista completa (`categories = useMemo(...)` no filtro), só não a reaproveita no formulário.
- **Fix**: trocar `<input>` por um `<select>`/combobox populado com as categorias já cadastradas, com uma opção "+ Nova categoria" para os casos genuinamente novos.
- **Comando sugerido**: implementação direta (nenhum comando do Impeccable cobre "adicionar autocomplete a um campo" especificamente — mais próximo seria `/impeccable clarify` pela dimensão de reduzir ambiguidade de input).

**[P1] `GiftForm` não tem nenhum agrupamento visual entre os 6-7 campos**
- **Por que importa**: falha 3 dos 8 itens do checklist de carga cognitiva (chunking ≤4 por grupo, agrupamento por proximidade, hierarquia visual) — nome/descrição/foto (o quê), valor/categoria (logística) e chave-secreta/link-de-pagamento (administrativo) são conceitualmente distintos mas renderizam como uma única coluna contínua com `gap-4` uniforme.
- **Fix**: dividir em 2-3 blocos com respiro maior entre eles (`gap-8` entre blocos, `gap-4` dentro do bloco), talvez com um rótulo pequeno por bloco, seguindo o mesmo padrão de agrupamento já aplicado na nav do admin.
- **Comando sugerido**: `/impeccable layout admin/presentes/novo`.

**[P2] Nenhuma saída explícita ("Cancelar") no formulário de criação**
- **Por que importa**: viola Controle e Liberdade do Usuário (heurística 3) — a única forma de desistir é o botão voltar do navegador ou clicar em outro item da nav, sem confirmação alguma. Um admin que preenche metade do formulário e muda de ideia não tem uma saída clara.
- **Fix**: adicionar um link "Cancelar" ao lado do botão de submit, voltando para `/admin/presentes`.
- **Comando sugerido**: incluir no mesmo passe de `/impeccable layout admin/presentes/novo`.

**[P2] Chave secreta recebe o mesmo tratamento visual que qualquer outro campo**
- **Por que importa**: é o único momento de alto risco de toda a superfície admin (controla mudança de valores financeiros), mas visualmente é idêntico a "Categoria" — mesma label, mesmo input, mesma cor. Nenhuma reassurance sobre por que existe ou o que acontece se for informada errado (além do erro genérico pós-submit).
- **Fix**: diferenciar visualmente (leve realce de fundo, ou um ícone) e adicionar uma microcopy de uma linha explicando o propósito.
- **Comando sugerido**: `/impeccable clarify admin/presentes` (copy) — opcionalmente seguido de `/impeccable colorize` se quiser reforçar com cor estratégica.

**[P3] Lista de presentes não mostra contagem de resultados nem orientação além de "Nenhum presente encontrado"**
- **Por que importa**: heurística 1 (visibilidade de status) — ao filtrar, o admin não sabe se 3 ou 30 itens correspondem sem contar visualmente.
- **Fix**: adicionar um texto pequeno "X de Y presentes" acima da tabela.
- **Comando sugerido**: `/impeccable clarify admin/presentes`.

## Persona Red Flags

**Alex (Power User)**: Cadastrar um presente novo exige digitar a categoria manualmente toda vez, mesmo já tendo digitado "cozinha" ou "casa" dezenas de vezes antes — sem autocomplete, sem memória. Também não existe duplicar/criar-a-partir-de um presente parecido; para cadastrar 5 itens de cozinha similares, cada um precisa ser digitado do zero. Fricção real para quem está montando a lista aos poucos.

**Sam (Usuário Dependente de Acessibilidade)**: O botão "Buscar dados do link" atualiza `linkFetchState.message` no DOM (de "Buscando..." para "Título, valor e imagem encontrados.") sem nenhuma `aria-live` region — um usuário de leitor de tela não é avisado automaticamente quando a busca termina. O campo "Chave secreta" também não usa `aria-describedby` para associar programaticamente o texto de contexto ("obrigatória se alterar o valor") ao input — a associação é só visual/adjacente, então o leitor de tela anuncia apenas "Chave secreta" sem a explicação de quando ela é exigida.

## Minor Observations

- O botão "Buscar dados do link" fica posicionado acima dos campos que ele preenche (nome, valor, imagem) — funciona, mas é uma ordem um pouco invertida (a ferramenta de preenchimento antes do que ela preenche).
- Nenhuma proteção contra perda de dados ao navegar para fora do formulário com campos preenchidos (sem `beforeunload`/confirmação).

## Questions to Consider

- O formulário precisa mesmo ficar em uma coluna só, ou um layout de duas colunas (dados do presente | dados administrativos) aproveitaria melhor o espaço em telas maiores, já que é um painel admin e não um formulário mobile-first?
- Vale a pena um "modo rápido" de cadastro (só nome + valor + categoria, com foto/descrição opcionais depois) para quando o casal está cadastrando vários presentes de uma vez?
