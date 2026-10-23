-- Oct 2026: short descriptions (EN/DE), new photos, new items from the photos Bolaji sent.
-- New items without a confirmed price use the 3000 (EUR 30) demo price like the rest of the
-- food stuffs and party trays. New cooked dishes stay hidden until Victoria sets a price.

alter table public.products
  add column if not exists description text,
  add column if not exists description_de text;

-- new photos for existing items
update public.products set image_path = '/menu/d_efo.jpg'        where id = 'vegetable-soup';
update public.products set image_path = '/menu/d_pepsoup.jpg'    where id = 'chicken-pepper-soup';
update public.products set image_path = '/menu/g_snail.jpg'      where id = 'snail';
update public.products set image_path = '/menu/g_crayfish.jpg'   where id = 'crayfish';
update public.products set image_path = '/menu/g_cassava.jpg'    where id = 'cassava-flour';
update public.products set image_path = '/menu/g_brownbeans.jpg' where id = 'beans';
update public.products set image_path = '/menu/d_tilapia.jpg',
       name = 'Grilled Tilapia, Fried Plantain & Yam'          where id = 'plantain-fish';

-- new items
insert into public.products (id, category, name, unit, price_cents, image_path, sort, allergens, active) values
  ('boli-fish',        'dishes',    'Boli (Roasted Plantain) & Grilled Fish', 'per plate',  3000, '/menu/d_boli.jpg',        25, 'D', false),
  ('dried-prawns',     'groceries', 'Dried Prawns',                           '200 g',      3000, '/menu/g_prawns.jpg',      35, 'B', true),
  ('black-eyed-beans', 'groceries', 'Black-Eyed Beans',                       '1 kg',       3000, '/menu/g_blackeyed.jpg',  115, '',  true),
  ('stockfish',        'groceries', 'Stockfish',                              '1 piece',    3000, '/menu/g_stockfish.jpg',  120, 'D', true),
  ('smoked-catfish',   'groceries', 'Smoked Catfish',                         '1 piece',    3000, '/menu/g_smokedfish.jpg', 130, 'D', true),
  ('yam-tuber',        'groceries', 'Yam (Tuber)',                            '1 tuber',    3000, '/menu/g_yam.jpg',        140, '',  true),
  ('tray-puffpuff',    'events',    'Puff Puff Tray',                         'party tray', 3000, '/menu/e_puffpuff.jpg',    60, 'A', true),
  ('tray-suya',        'events',    'Pepper Stick Meat Tray',                 'party tray', 3000, '/menu/e_suya.jpg',        70, '',  true),
  ('tray-salad',       'events',    'Nigerian Salad Tray',                    'party tray', 3000, '/menu/e_salad.jpg',       80, 'C', true)
on conflict (id) do nothing;

