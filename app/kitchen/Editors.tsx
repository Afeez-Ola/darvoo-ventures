"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { euro, hhmm } from "@/lib/format";
import type { Category, Product } from "@/lib/types";

const toCents = (v: string) => Math.round(parseFloat(v.replace(",", ".")) * 100);
const toEuroInput = (c: number) => (c / 100).toFixed(2).replace(".", ",");
const ALLERGEN = /^[ABCDEFGHLMNOPR](\s*,\s*[ABCDEFGHLMNOPR])*$/;

type Row = Product & { active: boolean };
type Draft = { price: string; allergens: string; unit: string; active: boolean; options: string };
const optsText = (o: string[] | null | undefined) => (o ?? []).join(", ");
const optsList = (t: string) => t.split(",").map((x) => x.trim()).filter(Boolean);

export function MenuEditor() {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [cat, setCat] = useState<Category>("dishes");
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulk, setBulk] = useState("");

  const load = async () => {
    const { data, error } = await sb.from("products").select("*").order("category").order("sort");
    if (error) return setMsg("Could not load the menu: " + error.message);
    setRows(data as Row[]);
    setDrafts({});
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draftOf = (r: Row): Draft =>
    drafts[r.id] ?? { price: toEuroInput(r.price_cents), allergens: r.allergens, unit: r.unit, active: r.active, options: optsText(r.options) };
  const setDraft = (r: Row, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [r.id]: { ...draftOf(r), ...patch } }));

  const changed = useMemo(
    () =>
      (rows ?? []).filter((r) => {
        const d = drafts[r.id];
        return d && (toCents(d.price) !== r.price_cents || d.allergens !== r.allergens || d.unit !== r.unit || d.active !== r.active || d.options !== optsText(r.options));
      }),
    [rows, drafts]
  );

  const problems = changed.filter((r) => {
    const d = drafts[r.id];
    const c = toCents(d.price);
    return !Number.isFinite(c) || c < 0 || c > 100000 || (d.allergens.trim() !== "" && !ALLERGEN.test(d.allergens.trim().toUpperCase()));
  });

  const save = async () => {
    setSaving(true);
    setMsg(null);
    for (const r of changed) {
      const d = drafts[r.id];
      const { error } = await sb
        .from("products")
        .update({ price_cents: toCents(d.price), allergens: d.allergens.trim().toUpperCase().replace(/\s*,\s*/g, ", "), unit: d.unit.trim(), active: d.active, options: optsList(d.options) })
        .eq("id", r.id);
      if (error) {
        setMsg(`Could not save ${r.name}: ${error.message}`);
        setSaving(false);
        return;
      }
    }
    setMsg(`Saved ${changed.length} item${changed.length === 1 ? "" : "s"}. The website shows the new prices straight away.`);
    setSaving(false);
    load();
  };

  const applyBulk = () => {
    const c = toCents(bulk);
    if (!Number.isFinite(c) || c < 0) return;
    const next = { ...drafts };
    (rows ?? []).filter((r) => r.category === cat).forEach((r) => (next[r.id] = { ...draftOf(r), price: toEuroInput(c) }));
    setDrafts(next);
  };

  if (!rows) return <main className="k-main"><p className="k-muted">{msg ?? "Loading menu…"}</p></main>;
  const list = rows.filter((r) => r.category === cat);

  return (
    <main className="k-main">
      <div className="k-toolbar">
        <div className="days">
          {(["dishes", "groceries", "events"] as Category[]).map((c) => (
            <button key={c} className="day" aria-pressed={cat === c} onClick={() => setCat(c)}>
              {c === "dishes" ? "Dishes" : c === "groceries" ? "Food stuffs" : "Event trays"}
            </button>
          ))}
        </div>
        <div className="k-bulk">
          <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            Set all to €
            <input value={bulk} onChange={(e) => setBulk(e.target.value)} inputMode="decimal" style={{ width: 90, height: 40 }} placeholder="30,00" />
          </label>
          <button className="k-btn ghost-green" onClick={applyBulk} style={{ width: "auto", padding: "0 14px", height: 40 }}>Apply to this tab</button>
        </div>
      </div>

      <div className="k-table-wrap">
        <table className="k-table">
          <thead>
            <tr><th>Item</th><th>Price €</th><th>Size / unit</th><th>Customer chooses (comma separated)</th><th>Allergens (A to R)</th><th>On menu</th></tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const d = draftOf(r);
              const dirty = !!drafts[r.id];
              return (
                <tr key={r.id} className={dirty ? "dirty" : ""}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {r.image_path ? <img src={r.image_path} alt="" width={40} height={40} style={{ borderRadius: 8, objectFit: "cover" }} /> : <span style={{ width: 40 }} />}
                      <span>{r.name}</span>
                    </div>
                  </td>
                  <td><input aria-label={`Price for ${r.name}`} inputMode="decimal" value={d.price} onChange={(e) => setDraft(r, { price: e.target.value })} style={{ width: 90 }} /></td>
                  <td><input aria-label={`Unit for ${r.name}`} value={d.unit} onChange={(e) => setDraft(r, { unit: e.target.value })} style={{ width: 120 }} /></td>
                  <td><input aria-label={`Choices for ${r.name}`} value={d.options} placeholder="e.g. with fish, with meat" onChange={(e) => setDraft(r, { options: e.target.value })} style={{ width: 210 }} /></td>
                  <td><input aria-label={`Allergens for ${r.name}`} value={d.allergens} placeholder="e.g. A, C, D" onChange={(e) => setDraft(r, { allergens: e.target.value })} style={{ width: 120 }} /></td>
                  <td>
                    <label className="check" style={{ minHeight: 0 }}>
                      <input type="checkbox" checked={d.active} onChange={(e) => setDraft(r, { active: e.target.checked })} />
                      <span className="k-muted small">{d.active ? "Shown" : "Hidden"}</span>
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="k-savebar">
        {problems.length > 0 && <span className="k-err">Check {problems.map((p) => p.name).join(", ")}: price must be a number, allergens letters A to R separated by commas.</span>}
        {msg && <span className="k-muted" role="status">{msg}</span>}
        <button className="k-btn" style={{ width: "auto", padding: "0 22px" }} disabled={!changed.length || problems.length > 0 || saving} onClick={save}>
          {saving ? "Saving…" : changed.length ? `Save ${changed.length} change${changed.length === 1 ? "" : "s"}` : "No changes"}
        </button>
      </div>
    </main>
  );
}

