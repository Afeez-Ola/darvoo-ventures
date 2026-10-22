/** Orders placed on this device, so customers can find their tracking link again. */
export interface RememberedOrder {
  token: string;
  number: number;
  at: string;
}

const KEY = "darvoo-orders";

export function rememberOrder(token: string, number: number) {
  try {
    const list: RememberedOrder[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    const next = [{ token, number, at: new Date().toISOString() }, ...list.filter((o) => o.token !== token)].slice(0, 10);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

export function rememberedOrders(): RememberedOrder[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
