"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { Dict, fill, useI18n } from "@/lib/i18n";
import { supabaseBrowser, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase";
import { euro, dayLabel } from "@/lib/format";
import { rememberedOrders } from "@/lib/orders";
import { enablePush, linkPushIfAllowed, pushPermission, type PushResult } from "@/lib/push";
import PageBar from "@/components/PageBar";
import SiteFooter from "@/components/SiteFooter";
import { Bell } from "@/components/Icons";
import type { Mode, OrderStatus } from "@/lib/types";


interface MyOrder {
  id: string; number: number; status: OrderStatus; mode: Mode; created_at: string;
  total_cents: number; public_token: string; order_items: { name: string; qty: number }[];
}
interface Profile {
  name: string | null; phone: string | null; street: string | null; postcode: string | null;
  city: string | null; country: string; door: string | null; email_updates: boolean; lang: string;
}
const EMPTY: Profile = { name: "", phone: "", street: "", postcode: "", city: "", country: "AT", door: "", email_updates: true, lang: "en" };

function statusText(t: Dict, o: MyOrder) {
  if (o.mode === "shipping" && (o.status === "cooking" || o.status === "ready")) return t.st_ship_cooking;
  if (o.mode === "shipping" && o.status === "out_for_delivery") return t.st_ship_out_for_delivery;
  if (o.mode === "pickup" && o.status === "completed") return t.st_completed_pickup;
  return t[("st_" + o.status) as keyof Dict] ?? o.status;
}

export default function AccountPage() {
  const { t } = useI18n();
  const sb = supabaseBrowser();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [providers, setProviders] = useState<{ google: boolean; phone: boolean }>({ google: false, phone: false });

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    // which sign-in methods are switched on in Supabase
    fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } })
      .then((r) => r.json())
      .then((s) => setProviders({ google: !!s?.external?.google, phone: !!s?.external?.phone }))
      .catch(() => {});
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  return (
    <div className="shell" style={{ paddingBottom: 40 }}>
      <PageBar title={session ? t.account : t.signIn} back="/" backLabel={t.backToMenu} />
      {session === undefined ? (
        <p className="center-msg">…</p>
      ) : session ? (
        <SignedIn session={session} />
      ) : (
        <SignInForm providers={providers} />
      )}
      <SiteFooter />
    </div>
  );
}

