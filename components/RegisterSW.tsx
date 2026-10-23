"use client";

import { useEffect } from "react";

// Registers the service worker on the live site only (not on localhost during development).
export default function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
