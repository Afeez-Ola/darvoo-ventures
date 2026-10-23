-- Nationwide shipping of food stuffs, Vienna delivery area, parcel tracking
-- (0004 adds the 'shipping' value to fulfilment_mode on its own, because a new
--  enum value cannot be used in the same transaction that creates it)

alter table public.settings
  add column shipping_fee_cents int not null default 690 check (shipping_fee_cents >= 0),
  add column free_shipping_from_cents int check (free_shipping_from_cents is null or free_shipping_from_cents >= 0),
  add column ship_dispatch_days int not null default 2 check (ship_dispatch_days between 0 and 30),
  add column delivery_postcode_prefixes text[] not null default '{1}';
comment on column public.settings.delivery_postcode_prefixes is
  'Postcodes accepted for cooked-food delivery, matched by prefix. Every Vienna postcode starts with 1.';

alter table public.orders
  alter column slot_date drop not null,
  alter column slot_time drop not null,
  add column city text,
  add column tracking_code text,
  add constraint orders_slot_unless_shipping
    check (mode = 'shipping' or (slot_date is not null and slot_time is not null));

create or replace function public.place_order(payload jsonb)
returns table(order_id uuid, public_token uuid, number int, total_cents int)
language plpgsql security definer set search_path = public as $$
declare
  s public.settings;
  v_mode fulfilment_mode := (payload->>'mode')::fulfilment_mode;
  v_date date := nullif(payload->>'slot_date','')::date;
  v_time time := nullif(payload->>'slot_time','')::time;
  v_pc text := trim(coalesce(payload->>'postcode',''));
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
  if jsonb_array_length(coalesce(payload->'items','[]'::jsonb)) = 0 then raise exception 'EMPTY_CART'; end if;

  if v_mode in ('delivery','shipping') and (coalesce(trim(payload->>'street'),'') = '' or v_pc = '') then
    raise exception 'MISSING_ADDRESS'; end if;

  if v_mode in ('delivery','shipping') and v_pc !~ '^[1-9][0-9]{3}$' then raise exception 'BAD_POSTCODE'; end if;

  if v_mode = 'shipping' then
    if coalesce(trim(payload->>'city'),'') = '' then raise exception 'MISSING_ADDRESS'; end if;
    v_date := null; v_time := null;
  else
    if v_mode = 'delivery' and not exists (select 1 from unnest(s.delivery_postcode_prefixes) pre where v_pc like pre || '%') then
      raise exception 'OUTSIDE_DELIVERY_AREA'; end if;
    select a.open into slot_ok from public.available_slots(v_date) a where a.slot_time = v_time;
    if not coalesce(slot_ok,false) then raise exception 'SLOT_UNAVAILABLE'; end if;
  end if;

  insert into public.orders(mode, slot_date, slot_time, customer_name, phone, email, whatsapp_updates,
                            street, postcode, city, door, note, payment_method, subtotal_cents, fee_cents, total_cents)
  values (v_mode, v_date, v_time, left(trim(payload->>'customer_name'),120), left(trim(payload->>'phone'),40),
          nullif(left(trim(payload->>'email'),200),''), coalesce((payload->>'whatsapp_updates')::boolean,true),
          nullif(left(payload->>'street',200),''), nullif(left(v_pc,10),''), nullif(left(trim(payload->>'city'),80),''),
          nullif(left(payload->>'door',40),''), nullif(left(payload->>'note',500),''),
          coalesce(payload->>'payment_method','card'), 0, 0, 0)
  returning * into v_order;

  for it in select * from jsonb_array_elements(payload->'items') loop
    select * into p from public.products where id = it->>'product_id' and active;
    if not found then raise exception 'UNKNOWN_PRODUCT'; end if;
    if v_mode = 'shipping' and p.category <> 'groceries' then raise exception 'NOT_SHIPPABLE'; end if;
    q := (it->>'qty')::int;
    if q is null or q < 1 or q > 50 then raise exception 'BAD_QTY'; end if;
    insert into public.order_items(order_id, product_id, name, unit, unit_price_cents, qty)
    values (v_order.id, p.id, p.name, p.unit, p.price_cents, q);
    v_sub := v_sub + p.price_cents * q;
  end loop;

  v_fee := case
    when v_mode = 'delivery' then s.delivery_fee_cents
    when v_mode = 'shipping' then
      case when s.free_shipping_from_cents is not null and v_sub >= s.free_shipping_from_cents then 0 else s.shipping_fee_cents end
    else 0 end;

  update public.orders set subtotal_cents = v_sub, fee_cents = v_fee, total_cents = v_sub + v_fee where id = v_order.id;
  return query select v_order.id, v_order.public_token, v_order.number, v_sub + v_fee;
end $$;

create or replace function public.get_order(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'number', o.number, 'status', o.status, 'mode', o.mode,
    'slot_date', o.slot_date, 'slot_time', o.slot_time, 'created_at', o.created_at,
    'customer_name', split_part(o.customer_name,' ',1),
    'city', o.city, 'tracking_code', o.tracking_code,
    'dispatch_days', (select ship_dispatch_days from public.settings where id = 1),
    'payment_method', o.payment_method, 'paid', o.paid_at is not null,
    'subtotal_cents', o.subtotal_cents, 'fee_cents', o.fee_cents, 'total_cents', o.total_cents,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name',i.name,'qty',i.qty,'unit_price_cents',i.unit_price_cents) order by i.id)
                       from public.order_items i where i.order_id = o.id),'[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object('status',e.status,'at',e.at) order by e.at)
                        from public.order_events e where e.order_id = o.id),'[]'::jsonb))
  from public.orders o where o.public_token = p_token;
$$;

revoke all on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to anon, authenticated;
revoke all on function public.get_order(uuid) from public;
grant execute on function public.get_order(uuid) to anon, authenticated;
