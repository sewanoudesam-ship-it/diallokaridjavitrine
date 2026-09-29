export function formatPrice(amount: number, currency: string, locale = "fr-FR"): string {
  if (!Number.isFinite(amount) || amount < 0) return "";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "code" }).format(amount);
  } catch {
    return `${new Intl.NumberFormat(locale).format(amount)} ${currency}`;
  }
}
