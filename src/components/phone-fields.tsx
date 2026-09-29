"use client";

import { ECOWAS_COUNTRIES } from "@/src/lib/countries";

export function PhoneFields({
  country,
  phone,
  onCountryChange,
  onPhoneChange,
}: {
  country: string;
  phone: string;
  onCountryChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
}) {
  const selected = ECOWAS_COUNTRIES.find((entry) => entry.iso === country);
  return (
    <div className="field field-full">
      <label htmlFor="whatsapp-country">Numéro WhatsApp <span aria-hidden="true">*</span></label>
      <div className="phone-row">
        <select
          id="whatsapp-country"
          value={country}
          onChange={(event) => onCountryChange(event.target.value)}
          autoComplete="country"
          required
          aria-label="Pays et indicatif WhatsApp"
        >
          <option value="">Choisir le pays et l’indicatif</option>
          {ECOWAS_COUNTRIES.map((entry) => (
            <option value={entry.iso} key={entry.iso}>
              {entry.flag} {entry.label} ({entry.dialCode})
            </option>
          ))}
        </select>
        <input
          id="whatsapp-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={phone}
          onChange={(event) => onPhoneChange(event.target.value)}
          placeholder={selected ? `Numéro local ${selected.dialCode}` : "Choisissez d’abord un pays"}
          aria-label="Numéro WhatsApp sans indicatif du pays"
          required
        />
      </div>
      <small>Choisissez d’abord votre pays; son drapeau et son indicatif seront ajoutés au numéro.</small>
    </div>
  );
}
