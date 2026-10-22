alter table public.products add column allergens text not null default '';
comment on column public.products.allergens is 'Austrian allergen letter codes A to R, e.g. "A, C, G"';
