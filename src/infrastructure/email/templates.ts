export interface EmailContent {
  subject: string;
  html: string;
}

function ctaButton(label: string, url: string): string {
  return `<p><a href="${url}" style="display: inline-block; background: #4a5335; color: #feffed; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-family: 'Inter', Helvetica, Arial, sans-serif; font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase;">${label}</a></p>`;
}

export function reservationConfirmationEmail(params: {
  guestName: string;
  giftName: string;
  formattedDate: string;
  checkoutUrl: string;
}): EmailContent {
  return {
    subject: `Reserva confirmada: ${params.giftName} 🎁`,
    html: `
      <p>Oi ${params.guestName}!</p>
      <p>Reservamos <strong>${params.giftName}</strong> para você, com pagamento previsto para ${params.formattedDate}.</p>
      <p>Quando quiser, é só clicar no link abaixo para concluir o pagamento. Vamos te lembrar mais perto da data, sem pressa!</p>
      ${ctaButton("Pagar agora", params.checkoutUrl)}
      <p>Com carinho,<br/>Stéfanie &amp; Jonatas</p>
    `,
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
    html: `
      <p>Oi ${params.guestName}!</p>
      <p>Passando para lembrar que você reservou <strong>${params.giftName}</strong>, com pagamento previsto para ${params.formattedDate}.</p>
      <p>Se ainda não pagou e quiser fazer isso agora, é só clicar aqui — sem pressa nenhuma, é só um lembrete carinhoso!</p>
      ${ctaButton("Pagar agora", params.checkoutUrl)}
      <p>Com carinho,<br/>Stéfanie &amp; Jonatas</p>
    `,
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
    html: `
      <p>Oi ${params.guestName}!</p>
      <p>Estamos muito felizes que você vai estar com a gente no dia ${params.formattedWeddingDate}.</p>
      <p>Se quiser nos ajudar a começar essa nova fase, preparamos uma lista de presentes com carinho — mas o mais importante é ter você lá com a gente!</p>
      ${ctaButton("Ver lista de presentes", params.giftsUrl)}
      <p>Com carinho,<br/>Stéfanie &amp; Jonatas</p>
    `,
  };
}

export function weddingDayEmail(params: { guestName: string }): EmailContent {
  return {
    subject: "Hoje é o grande dia! 💍",
    html: `
      <p>Oi ${params.guestName}!</p>
      <p>Hoje é o dia do nosso casamento e queremos muito aproveitar cada momento ao lado de quem a gente ama.</p>
      <p>Mal podemos esperar para te ver na cerimônia!</p>
      <p>Com todo carinho,<br/>Stéfanie &amp; Jonatas</p>
    `,
  };
}

export function paymentThankYouEmail(params: { guestName: string; giftName: string }): EmailContent {
  return {
    subject: `Muito obrigado pelo carinho! 💛`,
    html: `
      <p>Oi ${params.guestName}!</p>
      <p>Recebemos certinho o seu presente, <strong>${params.giftName}</strong> — muito obrigado pelo carinho e por fazer parte desse momento com a gente!</p>
      <p>Com todo carinho,<br/>Stéfanie &amp; Jonatas</p>
    `,
  };
}
