---
name: Stéfanie & Jonatas — Site de Casamento
description: Convite digital do casamento, com RSVP e lista de presentes, em tom caloroso e íntimo.
colors:
  moss: "#4a5335"
  forest: "#242a16"
  paper: "#feffed"
  paper-soft: "#e3e8c8"
  mist: "#f8f8f8"
  line: "#d0d7aa"
  danger: "#b3413a"
typography:
  display:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "clamp(2.5rem, 6vw, 4rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "normal"
  headline:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "clamp(1.5rem, 3vw, 2.25rem)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "normal"
  script:
    fontFamily: "Alex Brush, cursive"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.2em"
rounded:
  md: "6px"
  lg: "8px"
  full: "999px"
components:
  button-primary:
    backgroundColor: "transparent"
    textColor: "{colors.moss}"
    typography: "{typography.script}"
    rounded: "{rounded.full}"
    padding: "12px 32px"
  button-primary-hover:
    backgroundColor: "{colors.moss}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.forest}"
    rounded: "{rounded.full}"
    padding: "12px 32px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.forest}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  input-focus:
    backgroundColor: "{colors.paper}"
---

# Design System: Stéfanie & Jonatas — Site de Casamento

## 1. Overview

**Creative North Star: "A Casa do Jardim ao Mar"**

O casamento acontece numa casa com jardim, com uma muretinha que dá acesso direto à praia — decoração essencialmente verde e branco, terno bege bem clarinho, madrinhas em verde e rosa pastel. O site existe para colocar o convidado dentro dessa cena antes mesmo de chegar lá: verdes orgânicos (moss/forest) como base, papel quente ao invés de branco frio, uma caligrafia manuscrita (Alex Brush) que aparece nos momentos certos como se fosse assinada à mão, e cards em formato de arco (ArchFlipCard) que remetem a janelas/portais de jardim, não a caixas de app. Nada aqui pode parecer SaaS: sem sombras, sem gradientes, sem glassmorphism, sem cards genéricos empilhados — o site é chapado como uma folha de papel bem cuidada, e a profundidade vem de cor e contraste, não de efeito.

O site rejeita explicitamente o clichê de site de casamento em série (rosa pastel raso, cursiva em toda parte, clip-art de flores) — a cursiva (Alex Brush) é usada com intenção, não decorativamente em todo canto, e o verde profundo do moss/forest evita o "clichê romântico açucarado" mesmo mantendo calor.

**Key Characteristics:**
- Base verde-moss/forest profunda, papel quente (não branco puro) como fundo
- Serifada elegante (Playfair Display) para hierarquia + script manuscrito (Alex Brush) como assinatura, não decoração
- Totalmente chapado — zero `box-shadow` em qualquer componente
- Cards em arco (topo arredondado a 999px, base reta) como forma assinatura, não retângulos genéricos
- Botões-pílula (`rounded-full`) com contorno fino, preenchendo de cor só no hover

## 2. Colors

Paleta enraizada na cena real da cerimônia: jardim, mar, verde-e-branco — não uma paleta "romântica" genérica escolhida a esmo.

### Primary
- **Moss** (`#4a5335`): o verde-oliva profundo que carrega toda ação e intenção — CTAs, links ativos, estados de foco, ícones interativos. É a cor que "faz alguma coisa acontecer" na tela.

### Secondary
- **Forest** (`#242a16`): verde quase-preto, usado como cor de texto principal sobre papel e como fundo de seções de destaque invertidas (rodapé, verso dos ArchFlipCard, hero escuro). Onde Moss age, Forest ancora.

### Neutral
- **Papel** (`#feffed`): fundo principal — branco quente, nunca frio, como papel de carta guardado.
- **Papel Suave** (`#e3e8c8`): verde-sálvia bem claro, usado em seções alternadas (SplitPanel) e superfícies secundárias — o "verso da folha".
- **Névoa** (`#f8f8f8`): cinza neutro claro, uso único na seção "Save the date" da Home — quebra deliberada do verde-sálvia para dar respiro visual entre o hero e o restante da página.
- **Linha** (`#d0d7aa`): sálvia médio, reservado a bordas, divisores e contornos de input — nunca preenchimento.

### Estado
- **Vermelho Terracota** (`#b3413a`): único uso é erro/validação. Nunca decorativo, nunca perto do verde principal.

### Nota — tom vestigial não utilizado
- Existe um token `--color-gold` (`#d4af37`) no CSS herdado de uma era anterior da marca (antes do refresh moss/forest), mas **não é referenciado em nenhum componente hoje**. Não tratar como parte do sistema ativo; considerar remoção em uma limpeza futura.

### Named Rules
**A Regra do Papel Quente.** Nenhum branco puro (`#ffffff`) como fundo de página — sempre Papel (`#feffed`) ou mais quente. Branco puro só aparece pontualmente (ex: header sólido no scroll), nunca como bg de seção de conteúdo.

**A Regra da Cor com Propósito.** Moss só aparece onde algo é clicável ou ativo. Se não é interativo, é Forest, Papel ou Linha — nunca Moss "porque fica bonito".

## 3. Typography

**Display Font:** Playfair Display (com fallback Georgia, serif)
**Body Font:** Inter (com fallback system-ui, sans-serif)
**Script/Assinatura Font:** Alex Brush (cursiva, uso pontual)

**Character:** Uma serifada clássica e confiante contra uma sans neutra e legível — o par "convite impresso + leitura no celular". A cursiva Alex Brush entra como a assinatura manuscrita do casal, nunca como corpo de texto.

