# Product

## Register

brand

## Platform

web

## Users
Convidados do casamento de Stéfanie e Jonatas — família e amigos, majoritariamente acessando pelo celular ao receber o link do convite, muitas vezes pela primeira vez. Chegam para confirmar presença e/ou escolher um presente. Público secundário: o casal, via painel administrativo, para acompanhar RSVPs e presentes.

## Product Purpose
Um convite digital completo que substitui o convite impresso e o grupo de WhatsApp: centraliza as informações do casamento, o RSVP e a lista de presentes com pagamento via Mercado Pago em um único lugar, sem fricção.

## Positioning
Convite, confirmação de presença e presentes em um só lugar — diferente de um convite impresso estático ou de um grupo de WhatsApp disperso, aqui o convidado resolve tudo numa visita só.

## Conversion & proof
- CTA primário: Confirmar presença (RSVP)
- CTA secundário: Ver a lista de presentes / Presentear
- A frase que o visitante deve lembrar depois de 10 segundos: "Esse casamento é caloroso e íntimo, e fui convidado a fazer parte dele de verdade."
- Escada de crenças: (1) isso é real, é o casamento de Stéfanie e Jonatas → (2) confirmar presença aqui é rápido e fácil → (3) escolher e pagar um presente também é simples e seguro → (4) vale voltar aqui perto da data para conferir detalhes.
- Prova disponível: não aplicável — convite pessoal/familiar, sem necessidade de prova social.

## Brand Personality
Caloroso, íntimo, elegante. Voz próxima e afetuosa, como em "Com carinho, Stéfanie & Jonatas" — tom mais poético e reflexivo (inspirado em amabillyegabriel.com/pt), fotografia do casal em destaque ao invés de blocos de cor decorativos, e seções com bastante respiro entre si.

## Anti-references
O clichê genérico de site de casamento em série: rosa pastel, cursiva em toda parte, clip-art de flores. amabillyegabriel.com/pt é referência positiva especificamente para tom de texto poético, protagonismo da fotografia e respiro no layout — não para a paleta de cores (mantém-se moss/forest) nem para a tipografia (mantém-se Playfair/Alex Brush/Inter).

## Design Principles
Converter sem fricção: cada tela mantém a confirmação de presença e o ato de presentear a um passo claro de distância. Mostrar o casal, não só descrever: fotografia real carrega o peso emocional, não blocos de cor decorativos. Calor em vez de clichê: tom íntimo e literário, nunca o boilerplate genérico de site de casamento. Respeitar o tempo e o dispositivo do convidado: mobile-first, formulários curtos, já que a maioria chega pelo celular a partir de um link compartilhado.

## Accessibility & Inclusion
Sem nível formal de WCAG exigido, mas manter contraste sólido de cor e boa legibilidade mobile-first, considerando convidados de todas as idades lendo pelo celular.

## Secondary Surface: Painel Administrativo

O painel em `/admin/*` é uma superfície secundária de registro **product** (design serve o produto), usada só pelo casal (Stéfanie & Jonatas) para administrar o site: gerenciar convidados e RSVPs, cadastrar/editar presentes, acompanhar pagamentos, editar o conteúdo público (textos, fotos, data) e configurar integrações (Mercado Pago, Resend, chave secreta).

**Problema conhecido**: a navegação está crua — 6 itens soltos numa lista plana e sem hierarquia (Dashboard, Convidados, Presentes, Pagamentos, Conteúdo, Integrações), sem agrupamento por assunto, sem indicar onde o usuário está, sem atalhos entre telas relacionadas (ex: presentes ↔ pagamentos). Precisa de uma reorganização de informação — agrupar por tema (ex: "Convidados", "Presentes & Pagamentos", "Conteúdo do site", "Configurações"), indicar a seção ativa, e melhorar a hierarquia visual geral do shell administrativo.

Herda a paleta moss/forest do site público, mas aqui a prioridade é clareza operacional e eficiência de tarefas, não impacto emocional.
