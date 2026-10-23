"use client";

import { useState } from "react";
import { useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { euro, hhmm } from "@/lib/format";
import type { Category, Product, Settings } from "@/lib/types";
import { Clock, Minus, Plus, Truck } from "@/components/Icons";
import SiteFooter from "@/components/SiteFooter";

export default function MenuView({
  products,
  settings,
  failed,
}: {
  products: Product[] | null;
  settings: Settings | null;
  failed?: boolean;
}) {
  const { t, lang, setLang } = useI18n();
  const cart = useCart();
  const [tab, setTab] = useState<Category>("dishes");
  // chosen option per dish (defaults to its first option)
  const [picked, setPicked] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!products) return;
    setPicked((prev) => {
      const next = { ...prev };
      products.forEach((p) => { if (p.options?.length && !p.options.includes(next[p.id])) next[p.id] = p.options[0]; });
      return next;
    });
  }, [products]);
  const shown = (products ?? []).filter((p) => p.category === tab);
  const paused = settings ? !settings.accepting_orders : false;

  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="display brand-word">darvoo</span>
          <span className="brand-sub">{t.tagline}</span>
        </Link>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="lang-btn"
            onClick={() => setLang(lang === "en" ? "de" : "en")}
            aria-label={lang === "en" ? "Auf Deutsch wechseln" : "Switch to English"}
          >
            {lang === "en" ? "DE" : "EN"}
          </button>
          <Link href="/track" className="icon-btn" aria-label="Track your order">
            <Truck />
          </Link>
        </div>
      </header>

      <section className="hero">
        <img src="/hero.jpg" alt="Victoria from Darvoo serving jollof rice to a customer at a street market in Vienna" />
        <div className="hero-body">
          <span className="eyebrow">{t.heroEyebrow}</span>
          <h1 className="display">{t.heroTitle}</h1>
          <div className="chips">
            {settings && (
              <span className="chip">
                <Clock /> {t.orderUntil} {hhmm(settings.same_day_cutoff)}
              </span>
            )}
            <span className="chip">{t.shippingAustria}</span>
            <span className="chip">{t.eventCatering}</span>
          </div>
        </div>
      </section>

      {paused && <div className="notice red" role="status">{t.paused}</div>}

      <nav className="tabs" aria-label="Menu sections">
        {(["dishes", "groceries", "events"] as Category[]).map((c) => (
          <button key={c} className="tab" aria-pressed={tab === c} onClick={() => setTab(c)}>
            {t[c]}
          </button>
        ))}
      </nav>

      {tab === "groceries" && <div className="notice green">{t.groceriesNote}</div>}
      {tab === "events" && <div className="notice gold">{t.eventsNote}</div>}

      {failed && <div className="notice red" role="alert">{t.loadFailed}</div>}
      <div className="grid" aria-busy={products === null}>
        {products === null &&
          Array.from({ length: 6 }, (_, i) => (
            <div className="card" key={i} aria-hidden="true">
              <div className="card-photo skeleton" />
              <div className="skeleton" style={{ height: 16, borderRadius: 6, width: "80%" }} />
            </div>
          ))}
        {shown.map((p) => {
          const opt = p.options?.length ? picked[p.id] ?? p.options[0] : null;
          const q = cart.qtyOf(p.id, opt);
          return (
            <article className="card" key={p.id}>
              <div className="card-photo">
                {p.image_path ? (
                  <img src={p.image_path} alt={p.name} loading="lazy" />
                ) : (
                  <div className="nophoto">{t.photoComing}</div>
                )}
                {!paused && q === 0 && (
                  <button className="add-fab" aria-label={`${t.add}: ${p.name}`} onClick={() => cart.setQty(p, 1, opt)}>
                    <Plus />
                  </button>
                )}
                {!paused && q > 0 && (
                  <div className="stepper">
                    <button aria-label={`${t.remove}: ${p.name}`} onClick={() => cart.setQty(p, q - 1, opt)}>
                      <Minus />
                    </button>
                    <span aria-live="polite">{q}</span>
                    <button aria-label={`${t.add}: ${p.name}`} onClick={() => cart.setQty(p, q + 1, opt)}>
                      <Plus size={16} />
                    </button>
                  </div>
                )}
              </div>
              <h2>{p.name}</h2>
              {!!p.options?.length && (
                <label className="opt">
                  <span className="sr-only">{t.choose}: {p.name}</span>
                  <select value={opt ?? ""} onChange={(e) => setPicked((x) => ({ ...x, [p.id]: e.target.value }))}>
                    {p.options.map((o) => (
                      <option key={o} value={o}>{o}{cart.qtyOf(p.id, o) ? ` (${cart.qtyOf(p.id, o)} in basket)` : ""}</option>
                    ))}
                  </select>
                </label>
              )}
              <div className="price-row">
                <span className="price">{euro(p.price_cents)}</span>
                <span className="unit">{p.unit}</span>
              </div>
              {p.allergens && (
                <span className="unit" title={t.allergenHelp}>{t.allergens}: {p.allergens}</span>
              )}
            </article>
          );
        })}
      </div>

      <div className="summary" style={{ marginTop: 28, justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <strong style={{ fontSize: 14 }}>{t.planningEvent}</strong>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>+43 676 7835226 · +43 676 4022539</span>
        </div>
        <a href="tel:+436767835226" className="outline" style={{ height: 44, padding: "0 18px", fontSize: 14 }}>
          {t.callUs}
        </a>
      </div>

      <SiteFooter />

      {cart.ready && cart.count > 0 && !paused && (
        <div className="bottombar">
          <div className="bottombar-inner">
            <Link href="/basket" className="primary basket-link">
              <span>{t.viewBasket}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span>{euro(cart.subtotal)}</span>
                <span className="count-badge">{cart.count}</span>
              </span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