-- descriptions
update public.products p set description = d.en, description_de = d.de
from (values
  ('jollof',             'Smoky party jollof rice cooked in a tomato and pepper base, with seasoned chicken.',
                         'Rauchiger Jollof-Reis in Tomaten-Paprika-Sauce, dazu gewürztes Hähnchen.'),
  ('jollof-fish',        'Jollof rice with a whole grilled tilapia and sweet fried plantain.',
                         'Jollof-Reis mit ganzer gegrillter Tilapia und süßen gebratenen Kochbananen.'),
  ('plantain-fish',      'Whole grilled tilapia with fried plantain, boiled yam and fresh pepper sauce.',
                         'Ganze gegrillte Tilapia mit gebratenen Kochbananen, gekochter Yamswurzel und Pfeffersauce.'),
  ('boli-fish',          'Roasted plantain (boli) with grilled fish in a chunky pepper and onion sauce.',
                         'Geröstete Kochbananen (Boli) mit gegrilltem Fisch in Paprika-Zwiebel-Sauce.'),
  ('yam-fish-sauce',     'Soft boiled yam with fried fish simmered in a tomato and pepper sauce.',
                         'Gekochte Yamswurzel mit gebratenem Fisch in Tomaten-Paprika-Sauce.'),
  ('beans-corn',         'Slow cooked beans and sweet corn in palm oil sauce, with fish or meat.',
                         'Langsam gekochte Bohnen mit Mais in Palmölsauce, mit Fisch oder Fleisch.'),
  ('yam-porridge',       'Yam cooked down in a rich pepper and palm oil sauce (asaro), with fish or beef.',
                         'Yamswurzel-Eintopf (Asaro) in Pfeffer-Palmöl-Sauce, mit Fisch oder Rind.'),
  ('agonyin',            'Soft mashed beans with a deep pepper sauce, served with fried plantain or fried yam.',
                         'Weiche Bohnen mit kräftiger Pfeffersauce, dazu gebratene Kochbananen oder Yams.'),
  ('egusi',              'Ground melon seed soup with leafy greens and meat. Choose garri, pounded yam or semo.',
                         'Suppe aus gemahlenen Melonenkernen mit Blattgemüse und Fleisch. Mit Garri, Pounded Yam oder Semo.'),
  ('ogbono',             'Thick, silky ogbono soup with meat and fish. Choose garri, pounded yam or semo.',
                         'Sämige Ogbono-Suppe mit Fleisch und Fisch. Mit Garri, Pounded Yam oder Semo.'),
  ('okro-soup',          'Fresh okra soup with meat and fish. Choose garri, pounded yam or semo.',
                         'Frische Okra-Suppe mit Fleisch und Fisch. Mit Garri, Pounded Yam oder Semo.'),
  ('vegetable-soup',     'Efo riro: spinach stewed in pepper sauce with meat and fish. Choose garri, pounded yam or semo.',
                         'Efo Riro: Spinat in Pfeffersauce mit Fleisch und Fisch. Mit Garri, Pounded Yam oder Semo.'),
  ('chicken-pepper-soup','Light, spicy broth with tender chicken and pepper soup spices.',
                         'Leichte, scharfe Brühe mit zartem Hähnchen und Pepper-Soup-Gewürzen.'),
  ('goat-pepper-soup',   'Spicy goat meat broth with pepper soup spices. Warming and hearty.',
                         'Scharfe Ziegenfleischbrühe mit Pepper-Soup-Gewürzen. Wärmend und herzhaft.'),
  ('dry-ogbono',         'Dried ogbono seeds (wild mango) to grind for ogbono soup.',
                         'Getrocknete Ogbono-Kerne zum Mahlen für Ogbono-Suppe.'),
  ('egusi-seed',         'Melon seeds for egusi soup.',
                         'Melonenkerne für Egusi-Suppe.'),
  ('crayfish',           'Dried crayfish, the classic flavour base for Nigerian soups and stews.',
                         'Getrocknete Krebse, die klassische Würze für nigerianische Suppen.'),
  ('dried-prawns',       'Whole dried prawns for soups, stews and pepper sauce.',
                         'Ganze getrocknete Garnelen für Suppen, Eintöpfe und Pfeffersauce.'),
  ('cameroun-pepper',    'Hot, smoky dried pepper.',
                         'Scharfer, rauchiger getrockneter Pfeffer.'),
  ('banga-fruit',        'Palm fruit for banga soup.',
                         'Palmfrüchte für Banga-Suppe.'),
  ('snail',              'Large African land snails for pepper soup and stews.',
                         'Große afrikanische Landschnecken für Pepper Soup und Eintöpfe.'),
  ('gari-ijebu',         'Crisp, sour Ijebu gari. Soak it or make eba.',
                         'Knuspriger, säuerlicher Ijebu-Garri. Zum Einweichen oder für Eba.'),
  ('cassava-flour',      'Fine cassava flour for swallow.',
                         'Feines Maniokmehl für Swallow.'),
  ('banana-flour',       'Unripe plantain flour for a light swallow.',
                         'Mehl aus grünen Kochbananen für leichtes Swallow.'),
  ('palm-oil',           'Red palm oil for soups, stews and beans.',
                         'Rotes Palmöl für Suppen, Eintöpfe und Bohnen.'),
  ('beans',              'Brown beans (honey beans) for ewa agonyin, moin moin and porridge.',
                         'Braune Bohnen (Honey Beans) für Ewa Agonyin, Moin Moin und Eintopf.'),
  ('black-eyed-beans',   'Black-eyed beans for moin moin, akara and beans porridge.',
                         'Augenbohnen für Moin Moin, Akara und Bohneneintopf.'),
  ('stockfish',          'Dried stockfish for egusi, ogbono and vegetable soups.',
                         'Stockfisch für Egusi-, Ogbono- und Gemüsesuppen.'),
  ('smoked-catfish',     'Smoked catfish for pepper soup and soups.',
                         'Geräucherter Wels für Pepper Soup und Suppen.'),
  ('yam-tuber',          'Whole yam tuber to boil, fry, pound or make porridge.',
                         'Ganze Yamswurzel zum Kochen, Frittieren, Stampfen oder für Eintopf.'),
  ('tray-jollof',        'A full tray of party jollof rice for your guests.',
                         'Ein ganzes Blech Party-Jollof für deine Gäste.'),
  ('tray-chicken',       'Seasoned fried chicken by the tray.',
                         'Gewürztes frittiertes Hähnchen, blechweise.'),
  ('tray-fish',          'Seasoned fried fish by the tray.',
                         'Gewürzter frittierter Fisch, blechweise.'),
  ('tray-plantain',      'Sweet fried plantain (dodo) by the tray.',
                         'Süße gebratene Kochbananen (Dodo), blechweise.'),
  ('tray-egusi',         'Egusi soup by the tray, for parties and gatherings.',
                         'Egusi-Suppe im Blech, für Feiern und Treffen.'),
  ('tray-puffpuff',      'Soft, golden puff puff. A favourite small chop for any party.',
                         'Weiche, goldene Puff Puff. Der Klassiker unter den Small Chops.'),
  ('tray-suya',          'Spiced beef skewers with peppers and onions.',
                         'Gewürzte Rindfleischspieße mit Paprika und Zwiebeln.'),
  ('tray-salad',         'Nigerian salad with lettuce, cabbage, cucumber, carrot, sweet corn and boiled egg.',
                         'Nigerianischer Salat mit Salat, Kraut, Gurke, Karotte, Mais und gekochtem Ei.')
) as d(id, en, de)
where p.id = d.id;
