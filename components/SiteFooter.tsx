"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <strong>DarVoo Ventures International &amp; Co.</strong>
      <span>Kitchen &amp; pickup: Hauffgasse 6, 1110 Wien</span>
      <span>Head office: Mistelbacherstraße 31, 2193 Wilfersdorf</span>
      <span>
        <a href="tel:+436767835226">+43 676 7835226</a> · <a href="tel:+436764022539">+43 676 4022539</a>
      </span>
      <span>
        <a href="mailto:teejeomo@gmail.com">teejeomo@gmail.com</a> · <a href="mailto:tjdammy@yahoo.com">tjdammy@yahoo.com</a>
      </span>
      <span>
        <a href="https://www.instagram.com/victoriastephen1622/" target="_blank" rel="noopener">Instagram</a>
      </span>
      <nav className="footer-links" aria-label="Legal">
        <Link href="/impressum/">{t.impressum}</Link>
        <Link href="/agb/">{t.agb}</Link>
        <Link href="/datenschutz/">{t.privacy}</Link>
        <Link href="/allergene/">{t.allergens}</Link>
      </nav>
    </footer>
  );
}
