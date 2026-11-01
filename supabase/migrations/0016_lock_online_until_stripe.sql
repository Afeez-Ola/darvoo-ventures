-- Card payment is not built yet: mock_pay would mark orders paid with no money taken.
-- Lock payment_mode to bank transfer and make mock_pay unreachable until Stripe Checkout + webhook exist.
alter table public.settings drop constraint if exists stripe_not_live;
alter table public.settings add constraint stripe_not_live check (payment_mode = 'bank_transfer');
revoke execute on function public.mock_pay(uuid) from public, anon, authenticated;
-- performance advisors: index the two foreign keys
create index if not exists order_items_product_id_idx on public.order_items(product_id);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);
