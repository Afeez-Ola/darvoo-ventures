-- Darvoo Ventures: schema, security rules and ordering functions
create type product_category as enum ('dishes','groceries','events');
create type fulfilment_mode as enum ('delivery','pickup');
create type order_status as enum ('pending_payment','received','cooking','ready','out_for_delivery','completed','cancelled');

create table public.settings (
  id int primary key default 1 check (id = 1),
  accepting_orders boolean not null default true,
  delivery_fee_cents int not null default 490,
  booking_days int not null default 7,
  same_day_cutoff time not null default '15:00',
  updated_at timestamptz not null default now()
);
insert into public.settings default values;

create table public.products (
  id text primary key,
  category product_category not null,
  name text not null,
  unit text not null default '',
  price_cents int not null check (price_cents >= 0),
  image_path text,
  sort int not null default 0,
  active boolean not null default true
);

create table public.slot_templates (
  slot_time time primary key,
  capacity int not null check (capacity >= 0)
);

create table public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number int generated always as identity (start with 1001) unique,
  public_token uuid not null default gen_random_uuid() unique,
  status order_status not null default 'pending_payment',
  mode fulfilment_mode not null,
  slot_date date not null,
  slot_time time not null,
  customer_name text not null,
  phone text not null,
  email text,
  whatsapp_updates boolean not null default true,
  street text,
  postcode text,
  door text,
  note text,
  payment_method text not null,
  paid_at timestamptz,
  subtotal_cents int not null,
  fee_cents int not null,
  total_cents int not null,
  created_at timestamptz not null default now()
);
create index orders_slot_idx on public.orders (slot_date, slot_time);
create index orders_status_idx on public.orders (status);

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id),
  name text not null,
  unit text not null,
  unit_price_cents int not null,
  qty int not null check (qty > 0 and qty <= 50)
);
create index order_items_order_idx on public.order_items(order_id);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  status order_status not null,
  at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events(order_id);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

create or replace function public.log_order_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_events(order_id, status) values (new.id, new.status);
  end if;
  return new;
end $$;
create trigger orders_status_log after insert or update of status on public.orders
for each row execute function public.log_order_status();

alter table public.settings enable row level security;
alter table public.products enable row level security;
alter table public.slot_templates enable row level security;
alter table public.staff enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;

create policy "public reads settings" on public.settings for select using (true);
create policy "staff updates settings" on public.settings for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "public reads active products" on public.products for select using (active or public.is_staff());
create policy "staff manages products" on public.products for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "public reads slots" on public.slot_templates for select using (true);
create policy "staff manages slots" on public.slot_templates for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff sees self" on public.staff for select to authenticated using (user_id = auth.uid());
create policy "staff reads orders" on public.orders for select to authenticated using (public.is_staff());
create policy "staff updates orders" on public.orders for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff reads items" on public.order_items for select to authenticated using (public.is_staff());
create policy "staff reads events" on public.order_events for select to authenticated using (public.is_staff());

create or replace function public.available_slots(p_date date)
returns table(slot_time time, capacity int, booked int, remaining int, open boolean)
language plpgsql stable security definer set search_path = public as $$
declare s public.settings;
        now_local timestamp := (now() at time zone 'Europe/Vienna');
begin
  select * into s from public.settings where id = 1;
  return query
  select t.slot_time, t.capacity,
         coalesce(b.n,0)::int,
         greatest(t.capacity - coalesce(b.n,0),0)::int,
         (s.accepting_orders
           and p_date >= now_local::date
           and p_date <= now_local::date + s.booking_days
           and (p_date > now_local::date or (now_local::time <= s.same_day_cutoff and t.slot_time > now_local::time))
           and t.capacity - coalesce(b.n,0) > 0)
  from public.slot_templates t
  left join (
    select o.slot_time, count(*) n from public.orders o
    where o.slot_date = p_date and o.status <> 'cancelled'
      and (o.status <> 'pending_payment' or o.created_at > now() - interval '20 minutes')
    group by o.slot_time
  ) b on b.slot_time = t.slot_time
  order by t.slot_time;
end $$;

create or replace function public.place_order(payload jsonb)
returns table(order_id uuid, public_token uuid, number int, total_cents int)
language plpgsql security definer set search_path = public as $$
declare
  s public.settings;
  v_mode fulfilment_mode := (payload->>'mode')::fulfilment_mode;
  v_date date := (payload->>'slot_date')::date;
  v_time time := (payload->>'slot_time')::time;
  v_sub int := 0;
  v_fee int;
  v_order public.orders;
  it jsonb;
  p public.products;
  q int;
  slot_ok boolean;
