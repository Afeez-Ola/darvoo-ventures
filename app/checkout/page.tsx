"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { errorText, useI18n, fill } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { supabaseBrowser } from "@/lib/supabase";
import { dayLabel, euro, hhmm } from "@/lib/format";
import { rememberOrder } from "@/lib/orders";
import { feeFor, SETTINGS_COLS, countryName } from "@/lib/fees";
import type { Settings } from "@/lib/types";
import PageBar from "@/components/PageBar";
import { Lock, Truck, Pin } from "@/components/Icons";

type Method = "card" | "eps" | "klarna" | "bank_transfer";

export default function CheckoutPage() {
  const { t, lang } = useI18n();
  const cart = useCart();
  const router = useRouter();
  const f = cart.fulfilment;
  const [fee, setFee] = useState(0);
  const [method, setMethod] = useState<Method>("card");
  const [bankOnly, setBankOnly] = useState(false);
  const [hours, setHours] = useState(24);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState(true);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  // set once the order is placed, so emptying the basket does not bounce us back to /basket
  const placedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("darvoo-contact") || "{}");
      if (saved.name) setName(saved.name);
      if (saved.phone) setPhone(saved.phone);
      if (saved.email) setEmail(saved.email);
    } catch {}
    // signed-in customers: fill in from their account
    const sbc = supabaseBrowser();
    sbc.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user;
      if (!u) return;
      setSignedIn(true);
      const { data: p } = await sbc.from("profiles").select("name,phone").eq("user_id", u.id).maybeSingle();
      if (p?.name) setName(p.name);
      if (p?.phone) setPhone(p.phone);
      else if (u.phone) setPhone("+" + u.phone);
      if (u.email) setEmail(u.email);
    });
    supabaseBrowser().from("settings").select(SETTINGS_COLS).single()
      .then(({ data }) => {
        const st = data as Settings;
        setFee(feeFor(f.mode, st, cart.subtotal, f.postcode, f.country));
        if (st?.payment_mode !== "online") { setBankOnly(true); setHours(st?.transfer_hours ?? 24); setMethod("bank_transfer"); }
      });
  }, [f.mode, cart.subtotal, f.postcode, f.country]);

  useEffect(() => {
    if (placedRef.current) return;
    const needsSlot = f.mode !== "shipping";
    if (cart.ready && (cart.count === 0 || (needsSlot && (!f.slot_date || !f.slot_time)))) router.replace("/basket/");
  }, [cart.ready, cart.count, f.mode, f.slot_date, f.slot_time, router]);

  const total = cart.subtotal + fee;
  const canPay = name.trim() && phone.trim() && terms && !busy;

  async function pay() {
    setBusy(true);
    setError(null);
    const sb = supabaseBrowser();
    const { data, error: placeErr } = await sb.rpc("place_order", {
      payload: {
        mode: f.mode,
        slot_date: f.mode === "shipping" ? null : f.slot_date,
        slot_time: f.mode === "shipping" ? null : f.slot_time,
        customer_name: name,
        phone,
        email,
        whatsapp_updates: whatsapp,
        street: f.street,
        postcode: f.postcode,
        city: f.mode === "shipping" ? f.city : "",
        country: f.mode === "shipping" ? f.country : "AT",
        door: f.door,
        note: f.note,
        payment_method: method,
        items: cart.lines.map((l) => ({ product_id: l.product_id, qty: l.qty, option: l.option ?? null })),
      },
    });
    const placed = Array.isArray(data) ? data[0] : data;
    if (placeErr || !placed) {
      setError(errorText(t, placeErr?.message));
      setBusy(false);
      return;
    }
    // Bank transfer: the order waits for the money; the kitchen marks it paid.
    // Online (DEMO): replace with a Stripe Checkout session + webhook (see README)
    const { error: payErr } = bankOnly ? { error: null } : await sb.rpc("mock_pay", { p_token: placed.public_token });
    if (payErr) {
      setError(errorText(t, payErr.message));
      setBusy(false);
      return;
    }
    try {
      localStorage.setItem("darvoo-contact", JSON.stringify({ name, phone, email }));
    } catch {}
    rememberOrder(placed.public_token, placed.number);
    if (signedIn) {
      // keep the account's details up to date for next time
      const { data: s } = await sb.auth.getSession();
      if (s.session) await sb.from("profiles").upsert({
        user_id: s.session.user.id, name, phone, lang,
        ...(f.mode !== "pickup" ? { street: f.street, postcode: f.postcode, city: f.city || null, door: f.door || null, country: f.country || "AT" } : {}),
        updated_at: new Date().toISOString(),
      });
    }
    placedRef.current = true;
    router.replace(`/track/?t=${placed.public_token}`);
    cart.clear();
  }

  const methods: { id: Method; name: string; sub: string }[] = bankOnly
    ? [{ id: "bank_transfer", name: t.bankTransfer, sub: fill(t.bankTransferSub, { h: hours }) }]
    : [
        { id: "card", name: t.card, sub: t.cardSub },
        { id: "eps", name: t.eps, sub: t.epsSub },
        { id: "klarna", name: t.klarna, sub: t.klarnaSub },
      ];

  return (
    <div className="shell" style={{ paddingBottom: 180 }}>
      <PageBar title={t.payConfirm} back="/basket" backLabel={t.yourBasket} />

      <section className="summary">
        <span style={{ color: "var(--green)" }}>{f.mode === "pickup" ? <Pin /> : <Truck size={22} />}</span>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <strong style={{ fontSize: 14 }}>
            {f.mode === "shipping"
              ? t.shippingAustria
              : `${f.mode === "delivery" ? t.delivery : t.pickup} · ${f.slot_date ? dayLabel(f.slot_date, lang) : ""} ${f.slot_time ? hhmm(f.slot_time) : ""}`}
          </strong>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            {cart.count} {t.items}
            {f.mode === "delivery" && f.street ? ` · ${f.street}, ${f.postcode}` : ""}
            {f.mode === "shipping" && f.street ? ` · ${f.street}, ${f.postcode} ${f.city}, ${countryName(f.country, lang)}` : ""}
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
          <Lock /> {bankOnly ? fill(t.bankTransferHint, { h: hours }) : t.demoPay}
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
            {busy ? t.placing : bankOnly ? t.placeOrder : t.pay}
          </button>
        </div>
      </div>
    </div>
  );
}
