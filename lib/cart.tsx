"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { Mode, Product } from "./types";

export interface CartLine {
  product_id: string;
  name: string;
  unit: string;
  price_cents: number;
  qty: number;
}

export interface Fulfilment {
  mode: Mode;
  slot_date: string | null;
  slot_time: string | null;
  street: string;
  postcode: string;
  door: string;
  city: string;
  note: string;
}

const emptyFulfilment: Fulfilment = {
  mode: "delivery",
  slot_date: null,
  slot_time: null,
  street: "",
  postcode: "",
  door: "",
  city: "",
  note: "",
};

interface CartCtx {
  lines: CartLine[];
  count: number;
  subtotal: number;
  qtyOf: (id: string) => number;
  setQty: (p: Pick<Product, "id" | "name" | "unit" | "price_cents">, qty: number) => void;
  clear: () => void;
  fulfilment: Fulfilment;
  setFulfilment: (patch: Partial<Fulfilment>) => void;
  ready: boolean;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = "darvoo-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [fulfilment, setF] = useState<Fulfilment>(emptyFulfilment);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.lines)) setLines(data.lines);
        if (data.fulfilment) setF({ ...emptyFulfilment, ...data.fulfilment });
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ lines, fulfilment }));
    } catch {}
  }, [lines, fulfilment, ready]);

  const value = useMemo<CartCtx>(() => {
    const count = lines.reduce((a, l) => a + l.qty, 0);
    const subtotal = lines.reduce((a, l) => a + l.qty * l.price_cents, 0);
    return {
      lines,
      count,
      subtotal,
      ready,
      fulfilment,
      qtyOf: (id) => lines.find((l) => l.product_id === id)?.qty ?? 0,
      setQty: (p, qty) =>
        setLines((prev) => {
          const rest = prev.filter((l) => l.product_id !== p.id);
          if (qty <= 0) return rest;
          const existing = prev.find((l) => l.product_id === p.id);
          const line = { product_id: p.id, name: p.name, unit: p.unit, price_cents: p.price_cents, qty: Math.min(qty, 50) };
          if (!existing) return [...prev, line];
          return prev.map((l) => (l.product_id === p.id ? line : l));
        }),
      clear: () => {
        setLines([]);
        setF((f) => ({ ...f, slot_date: null, slot_time: null, note: "" }));
      },
      setFulfilment: (patch) => setF((f) => ({ ...f, ...patch })),
    };
  }, [lines, fulfilment, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
