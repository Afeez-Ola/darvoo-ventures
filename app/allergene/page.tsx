import LegalPage from "@/components/LegalPage";

const CODES: [string, string, string][] = [
  ["A", "Glutenhaltiges Getreide", "Cereals containing gluten"],
  ["B", "Krebstiere", "Crustaceans"],
  ["C", "Eier", "Eggs"],
  ["D", "Fisch", "Fish"],
  ["E", "Erdnüsse", "Peanuts"],
  ["F", "Soja", "Soy"],
  ["G", "Milch und Laktose", "Milk and lactose"],
  ["H", "Schalenfrüchte (Nüsse)", "Tree nuts"],
  ["L", "Sellerie", "Celery"],
  ["M", "Senf", "Mustard"],
  ["N", "Sesam", "Sesame"],
  ["O", "Sulfite", "Sulphites"],
  ["P", "Lupinen", "Lupin"],
  ["R", "Weichtiere", "Molluscs"],
];

export default function Allergene() {
  return (
    <LegalPage title="Allergene">
      <p>Bei jedem Produkt stehen die enthaltenen Allergene als Buchstaben. Every product lists its allergens by these letters.</p>
      <table>
        <tbody>
          {CODES.map(([c, de, en]) => (
            <tr key={c}>
              <td>{c}</td>
              <td>{de}<br /><span style={{ fontSize: 13, color: "var(--muted)" }}>{en}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: 16 }}>Fragen zu Allergenen? Ruf uns an: <a href="tel:+436764022539">+43 676 4022539</a></p>
    </LegalPage>
  );
}