### Hierarchy
- **Display** (600, `clamp(2.5rem, 6vw, 4rem)`, 1.1): títulos de hero, "Stéfanie & Jonatas" no topo da Home.
- **Headline** (500, `clamp(1.5rem, 3vw, 2.25rem)`, 1.2): títulos de seção (`h2`/`h3`), sempre Playfair.
- **Script** (400, 1.5rem, itálico): usado apenas no link de navegação ativo (minúsculo, itálico) e em assinaturas/citações como "Com carinho, Stéfanie & Jonatas". Nunca em corpo de texto ou botões primários fora dessa convenção.
- **Body** (400, 0.875rem, 1.6): parágrafos, descrições — limite de leitura confortável em torno de 65-75ch.
- **Label** (400, 0.75rem, tracking 0.2em, uppercase): itens de navegação inativos, eyebrows, tags de status.

### Named Rules
**A Regra da Assinatura.** Alex Brush aparece no máximo uma vez por tela como elemento ativo (o link de navegação atual, uma citação assinada) — nunca como estilo de múltiplos elementos na mesma vista. É uma assinatura, não uma fonte de uso geral.

## 4. Elevation

O sistema é inteiramente chapado — nenhum `box-shadow` existe em nenhum componente do projeto hoje, confirmado por varredura no código. Profundidade e hierarquia vêm exclusivamente de cor de fundo (Papel vs. Papel Suave vs. Forest) e de contraste tipográfico, nunca de sombra, blur ou glassmorphism. Isso é intencional: o site deve parecer uma folha de papel bem cuidada, não uma interface de software.

### Named Rules
**A Regra do Chapado.** Zero `box-shadow` em qualquer estado (default, hover, focus). Se um elemento precisa se destacar, mude a cor de fundo ou o peso da borda — nunca adicione sombra.

## 5. Components

Sensação geral: **delicados porém confiantes** — bordas finas, cantos arredondados suaves, nenhum peso visual excessivo, mas com contraste de cor decidido o suficiente para nunca parecer frágil ou genérico.

### Buttons (PillButton)
- **Shape:** totalmente arredondado (`rounded-full`, 999px) — nunca quadrado ou levemente arredondado.
- **Primary:** contorno fino em Moss, texto em Moss, fundo transparente em repouso; preenche com Moss sólido e texto Papel no hover. Tipografia: Playfair itálico, não uppercase.
- **Secondary:** contorno em Forest a 20% de opacidade, texto Forest a 70% — sobe para Forest sólido no hover.
- **Hover / Focus:** transição de cor suave (`transition-colors`), nunca transform/scale, nunca sombra.

### Cards / Containers
- **Arco assinatura (ArchFlipCard):** topo arredondado a 999px + base em `rounded-lg` (8px) — silhueta de arco/portal de jardim, não retângulo. Vira em 3D no hover/focus (`perspective`, `rotateY(180deg)`) revelando a face de trás em fundo Forest sólido.
- **Painéis (SplitPanel):** sem borda, sem sombra — dividem-se por bloco de cor sólida alternando Papel Suave / Forest, nunca por linha ou sombra.
- **Corner Style padrão:** `rounded-lg` (8px) quando não é o arco assinatura.
- **Border:** só onde funcionalmente necessário (inputs, divisores de seção) — nunca decorativo em cards.

### Inputs / Fields
- **Style:** borda fina em Linha (`#d0d7aa`), fundo Papel, `rounded-md` (6px), texto Forest.
- **Focus:** a borda muda para Moss sólido — sem glow, sem sombra, sem mudança de fundo.
- **Error:** texto/borda em Vermelho Terracota (`#b3413a`), reservado exclusivamente a esse estado.

### Navigation (Header)
- **Itens inativos:** Label (Inter uppercase, tracking 0.2em), a 80% de opacidade da cor de texto corrente, sobe para Moss no hover.
- **Item ativo — assinatura do sistema:** troca inteiramente de registro tipográfico para Script (Alex Brush) itálico, minúsculo, em Moss (ou Papel sobre hero transparente). Nenhum outro projeto "wedding site" faz essa troca de família tipográfica no estado ativo — é a marca registrada da navegação daqui.
- **Mobile:** ícone hamburguer de 3 traços (`h-px`/`bg-current`), sem contorno nem fundo.

## 6. Do's and Don'ts

### Do:
- **Do** usar Papel (`#feffed`) como fundo padrão, nunca branco puro (`#ffffff`) em seções de conteúdo.
- **Do** reservar Moss exclusivamente para elementos interativos/ativos (A Regra da Cor com Propósito).
- **Do** usar Alex Brush como assinatura pontual (nav ativo, citações assinadas), nunca como fonte de corpo ou em múltiplos elementos por tela.
- **Do** manter todo componente chapado — mudar cor de fundo/borda para dar destaque, nunca adicionar `box-shadow`.
- **Do** usar `rounded-full` em todo botão de ação e o arco assinatura (999px topo / 8px base) em cards de destaque temporal (marcos, timeline).

### Don't:
- **Don't** usar rosa pastel genérico, cursiva em todo elemento, ou clip-art de flores — o clichê explícito de site de casamento em série que este projeto rejeita (herdado de PRODUCT.md).
- **Don't** adicionar `box-shadow`, `backdrop-filter` ou glassmorphism em nenhum componente — o sistema é inteiramente chapado por decisão, não por omissão.
- **Don't** usar gradiente em texto (`background-clip: text`) — ênfase vem de peso/tamanho, nunca de gradiente.
- **Don't** empilhar cards genéricos com ícone + título + texto repetidos — quando uma lista precisa de estrutura, preferir o arco assinatura ou o SplitPanel antes de recorrer a uma grade de cards.
- **Don't** reintroduzir o token `--color-gold` em componentes novos — é vestigial e não faz parte do sistema ativo.
