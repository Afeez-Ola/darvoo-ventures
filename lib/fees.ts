import type { Mode, Settings } from "./types";

export const SETTINGS_COLS =
  "accepting_orders,delivery_fee_cents,delivery_fee_far_cents,far_postcodes,booking_days,same_day_cutoff,shipping_fee_cents,free_shipping_from_cents,ship_dispatch_days,delivery_postcode_prefixes";

/** Mirrors the fee rules in place_order(); the database is the source of truth. */
export function feeFor(mode: Mode, s: Settings | null, subtotal: number, postcode = "") {
  if (!s) return 0;
  if (mode === "delivery") {
    return s.far_postcodes?.includes(postcode.trim()) ? s.delivery_fee_far_cents : s.delivery_fee_cents;
  }
  if (mode === "shipping") {
    if (s.free_shipping_from_cents != null && subtotal >= s.free_shipping_from_cents) return 0;
    return s.shipping_fee_cents;
  }
  return 0;
}
