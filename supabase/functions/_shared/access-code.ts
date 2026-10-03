const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ACCESS_CODE_RE = /^(?:[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}|[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{16})$/;

export function isValidAccessCode(value: string): boolean {
  return ACCESS_CODE_RE.test(value);
}

export function generateAccessCode(): string {
  const random = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(random, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}
