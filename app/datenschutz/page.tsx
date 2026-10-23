import LegalPage, { Todo } from "@/components/LegalPage";

export default function Datenschutz() {
  return (
    <LegalPage title="Datenschutz">
      <p><Todo>Entwurf. Vor dem Start prüfen lassen.</Todo></p>

      <h2>Verantwortlich</h2>
      <p>DarVoo Ventures International &amp; Co., Inhaberin Victoria Oluwatosin Stephen, Mistelbacherstraße 31, 2193 Wilfersdorf, Österreich (Zweigstelle: Hauffgasse 6, 1110 Wien). E-Mail: <a href="mailto:teejeomo@gmail.com">teejeomo@gmail.com</a> oder <a href="mailto:tjdammy@yahoo.com">tjdammy@yahoo.com</a>, Telefon: +43 676 7835226 oder +43 676 4022539.</p>

      <h2>Welche Daten wir verarbeiten</h2>
      <p>Wenn du bestellst: Name, Handynummer, E-Mail (optional), Lieferadresse, Bestellinhalt, Zeitfenster, Notiz an die Küche und Zahlungsstatus. Kartendaten sehen wir nie; diese verarbeitet der Zahlungsanbieter.</p>

      <h2>Zweck und Rechtsgrundlage</h2>
      <p>Wir nutzen die Daten, um deine Bestellung zuzubereiten, zu liefern und dich über den Status zu informieren (Art. 6 Abs. 1 lit. b DSGVO, Vertragserfüllung). Rechnungsdaten bewahren wir wegen der gesetzlichen Aufbewahrungspflicht sieben Jahre auf (Art. 6 Abs. 1 lit. c DSGVO).</p>

      <h2>Auftragsverarbeiter</h2>
      <ul>
        <li>Supabase (Datenbank, Server in Frankfurt, EU)</li>
        <li>Cloudflare (Hosting der Website)</li>
        <li>WhatsApp (nur wenn du Statusmeldungen per WhatsApp wünschst)</li>
        <li>Stripe Payments Europe, Ltd., Dublin, Irland (Zahlungsabwicklung; Kartendaten gehen direkt an Stripe)</li>
        <li>Paketdienst für den Versand von Lebensmitteln (nur Name und Lieferadresse)</li>
      </ul>

      <h2>Speicher im Browser</h2>
      <p>Dein Warenkorb, deine Sprache und deine letzten Bestellungen werden nur lokal in deinem Browser gespeichert, damit du sie wiederfindest. Wir setzen keine Tracking- oder Werbe-Cookies.</p>

      <h2>Deine Rechte</h2>
      <p>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch. Schreib uns dazu einfach. Beschwerden kannst du bei der österreichischen Datenschutzbehörde einbringen (<a href="https://www.dsb.gv.at" target="_blank" rel="noopener">dsb.gv.at</a>).</p>
    </LegalPage>
  );
}
