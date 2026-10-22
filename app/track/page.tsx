"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { rememberedOrders, RememberedOrder } from "@/lib/orders";
import PageBar from "@/components/PageBar";

export default function TrackList() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<RememberedOrder[] | null>(null);
  useEffect(() => setOrders(rememberedOrders()), []);

  return (
    <div className="shell">
      <PageBar title={t.yourOrder} back="/" backLabel={t.backToMenu} />
      {orders && orders.length === 0 && <p className="center-msg">{t.notFound}</p>}
      <div className="box" style={{ display: orders?.length ? "block" : "none" }}>
        {orders?.map((o) => (
          <Link key={o.token} href={`/track/${o.token}`} className="line" style={{ textDecoration: "none", color: "inherit", minHeight: 56 }}>
            <strong style={{ flex: 1 }}>{t.order} #{o.number}</strong>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{new Date(o.at).toLocaleDateString("de-AT")}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
