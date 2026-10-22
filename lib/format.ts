export const euro = (cents: number) =>
  "€" + (cents / 100).toFixed(2).replace(".", ",");

export const hhmm = (t: string) => t.slice(0, 5);

/** Today's date in Vienna as YYYY-MM-DD. */
export function viennaToday(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vienna" }).format(d);
}

export function dayLabel(iso: string, lang: "en" | "de") {
  const d = new Date(iso + "T12:00:00");
  return new Intl.DateTimeFormat(lang === "de" ? "de-AT" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

export function clock(iso: string) {
  return new Intl.DateTimeFormat("de-AT", {
    timeZone: "Europe/Vienna",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
