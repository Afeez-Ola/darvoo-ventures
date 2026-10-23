// Front door for darvooventures.com: one canonical address, security headers, then the static site.
const CANONICAL = "darvooventures.com";

const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(self)",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; font-src 'self' data:; " +
    "connect-src 'self' https://hgnfqpxkvnbieqrbynzf.supabase.co wss://hgnfqpxkvnbieqrbynzf.supabase.co; " +
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";

    // www, http and the old workers.dev address all go to https://darvooventures.com
    if (!local && (url.hostname !== CANONICAL || url.protocol === "http:")) {
      url.hostname = CANONICAL;
      url.protocol = "https:";
      url.port = "";
      return Response.redirect(url.toString(), 301);
    }

    const res = await env.ASSETS.fetch(request);
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
    if (url.pathname.startsWith("/kitchen")) out.headers.set("X-Robots-Tag", "noindex, nofollow");
    if (url.pathname.startsWith("/_next/static/")) out.headers.set("Cache-Control", "public, max-age=31536000, immutable");
    // the service worker must always be fresh, so app updates reach phones quickly
    if (url.pathname === "/sw.js") out.headers.set("Cache-Control", "no-cache");
    // Android app link verification (Trusted Web Activity)
    if (url.pathname === "/.well-known/assetlinks.json") out.headers.set("Content-Type", "application/json");
    return out;
  },
};
