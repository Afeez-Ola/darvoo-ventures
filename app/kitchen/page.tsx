"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase";
import { clock, dayLabel, euro, hhmm, viennaToday } from "@/lib/format";
import type { Mode, OrderStatus } from "@/lib/types";
import { MenuEditor, SettingsEditor } from "./Editors";
import "./kitchen.css";

interface KOrder {
  id: string;
  number: number;
  status: OrderStatus;
  mode: Mode;
  slot_date: string | null;
  slot_time: string | null;
  city: string | null;
  country: string | null;
  tracking_code: string | null;
  customer_name: string;
  phone: string;
  street: string | null;
  postcode: string | null;
  door: string | null;
  note: string | null;
  total_cents: number;
  paid_at: string | null;
  created_at: string;
  public_token: string;
  whatsapp_updates: boolean;
  order_items: { name: string; qty: number; option: string | null }[];
}

const COLUMNS: { status: OrderStatus; title: string; tone: string }[] = [
  { status: "received", title: "New orders", tone: "gold" },
  { status: "cooking", title: "Cooking / packing", tone: "orange" },
  { status: "ready", title: "Ready", tone: "green" },
  { status: "out_for_delivery", title: "On the way", tone: "blue" },
  { status: "completed", title: "Done", tone: "grey" },
];

const PARCELS = "parcels";

function nextStep(o: KOrder): { to: OrderStatus; label: string } | null {
  if (o.mode === "shipping") {
    switch (o.status) {
      case "received": return { to: "cooking", label: "Accept and start packing" };
      case "cooking":
      case "ready": return { to: "out_for_delivery", label: "Mark posted" };
      case "out_for_delivery": return { to: "completed", label: "Mark delivered" };
      default: return null;
    }
  }
  switch (o.status) {
    case "received": return { to: "cooking", label: "Accept and start cooking" };
    case "cooking": return { to: "ready", label: "Mark ready" };
    case "ready": return o.mode === "delivery" ? { to: "out_for_delivery", label: "Hand to driver" } : { to: "completed", label: "Customer collected" };
    case "out_for_delivery": return { to: "completed", label: "Mark delivered" };
    default: return null;
  }
}

/** Austrian numbers typed as 0660… become 43660…; wa.me wants digits only. */
function waNumber(phone: string) {
  let d = phone.replace(/[^0-9+]/g, "");
  if (d.startsWith("+")) return d.slice(1);
  if (d.startsWith("00")) return d.slice(2);
  if (d.startsWith("0")) return "43" + d.slice(1);
  return d;
}

const WA_TEXT: Partial<Record<OrderStatus, string>> = {
  received: "wir haben deine Bestellung erhalten",
  cooking: "deine Bestellung wird gerade gekocht",
  ready: "deine Bestellung ist fertig",
  out_for_delivery: "deine Bestellung ist unterwegs zu dir",
  completed: "danke für deine Bestellung! Guten Appetit",
  cancelled: "deine Bestellung wurde leider storniert. Wir melden uns wegen der Rückerstattung",
};

const WA_SHIP: Partial<Record<OrderStatus, string>> = {
  received: "wir haben deine Bestellung erhalten und verschicken sie bald",
  cooking: "dein Paket wird gerade verpackt",
  ready: "dein Paket wird gerade verpackt",
  out_for_delivery: "dein Paket ist unterwegs",
  completed: "dein Paket wurde zugestellt. Danke für deine Bestellung",
  cancelled: WA_TEXT.cancelled,
};

function waLink(o: KOrder) {
  const first = o.customer_name.split(" ")[0];
  if (o.mode === "shipping") {
    const link = `${window.location.origin}/track/?t=${o.public_token}`;
    const code = o.status === "out_for_delivery" && o.tracking_code ? `. Sendungsnummer: ${o.tracking_code}` : "";
    const text = `Hallo ${first}, ${WA_SHIP[o.status] ?? "hier ein Update zu deiner Bestellung"}${code} (Bestellung #${o.number}). Status live verfolgen: ${link}\n\nDarVoo Ventures`;
    return `https://wa.me/${waNumber(o.phone)}?text=${encodeURIComponent(text)}`;
  }
  const pickupReady = o.status === "ready" && o.mode === "pickup" ? " und kann in der Hauffgasse 6, 1110 Wien abgeholt werden" : "";
  const link = `${window.location.origin}/track/?t=${o.public_token}`;
  const text = `Hallo ${first}, ${WA_TEXT[o.status] ?? "hier ein Update zu deiner Bestellung"}${pickupReady} (Bestellung #${o.number}). Status live verfolgen: ${link}\n\nDarVoo Ventures`;
  return `https://wa.me/${waNumber(o.phone)}?text=${encodeURIComponent(text)}`;
}

