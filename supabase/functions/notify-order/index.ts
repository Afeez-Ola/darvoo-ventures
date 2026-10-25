// notify-order: called by a database trigger whenever an order is created or its status changes.
// Sends web push to the customer (signed-in account or guest who allowed alerts for that order),
// web push to staff for new orders, and an email to the customer when RESEND_API_KEY is set.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const SITE = "https://darvooventures.com";
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
// Secrets live in Supabase Vault (see migration 0013). Push keys are created here on first run,
// so the private key never leaves the server.
let ready: Promise<string> | null = null;
async function init(): Promise<string> {
  const get = async (name: string) => (await sb.rpc("app_secret", { p_name: name })).data as string | null;
  let pub = await get("vapid_public");
  let priv = await get("vapid_private");
  if (!pub || !priv) {
    const k = webpush.generateVAPIDKeys();
    await sb.rpc("set_app_secret", { p_name: "vapid_private", p_value: k.privateKey });
    await sb.rpc("set_app_secret", { p_name: "vapid_public", p_value: k.publicKey });
    pub = k.publicKey; priv = k.privateKey;
  }
  webpush.setVapidDetails("mailto:teejeomo@gmail.com", pub, priv);
  return (await get("notify_secret")) ?? crypto.randomUUID(); // unknown secret = nobody gets in
}

type Lang = "en" | "de";
type Order = {
  id: string; number: number; status: string; mode: "delivery" | "pickup" | "shipping";
  public_token: string; user_id: string | null; email: string | null; customer_name: string;
  total_cents: number; tracking_code: string | null; payment_method: string; created_at: string;
};

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const euro = (c: number) => "€" + (c / 100).toFixed(2).replace(".", ",");

function message(o: Order, lang: Lang): { title: string; body: string } | null {
  const n = `#${o.number}`;
  const de = lang === "de";
  const ship = o.mode === "shipping";
  switch (o.status) {
    case "pending_payment":
      return o.payment_method === "bank_transfer"
        ? { title: de ? `Bestellung ${n} erhalten` : `Order ${n} received`,
            body: de ? `Bitte überweise ${euro(o.total_cents)} innerhalb von 24 Stunden. Bankdaten in der App.` : `Please transfer ${euro(o.total_cents)} within 24 hours. Bank details in the app.` }
        : null;
    case "received":
      return { title: de ? `Bestellung ${n} bestätigt` : `Order ${n} confirmed`,
               body: ship ? (de ? "Zahlung erhalten. Wir verpacken dein Paket bald." : "Payment received. We'll pack your parcel soon.")
                          : (de ? "Zahlung erhalten. Wir fangen bald an zu kochen." : "Payment received. We'll start cooking soon.") };
    case "cooking":
      return ship ? { title: de ? "Dein Paket wird verpackt" : "Your parcel is being packed", body: de ? `Bestellung ${n}` : `Order ${n}` }
                  : { title: de ? "Dein Essen wird gekocht" : "Your food is being cooked", body: de ? `Bestellung ${n} ist in der Küche.` : `Order ${n} is in the kitchen.` };
    case "ready":
      if (ship) return null;
      return o.mode === "pickup"
        ? { title: de ? "Fertig zum Abholen!" : "Ready for pickup!", body: de ? `Bestellung ${n} wartet in der Hauffgasse 6, 1110 Wien.` : `Order ${n} is waiting at Hauffgasse 6, 1110 Vienna.` }
        : { title: de ? "Dein Essen ist fertig" : "Your food is ready", body: de ? `Bestellung ${n} geht gleich auf den Weg.` : `Order ${n} leaves the kitchen shortly.` };
    case "out_for_delivery":
      return ship
        ? { title: de ? "Dein Paket ist unterwegs" : "Your parcel is on its way",
            body: (de ? `Bestellung ${n} wurde verschickt.` : `Order ${n} has been posted.`) + (o.tracking_code ? (de ? ` Sendungsnummer: ${o.tracking_code}` : ` Tracking number: ${o.tracking_code}`) : "") }
        : { title: de ? "Dein Essen ist unterwegs!" : "Your food is on the way!", body: de ? `Bestellung ${n} ist bald bei dir.` : `Order ${n} will be with you soon.` };
    case "completed":
      return { title: de ? "Guten Appetit!" : "Enjoy your meal!",
               body: ship ? (de ? `Bestellung ${n} wurde zugestellt. Danke!` : `Order ${n} has been delivered. Thank you!`)
                          : (de ? `Danke für deine Bestellung ${n}.` : `Thank you for order ${n}.`) };
    case "cancelled":
      return { title: de ? `Bestellung ${n} storniert` : `Order ${n} cancelled`, body: de ? "Wir melden uns bei dir. Fragen: +43 676 7835226" : "We'll be in touch. Questions: +43 676 7835226" };
  }
  return null;
}

async function push(rows: { id: string; endpoint: string; p256dh: string; auth: string }[], payload: Record<string, unknown>) {
  let sent = 0;
  await Promise.all(rows.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600, urgency: "high" });
      sent++;
      await sb.from("push_subscriptions").update({ last_success_at: new Date().toISOString() }).eq("id", s.id);
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await sb.from("push_subscriptions").delete().eq("id", s.id); // subscription expired
      else console.error("push failed", code, String(e).slice(0, 200));
    }
  }));
  return sent;
}

