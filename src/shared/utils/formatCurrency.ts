const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrency(amountInBrl: number): string {
  return currencyFormatter.format(amountInBrl);
}
