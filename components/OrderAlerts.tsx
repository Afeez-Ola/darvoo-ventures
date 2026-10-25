"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { enablePush, linkPushIfAllowed, pushPermission, type PushResult } from "@/lib/push";
import { Bell } from "./Icons";

/** "Get alerts for this order" card: phone notifications for one order. */
export default function OrderAlerts({ token }: { token: string }) {
  const { t, lang } = useI18n();
  const [state, setState] = useState<PushResult | "idle">("idle");
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  useEffect(() => {
    setPerm(pushPermission());
    // already allowed on this device: link this order silently
    linkPushIfAllowed({ orderToken: token, lang }).then((ok) => ok && setState("on"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  if (perm === "unsupported") return null;
  return (
    <section className="alerts-card">
      <span className="alerts-icon"><Bell size={22} /></span>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        {state === "on" ? <><strong>{t.alertsTitle}</strong><span className="hint">{t.trackAlertsOn}</span></>
          : perm === "denied" || state === "denied" ? <><strong>{t.alertsTitle}</strong><span className="hint">{t.alertsDenied}</span></>
          : <button className="primary" style={{ height: 44, fontSize: 15 }} onClick={async () => setState(await enablePush({ orderToken: token, lang }))}>{t.trackAlerts}</button>}
      </div>
    </section>
  );
}
