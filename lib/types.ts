export type Category = "dishes" | "groceries" | "events";
export type Mode = "delivery" | "pickup";
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
  active?: boolean;
}

export interface Settings {
  accepting_orders: boolean;
  delivery_fee_cents: number;
  booking_days: number;
  same_day_cutoff: string;
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
  slot_date: string;
  slot_time: string;
  customer_name: string;
  payment_method: string;
  paid: boolean;
  subtotal_cents: number;
  fee_cents: number;
  total_cents: number;
  items: { name: string; qty: number; unit_price_cents: number }[];
  events: { status: OrderStatus; at: string }[];
}
