function toBrasiliaDateOnly(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date);
}

export function daysBetweenBrasiliaDates(from: Date, to: Date): number {
  const fromMidnight = new Date(`${toBrasiliaDateOnly(from)}T00:00:00-03:00`);
  const toMidnight = new Date(`${toBrasiliaDateOnly(to)}T00:00:00-03:00`);
  return Math.round((toMidnight.getTime() - fromMidnight.getTime()) / (24 * 60 * 60 * 1000));
}

export function formatBrasiliaDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(date);
}
