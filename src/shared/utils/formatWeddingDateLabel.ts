const formatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatWeddingDateLabel(iso: string): string {
  return formatter.format(new Date(iso));
}
