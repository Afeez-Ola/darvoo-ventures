"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { supabaseBrowser } from "@/lib/supabase";
import { dayLabel, euro, hhmm, viennaToday } from "@/lib/format";
import type { Settings, Slot } from "@/lib/types";
import PageBar from "@/components/PageBar";
import { Minus, Pin, Plus } from "@/components/Icons";

export default function BasketPage() {
  const { t, lang } = useI18n();
  const cart = useCart();
  const router = useRouter();
  const f = cart.fulfilment;
  const [settings, setSettings] = useState<Settings | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);

  useEffect(() => {
    supabaseBrowser()
      .from("settings")
      .select("accepting_orders,delivery_fee_cents,booking_days,same_day_cutoff")
      .single()
      .then(({ data }) => setSettings(data as Settings));
  }, []);

  const days = useMemo(() => {
    const n = settings?.booking_days ?? 7;
    return Array.from({ length: n + 1 }, (_, i) => viennaToday(i));
  }, [settings]);

  // default to today, and drop a stale date from an old visit
  useEffect(() => {
    if (!days.length) return;
    if (!f.slot_date || !days.includes(f.slot_date)) cart.setFulfilment({ slot_date: days[0], slot_time: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  useEffect(() => {
    if (!f.slot_date) return;
    setSlots(null);
    supabaseBrowser()
      .rpc("available_slots", { p_date: f.slot_date })
      .then(({ data }) => {
        const list = (data ?? []) as Slot[];
        setSlots(list);
        if (f.slot_time && !list.find((s) => s.slot_time === f.slot_time && s.open)) cart.setFulfilment({ slot_time: null });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.slot_date]);

  const fee = f.mode === "delivery" ? settings?.delivery_fee_cents ?? 0 : 0;
  const addressOk = f.mode === "pickup" || (f.street.trim() !== "" && f.postcode.trim() !== "");
  const canContinue = cart.count > 0 && !!f.slot_date && !!f.slot_time && addressOk && settings?.accepting_orders !== false;
  const openSlots = (slots ?? []).filter((s) => s.open);

  if (cart.ready && cart.count === 0) {
    return (
      <div className="shell">
        <PageBar title={t.yourBasket} back="/" backLabel={t.backToMenu} />
        <p className="center-msg">{t.emptyBasket}</p>
        <div style={{ padding: "0 20px" }}>
          <Link href="/" className="primary">{t.backToMenu}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="shell" style={{ paddingBottom: 230 }}>
      <PageBar title={t.yourBasket} back="/" backLabel={t.backToMenu} />

      <section className="box" aria-label="Items">
        {cart.lines.map((l) => (
          <div className="line" key={l.product_id}>
            <span className="qty-tag">{l.qty}×</span>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{l.name}</span>
            <span style={{ display: "flex", gap: 2 }}>
              <button className="back" style={{ border: 0, background: "none" }} aria-label={`${t.remove}: ${l.name}`}
                onClick={() => cart.setQty({ id: l.product_id, name: l.name, unit: l.unit, price_cents: l.price_cents }, l.qty - 1)}>
                <Minus />
              </button>
              <button className="back" style={{ border: 0, background: "none" }} aria-label={`${t.add}: ${l.name}`}
                onClick={() => cart.setQty({ id: l.product_id, name: l.name, unit: l.unit, price_cents: l.price_cents }, l.qty + 1)}>
                <Plus size={16} />
              </button>
            </span>
            <strong style={{ fontSize: 15, minWidth: 70, textAlign: "right" }}>{euro(l.qty * l.price_cents)}</strong>
          </div>
        ))}
      </section>

      <section className="section">
        <h2>{t.howWant}</h2>
        <div className="segment">
          <button aria-pressed={f.mode === "delivery"} onClick={() => cart.setFulfilment({ mode: "delivery" })}>{t.delivery}</button>
          <button aria-pressed={f.mode === "pickup"} onClick={() => cart.setFulfilment({ mode: "pickup" })}>{t.pickup}</button>
        </div>
      </section>

      <section className="section">
        <h2>{t.chooseDay}</h2>
        <div className="days">
          {days.map((d) => (
            <button key={d} className="day" aria-pressed={f.slot_date === d} onClick={() => cart.setFulfilment({ slot_date: d, slot_time: null })}>
              {dayLabel(d, lang)}
            </button>
          ))}
        </div>
        <h2 style={{ marginTop: 8 }}>{t.chooseTime}</h2>
        {slots === null ? (
          <p className="hint">…</p>
        ) : openSlots.length === 0 ? (
          <p className="hint">{t.noSlots}</p>
        ) : (
          <div className="slots">
            {slots.map((s) => {
              const label = !s.open ? (s.remaining === 0 ? t.full : t.closed) : s.remaining <= 1 ? t.lastSpot : t.open;
              return (
                <button key={s.slot_time} className="slot" disabled={!s.open}
                  aria-pressed={f.slot_time === s.slot_time}
                  onClick={() => cart.setFulfilment({ slot_time: s.slot_time })}>
                  <strong>{hhmm(s.slot_time)}</strong>
                  <small>{label}</small>
                </button>
              );
            })}
          </div>
        )}
        <p className="hint">{t.slotsNote}</p>
      </section>

      {f.mode === "delivery" ? (
        <section className="section" aria-label={t.deliveryAddress}>
          <h2>{t.deliveryAddress}</h2>
          <label className="field">{t.street}
            <input value={f.street} autoComplete="street-address" onChange={(e) => cart.setFulfilment({ street: e.target.value })} />
          </label>
          <div className="two">
            <label className="field">{t.postcode}
              <input value={f.postcode} inputMode="numeric" autoComplete="postal-code" onChange={(e) => cart.setFulfilment({ postcode: e.target.value })} />
            </label>
            <label className="field">{t.door}
              <input value={f.door} onChange={(e) => cart.setFulfilment({ door: e.target.value })} />
            </label>
          </div>
        </section>
      ) : (
        <section className="pickup-card">
          <span style={{ color: "var(--green)" }}><Pin /></span>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <strong style={{ fontSize: 15 }}>{t.pickupTitle}</strong>
            <span style={{ fontSize: 13, lineHeight: "18px", color: "var(--ink-2)" }}>{t.pickupAddress}</span>
          </div>
        </section>
      )}

      <section className="section">
        <label className="field">{t.kitchenNote}
          <textarea rows={2} value={f.note} maxLength={500} onChange={(e) => cart.setFulfilment({ note: e.target.value })} />
        </label>
      </section>

      <div className="bottombar">
        <div className="bottombar-inner">
          <div className="sumrow"><span>{t.subtotal}</span><span>{euro(cart.subtotal)}</span></div>
          <div className="sumrow"><span>{f.mode === "delivery" ? t.deliveryFee : t.pickup}</span><span>{fee ? euro(fee) : t.free}</span></div>
          <div className="sumrow total"><span>{t.total}</span><span>{euro(cart.subtotal + fee)}</span></div>
          <button className="primary" disabled={!canContinue} onClick={() => router.push("/checkout")}>{t.continuePay}</button>
        </div>
      </div>
    </div>
  );
}