export default function KitchenPage() {
  const sb = supabaseBrowser();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  useEffect(() => {
    if (!session) return setIsStaff(null);
    sb.from("staff").select("user_id").eq("user_id", session.user.id).maybeSingle()
      .then(({ data }) => setIsStaff(!!data));
  }, [session, sb]);

  if (session === undefined) return <div className="k-center">Loading…</div>;
  if (!session) return <Login />;
  if (isStaff === null) return <div className="k-center">Checking access…</div>;
  if (!isStaff)
    return (
      <div className="k-center">
        <p>This account is not on the kitchen staff list yet.</p>
        <p className="k-muted">Add it in Supabase (see README), then reload.</p>
        <button className="k-btn ghost" onClick={() => sb.auth.signOut()}>Sign out</button>
      </div>
    );
  return <Board />;
}

function Login() {
  const sb = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="k-center">
      <form
        className="k-login"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          const { error } = await sb.auth.signInWithPassword({ email, password });
          if (error) setErr(error.message);
          setBusy(false);
        }}
      >
        <span className="display k-logo">darvoo <em>kitchen</em></span>
        <label className="field">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></label>
        <label className="field">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
        {err && <p className="k-err" role="alert">{err}</p>}
        <button className="k-btn" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}

function Orders({ header }: { header: React.ReactNode }) {
  const sb = supabaseBrowser();
  const [orders, setOrders] = useState<KOrder[]>([]);
  const [accepting, setAccepting] = useState<boolean | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [day, setDay] = useState(viennaToday());
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 14 * 86400000).toISOString();
    const { data } = await sb
      .from("orders")
      .select("id,number,status,mode,slot_date,slot_time,city,country,tracking_code,customer_name,phone,street,postcode,door,note,total_cents,paid_at,created_at,public_token,whatsapp_updates,order_items(name,qty,option)")
      .neq("status", "pending_payment")
      .or(`slot_date.gte.${viennaToday(-1)},and(mode.eq.shipping,created_at.gte.${since})`)
      .order("created_at")
      .limit(400);
    const list = (data ?? []) as KOrder[];
    list.sort((a, b) => `${a.slot_date ?? ""}${a.slot_time ?? ""}${a.created_at}`.localeCompare(`${b.slot_date ?? ""}${b.slot_time ?? ""}${b.created_at}`));
    setOrders(list);
  }, [sb]);

  useEffect(() => {
    load();
    sb.from("settings").select("accepting_orders").single().then(({ data }) => setAccepting(data?.accepting_orders ?? true));
    const ch = sb
      .channel("kitchen-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe((s) => setLive(s === "SUBSCRIBED"));
    const poll = setInterval(load, 30000);
    return () => {
      sb.removeChannel(ch);
      clearInterval(poll);
    };
  }, [sb, load]);

  const advance = async (o: KOrder, to: OrderStatus) => {
    setBusyId(o.id);
    const patch: { status: OrderStatus; tracking_code?: string | null } = { status: to };
    if (o.mode === "shipping" && to === "out_for_delivery") patch.tracking_code = (codes[o.id] ?? "").trim().toUpperCase() || null;
    setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, ...patch } : x)));
    const { error } = await sb.from("orders").update(patch).eq("id", o.id);
    if (error) {
      alert("Could not update order: " + error.message);
      load();
    }
    setBusyId(null);
  };

  const togglePause = async () => {
    const next = !accepting;
    setAccepting(next);
    const { error } = await sb.from("settings").update({ accepting_orders: next, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) {
      alert("Could not change ordering: " + error.message);
      setAccepting(!next);
    }
  };

  const days = useMemo(
    () => Array.from(new Set([viennaToday(), ...orders.filter((o) => o.slot_date).map((o) => o.slot_date as string)])).sort(),
    [orders]
  );
  const parcels = orders.filter((o) => o.mode === "shipping");
  const openParcels = parcels.filter((o) => !["completed", "cancelled"].includes(o.status)).length;
  const forDay = day === PARCELS ? parcels : orders.filter((o) => o.mode !== "shipping" && o.slot_date === day);
  const open = forDay.filter((o) => !["completed", "cancelled"].includes(o.status)).length;
  const newCount = orders.filter((o) => o.status === "received").length;

  return (
    <div className="k-page">
      {header}
      <header className="k-head k-head-stats">
        <div className="k-head-inner">
          <div className="k-brand">
            <span className={`k-live ${live ? "on" : ""}`}>{live ? "Live updates on" : "Connecting…"}</span>
          </div>
          <div className="k-stats">
            <span className="k-stat"><strong>{open}</strong> {day === PARCELS ? "open parcels" : `open on ${dayLabel(day, "en")}`}</span>
            {newCount > 0 && <span className="k-stat alert"><strong>{newCount}</strong> new to accept</span>}
            <button className={`k-pause ${accepting ? "" : "paused"}`} onClick={togglePause} aria-pressed={accepting === false}>
              {accepting ? "Accepting orders · Pause" : "Paused · Resume orders"}
            </button>
          </div>
        </div>
      </header>

      <main className="k-main">
        <div className="days" style={{ marginBottom: 18 }}>
          {days.map((d) => (
            <button key={d} className="day" aria-pressed={d === day} onClick={() => setDay(d)}>
              {dayLabel(d, "en")} ({orders.filter((o) => o.mode !== "shipping" && o.slot_date === d && o.status !== "cancelled").length})
            </button>
          ))}
          <button className="day" aria-pressed={day === PARCELS} onClick={() => setDay(PARCELS)}>
            Parcels to post ({openParcels})
          </button>
        </div>
        <div className="k-cols">
          {COLUMNS.map((c) => {
            const list = forDay.filter((o) => o.status === c.status);
            return (
              <section key={c.status} className="k-col" aria-label={c.title}>
                <div className="k-col-head">
                  <h2>{c.title}</h2>
                  <span className={`k-badge ${c.tone}`}>{list.length}</span>
                </div>
                {list.map((o) => {
                  const step = nextStep(o);
                  return (
                    <article key={o.id} className="k-card">
                      <div className="k-card-top">
                        <strong>#{o.number} · {o.customer_name}</strong>
                        <span className="k-time">{o.slot_time ? hhmm(o.slot_time) : "Parcel"}</span>
                      </div>
                      <ul className="k-items">
                        {o.order_items.map((i, k) => <li key={k}>{i.qty}× {i.name}{i.option ? <strong> ({i.option})</strong> : null}</li>)}
                      </ul>
                      {o.note && <p className="k-note">“{o.note}”</p>}
                      <div className="k-tags">
                        <span className={`k-pill ${o.mode === "pickup" ? "gold" : "blue"}`}>
                          {o.mode === "delivery" ? "Delivery" : o.mode === "shipping" ? "Shipping" : "Pickup"}
                        </span>
                        <span className="k-pill green">{o.paid_at ? "Paid" : "Unpaid"} {euro(o.total_cents)}</span>
                      </div>
                      {o.mode !== "pickup" && o.street && (
                        <p className="k-addr">{o.street}{o.door ? `, ${o.door}` : ""}, {o.postcode}{o.city ? ` ${o.city}` : ""}{o.country && o.country !== "AT" ? `, ${o.country}` : ""}</p>
                      )}
                      {o.mode === "shipping" && (o.status === "cooking" || o.status === "ready") && (
                        <label className="field" style={{ fontSize: 12 }}>
                          Tracking number (optional)
                          <input value={codes[o.id] ?? ""} onChange={(e) => setCodes((c) => ({ ...c, [o.id]: e.target.value }))}
                            placeholder="from the post office receipt" style={{ height: 40 }} />
                        </label>
                      )}
                      {o.tracking_code && <p className="k-addr">Tracking: <strong>{o.tracking_code}</strong></p>}
                      <div className="k-contact">
                        <a className="k-phone" href={`tel:${o.phone.replace(/\s/g, "")}`}>{o.phone}</a>
                        <a className={`k-wa ${o.whatsapp_updates ? "" : "off"}`} href={waLink(o)} target="_blank" rel="noopener"
                          title={o.whatsapp_updates ? "Customer asked for WhatsApp updates" : "Customer did not ask for WhatsApp updates"}>
                          WhatsApp update
                        </a>
                      </div>
                      <span className="k-muted small">Ordered {clock(o.created_at)}</span>
                      {step && (
                        <button className="k-btn" disabled={busyId === o.id} onClick={() => advance(o, step.to)}>{step.label}</button>
                      )}
                      {o.status === "received" && (
                        <button className="k-btn ghost" disabled={busyId === o.id}
                          onClick={() => confirm(`Cancel order #${o.number}? Remember to refund the customer.`) && advance(o, "cancelled")}>
                          Cancel order
                        </button>
                      )}
                    </article>
                  );
                })}
                {list.length === 0 && <div className="k-empty">Nothing here</div>}
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}

type View = "orders" | "menu" | "settings";

function Board() {
  const sb = supabaseBrowser();
  const [view, setView] = useState<View>("orders");
  const header = (
    <header className="k-head">
      <div className="k-head-inner">
        <div className="k-brand">
          <span className="display">darvoo</span>
          <span className="k-tag">Kitchen</span>
        </div>
        <nav className="k-tabs" aria-label="Kitchen sections">
          {(
            [
              ["orders", "Orders"],
              ["menu", "Menu & prices"],
              ["settings", "Slots & settings"],
            ] as [View, string][]
          ).map(([v, label]) => (
            <button key={v} className="k-tab" aria-pressed={view === v} onClick={() => setView(v)}>{label}</button>
          ))}
          <button className="k-signout" onClick={() => sb.auth.signOut()}>Sign out</button>
        </nav>
      </div>
    </header>
  );
  if (view === "menu") return <div className="k-page">{header}<MenuEditor /></div>;
  if (view === "settings") return <div className="k-page">{header}<SettingsEditor /></div>;
  return <Orders header={header} />;
}
