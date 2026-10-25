"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fill, useI18n } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase";
import { clock, dayLabel, euro, hhmm } from "@/lib/format";
import type { TrackedOrder } from "@/lib/types";
import BankBox from "@/components/BankBox";
import OrderAlerts from "@/components/OrderAlerts";
import { Check } from "@/components/Icons";

const UUID = /^[0-9a-f-]{36}$/i;

function ThankYou({ token }: { token: string }) {
  const { t, lang } = useI18n();
  const [order, setOrder] = useState<TrackedOrder | null | undefined>(undefined);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (!UUID.test(token)) return setOrder(null);
    const sb = supabaseBrowser();
    sb.rpc("get_order", { p_token: token }).then(({ data }) => setOrder((data as TrackedOrder) ?? null));
    sb.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, [token]);

  if (order === undefined) return <div className="shell"><p className="center-msg">…</p></div>;
  if (order === null)
    return (
      <div className="shell">
        <p className="center-msg">{t.notFound}</p>
        <div style={{ padding: "0 20px" }}><Link href="/" className="primary">{t.tyMenu}</Link></div>
      </div>
    );

  const first = order.customer_name || "";
  const track = `/track/?t=${token}`;
  const day = order.slot_date ? dayLabel(order.slot_date, lang) : "";
  const time = order.slot_time ? hhmm(order.slot_time) : "";
  const steps: string[] = [];
  if (order.status === "pending_payment" && order.bank) {
    const by = `${dayLabel(new Date(order.bank.pay_by).toLocaleDateString("en-CA", { timeZone: "Europe/Vienna" }), lang)} ${clock(order.bank.pay_by)}`;
    steps.push(fill(t.tyStepPay, { x: euro(order.total_cents), by, r: order.bank.reference }), t.tyStepConfirm);
  } else if (order.paid) {
    steps.push(t.tyStepPaid);
  }
  steps.push(
    order.mode === "shipping" ? fill(t.tyStepShip, { n: order.dispatch_days })
      : order.mode === "pickup" ? fill(t.tyStepPickup, { d: day, t: time })
      : fill(t.tyStepDelivery, { d: day, t: time }),
  );

  return (
    <div className="shell" style={{ paddingBottom: 200 }}>
      <section className="ty-hero">
        <span className="ty-check" aria-hidden="true"><Check size={34} /></span>
        <h1 className="display">{fill(t.tyTitle, { x: first })}</h1>
        <p>{fill(t.tySub, { n: order.number })}</p>
      </section>

      <BankBox order={order} />

      <section className="section">
        <h2>{t.tyNext}</h2>
        <ol className="ty-steps">
          {steps.map((s, i) => <li key={i}><span className="ty-num">{i + 1}</span><span>{s}</span></li>)}
        </ol>
        <p className="hint">{t.tyEmail}</p>
      </section>

      <OrderAlerts token={token} />

      <section className="order-box">
        <h2>{t.tySummary} #{order.number}</h2>
        {order.items.map((i, k) => (
          <div className="sumrow" key={k}><span>{i.qty}× {i.name}{i.option ? ` (${i.option})` : ""}</span><span>{euro(i.qty * i.unit_price_cents)}</span></div>
        ))}
        {order.fee_cents > 0 && (
          <div className="sumrow" style={{ color: "var(--muted)" }}><span>{order.mode === "shipping" ? t.shippingFee : t.deliveryFee}</span><span>{euro(order.fee_cents)}</span></div>
        )}
        <div className="sumrow total"><span>{t.totalVat}</span><span>{euro(order.total_cents)}</span></div>
      </section>

      {signedIn === false && (
        <p style={{ margin: "16px 20px 0", fontSize: 14 }}><Link href="/account/" style={{ fontWeight: 700 }}>{t.saveToAccount}</Link></p>
      )}
      <p className="hint" style={{ margin: "12px 20px 0" }}>{t.tyQuestions}</p>

      <div className="bottombar">
        <div className="bottombar-inner">
          <Link href={track} className="primary">{t.tyTrack}</Link>
          <Link href="/" className="outline" style={{ height: 48 }}>{t.tyMenu}</Link>
        </div>
      </div>
    </div>
  );
}

function Router() {
  const token = useSearchParams().get("t") ?? "";
  return <ThankYou token={token} />;
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={<div className="shell"><p className="center-msg">…</p></div>}>
      <Router />
    </Suspense>
  );
}
