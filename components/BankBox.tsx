"use client";

import { fill, useI18n } from "@/lib/i18n";
import { clock, dayLabel, euro } from "@/lib/format";
import type { TrackedOrder } from "@/lib/types";

/** Bank transfer details for an unpaid order, with copy buttons. */
export default function BankBox({ order }: { order: TrackedOrder }) {
  const { t, lang } = useI18n();
  if (order.status !== "pending_payment" || !order.bank) return null;
  const b = order.bank;
  const by = `${dayLabel(new Date(b.pay_by).toLocaleDateString("en-CA", { timeZone: "Europe/Vienna" }), lang)} ${clock(b.pay_by)}`;
  const rows: [string, string, string][] = [
    [t.bankHolder, b.holder, b.holder],
    ["IBAN", b.iban, b.iban.replace(/\s/g, "")],
    ["BIC", `${b.bic} (${b.bank})`, b.bic],
    [t.bankAmount, euro(order.total_cents), (order.total_cents / 100).toFixed(2)],
    [t.bankReference, b.reference, b.reference],
  ];
  return (
    <section className="bank-box" aria-label={t.bankTitle}>
      <h2>{t.bankTitle}</h2>
      <p>{fill(t.bankIntro, { x: euro(order.total_cents), by })}</p>
      <dl>
        {rows.map(([k, shown, copy]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>
              <span>{shown}</span>
              <button type="button" className="copy-btn" onClick={() => navigator.clipboard?.writeText(copy)}>{t.copy}</button>
            </dd>
          </div>
        ))}
      </dl>
      <p className="small">{t.bankAfter}</p>
    </section>
  );
}