async function email(o: Order, bank: Record<string, string> | null) {
  // the Resend key may be saved as RESEND_API_KEY or under the name "Darvoo"
  const key = Deno.env.get("RESEND_API_KEY") ?? Deno.env.get("Darvoo") ?? Deno.env.get("DARVOO");
  if (!key || !o.email) return "skipped";
  if (o.user_id) {
    const { data: p } = await sb.from("profiles").select("email_updates").eq("user_id", o.user_id).maybeSingle();
    if (p && p.email_updates === false) return "opted-out";
  }
  const de = message(o, "de"), en = message(o, "en");
  if (!de || !en) return "no-message";
  const link = `${SITE}/track/?t=${o.public_token}`;
  const bankHtml = bank && o.status === "pending_payment"
    ? `<table style="margin:16px 0;border-collapse:collapse;font-size:15px">
        <tr><td style="padding:4px 12px 4px 0;color:#57534e">Kontoinhaberin / Account holder</td><td><b>${esc(bank.holder)}</b></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#57534e">IBAN</td><td><b>${bank.iban}</b></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#57534e">BIC</td><td><b>${bank.bic}</b> (${bank.bank})</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#57534e">Betrag / Amount</td><td><b>${euro(o.total_cents)}</b></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#57534e">Verwendungszweck / Reference</td><td><b>Darvoo ${o.number}</b></td></tr></table>`
    : "";
  const first = esc(o.customer_name.split(" ")[0]);
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1c1917">
    <img src="${SITE}/logo-green.png" alt="Darvoo" width="180" style="margin:16px 0">
    <h2 style="margin:0 0 6px">${de.title}</h2><p style="margin:0 0 4px">Hallo ${first}, ${de.body}</p>
    <p style="margin:0 0 4px;color:#57534e">${en.title}. ${en.body}</p>${bankHtml}
    <p><a href="${link}" style="display:inline-block;background:#0b6b34;color:#fff;padding:12px 22px;border-radius:24px;text-decoration:none;font-weight:bold">Bestellung verfolgen · Track order</a></p>
    <p style="font-size:12px;color:#78716c">DarVoo Ventures International &amp; Co. · Hauffgasse 6, 1110 Wien · +43 676 7835226</p></div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("EMAIL_FROM") ?? "Darvoo <orders@darvooventures.com>",
      to: [o.email], reply_to: "teejeomo@gmail.com",
      subject: `${de.title} · ${en.title}`, html,
    }),
  });
  return res.ok ? "sent" : `error ${res.status}: ${(await res.text()).slice(0, 160)}`;
}

Deno.serve(async (req) => {
  ready ??= init();
  const secret = await ready;
  const body = await req.json().catch(() => ({})) as { order_id?: string; event?: "insert" | "status"; setup?: boolean };
  if (body.setup) return Response.json({ ok: true }); // first call creates the push keys
  if (req.headers.get("x-notify-secret") !== secret) return new Response("forbidden", { status: 403 });
  const { order_id, event } = body as { order_id: string; event: "insert" | "status" };
  const { data: o } = await sb.from("orders")
    .select("id,number,status,mode,public_token,user_id,email,customer_name,total_cents,tracking_code,payment_method,created_at")
    .eq("id", order_id).single<Order>();
  if (!o) return new Response("no order", { status: 404 });

  const result: Record<string, unknown> = {};
  const link = `/track/?t=${o.public_token}`;

  // customer push: their account's devices, plus devices that asked for alerts on this order
  const filters = [`order_tokens.cs.{${o.public_token}}`];
  if (o.user_id) filters.push(`user_id.eq.${o.user_id}`);
  const { data: subs } = await sb.from("push_subscriptions").select("id,endpoint,p256dh,auth,lang,is_staff").or(filters.join(","));
  const customerSubs = (subs ?? []).filter((s) => !s.is_staff);
  let sent = 0;
  for (const lang of ["en", "de"] as Lang[]) {
    const m = message(o, lang);
    const rows = customerSubs.filter((s) => (s.lang === "de" ? "de" : "en") === lang);
    if (m && rows.length) sent += await push(rows, { ...m, url: link, tag: `order-${o.number}` });
  }
  result.customer_push = sent;

  // staff push for each new order
  if (event === "insert") {
    const { data: staff } = await sb.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("is_staff", true);
    const kind = o.mode === "shipping" ? "Parcel" : o.mode === "pickup" ? "Pickup" : "Delivery";
    result.staff_push = await push(staff ?? [], {
      title: `New order #${o.number} · ${euro(o.total_cents)}`,
      body: `${kind} for ${o.customer_name}${o.status === "pending_payment" ? " · awaiting bank transfer" : ""}`,
      url: "/kitchen/", tag: `kitchen-${o.number}`, staff: true,
    });
  }

  // email
  let bank: Record<string, string> | null = null;
  if (o.status === "pending_payment") {
    const { data: s } = await sb.from("settings").select("bank_holder,bank_iban,bank_bic,bank_name").eq("id", 1).single();
    if (s) bank = { holder: s.bank_holder, iban: s.bank_iban, bic: s.bank_bic, bank: s.bank_name };
  }
  result.email = await email(o, bank);
  return Response.json(result);
});