interface SlotRow { slot_time: string; capacity: number }

export function SettingsEditor() {
  const sb = supabaseBrowser();
  const [fee, setFee] = useState("");
  const [cutoff, setCutoff] = useState("");
  const [days, setDays] = useState("7");
  const [shipFee, setShipFee] = useState("");
  const [freeShip, setFreeShip] = useState("");
  const [dispatch, setDispatch] = useState("2");
  const [euFee, setEuFee] = useState("");
  const [payMode, setPayMode] = useState("bank_transfer");
  const [holder, setHolder] = useState("");
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [bankName, setBankName] = useState("");
  const [hours, setHours] = useState("24");
  const [countries, setCountries] = useState("");
  const [prefixes, setPrefixes] = useState("1");
  const [farFee, setFarFee] = useState("");
  const [farPcs, setFarPcs] = useState("");
  const [slots, setSlots] = useState<SlotRow[] | null>(null);
  const [original, setOriginal] = useState<SlotRow[]>([]);
  const [newTime, setNewTime] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [s, t] = await Promise.all([
      sb.from("settings").select("*").single(),
      sb.from("slot_templates").select("slot_time,capacity").order("slot_time"),
    ]);
    if (s.data) {
      setFee(toEuroInput(s.data.delivery_fee_cents));
      setCutoff(hhmm(s.data.same_day_cutoff));
      setDays(String(s.data.booking_days));
      setShipFee(toEuroInput(s.data.shipping_fee_cents));
      setFreeShip(s.data.free_shipping_from_cents == null ? "" : toEuroInput(s.data.free_shipping_from_cents));
      setDispatch(String(s.data.ship_dispatch_days));
      setEuFee(toEuroInput(s.data.shipping_fee_eu_cents));
      setPayMode(s.data.payment_mode);
      setHolder(s.data.bank_holder);
      setIban(s.data.bank_iban);
      setBic(s.data.bank_bic);
      setBankName(s.data.bank_name);
      setHours(String(s.data.transfer_hours));
      setCountries((s.data.ship_countries ?? []).join(", "));
      setPrefixes((s.data.delivery_postcode_prefixes ?? []).join(", "));
      setFarFee(toEuroInput(s.data.delivery_fee_far_cents));
      setFarPcs((s.data.far_postcodes ?? []).join(", "));
    }
    setSlots((t.data ?? []) as SlotRow[]);
    setOriginal((t.data ?? []) as SlotRow[]);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSettings = async () => {
    const c = toCents(fee);
    const d = parseInt(days, 10);
    const sf = toCents(shipFee);
    const fs = freeShip.trim() === "" ? null : toCents(freeShip);
    const dd = parseInt(dispatch, 10);
    const pre = prefixes.split(",").map((x) => x.trim()).filter(Boolean);
    const ff = toCents(farFee);
    const far = farPcs.split(",").map((x) => x.trim()).filter(Boolean);
    const eu = toCents(euFee);
    const hh = parseInt(hours, 10);
    const ibanOk = /^[A-Z]{2}\d{2}[A-Z0-9 ]{10,32}$/.test(iban.trim().toUpperCase());
    const ccs = countries.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean);
    if (
      !Number.isFinite(c) || c < 0 || !/^\d{2}:\d{2}$/.test(cutoff) || !(d >= 0 && d <= 60) ||
      !Number.isFinite(sf) || sf < 0 || (fs !== null && (!Number.isFinite(fs) || fs < 0)) || !(dd >= 0 && dd <= 30) ||
      !pre.length || pre.some((x) => !/^\d{1,4}$/.test(x)) ||
      !Number.isFinite(ff) || ff < 0 || far.some((x) => !/^\d{4}$/.test(x)) ||
      !(hh >= 1 && hh <= 168) || !ibanOk || !holder.trim() ||
      !Number.isFinite(eu) || eu < 0 || !ccs.includes("AT") || ccs.some((x) => !/^[A-Z]{2}$/.test(x))
    ) {
      setMsg("Check the values: fees are numbers, cut-off like 15:00, booking days 0 to 60, dispatch days 0 to 30, postcodes like 1 or 2193, countries as two-letter codes like AT, DE including AT.");
      return;
    }
    setBusy(true);
    const { error } = await sb.from("settings").update({
      delivery_fee_cents: c, same_day_cutoff: cutoff, booking_days: d,
      shipping_fee_cents: sf, free_shipping_from_cents: fs, ship_dispatch_days: dd, delivery_postcode_prefixes: pre,
      delivery_fee_far_cents: ff, far_postcodes: far,
      shipping_fee_eu_cents: eu, ship_countries: ccs,
      payment_mode: payMode, bank_holder: holder.trim(), bank_iban: iban.trim().toUpperCase(), bank_bic: bic.trim().toUpperCase(),
      bank_name: bankName.trim(), transfer_hours: hh,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    setMsg(error ? "Could not save: " + error.message : "Settings saved.");
    setBusy(false);
  };

  const saveSlots = async () => {
    if (!slots) return;
    setBusy(true);
    const removed = original.filter((o) => !slots.find((s) => s.slot_time === o.slot_time));
    for (const r of removed) await sb.from("slot_templates").delete().eq("slot_time", r.slot_time);
    const { error } = await sb.from("slot_templates").upsert(slots.map((s) => ({ slot_time: s.slot_time, capacity: Math.max(0, s.capacity) })));
    setMsg(error ? "Could not save slots: " + error.message : "Time slots saved.");
    setBusy(false);
    load();
  };

  return (
    <main className="k-main k-settings">
      {msg && <p className="notice green" role="status" style={{ margin: "0 0 16px" }}>{msg}</p>}

      <section className="k-panel">
        <h2>Delivery and ordering</h2>
        <div className="k-form-row">
          <label className="field">Delivery fee, up to ~10 km (€)<input inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} /></label>
          <label className="field">Delivery fee, over ~10 km (€)<input inputMode="decimal" value={farFee} onChange={(e) => setFarFee(e.target.value)} /></label>
          <label className="field">Same day orders until<input type="time" value={cutoff} onChange={(e) => setCutoff(e.target.value)} /></label>
          <label className="field">Days ahead customers can book<input type="number" min={0} max={60} value={days} onChange={(e) => setDays(e.target.value)} /></label>
        </div>
        <div className="k-form-row">
          <label className="field">Delivery postcodes (start with)
            <input value={prefixes} onChange={(e) => setPrefixes(e.target.value)} placeholder="1, 2193" />
            <span className="k-muted small" style={{ fontWeight: 400 }}>1 = all of Vienna. Add more separated by commas, e.g. 1, 2193.</span>
          </label>
          <label className="field">Postcodes over ~10 km (pay the higher fee)
            <input value={farPcs} onChange={(e) => setFarPcs(e.target.value)} placeholder="1210, 1220, 1230" />
            <span className="k-muted small" style={{ fontWeight: 400 }}>Every other delivery postcode pays the lower fee.</span>
          </label>
        </div>
        <h2 style={{ marginTop: 8 }}>Shipping food stuffs across Europe</h2>
        <div className="k-form-row">
          <label className="field">Shipping fee Austria (€)<input inputMode="decimal" value={shipFee} onChange={(e) => setShipFee(e.target.value)} /></label>
          <label className="field">Shipping fee other countries (€)<input inputMode="decimal" value={euFee} onChange={(e) => setEuFee(e.target.value)} /></label>
          <label className="field">Free shipping in Austria from (€, empty = never)<input inputMode="decimal" value={freeShip} onChange={(e) => setFreeShip(e.target.value)} /></label>
          <label className="field">Posted within (working days)<input type="number" min={0} max={30} value={dispatch} onChange={(e) => setDispatch(e.target.value)} /></label>
        </div>
        <label className="field">Countries we ship to (two-letter codes)
          <input value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="AT, DE, NL" />
          <span className="k-muted small" style={{ fontWeight: 400 }}>Default: all 27 EU countries. Outside the EU (UK, Switzerland, Norway) fish and meat products need customs checks, so add those only after asking the post office.</span>
        </label>
        <h2 style={{ marginTop: 8 }}>Payment</h2>
        <label className="field">How customers pay
          <select value={payMode} onChange={(e) => setPayMode(e.target.value)} style={{ height: 44, borderRadius: 10, border: "1px solid var(--field)", padding: "0 10px" }}>
            <option value="bank_transfer">Bank transfer only (until Stripe is verified)</option>
            <option value="online">Online payment (Stripe live)</option>
          </select>
        </label>
        <div className="k-form-row">
          <label className="field">Account holder<input value={holder} onChange={(e) => setHolder(e.target.value)} /></label>
          <label className="field">IBAN<input value={iban} onChange={(e) => setIban(e.target.value)} /></label>
          <label className="field">BIC<input value={bic} onChange={(e) => setBic(e.target.value)} /></label>
          <label className="field">Bank<input value={bankName} onChange={(e) => setBankName(e.target.value)} /></label>
          <label className="field">Customer must pay within (hours)<input type="number" min={1} max={168} value={hours} onChange={(e) => setHours(e.target.value)} /></label>
        </div>
        <button className="k-btn" style={{ width: "auto", padding: "0 22px" }} disabled={busy} onClick={saveSettings}>Save settings</button>
      </section>

      <section className="k-panel">
        <h2>Time slots</h2>
        <p className="k-muted" style={{ marginTop: 0 }}>How many orders the kitchen can handle at each time. Set 0 to close a slot. Applies to every day.</p>
        {!slots ? (
          <p className="k-muted">Loading…</p>
        ) : (
          <div className="k-slots">
            {slots.map((s, i) => (
              <div key={s.slot_time} className="k-slot">
                <strong>{hhmm(s.slot_time)}</strong>
                <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <input type="number" min={0} max={99} aria-label={`Orders at ${hhmm(s.slot_time)}`} value={s.capacity} style={{ width: 70, height: 40 }}
                    onChange={(e) => setSlots(slots.map((x, k) => (k === i ? { ...x, capacity: parseInt(e.target.value || "0", 10) } : x)))} />
                  orders
                </label>
                <button className="k-x" aria-label={`Remove ${hhmm(s.slot_time)}`} onClick={() => setSlots(slots.filter((_, k) => k !== i))}>Remove</button>
              </div>
            ))}
          </div>
        )}
        <div className="k-form-row" style={{ alignItems: "flex-end" }}>
          <label className="field">Add a time<input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} /></label>
          <button className="k-btn ghost-green" style={{ width: "auto", padding: "0 18px" }}
            onClick={() => {
              if (!newTime || !slots || slots.find((s) => hhmm(s.slot_time) === newTime)) return;
              setSlots([...slots, { slot_time: newTime + ":00", capacity: 4 }].sort((a, b) => a.slot_time.localeCompare(b.slot_time)));
              setNewTime("");
            }}>Add</button>
          <button className="k-btn" style={{ width: "auto", padding: "0 22px" }} disabled={busy} onClick={saveSlots}>Save time slots</button>
        </div>
        <p className="k-muted small">Delivery fee now: {fee ? euro(toCents(fee) || 0) : "…"}</p>
      </section>
    </main>
  );
}
