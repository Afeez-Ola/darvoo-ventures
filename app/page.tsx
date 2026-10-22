import { supabaseServer } from "@/lib/supabase";
import type { Product, Settings } from "@/lib/types";
import MenuView from "./MenuView";

export const revalidate = 60;

export default async function Home() {
  const sb = supabaseServer();
  const [{ data: products }, { data: settings }] = await Promise.all([
    sb.from("products").select("id,category,name,unit,price_cents,image_path,sort").eq("active", true).order("sort"),
    sb.from("settings").select("accepting_orders,delivery_fee_cents,booking_days,same_day_cutoff").single(),
  ]);
  return <MenuView products={(products ?? []) as Product[]} settings={settings as Settings | null} />;
}
