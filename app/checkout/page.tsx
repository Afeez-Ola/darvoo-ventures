"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { errorText, useI18n } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { supabaseBrowser } from "@/lib/supabase";
import { dayLabel, euro, hhmm } from "@/lib/format";
import { rememberOrder } from "@/lib/orders";
import PageBar from "@/components/PageBar";
import { Lock, Truck, Pin } from "@/components/Icons";

type Method = "card" | "eps" | "klarna";

export default function CheckoutPage() {
  const { t, lang } = useI18n();
  const cart = useCart();
  const router = useRouter();
  const f = cart.fulfilment;
  const [fee, setFee] = useState(0);
  const [method, setMethod] = useState<Method>("card");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState(true);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("darvoo-contact") || "{}");
      if (saved.name) setName(saved.name);
      if (saved.phone) setPhone(saved.phone);
      if (saved.email) setEmail(saved.email);
    } catch {}
    supabaseBrowser().from("settings").select("delivery_fee_cents").single()
      .then(({ data }) => setFee(f.mode === "delivery" ? data?.delivery_fee_cents ?? 0 : 0));
  }, [f.mode]);

  useEffect(() => {
    if (cart.ready && (cart.count === 0 || !f.slot_date || !f.slot_time)) router.replace("/basket");
  }, [cart.ready, cart.count, f.slot_date, f.slot_time, router]);

  const total = cart.subtotal + fee;
  const canPay = name.trim() && phone.trim() && terms && !busy;

  async function pay() {
    setBusy(true);
    setError(null);
    const sb = supabaseBrowser();
    const { data, error: placeErr } = await sb.rpc("place_order", {
      payload: {
        mode: f.mode,
        slot_date: f.slot_date,
        slot_time: f.slot_time,
        customer_name: name,
        phone,
        email,
        whatsapp_updates: whatsapp,
        street: f.street,
        postcode: f.postcode,
        door: f.door,
        note: f.note,
        payment_method: method,
        items: cart.lines.map((l) => ({ product_id: l.product_id, qty: l.qty })),
      },
    });
    const placed = Array.isArray(data) ? data[0] : data;
    if (placeErr || !placed) {
      setError(errorText(t, placeErr?.message));
      setBusy(false);
      return;
    }
    // DEMO: replace with a Stripe Checkout session + webhook (see README)
    const { error: payErr } = await sb.rpc("mock_pay", { p_token: placed.public_token });
    if (payErr) {
      setError(errorText(t, payErr.message));
      setBusy(false);
      return;
    }
    try {
      localStorage.setItem("darvoo-contact", JSON.stringify({ name, phone, email }));
    } catch {}
    rememberOrder(placed.public_token, placed.number);
    cart.clear();
    router.push(`/track/${placed.public_token}`);
  }

  const methods: { id: Method; name: string; sub: string }[] = [
    { id: "card", name: t.card, sub: t.cardSub },
    { id: "eps", name: t.eps, sub: t.epsSub },
    { id: "klarna", name: t.klarna, sub: t.klarnaSub },
  ];

  return (
    <div className="shell" style={{ paddingBottom: 180 }}>
      <PageBar title={t.payConfirm} back="/basket" backLabel={t.yourBasket} />

      <section className="summary">
        <span style={{ color: "var(--green)" }}>{f.mode === "delivery" ? <Truck size={22} /> : <Pin />}</span>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <strong style={{ fontSize: 14 }}>
            {f.mode === "delivery" ? t.delivery : t.pickup} · {f.slot_date ? dayLabel(f.slot_date, lang) : ""} {f.slot_time ? hhmm(f.slot_time) : ""}
          </strong>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            {cart.count} {t.items}
            {f.mode === "delivery" && f.street ? ` · ${f.street}, ${f.postcode}` : ""}
          </span>
        </div>
        <Link href="/basket" style={{ fontSize: 14, fontWeight: 700, padding: "12px 4px" }}>{t.edit}</Link>
      </section>

      <section className="section">
        <h2>{t.yourDetails}</h2>
        <label className="field">{t.name}
          <input value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">{t.phone}
          <input type="tel" value={phone} autoComplete="tel" placeholder="+43 660 123 4567" onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="field">{t.email}
          <input type="email" value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} />
          {t.whatsapp}
        </label>
      </section>

      <section className="section">
        <h2>{t.paymentMethod}</h2>
        {methods.map((m) => (
          <button key={m.id} className="method" aria-pressed={method === m.id} onClick={() => setMethod(m.id)}>
            <span className="radio" aria-hidden="true" />
            <span className="method-text">
              <strong>{m.name}</strong>
              <small>{m.sub}</small>
            </span>
          </button>
        ))}
        <p className="hint" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Lock /> {t.demoPay}
        </p>
        <label className="check">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <span>{t.terms}</span>
        </label>
      </section>

      {error && <div className="notice red" role="alert">{error}</div>}

      <div className="bottombar">
        <div className="bottombar-inner">
          <div className="sumrow total"><span>{t.totalVat}</span><span>{euro(total)}</span></div>
          <button className="primary" disabled={!canPay} onClick={pay}>
            {busy ? t.placing : `${t.pay} ${euro(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
