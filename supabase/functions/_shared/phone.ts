import { parsePhoneNumberFromString } from "libphonenumber-js";

export const ECOWAS_ISO = new Set(["BJ", "CV", "CI", "GM", "GH", "GN", "GW", "LR", "NG", "SN", "SL", "TG"]);

export function validateEcowasPhone(phoneValue: unknown, countryValue: unknown): { e164: string; country: string } {
  if (typeof phoneValue !== "string" || typeof countryValue !== "string" || !ECOWAS_ISO.has(countryValue)) {
    throw new Error("UNSUPPORTED_COUNTRY_OR_PHONE");
  }
  const parsed = parsePhoneNumberFromString(phoneValue);
  if (!parsed || !parsed.isValid() || parsed.number !== phoneValue || parsed.country !== countryValue) {
    throw new Error("INVALID_WHATSAPP_NUMBER");
  }
  return { e164: parsed.number, country: parsed.country };
}
