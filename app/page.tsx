"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import type { Product, Settings } from "@/lib/types";
import MenuView from "./MenuView";

export default function Home() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const sb = supabaseBrowser();
    Promise.all([
      sb.from("products").select("id,category,name,unit,price_cents,image_path,sort,allergens,options").eq("active", true).order("sort"),
      sb.from("settings").select("accepting_orders,delivery_fee_cents,booking_days,same_day_cutoff").single(),
    ]).then(([p, s]) => {
      if (p.error) setFailed(true);
      setProducts((p.data ?? []) as Product[]);
      setSettings((s.data as Settings) ?? null);
    });
  }, []);

  return <MenuView products={products} settings={settings} failed={failed} />;
}
