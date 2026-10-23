-- Darvoo's dish menu and prices as sent on 23 Oct 2026
update public.products set name='Jollof Rice & Chicken', price_cents=1650, options='{}', sort=10, active=true where id='jollof';
update public.products set name='Jollof Rice, Grilled Tilapia & Plantain', price_cents=2550, options='{}', sort=20, active=true where id='jollof-fish';
insert into public.products (id, category, name, unit, price_cents, image_path, sort, options) values
  ('yam-fish-sauce','dishes','Boiled Yam & Fried Fish Sauce','per plate',1450,'/menu/d07.jpg',30,'{}'),
  ('beans-corn','dishes','Beans & Corn','per plate',1350,'/menu/d18.jpg',40,'{"with fish","with meat"}'),
  ('okro-soup','dishes','Okro Soup','per plate',1850,'/menu/d16.jpg',90,'{"with garri","with pounded yam","with semo"}'),
  ('vegetable-soup','dishes','Vegetable Soup','per plate',1850,'/menu/d23.jpg',100,'{"with garri","with pounded yam","with semo"}'),
  ('chicken-pepper-soup','dishes','Chicken Pepper Soup','per bowl',1000,null,110,'{}'),
  ('goat-pepper-soup','dishes','Goat Meat Pepper Soup','per bowl',1200,null,120,'{}')
on conflict (id) do update set name=excluded.name, price_cents=excluded.price_cents, image_path=excluded.image_path,
  sort=excluded.sort, options=excluded.options, active=true;
update public.products set name='Yam Porridge', price_cents=1650, options='{"with fried fish","with fried beef"}', sort=50, active=true where id='yam-porridge';
update public.products set name='Beans with Plantain or Fried Yam', price_cents=1500, options='{"with fried plantain","with fried yam"}', sort=60, active=true where id='agonyin';
update public.products set name='Egusi Soup', price_cents=1850, options='{"with garri","with pounded yam","with semo"}', sort=70, active=true where id='egusi';
update public.products set name='Ogbono Soup', price_cents=1850, options='{"with garri","with pounded yam","with semo"}', sort=80, active=true where id='ogbono';
-- not on the new list: hidden, not deleted (switch back on in Kitchen > Menu & prices)
update public.products set active=false
 where id in ('plantain-fish','pepper-fish','fried-yam','banga','snail-soup','assorted-stew','moin-moin','meat-pie');
