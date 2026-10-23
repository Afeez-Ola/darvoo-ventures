import type { Mode, Settings } from "./types";

export const SETTINGS_COLS =
  "accepting_orders,delivery_fee_cents,delivery_fee_far_cents,far_postcodes,booking_days,same_day_cutoff,shipping_fee_cents,free_shipping_from_cents,ship_dispatch_days,delivery_postcode_prefixes,shipping_fee_eu_cents,ship_countries";

/** Mirrors the fee rules in place_order(); the database is the source of truth. */
export function feeFor(mode: Mode, s: Settings | null, subtotal: number, postcode = "", country = "AT") {
  if (!s) return 0;
  if (mode === "delivery") {
    return s.far_postcodes?.includes(postcode.trim()) ? s.delivery_fee_far_cents : s.delivery_fee_cents;
  }
  if (mode === "shipping") {
    if (country !== "AT") return s.shipping_fee_eu_cents;
    if (s.free_shipping_from_cents != null && subtotal >= s.free_shipping_from_cents) return 0;
    return s.shipping_fee_cents;
  }
  return 0;
}

/** Postcode rules: Austria = 4 digits (1010 to 9999); elsewhere letters, digits, spaces and dashes. */
export function postcodeOk(postcode: string, country = "AT") {
  const pc = postcode.trim();
  return country === "AT" ? /^[1-9][0-9]{3}$/.test(pc) : /^[A-Za-z0-9][A-Za-z0-9 -]{1,9}$/.test(pc);
}

/** Country name in the visitor's language, e.g. DE -> "Germany" / "Deutschland". */
export function countryName(code: string, lang: string) {
  try {
    return new Intl.DisplayNames([lang === "de" ? "de" : "en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
