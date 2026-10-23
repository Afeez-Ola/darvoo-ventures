-- Vienna delivery: €5 within about 10 km of the centre (1010 to 1200), €10 for the outer districts
alter table public.settings
  add column delivery_fee_far_cents int not null default 1000 check (delivery_fee_far_cents >= 0),
  add column far_postcodes text[] not null default '{1210,1220,1230}';
update public.settings set delivery_fee_cents = 500, delivery_fee_far_cents = 1000, far_postcodes = '{1210,1220,1230}' where id = 1;
-- place_order(): delivery fee = delivery_fee_far_cents when the postcode is in far_postcodes,
-- otherwise delivery_fee_cents (full function body as applied: see 0006 plus this fee rule)

-- 23 Oct 2026: distances measured by road from the Vienna kitchen (Hauffgasse 6, 1110 Wien)
-- to each district centre (OSRM). Over ~10 km: 1130, 1140, 1160, 1170, 1180, 1190, 1210, 1220, 1230.
update public.settings set far_postcodes = '{1130,1140,1160,1170,1180,1190,1210,1220,1230}' where id = 1;
