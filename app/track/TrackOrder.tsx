"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Dict, fill, useI18n } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase";
import { clock, dayLabel, euro, hhmm } from "@/lib/format";
import type { Mode, OrderStatus, TrackedOrder } from "@/lib/types";
import PageBar from "@/components/PageBar";
import { Back, Chat, Check, Phone } from "@/components/Icons";

const UUID = /^[0-9a-f-]{36}$/i;

function stepsFor(mode: Mode): OrderStatus[] {
  if (mode === "shipping") return ["received", "cooking", "out_for_delivery", "completed"];
  return mode === "delivery"
    ? ["received", "cooking", "ready", "out_for_delivery", "completed"]
    : ["received", "cooking", "ready", "completed"];
}

function label(t: Dict, s: OrderStatus, mode: Mode) {
  if (mode === "shipping" && (s === "cooking" || s === "ready")) return t.st_ship_cooking;
  if (mode === "shipping" && s === "out_for_delivery") return t.st_ship_out_for_delivery;
  if (mode === "shipping" && s === "completed") return t.st_ship_completed;
  if (mode === "pickup" && s === "ready") return t.st_ready_pickup;
  if (mode === "pickup" && s === "completed") return t.st_completed_pickup;
  return t[("st_" + s) as keyof Dict];
}

export default function TrackOrder({ token }: { token: string }) {
  const { t, lang } = useI18n();
  const [order, setOrder] = useState<TrackedOrder | null | undefined>(undefined);

  const load = useCallback(async () => {
    if (!UUID.test(token)) return setOrder(null);
    const { data } = await supabaseBrowser().rpc("get_order", { p_token: token });
    setOrder((data as TrackedOrder) ?? null);
  }, [token]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  if (order === undefined) return <div className="shell"><p className="center-msg">…</p></div>;
  if (order === null)
    return (
      <div className="shell">
        <PageBar title={t.yourOrder} back="/" backLabel={t.backToMenu} />
        <p className="center-msg">{t.notFound}</p>
      </div>
    );

  const steps = stepsFor(order.mode);
  const cancelled = order.status === "cancelled";
  // a parcel marked "ready" sits on the packing step
  const status = order.mode === "shipping" && order.status === "ready" ? "cooking" : order.status;
  const current = Math.max(0, steps.indexOf(status));
  const isShip = order.mode === "shipping";
  const city = order.city ?? "";
  const headline = isShip
    ? order.status === "completed"
      ? fill(t.shipHeadlineDone, { city })
      : order.status === "out_for_delivery"
        ? fill(t.shipHeadlineOnWay, { city })
        : fill(t.shipHeadlineWaiting, { n: order.dispatch_days })
    : `${order.mode === "delivery" ? t.arriving : t.readyAround} ${hhmm(order.slot_time ?? "")}`;
  const intro = isShip
    ? t.shipIntro
    : `${order.slot_date ? dayLabel(order.slot_date, lang) : ""} · ${order.mode === "delivery" ? t.trackIntroDelivery : t.trackIntroPickup}`;
  const done = order.status === "completed";
  const eventAt = (s: OrderStatus) => order.events.filter((e) => e.status === s).pop()?.at;
  const progress = done ? 100 : Math.round(((current + 0.5) / steps.length) * 100);

  return (
    <div className="shell">
      <header className="pagebar" style={{ justifyContent: "space-between" }}>
        <Link href="/" className="back" aria-label={t.backToMenu}><Back /></Link>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--muted)" }}>{t.order} #{order.number}</span>
        <span style={{ width: 44 }} />
      </header>

      <section className="track-hero" aria-live="polite">
        <span className="eyebrow">
          {order.status === "pending_payment" ? t.st_pending_payment : cancelled ? t.st_cancelled : `${t.step} ${current + 1} ${t.of} ${steps.length} · ${label(t, order.status, order.mode)}`}
        </span>
        <h1 className="display">{headline}</h1>
        <p>{intro}</p>
        <div className="progress" aria-hidden="true"><div style={{ width: cancelled ? "0%" : progress + "%" }} /></div>
      </section>

      {order.status === "pending_payment" && order.bank && (
        <section className="bank-box" aria-label={t.bankTitle}>
          <h2>{t.bankTitle}</h2>
          <p>{fill(t.bankIntro, { x: euro(order.total_cents), by: `${dayLabel(order.bank.pay_by.slice(0, 10), lang)} ${clock(order.bank.pay_by)}` })}</p>
          <dl>
            {([
              [t.bankHolder, order.bank.holder],
              ["IBAN", order.bank.iban],
              ["BIC", `${order.bank.bic} (${order.bank.bank})`],
              [t.bankAmount, euro(order.total_cents)],
              [t.bankReference, order.bank.reference],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>
                  <span>{v}</span>
                  <button type="button" className="copy-btn" onClick={() => navigator.clipboard?.writeText(k === "IBAN" ? v.replace(/\s/g, "") : k === t.bankAmount ? (order.total_cents / 100).toFixed(2) : v.split(" (")[0])}>{t.copy}</button>
                </dd>
              </div>
            ))}
          </dl>
          <p className="small">{t.bankAfter}</p>
        </section>
      )}

      {!cancelled && (
        <ol className="timeline" aria-label="Order status">
          {steps.map((s, i) => {
            const isDone = i < current || done;
            const isNow = i === current && !done;
            const at = eventAt(s);
            return (
              <li key={s}>
                <div className="rail">
                  <span className={`dot ${isDone ? "done" : ""} ${isNow ? "now" : ""}`}>{isDone && <Check />}</span>
                  {i < steps.length - 1 && <span className={`rail-line ${i < current || done ? "done" : ""}`} />}
                </div>
                <div className={`step-text ${!isDone && !isNow ? "future" : ""}`}>
                  <strong>{label(t, s, order.mode)}</strong>
                  <small>{at ? clock(at) : ""}</small>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {isShip && order.tracking_code && (
        <section className="order-box" style={{ marginTop: 8 }}>
          <h2>{t.trackingNumber}</h2>
          <div className="sumrow" style={{ alignItems: "center" }}>
            <strong style={{ fontSize: 16, letterSpacing: 0.5 }}>{order.tracking_code}</strong>
            <a href={`https://www.post.at/s/sendungssuche?snr=${encodeURIComponent(order.tracking_code)}`} target="_blank" rel="noopener"
              style={{ fontWeight: 700 }}>{t.trackParcel}</a>
          </div>
        </section>
      )}

      <section className="contact" style={{ paddingTop: cancelled ? 22 : 8 }}>
        <a href="tel:+436767835226" className="outline"><Phone /> {t.callUs}</a>
        <a href="https://wa.me/436764022539" className="outline" target="_blank" rel="noopener"><Chat /> WhatsApp</a>
      </section>

      <section className="order-box">
        <h2>{t.yourOrder}</h2>
        {order.items.map((i, k) => (
          <div className="sumrow" key={k}><span>{i.qty}× {i.name}{i.option ? ` (${i.option})` : ""}</span><span>{euro(i.qty * i.unit_price_cents)}</span></div>
        ))}
        {order.fee_cents > 0 && <div className="sumrow" style={{ color: "var(--muted)" }}><span>{isShip ? t.shippingFee : t.deliveryFee}</span><span>{euro(order.fee_cents)}</span></div>}
        <div className="sumrow total"><span>{order.paid ? t.paidWith : t.st_pending_payment}</span><span>{euro(order.total_cents)}</span></div>
      </section>

      <div className="bottombar">
        <div className="bottombar-inner">
          <Link href="/" className="primary gold">{t.orderAgain}</Link>
        </div>
      </div>
    </div>
  );
}
