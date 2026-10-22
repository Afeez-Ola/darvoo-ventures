"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { rememberedOrders, RememberedOrder } from "@/lib/orders";
import PageBar from "@/components/PageBar";
import TrackOrder from "./TrackOrder";

function TrackList() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<RememberedOrder[] | null>(null);
  useEffect(() => setOrders(rememberedOrders()), []);

  return (
    <div className="shell">
      <PageBar title={t.yourOrder} back="/" backLabel={t.backToMenu} />
      {orders && orders.length === 0 && <p className="center-msg">{t.notFound}</p>}
      {!!orders?.length && (
        <div className="box">
          {orders.map((o) => (
            <Link key={o.token} href={`/track/?t=${o.token}`} className="line" style={{ textDecoration: "none", color: "inherit", minHeight: 56 }}>
              <strong style={{ flex: 1 }}>{t.order} #{o.number}</strong>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{new Date(o.at).toLocaleDateString("de-AT")}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function TrackRouter() {
  const token = useSearchParams().get("t");
  return token ? <TrackOrder token={token} /> : <TrackList />;
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="shell"><p className="center-msg">…</p></div>}>
      <TrackRouter />
    </Suspense>
  );
}