begin
  select * into s from public.settings where id = 1;
  if not s.accepting_orders then raise exception 'ORDERS_PAUSED'; end if;
  if coalesce(trim(payload->>'customer_name'),'') = '' or coalesce(trim(payload->>'phone'),'') = '' then
    raise exception 'MISSING_CONTACT'; end if;
  if v_mode = 'delivery' and (coalesce(trim(payload->>'street'),'') = '' or coalesce(trim(payload->>'postcode'),'') = '') then
    raise exception 'MISSING_ADDRESS'; end if;
  if jsonb_array_length(coalesce(payload->'items','[]'::jsonb)) = 0 then raise exception 'EMPTY_CART'; end if;

  select a.open into slot_ok from public.available_slots(v_date) a where a.slot_time = v_time;
  if not coalesce(slot_ok,false) then raise exception 'SLOT_UNAVAILABLE'; end if;

  v_fee := case when v_mode = 'delivery' then s.delivery_fee_cents else 0 end;

  insert into public.orders(mode, slot_date, slot_time, customer_name, phone, email, whatsapp_updates,
                            street, postcode, door, note, payment_method, subtotal_cents, fee_cents, total_cents)
  values (v_mode, v_date, v_time, left(trim(payload->>'customer_name'),120), left(trim(payload->>'phone'),40),
          nullif(left(trim(payload->>'email'),200),''), coalesce((payload->>'whatsapp_updates')::boolean,true),
          nullif(left(payload->>'street',200),''), nullif(left(payload->>'postcode',10),''), nullif(left(payload->>'door',40),''),
          nullif(left(payload->>'note',500),''), coalesce(payload->>'payment_method','card'), 0, v_fee, 0)
  returning * into v_order;

  for it in select * from jsonb_array_elements(payload->'items') loop
    select * into p from public.products where id = it->>'product_id' and active;
    if not found then raise exception 'UNKNOWN_PRODUCT'; end if;
    q := (it->>'qty')::int;
    if q is null or q < 1 or q > 50 then raise exception 'BAD_QTY'; end if;
    insert into public.order_items(order_id, product_id, name, unit, unit_price_cents, qty)
    values (v_order.id, p.id, p.name, p.unit, p.price_cents, q);
    v_sub := v_sub + p.price_cents * q;
  end loop;

  update public.orders set subtotal_cents = v_sub, total_cents = v_sub + v_fee where id = v_order.id;
  return query select v_order.id, v_order.public_token, v_order.number, v_sub + v_fee;
end $$;

-- DEMO ONLY: replace with a Stripe webhook before taking real money
create or replace function public.mock_pay(p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.orders set status = 'received', paid_at = now()
  where public_token = p_token and status = 'pending_payment';
  return found;
end $$;

create or replace function public.get_order(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'number', o.number, 'status', o.status, 'mode', o.mode,
    'slot_date', o.slot_date, 'slot_time', o.slot_time,
    'customer_name', split_part(o.customer_name,' ',1),
    'payment_method', o.payment_method, 'paid', o.paid_at is not null,
    'subtotal_cents', o.subtotal_cents, 'fee_cents', o.fee_cents, 'total_cents', o.total_cents,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name',i.name,'qty',i.qty,'unit_price_cents',i.unit_price_cents) order by i.id)
                       from public.order_items i where i.order_id = o.id),'[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object('status',e.status,'at',e.at) order by e.at)
                        from public.order_events e where e.order_id = o.id),'[]'::jsonb))
  from public.orders o where o.public_token = p_token;
$$;

revoke all on function public.place_order(jsonb) from public;
revoke all on function public.mock_pay(uuid) from public;
revoke all on function public.get_order(uuid) from public;
revoke all on function public.available_slots(date) from public;
grant execute on function public.place_order(jsonb) to anon, authenticated;
grant execute on function public.mock_pay(uuid) to anon, authenticated;
grant execute on function public.get_order(uuid) to anon, authenticated;
grant execute on function public.available_slots(date) to anon, authenticated;
revoke all on function public.log_order_status() from public, anon, authenticated;

alter publication supabase_realtime add table public.orders;
