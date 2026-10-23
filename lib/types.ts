export type Category = "dishes" | "groceries" | "events";
export type Mode = "delivery" | "pickup" | "shipping";
export type OrderStatus =
  | "pending_payment"
  | "received"
  | "cooking"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

export interface Product {
  id: string;
  category: Category;
  name: string;
  unit: string;
  price_cents: number;
  image_path: string | null;
  sort: number;
  allergens: string;
  options: string[];
  active?: boolean;
  description?: string | null;
  description_de?: string | null;
}

export interface Settings {
  accepting_orders: boolean;
  delivery_fee_cents: number;
  booking_days: number;
  same_day_cutoff: string;
  shipping_fee_cents: number;
  free_shipping_from_cents: number | null;
  shipping_fee_eu_cents: number;
  ship_countries: string[];
  payment_mode?: "bank_transfer" | "online";
  transfer_hours?: number;
  ship_dispatch_days: number;
  delivery_postcode_prefixes: string[];
  delivery_fee_far_cents: number;
  far_postcodes: string[];
}

export interface Slot {
  slot_time: string;
  capacity: number;
  booked: number;
  remaining: number;
  open: boolean;
}

export interface TrackedOrder {
  number: number;
  status: OrderStatus;
  mode: Mode;
  slot_date: string | null;
  slot_time: string | null;
  created_at: string;
  city: string | null;
  tracking_code: string | null;
  dispatch_days: number;
  customer_name: string;
  payment_method: string;
  paid: boolean;
  bank?: { holder: string; iban: string; bic: string; bank: string; reference: string; pay_by: string } | null;
  subtotal_cents: number;
  fee_cents: number;
  total_cents: number;
  items: { name: string; option: string | null; qty: number; unit_price_cents: number }[];
  events: { status: OrderStatus; at: string }[];
}
