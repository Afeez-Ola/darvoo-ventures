"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <strong>DarVoo Ventures International &amp; Co.</strong>
      <span>Mistelbacherstraße 31, Wilfersdorf, Austria</span>
      <span>
        <a href="tel:+436764022539">+43 676 4022539</a> · <a href="mailto:tjdammy@yahoo.com">tjdammy@yahoo.com</a>
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
