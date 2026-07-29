export function formatBrazilianPhoneMask(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (digits.length < 2) {
    return `(${ddd}`;
  }

  if (rest.length <= 5) {
    return `(${ddd})${rest}`;
  }

  return `(${ddd})${rest.slice(0, 5)}-${rest.slice(5)}`;
}

export function normalizePhoneToE164(masked: string): string | null {
  if (!masked) return null;

  const digits = masked.replace(/\D/g, "");
  if (digits.length !== 11) return null;

  return `+55${digits}`;
}
