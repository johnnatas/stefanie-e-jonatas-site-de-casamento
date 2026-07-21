export interface EmailContent {
  subject: string;
  html: string;
}

function wrapHtml(bodyHtml: string): string {
  return `<div style="font-family: sans-serif; color: #2f3e2e; line-height: 1.6;">${bodyHtml}</div>`;
}

function ctaButton(label: string, url: string): string {
  return `<p><a href="${url}" style="display: inline-block; background: #4a5d3a; color: #fff; padding: 10px 20px; border-radius: 999px; text-decoration: none;">${label}</a></p>`;
}

export function reservationConfirmationEmail(params: {
  guestName: string;
  giftName: string;
  formattedDate: string;
  checkoutUrl: string;
}): EmailContent {
  return {
    subject: `Reserva confirmada: ${params.giftName} 🎁`,
    html: wrapHtml(`
      <p>Oi ${params.guestName}!</p>
      <p>Reservamos <strong>${params.giftName}</strong> para você, com pagamento previsto para ${params.formattedDate}.</p>
      <p>Quando quiser, é só clicar no link abaixo para concluir o pagamento. Vamos te lembrar mais perto da data, sem pressa!</p>
      ${ctaButton("Pagar agora", params.checkoutUrl)}
      <p>Com carinho,<br/>Stéfanie &amp; Jonatas</p>
    `),
  };
}

export function reservationReminderEmail(params: {
  guestName: string;
  giftName: string;
  formattedDate: string;
  checkoutUrl: string;
}): EmailContent {
  return {
    subject: `Lembrete: sua reserva de ${params.giftName}`,
    html: wrapHtml(`
      <p>Oi ${params.guestName}!</p>
      <p>Passando para lembrar que você reservou <strong>${params.giftName}</strong>, com pagamento previsto para ${params.formattedDate}.</p>
      <p>Se ainda não pagou e quiser fazer isso agora, é só clicar aqui — sem pressa nenhuma, é só um lembrete carinhoso!</p>
      ${ctaButton("Pagar agora", params.checkoutUrl)}
      <p>Com carinho,<br/>Stéfanie &amp; Jonatas</p>
    `),
  };
}

export function giftSuggestionEmail(params: {
  guestName: string;
  daysUntilWedding: number;
  formattedWeddingDate: string;
  giftsUrl: string;
}): EmailContent {
  return {
    subject: `Faltam ${params.daysUntilWedding} dias para o nosso casamento!`,
    html: wrapHtml(`
      <p>Oi ${params.guestName}!</p>
      <p>Estamos muito felizes que você vai estar com a gente no dia ${params.formattedWeddingDate}.</p>
      <p>Se quiser nos ajudar a começar essa nova fase, preparamos uma lista de presentes com carinho — mas o mais importante é ter você lá com a gente!</p>
      ${ctaButton("Ver lista de presentes", params.giftsUrl)}
      <p>Com carinho,<br/>Stéfanie &amp; Jonatas</p>
    `),
  };
}

export function weddingDayEmail(params: { guestName: string }): EmailContent {
  return {
    subject: "Hoje é o grande dia! 💍",
    html: wrapHtml(`
      <p>Oi ${params.guestName}!</p>
      <p>Hoje é o dia do nosso casamento e queremos muito aproveitar cada momento ao lado de quem a gente ama.</p>
      <p>Mal podemos esperar para te ver na cerimônia!</p>
      <p>Com todo carinho,<br/>Stéfanie &amp; Jonatas</p>
    `),
  };
}
