import { runtimeEnv } from "./runtime.ts";

const encoder = new TextEncoder();
export { generateAccessCode, isValidAccessCode } from "./access-code.ts";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function generateAccessToken(): string {
  const random = crypto.getRandomValues(new Uint8Array(32));
  return toBase64(random).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function hashSecret(value: string): Promise<string> {
  const secret = runtimeEnv("CODE_HASH_SECRET");
  if (!secret || encoder.encode(secret).byteLength < 32) throw new Error("CODE_HASH_SECRET_REQUIRED");
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toHex(new Uint8Array(digest));
}

async function encryptionKey(): Promise<CryptoKey> {
  const raw = runtimeEnv("CODE_ENCRYPTION_KEY_B64");
  if (!raw) throw new Error("CODE_ENCRYPTION_KEY_REQUIRED");
  const bytes = fromBase64(raw);
  if (bytes.length !== 32) throw new Error("CODE_ENCRYPTION_KEY_INVALID");
  return crypto.subtle.importKey("raw", new Uint8Array(bytes).buffer, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(value: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), encoder.encode(value));
  return `v1.${toBase64(iv)}.${toBase64(new Uint8Array(ciphertext))}`;
}

export async function decryptSecret(value: string): Promise<string> {
  const [version, ivPart, ciphertextPart] = value.split(".");
  if (version !== "v1" || !ivPart || !ciphertextPart) throw new Error("CIPHERTEXT_INVALID");
  const iv = new Uint8Array(fromBase64(ivPart));
  const ciphertext = new Uint8Array(fromBase64(ciphertextPart));
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await encryptionKey(), ciphertext);
  return new TextDecoder().decode(plaintext);
}

export function pdfSafeText(value: string): string {
  return value.normalize("NFKD").replace(/\p{Diacritic}/gu, "").replace(/[^\x20-\x7E]/g, "?").slice(0, 120);
}
