-- Food stuffs ship across Europe (EU countries by default). Cooked food stays Vienna only.
-- Austria keeps its own shipping fee and free shipping threshold; other countries use shipping_fee_eu_cents.
-- shipping_fee_eu_cents 1490 is a PLACEHOLDER until Victoria confirms the real parcel price.

alter table public.orders add column if not exists country text not null default 'AT';

alter table public.settings
  add column if not exists shipping_fee_eu_cents int not null default 1490,
  add column if not exists ship_countries text[] not null default
    '{AT,BE,BG,HR,CY,CZ,DK,EE,FI,FR,DE,GR,HU,IE,IT,LV,LT,LU,MT,NL,PL,PT,RO,SK,SI,ES,SE}';

create or replace function public.place_order(payload jsonb)
 returns table(order_id uuid, public_token uuid, number integer, total_cents integer)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  s public.settings;
  v_mode fulfilment_mode := (payload->>'mode')::fulfilment_mode;
  v_date date := nullif(payload->>'slot_date','')::date;
  v_time time := nullif(payload->>'slot_time','')::time;
  v_pc text := trim(coalesce(payload->>'postcode',''));
  v_cc text := upper(coalesce(nullif(trim(payload->>'country'),''),'AT'));
  v_sub int := 0;
  v_fee int;
  v_order public.orders;
  it jsonb;
  p public.products;
  q int;
  v_opt text;
  slot_ok boolean;
begin
  select * into s from public.settings where id = 1;
  if not s.accepting_orders then raise exception 'ORDERS_PAUSED'; end if;
  if coalesce(trim(payload->>'customer_name'),'') = '' or coalesce(trim(payload->>'phone'),'') = '' then
    raise exception 'MISSING_CONTACT'; end if;
  if jsonb_array_length(coalesce(payload->'items','[]'::jsonb)) = 0 then raise exception 'EMPTY_CART'; end if;

  if v_mode <> 'shipping' then v_cc := 'AT'; end if;

  if v_mode in ('delivery','shipping') and (coalesce(trim(payload->>'street'),'') = '' or v_pc = '') then
    raise exception 'MISSING_ADDRESS'; end if;
  if v_mode in ('delivery','shipping') then
    if v_cc = 'AT' and v_pc !~ '^[1-9][0-9]{3}$' then raise exception 'BAD_POSTCODE'; end if;
    if v_cc <> 'AT' and v_pc !~ '^[A-Za-z0-9][A-Za-z0-9 -]{1,9}$' then raise exception 'BAD_POSTCODE'; end if;
  end if;

  if v_mode = 'shipping' then
    if coalesce(trim(payload->>'city'),'') = '' then raise exception 'MISSING_ADDRESS'; end if;
    if not (v_cc = any(s.ship_countries)) then raise exception 'COUNTRY_NOT_SHIPPED'; end if;
    v_date := null; v_time := null;
  else
    if v_mode = 'delivery' and not exists (select 1 from unnest(s.delivery_postcode_prefixes) pre where v_pc like pre || '%') then
      raise exception 'OUTSIDE_DELIVERY_AREA'; end if;
    select a.open into slot_ok from public.available_slots(v_date) a where a.slot_time = v_time;
    if not coalesce(slot_ok,false) then raise exception 'SLOT_UNAVAILABLE'; end if;
  end if;

  insert into public.orders(mode, slot_date, slot_time, customer_name, phone, email, whatsapp_updates,
                            street, postcode, city, country, door, note, payment_method, subtotal_cents, fee_cents, total_cents)
  values (v_mode, v_date, v_time, left(trim(payload->>'customer_name'),120), left(trim(payload->>'phone'),40),
          nullif(left(trim(payload->>'email'),200),''), coalesce((payload->>'whatsapp_updates')::boolean,true),
          nullif(left(payload->>'street',200),''), nullif(left(upper(v_pc),10),''), nullif(left(trim(payload->>'city'),80),''),
          v_cc, nullif(left(payload->>'door',40),''), nullif(left(payload->>'note',500),''),
          coalesce(payload->>'payment_method','card'), 0, 0, 0)
  returning * into v_order;

  for it in select * from jsonb_array_elements(payload->'items') loop
    select * into p from public.products where id = it->>'product_id' and active;
    if not found then raise exception 'UNKNOWN_PRODUCT'; end if;
    if v_mode = 'shipping' and p.category <> 'groceries' then raise exception 'NOT_SHIPPABLE'; end if;
    q := (it->>'qty')::int;
    if q is null or q < 1 or q > 50 then raise exception 'BAD_QTY'; end if;
    v_opt := nullif(trim(coalesce(it->>'option','')),'');
    if coalesce(array_length(p.options,1),0) > 0 then
      if v_opt is null or not (v_opt = any(p.options)) then raise exception 'CHOOSE_OPTION'; end if;
    else
      v_opt := null;
    end if;
    insert into public.order_items(order_id, product_id, name, unit, unit_price_cents, qty, option)
    values (v_order.id, p.id, p.name, p.unit, p.price_cents, q, v_opt);
    v_sub := v_sub + p.price_cents * q;
  end loop;

  v_fee := case
    when v_mode = 'delivery' then
      case when v_pc = any(s.far_postcodes) then s.delivery_fee_far_cents else s.delivery_fee_cents end
    when v_mode = 'shipping' and v_cc = 'AT' then
      case when s.free_shipping_from_cents is not null and v_sub >= s.free_shipping_from_cents then 0 else s.shipping_fee_cents end
    when v_mode = 'shipping' then s.shipping_fee_eu_cents
    else 0 end;

  update public.orders set subtotal_cents = v_sub, fee_cents = v_fee, total_cents = v_sub + v_fee where id = v_order.id;
  return query select v_order.id, v_order.public_token, v_order.number, v_sub + v_fee;
end $function$;
