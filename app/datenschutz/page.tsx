import LegalPage, { Todo } from "@/components/LegalPage";

export default function Datenschutz() {
  return (
    <LegalPage title="Datenschutz">
      <p><Todo>Entwurf. Vor dem Start prüfen lassen.</Todo></p>

      <h2>Verantwortlich</h2>
      <p>DarVoo Ventures International &amp; Co., Inhaberin Victoria Oluwatosin Stephen, Mistelbacherstraße 31, 2193 Wilfersdorf, Österreich (Zweigstelle: Hauffgasse 6, 1110 Wien). E-Mail: <a href="mailto:teejeomo@gmail.com">teejeomo@gmail.com</a> oder <a href="mailto:tjdammy@yahoo.com">tjdammy@yahoo.com</a>, Telefon: +43 676 7835226 oder +43 676 4022539.</p>

      <h2>Welche Daten wir verarbeiten</h2>
      <p>Wenn du bestellst: Name, Handynummer, E-Mail (optional), Liefer- oder Versandadresse samt Land, Bestellinhalt, Zeitfenster, Notiz an die Küche und Zahlungsstatus.</p>
      <p>Bei Zahlung per Überweisung sehen wir auf unserem Kontoauszug (Erste Bank) die Daten, die deine Bank mitschickt: Name, IBAN, Betrag und Verwendungszweck. Wir nutzen sie nur, um die Zahlung deiner Bestellung zuzuordnen. Sobald Kartenzahlung verfügbar ist, gehen Kartendaten direkt an den Zahlungsanbieter; wir sehen sie nie.</p>
      <p>Beim Aufruf der Website oder App verarbeitet unser Hosting technisch notwendige Verbindungsdaten (IP-Adresse, Zeitpunkt, aufgerufene Seite), um sie sicher auszuliefern. Diese Protokolle werden nach kurzer Zeit automatisch gelöscht (Art. 6 Abs. 1 lit. f DSGVO, berechtigtes Interesse an einem sicheren Betrieb).</p>

      <h2>Zweck und Rechtsgrundlage</h2>
      <p>Wir nutzen die Daten, um deine Bestellung zuzubereiten, zu liefern und dich über den Status zu informieren (Art. 6 Abs. 1 lit. b DSGVO, Vertragserfüllung). Rechnungsdaten bewahren wir wegen der gesetzlichen Aufbewahrungspflicht sieben Jahre auf (Art. 6 Abs. 1 lit. c DSGVO).</p>

      <h2>Auftragsverarbeiter</h2>
      <ul>
        <li>Supabase Inc. (Datenbank, Server in Frankfurt, EU)</li>
        <li>Cloudflare Inc. (Hosting der Website und App-Inhalte)</li>
        <li>WhatsApp (nur wenn du Statusmeldungen per WhatsApp wünschst)</li>
        <li>Stripe Payments Europe, Ltd., Dublin, Irland (Kartenzahlung, sobald verfügbar; Kartendaten gehen direkt an Stripe)</li>
        <li>Paketdienst für den Versand von Lebensmitteln (nur Name, Adresse und Telefonnummer für die Zustellung)</li>
      </ul>
      <p>Supabase und Cloudflare sind Unternehmen mit Sitz in den USA. Eine Übermittlung in die USA erfolgt auf Grundlage des EU-US Data Privacy Framework bzw. der EU-Standardvertragsklauseln.</p>

      <h2>Android-App</h2>
      <p>Die Android-App zeigt diese Website an. Es gelten dieselben Angaben; die App selbst greift nicht auf Standort, Kontakte, Kamera oder Fotos zu und enthält keine Werbung oder Analyse-Tools.</p>

      <h2>Speicher im Browser</h2>
      <p>Dein Warenkorb, deine Sprache und deine letzten Bestellungen werden nur lokal in deinem Browser gespeichert, damit du sie wiederfindest. Wir setzen keine Tracking- oder Werbe-Cookies.</p>

      <h2>Deine Rechte</h2>
      <p>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch. Schreib uns dazu einfach an eine der oben genannten Adressen. Bestelldaten, die wir aus steuerlichen Gründen aufbewahren müssen, löschen wir nach Ablauf dieser Frist. Beschwerden kannst du bei der österreichischen Datenschutzbehörde einbringen (<a href="https://www.dsb.gv.at" target="_blank" rel="noopener">dsb.gv.at</a>).</p>
    </LegalPage>
  );
}
