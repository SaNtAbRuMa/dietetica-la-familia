const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return arsFormatter
    .format(value)
    .replace(/\u00a0/g, " ")
    .replace(/^\$\s*/, "$ ");
}
