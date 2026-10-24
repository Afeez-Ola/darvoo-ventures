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

      <h2>Kundenkonto (freiwillig)</h2>
      <p>Du kannst ohne Konto bestellen. Wenn du ein Konto anlegst, speichern wir deine E-Mail-Adresse oder Handynummer (für die Anmeldung per Code), bei Anmeldung mit Google deinen Namen und deine E-Mail-Adresse von Google, deine gespeicherten Daten für die Kasse (Name, Telefon, Adresse) und deine Bestellungen, damit du sie in deinem Konto siehst. Frühere Bestellungen mit derselben bestätigten E-Mail-Adresse oder Nummer, oder die auf demselben Gerät aufgegeben wurden, werden deinem Konto zugeordnet. Du kannst dein Konto jederzeit selbst unter <a href="/account/">Konto</a> löschen; Bestellungen bleiben dann nur noch ohne Verbindung zu dir für die gesetzliche Aufbewahrungsfrist erhalten (Art. 6 Abs. 1 lit. b und c DSGVO).</p>

      <h2>Benachrichtigungen</h2>
      <p>Wenn du Benachrichtigungen erlaubst, speichern wir eine technische Empfangsadresse deines Geräts (Push-Token) zusammen mit deinem Konto oder der jeweiligen Bestellung. Zugestellt werden die Nachrichten über den Push-Dienst deines Browsers bzw. Handys (bei Android: Google Firebase Cloud Messaging). Sie enthalten nur Bestellnummer und Status. Du kannst sie jederzeit in den Einstellungen deines Geräts abschalten. Status-Mails schicken wir an die bei der Bestellung angegebene E-Mail-Adresse; im Konto kannst du sie abbestellen. Anmeldecodes per SMS verschickt ein SMS-Dienstleister in unserem Auftrag.</p>

      <h2>Zweck und Rechtsgrundlage</h2>
      <p>Wir nutzen die Daten, um deine Bestellung zuzubereiten, zu liefern und dich über den Status zu informieren (Art. 6 Abs. 1 lit. b DSGVO, Vertragserfüllung). Rechnungsdaten bewahren wir wegen der gesetzlichen Aufbewahrungspflicht sieben Jahre auf (Art. 6 Abs. 1 lit. c DSGVO).</p>

      <h2>Auftragsverarbeiter</h2>
      <ul>
        <li>Supabase Inc. (Datenbank und Anmeldung, Server in Frankfurt, EU)</li>
        <li>Google (nur wenn du „Weiter mit Google“ nutzt, und für Push-Benachrichtigungen auf Android)</li>
        <li>E-Mail-Versanddienst für Anmeldecodes und Status-Mails, sowie SMS-Dienstleister für Anmeldecodes per SMS</li>
        <li>Cloudflare Inc. (Hosting der Website und App-Inhalte)</li>
        <li>WhatsApp (nur wenn du Statusmeldungen per WhatsApp wünschst)</li>
        <li>Stripe Payments Europe, Ltd., Dublin, Irland (Kartenzahlung, sobald verfügbar; Kartendaten gehen direkt an Stripe)</li>
        <li>Paketdienst für den Versand von Lebensmitteln (nur Name, Adresse und Telefonnummer für die Zustellung)</li>
      </ul>
      <p>Supabase und Cloudflare sind Unternehmen mit Sitz in den USA. Eine Übermittlung in die USA erfolgt auf Grundlage des EU-US Data Privacy Framework bzw. der EU-Standardvertragsklauseln.</p>

      <h2>Android-App</h2>
      <p>Die Android-App zeigt diese Website an. Es gelten dieselben Angaben. Die App fragt nur nach der Erlaubnis für Benachrichtigungen; sie greift nicht auf Standort, Kontakte, Kamera oder Fotos zu und enthält keine Werbung oder Analyse-Tools.</p>

      <h2>Speicher im Browser</h2>
      <p>Dein Warenkorb, deine Sprache, deine letzten Bestellungen und, wenn du angemeldet bist, deine Anmeldung werden lokal in deinem Browser gespeichert. Wir setzen keine Tracking- oder Werbe-Cookies.</p>

      <h2>Deine Rechte</h2>
      <p>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch. Schreib uns dazu einfach an eine der oben genannten Adressen. Bestelldaten, die wir aus steuerlichen Gründen aufbewahren müssen, löschen wir nach Ablauf dieser Frist. Beschwerden kannst du bei der österreichischen Datenschutzbehörde einbringen (<a href="https://www.dsb.gv.at" target="_blank" rel="noopener">dsb.gv.at</a>).</p>
    </LegalPage>
  );
}
