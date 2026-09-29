import { getCountryCallingCode, type CountryCode } from "libphonenumber-js";

// Current ECOWAS list verified against the Commission (12 Member States):
// https://www.ecowas.int/careers/
// Burkina Faso, Mali and Niger withdrew effective 29 January 2025:
// https://www.ecowas.int/session-extraordinaire-du-conseil-des-ministres-de-la-cedeao-sur-le-plan-de-contingence-et-les-modalites-de-retrait-du-burkina-faso-du-mali-et-du-niger-de-la-cedeao/?lang=fr
const MEMBER_STATES = [
  { iso: "BJ", label: "Bénin", flag: "🇧🇯" },
  { iso: "CV", label: "Cabo Verde", flag: "🇨🇻" },
  { iso: "CI", label: "Côte d’Ivoire", flag: "🇨🇮" },
  { iso: "GM", label: "Gambie", flag: "🇬🇲" },
  { iso: "GH", label: "Ghana", flag: "🇬🇭" },
  { iso: "GN", label: "Guinée", flag: "🇬🇳" },
  { iso: "GW", label: "Guinée-Bissau", flag: "🇬🇼" },
  { iso: "LR", label: "Libéria", flag: "🇱🇷" },
  { iso: "NG", label: "Nigeria", flag: "🇳🇬" },
  { iso: "SN", label: "Sénégal", flag: "🇸🇳" },
  { iso: "SL", label: "Sierra Leone", flag: "🇸🇱" },
  { iso: "TG", label: "Togo", flag: "🇹🇬" },
] as const;

export type EcowasIso = (typeof MEMBER_STATES)[number]["iso"];

export const ECOWAS_COUNTRIES = MEMBER_STATES.map((country) => ({
  ...country,
  iso: country.iso as CountryCode,
  dialCode: `+${getCountryCallingCode(country.iso as CountryCode)}`,
}));

export function isEcowasCountry(value: string): value is EcowasIso {
  return MEMBER_STATES.some((country) => country.iso === value);
}
