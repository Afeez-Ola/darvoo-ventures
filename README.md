# Darvoo Ventures · online ordering

Ordering site for **Darvoo Ventures International & Co.** (Wilfersdorf, Austria): Nigerian dishes, food stuffs and party trays, with delivery or pickup, payment, live order tracking and a kitchen dashboard.

Built with Next.js 15 and Supabase (Postgres, Auth, Realtime).

## What's in it

| Page | What it does |
|---|---|
| `/` | Menu with three tabs (Dishes, Food stuffs, Events), photos from Darvoo's own catalogue, EN/DE switch |
| `/basket` | Basket, delivery or pickup, day and time slot (slots close when full), address, note for the kitchen |
| `/checkout` | Contact details, payment method, terms, places the order |
| `/track/[token]` | Live order status for the customer (refreshes every 15 s); `/track` lists orders placed on this device |
| `/kitchen` | Staff only. Order board by day, one tap to move an order forward, pause ordering, updates in real time |

## How ordering works

1. The browser sends **only product ids and quantities** to `place_order()`. Prices, delivery fee and totals are always read from the database, so a customer can't change a price.
2. `place_order()` also checks that ordering isn't paused, the slot still has room, and delivery orders have an address.
3. Payment is currently **mocked** (`mock_pay()` marks the order paid). See *Going live with Stripe* below.
4. Every status change is logged in `order_events` by a trigger. That log feeds the customer's timeline.
5. Customers can't read the `orders` table at all. They only see their own order, through `get_order(token)` and the secret link in their tracking URL.

## Run it locally

```bash
cp .env.example .env.local   # already points at the darvoo-ventures Supabase project
npm install
npm run dev                   # http://localhost:3000
```

## Give someone kitchen access

1. Supabase dashboard → **Authentication → Users → Add user** (email and password, tick *Auto confirm*).
2. In the **SQL editor**:

```sql
insert into public.staff (user_id)
select id from auth.users where email = 'kitchen@example.com';
```

3. Sign in at `/kitchen`.

## Change prices, menu, slots, settings

All in the Supabase **Table editor**, no deploy needed (the menu page refreshes within a minute):

* `products`: `price_cents` (3000 = €30,00), `active` to hide an item, `sort` for order
* `slot_templates`: delivery and pickup times and how many orders each can take
* `settings`: `delivery_fee_cents`, `same_day_cutoff`, `booking_days`, `accepting_orders`

Photos live in `public/menu/`. Add a file and put its path in `image_path`.

## Deploy (Vercel)

1. Import this repo at vercel.com/new.
2. Add the two env vars from `.env.example`.
3. Deploy, then point `darvooventures.com` at it under *Domains*.

## Going live with Stripe (before taking real money)

1. Create a Stripe account for the business and enable **cards, Apple Pay, Google Pay, eps and Klarna**.
2. Add a server route `app/api/checkout/route.ts` that calls `place_order()`, then creates a Stripe Checkout Session with the order total and `metadata.order_token`, and redirects to it.
3. Add a webhook route (`checkout.session.completed`). It verifies the Stripe signature, then sets `status = 'received', paid_at = now()` using the Supabase **service role key**, kept server-side only.
4. Delete `mock_pay()` from the database and remove its call in `app/checkout/page.tsx`.

## Still to do

- [ ] Real prices, tray sizes, delivery area and fee
- [ ] Stripe (above)
- [ ] WhatsApp / SMS status messages (e.g. a Supabase Edge Function on `order_events` inserts, via the WhatsApp Business API)
- [ ] Impressum, AGB, privacy policy pages, and allergen codes (A to R) per dish
- [ ] Own product photos for food stuffs (some flyer images look like stock photos)

## Database

SQL for a fresh project is in `supabase/migrations/`. Apply `0001_init.sql`, then `0002_seed.sql`.
