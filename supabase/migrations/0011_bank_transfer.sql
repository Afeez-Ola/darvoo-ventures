-- Bank transfer while Stripe is not verified. payment_mode = 'bank_transfer' forces every order to bank transfer:
-- the order waits in pending_payment, the customer sees the bank details and must pay within transfer_hours,
-- the kitchen marks it paid. Switch payment_mode to 'online' once Stripe is live.

alter table public.settings
  add column if not exists payment_mode text not null default 'bank_transfer' check (payment_mode in ('bank_transfer','online')),
  add column if not exists bank_holder text not null default 'Victoria Oluwatosin Stephen',
  add column if not exists bank_iban text not null default 'AT29 2011 1285 4678 7302',
  add column if not exists bank_bic text not null default 'GIBAATWWXXX',
  add column if not exists bank_name text not null default 'Erste Bank',
  add column if not exists transfer_hours int not null default 24 check (transfer_hours between 1 and 168);

-- place_order: force bank transfer while payment_mode = 'bank_transfer'
do $$
declare d text;
begin
  d := pg_get_functiondef('public.place_order(jsonb)'::regprocedure);
  d := replace(d, $r$coalesce(payload->>'payment_method','card')$r$,
    $r$case when s.payment_mode = 'bank_transfer' then 'bank_transfer' else coalesce(nullif(payload->>'payment_method','bank_transfer'),'card') end$r$);
  execute d;
end $$;

-- slots: an unpaid bank transfer order keeps its slot for the whole payment window
do $$
declare d text;
begin
  d := pg_get_functiondef('public.available_slots(date)'::regprocedure);
  d := replace(d, $r$and (o.status <> 'pending_payment' or o.created_at > now() - interval '20 minutes')$r$,
    $r$and (o.status <> 'pending_payment' or o.created_at > now() - interval '20 minutes'
           or (o.payment_method = 'bank_transfer' and o.created_at > now() - make_interval(hours => s.transfer_hours)))$r$);
  execute d;
end $$;

-- mock payment never marks a bank transfer order as paid
create or replace function public.mock_pay(p_token uuid)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if (select payment_mode from public.settings where id = 1) = 'bank_transfer' then return false; end if;
  update public.orders set status = 'received', paid_at = now()
  where public_token = p_token and status = 'pending_payment' and payment_method <> 'bank_transfer';
  return found;
end $function$;

-- tracking page: bank details, amount, reference and deadline for an unpaid transfer
do $$
declare d text;
begin
  d := pg_get_functiondef('public.get_order(uuid)'::regprocedure);
  d := replace(d, $r$'payment_method', o.payment_method, 'paid', o.paid_at is not null,$r$,
    $r$'payment_method', o.payment_method, 'paid', o.paid_at is not null,
    'bank', case when o.payment_method = 'bank_transfer' and o.paid_at is null and o.status = 'pending_payment' then
      (select jsonb_build_object('holder', st.bank_holder, 'iban', st.bank_iban, 'bic', st.bank_bic, 'bank', st.bank_name,
                                 'reference', 'Darvoo ' || o.number, 'pay_by', o.created_at + make_interval(hours => st.transfer_hours))
       from public.settings st where st.id = 1) end,$r$);
  execute d;
end $$;
