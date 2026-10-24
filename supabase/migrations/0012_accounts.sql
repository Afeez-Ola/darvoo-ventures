-- Customer accounts (optional; guest checkout stays) and push notification subscriptions.
-- Customers can read only their own orders. Staff rules are unchanged.

-- 1. order ownership
alter table public.orders add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists orders_user_id_idx on public.orders(user_id);

-- 2. profiles: details that prefill checkout
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text, phone text,
  street text, postcode text, city text, country text not null default 'AT', door text,
  lang text not null default 'en' check (lang in ('en','de')),
  email_updates boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "own profile read" on public.profiles;
drop policy if exists "own profile insert" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
drop policy if exists "staff reads profiles" on public.profiles;
create policy "own profile read" on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy "own profile insert" on public.profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "staff reads profiles" on public.profiles for select to authenticated using (public.is_staff());
revoke all on public.profiles from anon;

-- 3. customers read their own orders, items and events
drop policy if exists "customer reads own orders" on public.orders;
create policy "customer reads own orders" on public.orders for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "customer reads own items" on public.order_items;
create policy "customer reads own items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
drop policy if exists "customer reads own events" on public.order_events;
create policy "customer reads own events" on public.order_events for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));

-- 4. place_order records the signed-in customer as owner (null for guests)
do $$
declare d text;
begin
  d := pg_get_functiondef('public.place_order(jsonb)'::regprocedure);
  if position('subtotal_cents, fee_cents, total_cents)' in d) = 0 or position(E'0, 0, 0)\n  returning * into v_order;' in d) = 0 then
    raise exception 'place_order pattern not found';
  end if;
  d := replace(d, 'subtotal_cents, fee_cents, total_cents)', 'subtotal_cents, fee_cents, total_cents, user_id)');
  d := replace(d, E'0, 0, 0)\n  returning * into v_order;', E'0, 0, 0, auth.uid())\n  returning * into v_order;');
  execute d;
end $$;

-- 5. attach earlier guest orders to the account:
--    orders whose secret tracking token the customer holds (saved on this phone),
--    plus orders placed with the same verified email or phone number
create or replace function public.claim_orders(p_tokens uuid[] default '{}')
returns integer
language plpgsql security definer set search_path to 'public'
as $$
declare n int; v_email text := lower(nullif(auth.jwt()->>'email',''));
        v_phone text := nullif(auth.jwt()->>'phone','');
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  update public.orders o set user_id = auth.uid()
  where o.user_id is null
    and ( o.public_token = any(coalesce(p_tokens,'{}'))
       or (v_email is not null and lower(o.email) = v_email)
       or (v_phone is not null and length(v_phone) >= 8 and regexp_replace(o.phone, '\D', '', 'g') = regexp_replace(v_phone, '\D', '', 'g')) );
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.claim_orders(uuid[]) from public, anon;
grant execute on function public.claim_orders(uuid[]) to authenticated;

-- 6. push subscriptions (customers, guests per order, and staff); no direct table access
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_id uuid references auth.users(id) on delete cascade,
  order_tokens uuid[] not null default '{}',
  is_staff boolean not null default false,
  lang text not null default 'en',
  created_at timestamptz not null default now(),
  last_success_at timestamptz
);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

create or replace function public.save_push_subscription(p_sub jsonb, p_order_token uuid default null, p_lang text default 'en', p_staff boolean default false)
returns boolean
language plpgsql security definer set search_path to 'public'
as $$
declare v_staff boolean := p_staff and public.is_staff();
begin
  if coalesce(p_sub->>'endpoint','') !~ '^https://' or p_sub#>>'{keys,p256dh}' is null or p_sub#>>'{keys,auth}' is null then
    raise exception 'BAD_SUBSCRIPTION';
  end if;
  if p_order_token is not null and not exists (select 1 from public.orders where public_token = p_order_token) then
    raise exception 'UNKNOWN_ORDER';
  end if;
  insert into public.push_subscriptions (endpoint, p256dh, auth, user_id, order_tokens, is_staff, lang)
  values (p_sub->>'endpoint', p_sub#>>'{keys,p256dh}', p_sub#>>'{keys,auth}', auth.uid(),
          case when p_order_token is null then '{}' else array[p_order_token] end, v_staff,
          case when p_lang in ('en','de') then p_lang else 'en' end)
  on conflict (endpoint) do update set
    p256dh = excluded.p256dh, auth = excluded.auth,
    user_id = coalesce(auth.uid(), public.push_subscriptions.user_id),
    order_tokens = (select array(select distinct unnest(public.push_subscriptions.order_tokens || excluded.order_tokens))),
    is_staff = public.push_subscriptions.is_staff or excluded.is_staff,
    lang = excluded.lang;
  return true;
end $$;
revoke all on function public.save_push_subscription(jsonb, uuid, text, boolean) from public;
grant execute on function public.save_push_subscription(jsonb, uuid, text, boolean) to anon, authenticated;

-- 7. delete my account: orders stay for the legal retention period but are no longer linked
create or replace function public.delete_my_account()
returns boolean
language plpgsql security definer set search_path to 'public', 'auth'
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'NOT_SIGNED_IN'; end if;
  if public.is_staff() then raise exception 'STAFF_ACCOUNT'; end if;
  update public.orders set user_id = null where user_id = uid;
  delete from public.push_subscriptions where user_id = uid;
  delete from public.profiles where user_id = uid;
  delete from auth.users where id = uid;
  return true;
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