function SignInForm({ providers }: { providers: { google: boolean; phone: boolean } }) {
    const { t } = useI18n();
    const sb = supabaseBrowser();
    const [method, setMethod] = useState<"email" | "phone">("email");
    const [id, setId] = useState("");
    const [code, setCode] = useState("");
    const [sent, setSent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const phone = () => "+" + id.replace(/[^\d]/g, "").replace(/^00/, "");

    const send = async () => {
      setBusy(true); setErr(null);
      const { error } = method === "email"
        ? await sb.auth.signInWithOtp({ email: id.trim(), options: { shouldCreateUser: true } })
        : await sb.auth.signInWithOtp({ phone: phone() });
      setBusy(false);
      if (error) setErr(error.message); else setSent(true);
    };
    const verify = async () => {
      setBusy(true); setErr(null);
      const { error } = method === "email"
        ? await sb.auth.verifyOtp({ email: id.trim(), token: code.trim(), type: "email" })
        : await sb.auth.verifyOtp({ phone: phone(), token: code.trim(), type: "sms" });
      setBusy(false);
      if (error) setErr(t.authError);
    };
    const google = () => sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/account/` } });

    return (
      <section className="section">
        <p className="hint" style={{ fontSize: 14, lineHeight: "20px" }}>{t.signInIntro}</p>
        {providers.google && (
          <>
            <button className="outline" onClick={google} style={{ width: "100%" }}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.4 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>
              {t.withGoogle}
            </button>
            <p className="hint" style={{ textAlign: "center" }}>{t.orUse}</p>
          </>
        )}
        {providers.phone && !sent && (
          <div className="segment">
            <button aria-pressed={method === "email"} onClick={() => { setMethod("email"); setId(""); }}>{t.byEmail}</button>
            <button aria-pressed={method === "phone"} onClick={() => { setMethod("phone"); setId(""); }}>{t.bySms}</button>
          </div>
        )}
        {!sent ? (
          <>
            <label className="field">{method === "email" ? t.emailLabel : t.phoneLabel}
              <input value={id} onChange={(e) => setId(e.target.value)}
                type={method === "email" ? "email" : "tel"} autoComplete={method === "email" ? "email" : "tel"}
                placeholder={method === "email" ? "name@example.com" : "+43 660 1234567"} />
              {method === "phone" && <span className="hint" style={{ fontWeight: 400 }}>{t.phoneHint}</span>}
            </label>
            <button className="primary" disabled={busy || id.trim().length < 5} onClick={send}>{busy ? "…" : t.sendCode}</button>
          </>
        ) : (
          <>
            <p className="notice green" style={{ margin: 0 }}>{fill(method === "email" ? t.codeSentEmail : t.codeSentPhone, { x: id })}</p>
            <label className="field">{t.codeLabel}
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                inputMode="numeric" autoComplete="one-time-code" placeholder="123456" />
            </label>
            <button className="primary" disabled={busy || code.length < 6} onClick={verify}>{busy ? "…" : t.verify}</button>
            <button className="back" style={{ width: "auto", border: 0, background: "none", fontWeight: 700, color: "var(--green)" }}
              onClick={() => { setSent(false); setCode(""); }}>{t.useOther}</button>
          </>
        )}
        {err && <p className="notice red" role="alert" style={{ margin: 0 }}>{err}</p>}
      </section>
    );
  }

function SignedIn({ session }: { session: Session }) {
    const { t, lang } = useI18n();
    const sb = supabaseBrowser();
    const [orders, setOrders] = useState<MyOrder[] | null>(null);
    const [profile, setProfile] = useState<Profile>(EMPTY);
    const [linked, setLinked] = useState(0);
    const [staff, setStaff] = useState(false);
    const [alerts, setAlerts] = useState<PushResult | "idle">("idle");
    const [savedMsg, setSavedMsg] = useState(false);
    const user = session.user;

    const load = useCallback(async () => {
      const { data } = await sb.from("orders")
        .select("id,number,status,mode,created_at,total_cents,public_token,order_items(name,qty)")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
      setOrders((data ?? []) as MyOrder[]);
    }, [user.id]);

    useEffect(() => {
      (async () => {
        const { data: n } = await sb.rpc("claim_orders", { p_tokens: rememberedOrders().map((o) => o.token) });
        if (typeof n === "number" && n > 0) setLinked(n);
        const { data: st } = await sb.rpc("is_staff");
        setStaff(!!st);
        const { data: p } = await sb.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
        if (p) setProfile({ ...EMPTY, ...p });
        else {
          const meta = user.user_metadata ?? {};
          setProfile({ ...EMPTY, name: meta.full_name ?? meta.name ?? "", phone: user.phone ? "+" + user.phone : "", lang });
        }
        await load();
        if (await linkPushIfAllowed({ lang })) setAlerts("on");
      })();
      // live status changes for my orders
      const ch = sb.channel("my-orders")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` }, () => load())
        .subscribe();
      return () => { sb.removeChannel(ch); };
    }, [load, user]);

    const saveProfile = async () => {
      const row = { ...profile, user_id: user.id, lang, updated_at: new Date().toISOString() };
      const { error } = await sb.from("profiles").upsert(row);
      if (!error) { setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2500); }
    };
    const del = async () => {
      if (!confirm(t.deleteConfirm)) return;
      const { error } = await sb.rpc("delete_my_account");
      if (!error) { await sb.auth.signOut(); alert(t.deleted); location.href = "/"; }
    };
    const perm = pushPermission();
    const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => setProfile((p) => ({ ...p, [k]: e.target.value }));

    return (
      <>
        <section className="section">
          <h2 className="display" style={{ fontSize: 22 }}>{fill(t.hello, { x: profile.name?.split(" ")[0] || user.email || (user.phone ? "+" + user.phone : "") })}</h2>
          <span className="hint">{user.email ?? (user.phone ? "+" + user.phone : "")}</span>
          {linked > 0 && <p className="notice green" style={{ margin: 0 }}>{fill(t.linkedOrders, { n: linked })}</p>}
          {staff && (
            <p className="notice gold" style={{ margin: 0 }}>{t.staffNote} <Link href="/kitchen/" style={{ fontWeight: 700 }}>{t.openKitchen}</Link></p>
          )}
        </section>

        <section className="alerts-card">
          <span className="alerts-icon"><Bell size={22} /></span>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <strong>{t.alertsTitle}</strong>
            {alerts === "on" ? <span className="hint">{t.alertsOn}</span>
              : perm === "unsupported" || alerts === "unsupported" ? <span className="hint">{t.alertsUnsupported}</span>
              : perm === "denied" || alerts === "denied" ? <span className="hint">{t.alertsDenied}</span>
              : <>
                  <span className="hint">{t.alertsText}</span>
                  <button className="primary" style={{ height: 44, fontSize: 15 }} onClick={async () => setAlerts(await enablePush({ lang }))}>{t.alertsTurnOn}</button>
                </>}
          </div>
        </section>

        <section className="section">
          <h2>{t.myOrders}</h2>
          {orders === null ? <p className="hint">…</p> : orders.length === 0 ? <p className="hint">{t.noOrders}</p> : (
            <div className="box" style={{ margin: 0 }}>
              {orders.map((o) => (
                <Link key={o.id} href={`/track/?t=${o.public_token}`} className="line order-line">
                  <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                    <strong style={{ fontSize: 15 }}>#{o.number} · {statusText(t, o)}</strong>
                    <span className="hint">
                      {dayLabel(new Date(o.created_at).toLocaleDateString("en-CA", { timeZone: "Europe/Vienna" }), lang)} · {o.order_items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                    </span>
                  </span>
                  <strong style={{ fontSize: 15 }}>{euro(o.total_cents)}</strong>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="section">
          <h2>{t.myDetails}</h2>
          <p className="hint" style={{ marginTop: -6 }}>{t.detailsHint}</p>
          <label className="field">{t.name}<input value={profile.name ?? ""} autoComplete="name" onChange={set("name")} /></label>
          <label className="field">{t.phone}<input type="tel" value={profile.phone ?? ""} autoComplete="tel" onChange={set("phone")} /></label>
          <label className="field">{t.street}<input value={profile.street ?? ""} autoComplete="street-address" onChange={set("street")} /></label>
          <div className="two">
            <label className="field">{t.postcode}<input value={profile.postcode ?? ""} autoComplete="postal-code" onChange={set("postcode")} /></label>
            <label className="field">{t.city}<input value={profile.city ?? ""} autoComplete="address-level2" onChange={set("city")} /></label>
          </div>
          <label className="field">{t.door}<input value={profile.door ?? ""} onChange={set("door")} /></label>
          <label className="check">
            <input type="checkbox" checked={profile.email_updates} onChange={(e) => setProfile((p) => ({ ...p, email_updates: e.target.checked }))} />
            {t.emailUpdates}
          </label>
          <button className="primary" onClick={saveProfile}>{savedMsg ? t.saved : t.save}</button>
        </section>

        <section className="section" style={{ gap: 8 }}>
          <button className="outline" onClick={() => sb.auth.signOut()}>{t.signOut}</button>
          {!staff && <button className="link-danger" onClick={del}>{t.deleteAccount}</button>}
        </section>
      </>
    );
  }
