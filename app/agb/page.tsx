import LegalPage, { Todo } from "@/components/LegalPage";

export default function Agb() {
  return (
    <LegalPage title="AGB">
      <p><Todo>Mustertext. Bitte vor dem Start von Steuerberatung oder Wirtschaftskammer prüfen lassen.</Todo></p>

      <h2>1. Geltungsbereich</h2>
      <p>Diese Bedingungen gelten für alle Bestellungen über diese Website bei DarVoo Ventures International &amp; Co., Mistelbacherstraße 31, Wilfersdorf.</p>

      <h2>2. Bestellung und Vertrag</h2>
      <p>Mit dem Klick auf „Bezahlen“ gibst du eine verbindliche Bestellung ab. Der Vertrag kommt zustande, sobald wir die Bestellung in der Küche annehmen. Den Status siehst du jederzeit auf deiner Tracking-Seite.</p>

      <h2>3. Preise und Zahlung</h2>
      <p>Alle Preise sind Endpreise in Euro inklusive Umsatzsteuer. Für Lieferungen fällt die angezeigte Liefergebühr an. Die Zahlung erfolgt bei der Bestellung online.</p>

      <h2>4. Lieferung und Abholung</h2>
      <p>Wir liefern bzw. übergeben zum gewählten Zeitfenster. Liefergebiet: <Todo>[Liefergebiet]</Todo>. Bei Abholung gilt die Adresse Mistelbacherstraße 31, Wilfersdorf.</p>

      <h2>5. Event-Catering und Party-Platten</h2>
      <p>Party-Platten werden auf Bestellung frisch zubereitet. Bestellungen bitte mindestens <Todo>[X] Tage</Todo> im Voraus. Stornierung bis <Todo>[X] Tage</Todo> vor dem Termin kostenlos, danach <Todo>[Regelung]</Todo>.</p>

      <h2>6. Kein Rücktrittsrecht bei Speisen</h2>
      <p>Bei frisch zubereiteten Speisen und schnell verderblichen Lebensmitteln besteht nach § 18 Abs. 1 Z 4 FAGG kein Rücktrittsrecht.</p>

      <h2>7. Reklamationen</h2>
      <p>Wenn etwas nicht passt, melde dich bitte am selben Tag telefonisch oder per WhatsApp unter +43 676 4022539. Wir finden eine Lösung.</p>

      <h2>8. Allergene</h2>
      <p>Allergeninformationen findest du bei jedem Produkt und in unserer Allergenliste. Spuren anderer Allergene können wir in unserer Küche nicht ausschließen.</p>
    </LegalPage>
  );
}
