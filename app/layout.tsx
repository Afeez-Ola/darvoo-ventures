import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import { I18nProvider } from "@/lib/i18n";
import { CartProvider } from "@/lib/cart";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "800"], variable: "--font-display" });
const body = DM_Sans({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "700"], variable: "--font-body" });

const DESCRIPTION =
  "Order Nigerian dishes, food stuffs and party trays from Darvoo Ventures in Vienna. Delivery in Vienna, pickup, and shipping across Austria.";

export const metadata: Metadata = {
  metadataBase: new URL("https://darvooventures.com"),
  title: "Darvoo Ventures · Nigerian food in Vienna",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    url: "https://darvooventures.com",
    siteName: "Darvoo Ventures",
    title: "Darvoo Ventures · Nigerian food in Vienna",
    description: DESCRIPTION,
    locale: "en_AT",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Darvoo Ventures: Nigerian food, cooked in Vienna" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.jpg"] },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#0B6B34", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <I18nProvider>
          <CartProvider>{children}</CartProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
