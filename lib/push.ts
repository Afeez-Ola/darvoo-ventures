"use client";

import { supabaseBrowser } from "./supabase";

export type PushResult = "on" | "denied" | "unsupported" | "error";

function keyBytes(base64url: string) {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function pushPermission(): NotificationPermission | "unsupported" {
  return pushSupported() ? Notification.permission : "unsupported";
}

/**
 * Ask for notification permission (must be called from a tap) and register this device.
 * orderToken: alerts for one order (guests). staff: kitchen alerts for every new order.
 */
export async function enablePush(opts: { orderToken?: string; staff?: boolean; lang?: string } = {}): Promise<PushResult> {
  if (!pushSupported()) return "unsupported";
  try {
    const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (perm !== "granted") return "denied";
    const reg = (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
    await navigator.serviceWorker.ready;
    const sb = supabaseBrowser();
    const { data: key } = await sb.rpc("push_public_key");
    if (!key) return "error";
    const sub = (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key as string) }));
    const { error } = await sb.rpc("save_push_subscription", {
      p_sub: sub.toJSON(), p_order_token: opts.orderToken ?? null, p_lang: opts.lang === "de" ? "de" : "en", p_staff: !!opts.staff,
    });
    return error ? "error" : "on";
  } catch {
    return "error";
  }
}

/** If the person already allowed notifications, quietly link this device (no prompt). */
export async function linkPushIfAllowed(opts: { orderToken?: string; staff?: boolean; lang?: string } = {}) {
  if (pushPermission() !== "granted") return false;
  return (await enablePush(opts)) === "on";
}
