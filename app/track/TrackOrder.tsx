"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Dict, useI18n } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase";
import { clock, dayLabel, euro, hhmm } from "@/lib/format";
import type { OrderStatus, TrackedOrder } from "@/lib/types";
import PageBar from "@/components/PageBar";
import { Back, Chat, Check, Phone } from "@/components/Icons";

const UUID = /^[0-9a-f-]{36}$/i;

function stepsFor(mode: "delivery" | "pickup"): OrderStatus[] {
  return mode === "delivery"
    ? ["received", "cooking", "ready", "out_for_delivery", "completed"]
    : ["received", "cooking", "ready", "completed"];
}

function label(t: Dict, s: OrderStatus, mode: "delivery" | "pickup") {
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
  const current = Math.max(0, steps.indexOf(order.status));
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
          {cancelled ? t.st_cancelled : `${t.step} ${current + 1} ${t.of} ${steps.length} · ${label(t, order.status, order.mode)}`}
        </span>
        <h1 className="display">
          {order.mode === "delivery" ? t.arriving : t.readyAround} {hhmm(order.slot_time)}
        </h1>
        <p>
          {dayLabel(order.slot_date, lang)} · {order.mode === "delivery" ? t.trackIntroDelivery : t.trackIntroPickup}
        </p>
        <div className="progress" aria-hidden="true"><div style={{ width: cancelled ? "0%" : progress + "%" }} /></div>
      </section>

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

      <section className="contact" style={{ paddingTop: cancelled ? 22 : 8 }}>
        <a href="tel:+436764022539" className="outline"><Phone /> {t.callUs}</a>
        <a href="https://wa.me/436764022539" className="outline" target="_blank" rel="noopener"><Chat /> WhatsApp</a>
      </section>

      <section className="order-box">
        <h2>{t.yourOrder}</h2>
        {order.items.map((i, k) => (
          <div className="sumrow" key={k}><span>{i.qty}× {i.name}</span><span>{euro(i.qty * i.unit_price_cents)}</span></div>
        ))}
        {order.fee_cents > 0 && <div className="sumrow" style={{ color: "var(--muted)" }}><span>{t.deliveryFee}</span><span>{euro(order.fee_cents)}</span></div>}
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
