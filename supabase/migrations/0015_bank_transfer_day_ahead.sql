-- While payment is bank transfer only: cooked food (delivery, pickup) can be booked from tomorrow,
-- and the payment deadline is the earlier of transfer_hours after ordering and 2 hours before the slot.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.available_slots(date)'::regprocedure);
  if position('and p_date >= now_local::date' in d) = 0 then raise exception 'slots pattern not found'; end if;
  d := replace(d, 'and p_date >= now_local::date',
               'and p_date >= now_local::date and (s.payment_mode <> ''bank_transfer'' or p_date > now_local::date)');
  execute d;
end $$;

create or replace function public.pay_by(o public.orders)
returns timestamptz language sql stable security definer set search_path to 'public'
as $$
  select least(o.created_at + make_interval(hours => (select transfer_hours from public.settings where id = 1)),
               case when o.slot_date is not null and o.slot_time is not null
                    then ((o.slot_date + o.slot_time) at time zone 'Europe/Vienna') - interval '2 hours' end)
$$;
revoke all on function public.pay_by(public.orders) from public, anon, authenticated;
grant execute on function public.pay_by(public.orders) to service_role;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.get_order(uuid)'::regprocedure);
  if position('''pay_by'', o.created_at + make_interval(hours => st.transfer_hours)' in d) = 0 then raise exception 'get_order pattern not found'; end if;
  d := replace(d, '''pay_by'', o.created_at + make_interval(hours => st.transfer_hours)', '''pay_by'', public.pay_by(o)');
  execute d;
end $$;
