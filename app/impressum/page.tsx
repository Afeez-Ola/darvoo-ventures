import LegalPage, { Todo } from "@/components/LegalPage";

export default function Impressum() {
  return (
    <LegalPage title="Impressum">
      <p>Informationen gemäß § 5 ECG und Offenlegung gemäß § 25 MedienG</p>

      <h2>Unternehmen</h2>
      <p>
        DarVoo Ventures International &amp; Co.<br />
        Inhaber/in: <Todo>[Name laut Gewerbeschein]</Todo><br />
        Mistelbacherstraße 31<br />
        <Todo>[PLZ]</Todo> Wilfersdorf, Österreich
      </p>

      <h2>Kontakt</h2>
      <p>
        Telefon: <a href="tel:+436764022539">+43 676 4022539</a><br />
        E-Mail: <a href="mailto:tjdammy@yahoo.com">tjdammy@yahoo.com</a>
      </p>

      <h2>Gewerbe</h2>
      <p>
        GISA-Zahl: 32952650<br />
        Gewerbewortlaut: <Todo>[laut GISA-Auszug]</Todo><br />
        Gewerbebehörde: <Todo>[zuständige Bezirkshauptmannschaft]</Todo><br />
        Kammerzugehörigkeit: Wirtschaftskammer Niederösterreich<br />
        UID-Nummer: <Todo>[falls vorhanden]</Todo><br />
        Anwendbare Rechtsvorschriften: Gewerbeordnung, abrufbar unter <a href="https://www.ris.bka.gv.at" target="_blank" rel="noopener">ris.bka.gv.at</a>
      </p>

      <h2>Online-Streitbeilegung</h2>
      <p>
        Verbraucher können Beschwerden an die Online-Streitbeilegungsplattform der EU richten:{" "}
        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener">ec.europa.eu/consumers/odr</a>.
      </p>

      <h2>Bildnachweis</h2>
      <p>Fotos der Gerichte: DarVoo Ventures. <Todo>[Herkunft der Produktfotos bei Lebensmitteln prüfen]</Todo></p>
    </LegalPage>
  );
}
