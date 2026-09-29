import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { isEcowasCountry } from "@/src/lib/countries";

export type PhoneValidation = { ok: true; e164: string } | { ok: false; error: string };

export function normalizeEcowasPhone(rawPhone: string, iso: string): PhoneValidation {
  if (!isEcowasCountry(iso)) {
    return { ok: false, error: "Choisissez un pays de la CEDEAO." };
  }
  const parsed = parsePhoneNumberFromString(rawPhone.trim(), iso as CountryCode);
  if (!parsed || !parsed.isValid() || parsed.country !== iso) {
    return { ok: false, error: "Saisissez un numéro WhatsApp valide pour le pays sélectionné." };
  }
  return { ok: true, e164: parsed.number };
}
