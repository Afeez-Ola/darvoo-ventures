# Darvoo Ventures · online ordering

Ordering site for **Darvoo Ventures International & Co.** (Wilfersdorf, Austria): Nigerian dishes, food stuffs and party trays, with delivery or pickup, payment, live order tracking and a kitchen dashboard.

Built with Next.js 15 and Supabase (Postgres, Auth, Realtime).

## What's in it

| Page | What it does |
|---|---|
| `/` | Menu with three tabs (Dishes, Food stuffs, Events), photos and a short EN/DE description per item (`products.description`, `description_de`), event services on the Events tab, EN/DE switch |
| `/basket` | Basket and three ways to get it: **delivery** in Vienna (postcodes starting with 1, editable) or **pickup** at the Vienna kitchen (Hauffgasse 6, 1110), both with a day and time slot that closes when full; or **shipping** across the EU for food stuffs only (no slot, parcel; country picker, Austrian and EU fees) |
| `/checkout` | Contact details, payment method, terms, places the order |
| `/track/?t=…` | Live order status for the customer (refreshes every 15 s). Parcels show the tracking number with a link to post.at. `/track/` alone lists orders placed on this device |
| `/kitchen` | Staff only. **Orders**: live board by day plus a **Parcels to post** view, one tap to move an order forward, tracking number when a parcel is posted, WhatsApp update button, pause ordering. **Menu & prices**: edit prices, sizes, allergen codes, hide items. **Slots & settings**: Vienna delivery fees (€5 up to ~10 km from Hauffgasse 6, €10 beyond, by postcode) and delivery postcodes, shipping fee, free shipping threshold, dispatch days, same day cut-off, booking window, time slots and capacity |
| `/account` | Optional customer account: sign in with an email code (Google and SMS appear once switched on in Supabase), order history, saved details, order alerts, delete account |
| `/impressum`, `/agb`, `/datenschutz`, `/allergene` | Legal pages (German). Yellow highlights mark facts the business still has to fill in |

## How ordering works

1. The browser sends **only product ids and quantities** to `place_order()`. Prices, delivery fee and totals are always read from the database, so a customer can't change a price.
2. `place_order()` also checks that ordering isn't paused, the slot still has room, delivery addresses are in the delivery area, and shipped orders contain only food stuffs.
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

Changes show on the website immediately, no deploy needed.

Easiest: sign in at `/kitchen` and use the **Menu & prices** and **Slots & settings** tabs.

Or directly in Supabase:
* `products`: `price_cents` (3000 = €30,00), `allergens` (e.g. `A, C, D`), `active` to hide an item, `sort` for order
* `slot_templates`: delivery and pickup times and how many orders each can take
* `settings`: `delivery_fee_cents`, `delivery_postcode_prefixes`, `shipping_fee_cents`, `free_shipping_from_cents`, `ship_dispatch_days`, `same_day_cutoff`, `booking_days`, `accepting_orders`

Photos live in `public/menu/`. Add a file and put its path in `image_path`.

## Deploy (Cloudflare Workers, static assets)

The app is a fully static site (`next build` writes it to `out/`). It is deployed as the Cloudflare Worker `darvoo-ventures`, connected to this repo; `wrangler.toml` tells it to serve `out/`.

* Build command: `npm run build`. Deploy command: `npx wrangler deploy`.
* Every push to `main` rebuilds and redeploys automatically.
* Live at **https://darvooventures.com**. `worker/index.js` redirects `www.`, `http://` and the old workers.dev address there (301) and adds security headers (HSTS, CSP, no framing).
* Both custom domains are declared in `wrangler.toml` (`routes`), so a deploy recreates them if they are missing.

No environment variables are needed: the Supabase URL and publishable key are public values with defaults in `lib/supabase.ts`. Security comes from the database rules, not from hiding the key.

## Going live with Stripe (before taking real money)

1. Create a Stripe account for the business and enable **cards, Apple Pay, Google Pay, eps and Klarna**.
2. Add a Cloudflare Pages Function `functions/api/checkout.ts` (the site itself is static) that calls `place_order()`, then creates a Stripe Checkout Session with the order total and `metadata.order_token`, and redirects to it.
3. Add a webhook function `functions/api/stripe-webhook.ts` (`checkout.session.completed`). It verifies the Stripe signature, then sets `status = 'received', paid_at = now()` using the Supabase **service role key**, kept server-side only.
4. Delete `mock_pay()` from the database and remove its call in `app/checkout/page.tsx`.

## Still to do

- [ ] Real prices, tray sizes, Vienna delivery fee and shipping fee (the €6,90 shipping fee is a placeholder)
- [ ] Stripe (above)
- [ ] Automatic WhatsApp messages (today the kitchen taps "WhatsApp update", which opens WhatsApp with the message ready to send; full automation needs the WhatsApp Business API)
- [ ] Fill the yellow gaps in Impressum, AGB and Datenschutz, and have them checked
- [ ] Allergen codes for every item (Kitchen → Menu & prices)
- [ ] Own product photos for food stuffs (some flyer images look like stock photos)

## Database

SQL for a fresh project is in `supabase/migrations/`. Apply them in order (`0001` to `0014`); `0004` must run on its own because it adds an enum value.

## Accounts and notifications

* Customers can order as guests or sign in. `orders.user_id` links an order to an account; customers can only read their own orders (row level security). `claim_orders()` attaches earlier guest orders placed on the same phone or with the same verified email or phone.
* `delete_my_account()` removes the login, profile and push subscriptions; orders stay, unlinked, for the tax retention period.
* Every new order and status change fires the `orders_notify` trigger, which calls the `notify-order` edge function. It sends web push to the customer (account devices and guests who tapped "Get alerts"), web push to the kitchen for new orders, and an email when the Resend key is set as an edge function secret (named `RESEND_API_KEY` or `Darvoo`).
* Push keys and the trigger secret live in Supabase Vault; nothing secret is in this repo.
* Kitchen: "Turn on new-order alarm" beeps and shows a red banner for each new order until someone taps "Seen", and registers the device for kitchen push.
