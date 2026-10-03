const ADMIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ADMIN_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{32}$/;
const ADMIN_CODE_HASH_PREFIX = "maison-karidja:admin-code:v1:";

export function isValidAdminCode(value: string): boolean {
  return ADMIN_CODE_PATTERN.test(value);
}

export function generateAdminCode(): string {
  const random = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(random, (byte) => ADMIN_CODE_ALPHABET[byte % ADMIN_CODE_ALPHABET.length]).join("");
}

export async function hashAdminCode(value: string): Promise<string> {
  const normalized = value.trim().toUpperCase();
  if (!isValidAdminCode(normalized)) throw new Error("ADMIN_CODE_INVALID");
  const bytes = new TextEncoder().encode(`${ADMIN_CODE_HASH_PREFIX}${normalized}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
