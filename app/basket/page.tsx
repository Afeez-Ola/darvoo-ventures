"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fill, useI18n } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { supabaseBrowser } from "@/lib/supabase";
import { dayLabel, euro, hhmm, viennaToday } from "@/lib/format";
import type { Category, Settings, Slot } from "@/lib/types";
import { feeFor, SETTINGS_COLS, postcodeOk, countryName } from "@/lib/fees";
import PageBar from "@/components/PageBar";
import { Minus, Pin, Plus } from "@/components/Icons";

export default function BasketPage() {
  const { t, lang } = useI18n();
  const cart = useCart();
  const router = useRouter();
  const f = cart.fulfilment;
  const [settings, setSettings] = useState<Settings | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  // categories of the basket items, tagged with the basket they were loaded for
  const [cats, setCats] = useState<{ key: string; map: Record<string, Category> } | null>(null);

  useEffect(() => {
    supabaseBrowser().from("settings").select(SETTINGS_COLS).single()
      .then(({ data }) => setSettings(data as Settings));
  }, []);

  // which basket items are food stuffs (only those can be posted)
  const ids = cart.lines.map((l) => l.product_id).sort().join(",");
  useEffect(() => {
    if (!cart.ready || !ids) return;
    let live = true;
    supabaseBrowser().from("products").select("id,category").in("id", ids.split(","))
      .then(({ data }) => {
        if (live) setCats({ key: ids, map: Object.fromEntries((data ?? []).map((p) => [p.id, p.category as Category])) });
      });
    return () => { live = false; };
  }, [ids, cart.ready]);
  const categories = cats && cats.key === ids ? cats.map : null; // null until loaded for this basket
  const canShip = !!categories && cart.lines.length > 0 && cart.lines.every((l) => categories[l.product_id] === "groceries");

  // a basket with cooked food cannot stay on shipping (only decided once categories are loaded)
  useEffect(() => {
    if (categories && f.mode === "shipping" && !canShip) cart.setFulfilment({ mode: "delivery" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, canShip]);

  const days = useMemo(() => {
    const n = settings?.booking_days ?? 7;
    return Array.from({ length: n + 1 }, (_, i) => viennaToday(i));
  }, [settings]);

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

  const isShip = f.mode === "shipping";
  const cc = isShip ? f.country || "AT" : "AT";
  const fee = feeFor(f.mode, settings, cart.subtotal, f.postcode, cc);
  const pc = f.postcode.trim();
  const pcValid = postcodeOk(pc, cc);
  const inVienna = !!settings && settings.delivery_postcode_prefixes.some((p) => pc.startsWith(p));
  const outside = f.mode === "delivery" && pcValid && !inVienna;
  const addressOk =
    f.mode === "pickup" ||
    (f.street.trim() !== "" && pcValid && (isShip ? f.city.trim() !== "" : inVienna));
  const timeOk = isShip || (!!f.slot_date && !!f.slot_time);
  const canContinue = cart.count > 0 && timeOk && addressOk && settings?.accepting_orders !== false;
  const openSlots = (slots ?? []).filter((s) => s.open);
  const feeLabel = f.mode === "delivery" ? t.deliveryFee : isShip ? t.shippingFee : t.pickup;

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
          <div className="line" key={`${l.product_id}|${l.option ?? ""}`}>
            <span className="qty-tag">{l.qty}×</span>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>
              {l.name}
              {l.option && <span style={{ display: "block", fontSize: 13, fontWeight: 400, color: "var(--muted)" }}>{l.option}</span>}
            </span>
            <span style={{ display: "flex", gap: 2 }}>
              <button className="back" style={{ border: 0, background: "none" }} aria-label={`${t.remove}: ${l.name}`}
                onClick={() => cart.setQty({ id: l.product_id, name: l.name, unit: l.unit, price_cents: l.price_cents }, l.qty - 1, l.option ?? null)}>
                <Minus />
              </button>
              <button className="back" style={{ border: 0, background: "none" }} aria-label={`${t.add}: ${l.name}`}
                onClick={() => cart.setQty({ id: l.product_id, name: l.name, unit: l.unit, price_cents: l.price_cents }, l.qty + 1, l.option ?? null)}>
                <Plus size={16} />
              </button>
            </span>
            <strong style={{ fontSize: 15, minWidth: 70, textAlign: "right" }}>{euro(l.qty * l.price_cents)}</strong>
          </div>
        ))}
      </section>

      <section className="section">
        <h2>{t.howWant}</h2>
        <div className="segment three">
          <button aria-pressed={f.mode === "delivery"} onClick={() => cart.setFulfilment({ mode: "delivery" })}>{t.delivery}</button>
          <button aria-pressed={f.mode === "pickup"} onClick={() => cart.setFulfilment({ mode: "pickup" })}>{t.pickup}</button>
          <button aria-pressed={isShip} disabled={!canShip && !isShip} onClick={() => cart.setFulfilment({ mode: "shipping" })}>{t.shipping}</button>
        </div>
        {categories && !canShip && <p className="hint">{t.shipOnlyGroceries}</p>}
        {isShip && settings && (
          <div className="notice green" style={{ margin: 0 }}>
            {fill(t.shipNote, { n: settings.ship_dispatch_days })}{" "}
            {fill(t.shipFees, { at: euro(settings.shipping_fee_cents), eu: euro(settings.shipping_fee_eu_cents) })}
            {settings.free_shipping_from_cents != null && <> {fill(t.freeShipFrom, { x: euro(settings.free_shipping_from_cents) })}.</>}
          </div>
        )}
      </section>

      {!isShip && (
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
      )}

      {f.mode === "pickup" ? (
        <section className="pickup-card">
          <span style={{ color: "var(--green)" }}><Pin /></span>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <strong style={{ fontSize: 15 }}>{t.pickupTitle}</strong>
            <span style={{ fontSize: 13, lineHeight: "18px", color: "var(--ink-2)" }}>{t.pickupAddress}</span>
          </div>
        </section>
      ) : (
        <section className="section" aria-label={isShip ? t.shipAddress : t.deliveryAddress}>
          <h2>{isShip ? t.shipAddress : t.deliveryAddress}</h2>
          {!isShip && (
            <p className="hint" style={{ marginTop: -6 }}>
              {t.deliveryAreaNote}{" "}
              {settings && fill(t.deliveryZones, {
                near: euro(settings.delivery_fee_cents),
                far: euro(settings.delivery_fee_far_cents),
                list: settings.far_postcodes.join(", "),
              })}
            </p>
          )}
          {isShip && settings && (
            <label className="field">{t.country}
              <select className="select" value={cc} autoComplete="country"
                onChange={(e) => cart.setFulfilment({ country: e.target.value, postcode: "" })}>
                {[...settings.ship_countries]
                  .sort((a, b) => (a === "AT" ? -1 : b === "AT" ? 1 : countryName(a, lang).localeCompare(countryName(b, lang))))
                  .map((c) => <option key={c} value={c}>{countryName(c, lang)}</option>)}
              </select>
            </label>
          )}
          <label className="field">{t.street}
            <input value={f.street} autoComplete="street-address" onChange={(e) => cart.setFulfilment({ street: e.target.value })} />
          </label>
          <div className="two">
            <label className="field">{t.postcode}
              <input value={f.postcode} inputMode={cc === "AT" ? "numeric" : "text"} maxLength={cc === "AT" ? 4 : 10} autoComplete="postal-code"
                aria-invalid={outside || (pc.length >= 4 && !pcValid)}
                onChange={(e) => cart.setFulfilment({ postcode: cc === "AT" ? e.target.value.replace(/\D/g, "") : e.target.value.toUpperCase() })} />
            </label>
            {isShip ? (
              <label className="field">{t.city}
                <input value={f.city} autoComplete="address-level2" onChange={(e) => cart.setFulfilment({ city: e.target.value })} />
              </label>
            ) : (
              <label className="field">{t.door}
                <input value={f.door} onChange={(e) => cart.setFulfilment({ door: e.target.value })} />
              </label>
            )}
          </div>
          {isShip && (
            <label className="field">{t.door}
              <input value={f.door} onChange={(e) => cart.setFulfilment({ door: e.target.value })} />
            </label>
          )}
          {outside && <p className="notice red" role="alert" style={{ margin: 0 }}>{t.outsideArea}</p>}
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
          <div className="sumrow"><span>{feeLabel}</span><span>{fee ? euro(fee) : t.free}</span></div>
          <div className="sumrow total"><span>{t.total}</span><span>{euro(cart.subtotal + fee)}</span></div>
          <button className="primary" disabled={!canContinue} onClick={() => router.push("/checkout/")}>{t.continuePay}</button>
        </div>
      </div>
    </div>
  );
}
