-- Arise Coffee Supabase compatibility layer.
-- Run this in the Supabase SQL Editor before switching src/api/backend.js to supabaseBackend.

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_name text not null,
  drink text not null,
  temperature text,
  milk text,
  syrups text[] default '{}',
  notes text,
  status text not null default 'waiting'
);

alter table orders add column if not exists created_at timestamptz not null default now();
alter table orders add column if not exists name text;
alter table orders add column if not exists customer_name text;
alter table orders add column if not exists drink text;
alter table orders add column if not exists temp text;
alter table orders add column if not exists temperature text;
alter table orders add column if not exists milk text;
alter table orders add column if not exists syrups text[] default '{}';
alter table orders add column if not exists notes text;
alter table orders add column if not exists status text not null default 'waiting';

create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  item text not null unique,
  type text not null check (type in ('syrup', 'milk', 'topping')),
  available boolean not null default true,
  active boolean not null default true,
  sort_order integer not null default 0
);

alter table inventory add column if not exists item text;
alter table inventory add column if not exists type text;
alter table inventory add column if not exists available boolean not null default true;
alter table inventory add column if not exists active boolean not null default true;
alter table inventory add column if not exists sort_order integer not null default 0;

alter table inventory drop constraint if exists inventory_type_check;
alter table inventory add constraint inventory_type_check check (type in ('syrup', 'milk', 'topping'));

create table if not exists menu_drinks (
  id text primary key,
  label text not null,
  description text not null default '',
  category text not null default 'coffee',
  temps text[] not null default array['Hot','Cold'],
  has_milk boolean not null default true,
  has_syrups boolean not null default true,
  show_temp boolean not null default true,
  price numeric not null default 5,
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table menu_drinks add column if not exists label text;
alter table menu_drinks add column if not exists description text not null default '';
alter table menu_drinks add column if not exists category text not null default 'coffee';
alter table menu_drinks add column if not exists temps text[] not null default array['Hot','Cold'];
alter table menu_drinks add column if not exists has_milk boolean not null default true;
alter table menu_drinks add column if not exists has_syrups boolean not null default true;
alter table menu_drinks add column if not exists show_temp boolean not null default true;
alter table menu_drinks add column if not exists price numeric not null default 5;
alter table menu_drinks add column if not exists active boolean not null default true;
alter table menu_drinks add column if not exists sort_order integer not null default 0;
alter table menu_drinks add column if not exists updated_at timestamptz not null default now();

create table if not exists settings (
  key text primary key,
  value text
);

create table if not exists archived_orders (
  id uuid primary key default gen_random_uuid(),
  archived_at timestamptz not null default now(),
  original_order_id uuid,
  original_order_id_text text,
  original_created_at timestamptz,
  customer_name text,
  drink text,
  temperature text,
  milk text,
  syrups text,
  notes text,
  status text,
  order_data jsonb not null
);

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table employees add column if not exists name text;
alter table employees add column if not exists pin text;
alter table employees add column if not exists active boolean not null default true;
alter table employees add column if not exists created_at timestamptz not null default now();
create unique index if not exists employees_pin_key on employees (pin);

create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  created_at timestamptz not null default now()
);

alter table time_entries add column if not exists employee_id uuid references employees(id) on delete cascade;
alter table time_entries add column if not exists clock_in timestamptz not null default now();
alter table time_entries add column if not exists clock_out timestamptz;
alter table time_entries add column if not exists created_at timestamptz not null default now();

create table if not exists finance_items (
  id text primary key,
  item text not null,
  category text not null default 'Supply',
  units_on_hand numeric not null default 0,
  servings_per_unit numeric not null default 1,
  unit_cost numeric not null default 0,
  waste_servings numeric not null default 0,
  actual_remaining_servings numeric,
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table finance_items add column if not exists item text;
alter table finance_items add column if not exists category text not null default 'Supply';
alter table finance_items add column if not exists units_on_hand numeric not null default 0;
alter table finance_items add column if not exists servings_per_unit numeric not null default 1;
alter table finance_items add column if not exists unit_cost numeric not null default 0;
alter table finance_items add column if not exists waste_servings numeric not null default 0;
alter table finance_items add column if not exists actual_remaining_servings numeric;
alter table finance_items add column if not exists active boolean not null default true;
alter table finance_items add column if not exists sort_order integer not null default 0;
alter table finance_items add column if not exists updated_at timestamptz not null default now();

alter table archived_orders add column if not exists original_order_id_text text;
alter table archived_orders add column if not exists original_created_at timestamptz;
alter table archived_orders add column if not exists customer_name text;
alter table archived_orders add column if not exists drink text;
alter table archived_orders add column if not exists temperature text;
alter table archived_orders add column if not exists milk text;
alter table archived_orders add column if not exists syrups text;
alter table archived_orders add column if not exists notes text;
alter table archived_orders add column if not exists status text;

insert into finance_items (id, item, category, units_on_hand, servings_per_unit, unit_cost, active, sort_order) values
('espresso-beans','Espresso beans','Coffee',0,60,0,true,0),
('whole-milk','Whole milk','Milk',0,16,0,true,1),
('almond-milk','Almond milk','Milk',0,16,0,true,2),
('oat-milk','Oat milk','Milk',0,16,0,true,3),
('soy-milk','Soy milk','Milk',0,16,0,true,4),
('juice-bottles','Juice bottles','Juice',0,1,0,true,5),
('juice-boxes','Juice boxes','Juice',0,1,0,true,6),
('soda-cans','Soda cans','Soda',0,1,0,true,7),
('water-bottles','Water bottles','Water',0,1,0,true,8),
('refresher-base','Refresher base','Refreshers',0,60,0,true,9),
('smoothie-mix','Smoothie mix','Smoothies',0,30,0,true,10),
('small-snacks','Small snacks','Small Snacks',0,1,0,true,11),
('big-snacks','Big snacks','Big Snacks',0,1,0,true,12),
('light-meals','Light meals','Light Meals',0,1,0,true,13)
on conflict (id) do nothing;

update finance_items
set active = false
where id = 'juice-concentrate';

insert into inventory (item, type, available) values
('Caramel','syrup',true),
('Sugar Free Caramel','syrup',true),
('Vanilla','syrup',true),
('Sugar Free Vanilla','syrup',true),
('Mocha','syrup',true),
('White Chocolate','syrup',true),
('Honey','syrup',true),
('Cinnamon Powder','syrup',true),
('Hazelnut','syrup',true),
('Freeze-Dried Raspberry','topping',true),
('Freeze-Dried Mango','topping',true),
('Freeze-Dried Strawberries','topping',true),
('Brown Sugar Popping Pearls','topping',true),
('Mango Popping Pearls','topping',true),
('Strawberry Popping Pearls','topping',true),
('Green Apple Popping Pearls','topping',true),
('Almond milk','milk',true),
('Oat milk','milk',true),
('Soy milk','milk',true),
('Whole milk','milk',false)
on conflict (item) do nothing;

update inventory
set active = false, available = false
where type = 'topping'
  and item in ('Strawberry Popping Boba', 'Mango Popping Boba', 'Peach Popping Boba', 'Fresh Strawberry', 'Lemon Slice');

update inventory
set active = true, available = true
where type = 'topping'
  and item in ('Freeze-Dried Raspberry', 'Freeze-Dried Mango', 'Freeze-Dried Strawberries', 'Brown Sugar Popping Pearls', 'Mango Popping Pearls', 'Strawberry Popping Pearls', 'Green Apple Popping Pearls');

update inventory
set sort_order = ranked.sort_order
from (
  select item, row_number() over (
    partition by type
    order by
      case item
        when 'Whole milk' then 0
        when 'Almond milk' then 1
        when 'Oat milk' then 2
        when 'Soy milk' then 3
        when 'Caramel' then 0
        when 'Sugar Free Caramel' then 1
        when 'Vanilla' then 2
        when 'Sugar Free Vanilla' then 3
        when 'Mocha' then 4
        when 'White Chocolate' then 5
        when 'Honey' then 6
        when 'Cinnamon Powder' then 7
        when 'Hazelnut' then 8
        when 'Freeze-Dried Raspberry' then 0
        when 'Freeze-Dried Mango' then 1
        when 'Freeze-Dried Strawberries' then 2
        when 'Brown Sugar Popping Pearls' then 3
        when 'Mango Popping Pearls' then 4
        when 'Strawberry Popping Pearls' then 5
        when 'Green Apple Popping Pearls' then 6
        else 99
      end,
      item
  ) - 1 as sort_order
  from inventory
) ranked
where inventory.item = ranked.item
  and inventory.sort_order = 0;

delete from menu_drinks
where id in ('americano', 'latte', 'cappuccino', 'cortado', 'espresso', 'strawberry-refresher', 'mango-refresher', 'strawberry-banana-smoothie');

insert into menu_drinks (id, label, description, category, temps, has_milk, has_syrups, show_temp, price, active, sort_order) values
('iced-caramel','Iced Caramel','Poster coffee menu','coffee',array['Cold'],true,true,false,5,true,0),
('hot-caramel','Hot Caramel','Poster coffee menu','coffee',array['Hot'],true,true,false,5,true,1),
('caramel-frappe','Caramel Frappe','Blended caramel coffee','coffee',array['Cold'],true,true,false,5,true,2),
('iced-mocha','Iced Mocha','Poster coffee menu','coffee',array['Cold'],true,true,false,5,true,3),
('hot-mocha','Hot Mocha','Poster coffee menu','coffee',array['Hot'],true,true,false,5,true,4),
('mocha-frappe','Mocha Frappe','Blended mocha coffee','coffee',array['Cold'],true,true,false,5,true,5),
('iced-vanilla','Iced Vanilla','Poster coffee menu','coffee',array['Cold'],true,true,false,5,true,6),
('hot-vanilla','Hot Vanilla','Poster coffee menu','coffee',array['Hot'],true,true,false,5,true,7),
('vanilla-frappe','Vanilla Frappe','Blended vanilla coffee','coffee',array['Cold'],true,true,false,5,true,8),
('cranberry-mango','Cranberry Mango','Light, fruity refresher','refresher',array['Cold'],false,false,false,5,true,9),
('cranberry-pineapple','Cranberry Pineapple','Light, fruity refresher','refresher',array['Cold'],false,false,false,5,true,10),
('cranberry-raspberry','Cranberry Raspberry','Light, fruity refresher','refresher',array['Cold'],false,false,false,5,true,11),
('strawberry-acai','Strawberry Acai','Light, fruity refresher','refresher',array['Cold'],false,false,false,5,true,12),
('mango-smoothie','Mango Smoothie','Blended smoothie','smoothie',array['Cold'],false,false,false,5,true,13),
('strawberry-smoothie','Strawberry Smoothie','Blended smoothie','smoothie',array['Cold'],false,false,false,5,true,14),
('water','Water','Bottled water','drink',array['Cold'],false,false,false,3,true,15),
('soda','Soda','Canned soda','drink',array['Cold'],false,false,false,3,true,16),
('juice','Juice','Choose box or bottle','drink',array['Cold'],false,false,false,2,true,17),
('juice-bottle','Juice Bottle','Bottled juice','drink',array['Cold'],false,false,false,3,false,18),
('juice-box','Juice Box','Boxed juice','drink',array['Cold'],false,false,false,2,false,19),
('small-snack','Small Snack','Small snack item','snack',array['Cold'],false,false,false,1,true,20),
('big-snack','Big Snack','Big snack item','snack',array['Cold'],false,false,false,2,true,21),
('light-meal','Light Meal','Light meal item','snack',array['Cold'],false,false,false,3,true,22)
on conflict (id) do update set
  label = excluded.label,
  description = excluded.description,
  category = excluded.category,
  temps = excluded.temps,
  has_milk = excluded.has_milk,
  has_syrups = excluded.has_syrups,
  show_temp = excluded.show_temp,
  price = excluded.price,
  active = excluded.active,
  sort_order = excluded.sort_order,
  updated_at = now();

update menu_drinks
set active = false
where id in ('juice-bottle', 'juice-box');

update menu_drinks
set active = true, description = 'Choose box or bottle', price = 2
where id = 'juice';

update menu_drinks
set category = 'snack', price = case id when 'small-snack' then 1 when 'big-snack' then 2 when 'light-meal' then 3 else price end
where id in ('small-snack', 'big-snack', 'light-meal');

update menu_drinks
set price = case
  when id = 'juice-box' then 2
  when id in ('water', 'soda', 'juice-bottle') then 3
  when id = 'small-snack' then 1
  when id = 'big-snack' then 2
  when id = 'light-meal' then 3
  when category in ('coffee', 'refresher', 'smoothie') then 5
  else price
end;

insert into settings (key, value) values
('pin','"1972"')
on conflict (key) do update set value = excluded.value;

insert into settings (key, value) values
('isOpen','"true"'),
('message','""')
on conflict (key) do nothing;

insert into settings (key, value) values
('theme','{"bg":"#0B0604","surface":"#32180D","surface2":"#4A2415","text":"#FFF7EA","muted":"#E5C6A1","gold":"#E7A94C","red":"#D84A38","green":"#A9BC75","copper":"#B7642C"}')
on conflict (key) do nothing;

alter table orders enable row level security;
alter table inventory enable row level security;
alter table menu_drinks enable row level security;
alter table settings enable row level security;
alter table archived_orders enable row level security;
alter table employees enable row level security;
alter table time_entries enable row level security;
alter table finance_items enable row level security;

revoke all on orders from anon;
revoke all on inventory from anon;
revoke all on menu_drinks from anon;
revoke all on settings from anon;
revoke all on archived_orders from anon;
revoke all on employees from anon;
revoke all on time_entries from anon;
revoke all on finance_items from anon;
grant delete on archived_orders to anon;

drop function if exists arise_order(uuid);
drop function if exists arise_update_status(text, uuid, text);

create or replace function arise_setting(input_key text, fallback text default '')
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select trim(both '"' from value::text)
      from settings
      where key = input_key
      limit 1
    ),
    fallback
  );
$$;

create or replace function arise_setting_json(input_key text, fallback jsonb default '{}'::jsonb)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select value::jsonb
      from settings
      where key = input_key
      limit 1
    ),
    fallback
  );
$$;

create or replace function arise_pin_matches(input_pin text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(input_pin, '') = arise_setting('pin', '');
$$;

create or replace function arise_employee_pin_matches(input_pin text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from employees
    where pin = trim(coalesce(input_pin, ''))
      and active = true
  );
$$;

create or replace function arise_inventory_json()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with sorted as (
    select item, type, available, active, sort_order
    from inventory
    where active = true
    order by
      case type when 'syrup' then 0 when 'milk' then 1 else 2 end,
      sort_order,
      item
  )
  select jsonb_build_object(
    'syrups', coalesce(
      jsonb_agg(jsonb_build_object('item', item, 'type', 'syrup', 'available', available, 'active', active, 'sortOrder', sort_order))
        filter (where type = 'syrup'),
      '[]'::jsonb
    ),
    'milks', coalesce(
      jsonb_agg(jsonb_build_object('item', item, 'type', 'milk', 'available', available, 'active', active, 'sortOrder', sort_order))
        filter (where type = 'milk'),
      '[]'::jsonb
    ),
    'toppings', coalesce(
      jsonb_agg(jsonb_build_object('item', item, 'type', 'topping', 'available', available, 'active', active, 'sortOrder', sort_order))
        filter (where type = 'topping'),
      '[]'::jsonb
    )
  )
  from sorted;
$$;

create or replace function arise_inventory_menu_json(input_include_inactive boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with sorted as (
    select item, type, available, active, sort_order
    from inventory
    where input_include_inactive or active = true
    order by
      case type when 'syrup' then 0 when 'milk' then 1 else 2 end,
      sort_order,
      item
  )
  select jsonb_build_object(
    'syrups', coalesce(
      jsonb_agg(jsonb_build_object('id', lower(regexp_replace(item, '[^a-zA-Z0-9]+', '-', 'g')), 'item', item, 'type', 'syrup', 'available', available, 'active', active, 'sortOrder', sort_order))
        filter (where type = 'syrup'),
      '[]'::jsonb
    ),
    'milks', coalesce(
      jsonb_agg(jsonb_build_object('id', lower(regexp_replace(item, '[^a-zA-Z0-9]+', '-', 'g')), 'item', item, 'type', 'milk', 'available', available, 'active', active, 'sortOrder', sort_order))
        filter (where type = 'milk'),
      '[]'::jsonb
    ),
    'toppings', coalesce(
      jsonb_agg(jsonb_build_object('id', lower(regexp_replace(item, '[^a-zA-Z0-9]+', '-', 'g')), 'item', item, 'type', 'topping', 'available', available, 'active', active, 'sortOrder', sort_order))
        filter (where type = 'topping'),
      '[]'::jsonb
    )
  )
  from sorted;
$$;

create or replace function arise_menu_json(input_include_inactive boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'label', label,
        'desc', description,
        'category', category,
        'temps', to_jsonb(temps),
        'milk', has_milk,
        'syrups', has_syrups,
        'showTemp', show_temp,
        'price', price,
        'active', active,
        'sortOrder', sort_order
      )
      order by sort_order, label
    ),
    '[]'::jsonb
  )
  from menu_drinks
  where input_include_inactive or active = true;
$$;

create or replace function arise_menu(input_pin text default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'drinks', arise_menu_json(arise_pin_matches(input_pin) or arise_employee_pin_matches(input_pin)),
    'milks', arise_inventory_menu_json(arise_pin_matches(input_pin) or arise_employee_pin_matches(input_pin))->'milks',
    'syrups', arise_inventory_menu_json(arise_pin_matches(input_pin) or arise_employee_pin_matches(input_pin))->'syrups',
    'toppings', arise_inventory_menu_json(arise_pin_matches(input_pin) or arise_employee_pin_matches(input_pin))->'toppings',
    'theme', arise_setting_json('theme')
  );
$$;

create or replace function arise_order_json(input_order orders, input_position integer default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when input_order is null then 'null'::jsonb
    else jsonb_build_object(
      'id', (input_order).id,
      'time', (input_order).created_at,
      'name', coalesce((input_order).customer_name, (input_order).name, ''),
      'drink', (input_order).drink,
      'temp', coalesce((input_order).temperature, (input_order).temp, ''),
      'milk', coalesce((input_order).milk, ''),
      'syrups', array_to_string(coalesce((input_order).syrups, '{}'::text[]), ', '),
      'notes', coalesce((input_order).notes, ''),
      'status', coalesce((input_order).status, 'waiting'),
      'position', input_position,
      'ordersAhead', case when input_position is null then null else greatest(0, input_position - 1) end
    )
  end;
$$;

create or replace function arise_status()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'isOpen', arise_setting('isOpen', 'true') = 'true',
    'message', arise_setting('message', ''),
    'theme', arise_setting_json('theme')
  );
$$;

create or replace function arise_inventory()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'inventory', arise_inventory_json()
  );
$$;

create or replace function arise_login(input_pin text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  found_employee employees;
begin
  if arise_pin_matches(input_pin) then
    return jsonb_build_object('ok', true, 'role', 'owner');
  end if;

  select *
  into found_employee
  from employees
  where pin = trim(coalesce(input_pin, ''))
    and active = true
  limit 1;

  if found_employee is not null then
    return jsonb_build_object(
      'ok', true,
      'role', 'employee',
      'employee', jsonb_build_object(
        'id', found_employee.id,
        'name', found_employee.name,
        'active', found_employee.active
      )
    );
  end if;

  return jsonb_build_object('ok', false, 'error', 'Wrong PIN');
end;
$$;

create or replace function arise_orders()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with active as (
    select
      orders as order_row,
      orders.created_at,
      row_number() over (order by created_at) as position
    from orders
    where status <> 'complete'
  )
  select jsonb_build_object(
    'ok', true,
    'isOpen', arise_setting('isOpen', 'true') = 'true',
    'message', arise_setting('message', ''),
    'orders', coalesce(jsonb_agg(arise_order_json(active.order_row, active.position::integer) order by active.created_at), '[]'::jsonb),
    'inventory', arise_inventory_json(),
    'theme', arise_setting_json('theme')
  )
  from active;
$$;

create or replace function arise_display()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with queue as (
    select
      id::text as id,
      created_at,
      coalesce(customer_name, name, '') as name,
      drink,
      coalesce(temperature, temp, '') as temp,
      status,
      row_number() over (
        order by case when status = 'making' then 0 else 1 end, created_at
      ) as position
    from orders
    where status in ('waiting', 'making')
  ),
  ready as (
    select
      id::text as id,
      created_at,
      coalesce(customer_name, name, '') as name,
      drink,
      coalesce(temperature, temp, '') as temp,
      status
    from orders
    where status in ('ready', 'complete')
    order by created_at desc
    limit 8
  )
  select jsonb_build_object(
    'ok', true,
    'isOpen', arise_setting('isOpen', 'true') = 'true',
    'message', arise_setting('message', ''),
    'orders', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', id,
            'name', name,
            'drink', drink,
            'temp', temp,
            'status', status,
            'position', position
          )
          order by position
        )
        from queue
      ),
      '[]'::jsonb
    ),
    'ready', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', id,
            'name', name,
            'drink', drink,
            'temp', temp,
            'status', status
          )
          order by created_at desc
        )
        from ready
      ),
      '[]'::jsonb
    )
  );
$$;

create or replace function arise_order(order_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  found_order orders;
  found_position integer;
  found_id text;
begin
  select id::text, position::integer
  into found_id, found_position
  from (
    select
      id::text as id,
      row_number() over (order by created_at) as position
    from orders
    where status <> 'complete'
  ) active
  where id = order_id
  limit 1;

  if found_id is null then
    select id::text
    into found_id
    from orders
    where id::text = order_id
      and status = 'complete'
    limit 1;

    found_position := null;
  end if;

  if found_id is not null then
    select *
    into found_order
    from orders
    where id::text = found_id
    limit 1;
  end if;

  return jsonb_build_object(
    'ok', true,
    'isOpen', arise_setting('isOpen', 'true') = 'true',
    'message', arise_setting('message', ''),
    'order', arise_order_json(found_order, found_position),
    'position', found_position,
    'ordersAhead', case when found_position is null then null else greatest(0, found_position - 1) end,
    'theme', arise_setting_json('theme')
  );
end;
$$;

create or replace function arise_place_order(input_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id text;
  order_state jsonb;
  note_parts text[];
begin
  if arise_setting('isOpen', 'true') <> 'true' then
    return jsonb_build_object('ok', false, 'error', 'Queue closed');
  end if;

  note_parts := array_remove(array[
    nullif(coalesce(input_order->>'notes', ''), ''),
    case
      when jsonb_array_length(coalesce(input_order->'toppings', '[]'::jsonb)) > 0
      then 'Refresher toppings: ' || array_to_string(array(select jsonb_array_elements_text(coalesce(input_order->'toppings', '[]'::jsonb))), ', ')
      else null
    end,
    case when coalesce((input_order->>'lightIce')::boolean, false) then 'Light ice' else null end,
    case when coalesce(nullif(input_order->>'price', '')::numeric, 0) > 0 then 'Item price: $' || trim(to_char(coalesce(nullif(input_order->>'price', '')::numeric, 0), 'FM999999990.00')) else null end
  ], null);

  insert into orders (name, customer_name, drink, temp, temperature, milk, syrups, notes, status)
  values (
    coalesce(input_order->>'name', ''),
    coalesce(input_order->>'name', ''),
    coalesce(input_order->>'drink', ''),
    coalesce(input_order->>'temp', ''),
    coalesce(input_order->>'temp', ''),
    coalesce(input_order->>'milk', ''),
    coalesce(array(select jsonb_array_elements_text(coalesce(input_order->'syrups', '[]'::jsonb))), '{}'::text[]),
    array_to_string(note_parts, ' | '),
    'waiting'
  )
  returning id::text into new_id;

  order_state := arise_order(new_id);

  return jsonb_build_object(
    'ok', true,
    'id', new_id,
    'position', order_state->'position',
    'ordersAhead', order_state->'ordersAhead'
  );
end;
$$;

create or replace function arise_update_admin(input_pin text, input_is_open boolean default null, input_message text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (arise_pin_matches(input_pin) or arise_employee_pin_matches(input_pin)) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN');
  end if;

  if input_is_open is not null then
    insert into settings (key, value)
    values ('isOpen', to_jsonb(case when input_is_open then 'true' else 'false' end))
    on conflict (key) do update set value = excluded.value;
  end if;

  if input_message is not null then
    insert into settings (key, value)
    values ('message', to_jsonb(input_message))
    on conflict (key) do update set value = excluded.value;
  end if;

  return arise_orders();
end;
$$;

create or replace function arise_update_status(input_pin text, order_id text, input_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_order orders;
  order_state jsonb;
begin
  if not (arise_pin_matches(input_pin) or arise_employee_pin_matches(input_pin)) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN');
  end if;

  update orders
  set status = input_status
  where id::text = order_id
  returning * into updated_order;

  if updated_order is null then
    return jsonb_build_object('ok', false, 'error', 'Order not found');
  end if;

  order_state := arise_order(order_id);

  return jsonb_build_object(
    'ok', true,
    'order', coalesce(order_state->'order', arise_order_json(updated_order, null))
  );
end;
$$;

create or replace function arise_update_inventory(input_pin text, input_item text, input_available boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  changed integer;
begin
  if not (arise_pin_matches(input_pin) or arise_employee_pin_matches(input_pin)) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN');
  end if;

  update inventory
  set available = input_available
  where item = input_item;

  get diagnostics changed = row_count;

  if changed = 0 then
    return jsonb_build_object('ok', false, 'error', 'Inventory item not found');
  end if;

  return arise_inventory();
end;
$$;

drop function if exists arise_save_menu(text, jsonb);
drop function if exists arise_save_menu(text, jsonb, jsonb, jsonb);
drop function if exists arise_save_menu(text, jsonb, jsonb, jsonb, jsonb);

create or replace function arise_save_menu(input_pin text, input_drinks jsonb, input_milks jsonb default '[]'::jsonb, input_syrups jsonb default '[]'::jsonb, input_toppings jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  drink_item jsonb;
  ingredient_item jsonb;
  cleaned_temps text[];
  drink_index integer := 0;
  ingredient_index integer := 0;
begin
  if not (arise_pin_matches(input_pin) or arise_employee_pin_matches(input_pin)) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN');
  end if;

  if jsonb_typeof(coalesce(input_drinks, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(input_milks, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(input_syrups, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(input_toppings, '[]'::jsonb)) <> 'array' then
    return jsonb_build_object('ok', false, 'error', 'Invalid menu');
  end if;

  delete from menu_drinks where true;

  for drink_item in
    select value
    from jsonb_array_elements(input_drinks)
  loop
    cleaned_temps := array(
      select temp_option
      from (values ('Hot', 1), ('Cold', 2)) as allowed(temp_option, sort_order)
      where exists (
        select 1
        from jsonb_array_elements_text(coalesce(drink_item->'temps', '["Hot"]'::jsonb)) as temp_value
        where temp_value = allowed.temp_option
      )
      order by sort_order
    );

    if array_length(cleaned_temps, 1) is null then
      cleaned_temps := array['Hot'];
    end if;

    insert into menu_drinks (
      id,
      label,
      description,
      category,
      temps,
      has_milk,
      has_syrups,
      show_temp,
      price,
      active,
      sort_order
    ) values (
      left(coalesce(nullif(trim(drink_item->>'id'), ''), 'drink-' || drink_index::text), 80),
      left(coalesce(nullif(trim(drink_item->>'label'), ''), 'Drink'), 80),
      left(coalesce(drink_item->>'desc', ''), 180),
      case
        when lower(coalesce(drink_item->>'category', 'coffee')) in ('coffee', 'refresher', 'smoothie', 'drink', 'snack') then lower(coalesce(drink_item->>'category', 'coffee'))
        when lower(coalesce(drink_item->>'category', 'coffee')) in ('small-snack', 'big-snack', 'light-meal') then 'snack'
        else 'coffee'
      end,
      cleaned_temps,
      coalesce((drink_item->>'milk')::boolean, true),
      coalesce((drink_item->>'syrups')::boolean, true),
      coalesce((drink_item->>'showTemp')::boolean, true),
      greatest(0, coalesce(nullif(drink_item->>'price', '')::numeric, 5)),
      coalesce((drink_item->>'active')::boolean, true),
      drink_index
    )
    on conflict (id) do update set
      label = excluded.label,
      description = excluded.description,
      category = excluded.category,
      temps = excluded.temps,
      has_milk = excluded.has_milk,
      has_syrups = excluded.has_syrups,
      show_temp = excluded.show_temp,
      price = excluded.price,
      active = excluded.active,
      sort_order = excluded.sort_order,
      updated_at = now();

    drink_index := drink_index + 1;
  end loop;

  delete from inventory where type in ('milk', 'syrup', 'topping');

  ingredient_index := 0;
  for ingredient_item in
    select value
    from jsonb_array_elements(input_milks)
  loop
    insert into inventory (item, type, available, active, sort_order)
    values (
      left(coalesce(nullif(trim(ingredient_item->>'item'), ''), 'Milk'), 80),
      'milk',
      coalesce((ingredient_item->>'available')::boolean, true),
      coalesce((ingredient_item->>'active')::boolean, true),
      ingredient_index
    );

    ingredient_index := ingredient_index + 1;
  end loop;

  ingredient_index := 0;
  for ingredient_item in
    select value
    from jsonb_array_elements(input_syrups)
  loop
    insert into inventory (item, type, available, active, sort_order)
    values (
      left(coalesce(nullif(trim(ingredient_item->>'item'), ''), 'Syrup'), 80),
      'syrup',
      coalesce((ingredient_item->>'available')::boolean, true),
      coalesce((ingredient_item->>'active')::boolean, true),
      ingredient_index
    );

    ingredient_index := ingredient_index + 1;
  end loop;

  ingredient_index := 0;
  for ingredient_item in
    select value
    from jsonb_array_elements(input_toppings)
  loop
    insert into inventory (item, type, available, active, sort_order)
    values (
      left(coalesce(nullif(trim(ingredient_item->>'item'), ''), 'Topping'), 80),
      'topping',
      coalesce((ingredient_item->>'available')::boolean, true),
      coalesce((ingredient_item->>'active')::boolean, true),
      ingredient_index
    );

    ingredient_index := ingredient_index + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'drinks', arise_menu_json(true),
    'milks', arise_inventory_menu_json(true)->'milks',
    'syrups', arise_inventory_menu_json(true)->'syrups',
    'toppings', arise_inventory_menu_json(true)->'toppings',
    'inventory', arise_inventory_json()
  );
exception
  when others then
    return jsonb_build_object('ok', false, 'error', SQLERRM);
end;
$$;

create or replace function arise_clear_completed(input_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not arise_pin_matches(input_pin) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN');
  end if;

  insert into archived_orders (
    original_order_id,
    original_order_id_text,
    original_created_at,
    customer_name,
    drink,
    temperature,
    milk,
    syrups,
    notes,
    status,
    order_data
  )
  select
    id,
    id::text,
    created_at,
    coalesce(customer_name, name, ''),
    drink,
    coalesce(temperature, temp, ''),
    milk,
    array_to_string(coalesce(syrups, '{}'::text[]), ', '),
    notes,
    status,
    to_jsonb(orders)
  from orders
  where status = 'complete';

  delete from orders
  where status = 'complete';

  return arise_orders();
end;
$$;

create or replace function arise_clear_all(input_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not arise_pin_matches(input_pin) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN');
  end if;

  if arise_setting('isOpen', 'true') = 'true' then
    return jsonb_build_object('ok', false, 'error', 'Close the queue before clearing all orders');
  end if;

  insert into archived_orders (
    original_order_id,
    original_order_id_text,
    original_created_at,
    customer_name,
    drink,
    temperature,
    milk,
    syrups,
    notes,
    status,
    order_data
  )
  select
    id,
    id::text,
    created_at,
    coalesce(customer_name, name, ''),
    drink,
    coalesce(temperature, temp, ''),
    milk,
    array_to_string(coalesce(syrups, '{}'::text[]), ', '),
    notes,
    status,
    to_jsonb(orders)
  from orders;

  delete from orders where true;

  return arise_orders();
end;
$$;

create or replace function arise_archive(input_pin text, input_limit integer default 25)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not arise_pin_matches(input_pin) then jsonb_build_object('ok', false, 'error', 'Wrong PIN')
    else jsonb_build_object(
      'ok', true,
      'archive', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', id,
              'archivedAt', archived_at,
              'originalOrderId', coalesce(original_order_id_text, original_order_id::text),
              'time', original_created_at,
              'name', coalesce(customer_name, ''),
              'drink', coalesce(drink, ''),
              'temp', coalesce(temperature, ''),
              'milk', coalesce(milk, ''),
              'syrups', coalesce(syrups, ''),
              'notes', coalesce(notes, ''),
              'status', coalesce(status, '')
            )
            order by archived_at desc
          )
          from (
            select *
            from archived_orders
            order by archived_at desc
            limit greatest(1, least(coalesce(input_limit, 25), 50))
          ) recent_archive
        ),
        '[]'::jsonb
      )
    )
  end;
$$;

create or replace function arise_clear_archive(input_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not arise_pin_matches(input_pin) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN');
  end if;

  delete from archived_orders
  where true;

  return jsonb_build_object('ok', true, 'archive', '[]'::jsonb);
end;
$$;

drop function if exists arise_analytics(text);
create or replace function arise_analytics(input_pin text, input_week_offset integer default 0)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with week_bounds as (
    select
      ((date_trunc('week', now() at time zone 'America/Los_Angeles') + (coalesce(input_week_offset, 0) || ' weeks')::interval) at time zone 'America/Los_Angeles') as week_start,
      ((date_trunc('week', now() at time zone 'America/Los_Angeles') + ((coalesce(input_week_offset, 0) + 1) || ' weeks')::interval) at time zone 'America/Los_Angeles') as week_end
  ),
  base as (
    select
      nullif(trim(coalesce(drink, '')), '') as drink,
      nullif(trim(coalesce(temperature, '')), '') as temperature,
      nullif(trim(coalesce(milk, '')), '') as milk,
      nullif(trim(coalesce(syrups, '')), '') as syrups
    from archived_orders
    cross join week_bounds
    where archived_at >= week_bounds.week_start
      and archived_at < week_bounds.week_end
  ),
  syrup_items as (
    select nullif(trim(syrup_value), '') as syrup
    from base
    cross join lateral regexp_split_to_table(coalesce(base.syrups, ''), '\s*,\s*') as syrup_value
  )
  select case
    when not arise_pin_matches(input_pin) then jsonb_build_object('ok', false, 'error', 'Wrong PIN')
    else jsonb_build_object(
      'ok', true,
      'analytics', jsonb_build_object(
        'weekOffset', coalesce(input_week_offset, 0),
        'weekStart', (select week_start from week_bounds),
        'weekEnd', (select week_end from week_bounds),
        'totalOrders', (select count(*) from base),
        'hotOrders', (select count(*) from base where lower(temperature) = 'hot'),
        'coldOrders', (select count(*) from base where lower(temperature) = 'cold'),
        'topDrinks', coalesce(
          (
            select jsonb_agg(jsonb_build_object('item', drink, 'count', count) order by count desc, drink)
            from (
              select drink, count(*) as count
              from base
              where drink is not null
              group by drink
              order by count desc, drink
              limit 5
            ) ranked_drinks
          ),
          '[]'::jsonb
        ),
        'topMilks', coalesce(
          (
            select jsonb_agg(jsonb_build_object('item', milk, 'count', count) order by count desc, milk)
            from (
              select milk, count(*) as count
              from base
              where milk is not null
              group by milk
              order by count desc, milk
              limit 5
            ) ranked_milks
          ),
          '[]'::jsonb
        ),
        'topSyrups', coalesce(
          (
            select jsonb_agg(jsonb_build_object('item', syrup, 'count', count) order by count desc, syrup)
            from (
              select syrup, count(*) as count
              from syrup_items
              where syrup is not null
              group by syrup
              order by count desc, syrup
              limit 5
            ) ranked_syrups
          ),
          '[]'::jsonb
        )
      )
    )
  end;
$$;

drop function if exists arise_finance(text);
create or replace function arise_finance(input_pin text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with usage_rows as (
    select 'espresso-beans' as id, count(*)::numeric as used
    from archived_orders
    where lower(coalesce(drink, '')) not like '%soda%'
      and lower(coalesce(drink, '')) not like '%water%'
      and lower(coalesce(drink, '')) not like '%juice%'
      and lower(coalesce(drink, '')) not like '%refresher%'
      and lower(coalesce(drink, '')) not like '%smoothie%'
      and lower(coalesce(drink, '')) not like '%snack%'
      and lower(coalesce(drink, '')) not like '%meal%'
    union all
    select 'whole-milk', count(*)::numeric from archived_orders where lower(coalesce(milk, '')) = 'whole milk'
    union all
    select 'almond-milk', count(*)::numeric from archived_orders where lower(coalesce(milk, '')) = 'almond milk'
    union all
    select 'oat-milk', count(*)::numeric from archived_orders where lower(coalesce(milk, '')) = 'oat milk'
    union all
    select 'soy-milk', count(*)::numeric from archived_orders where lower(coalesce(milk, '')) = 'soy milk'
    union all
    select 'juice-bottles', count(*)::numeric from archived_orders where lower(coalesce(drink, '')) like '%juice% bottle%'
      or lower(coalesce(drink, '')) = 'juice'
    union all
    select 'juice-boxes', count(*)::numeric from archived_orders where lower(coalesce(drink, '')) like '%juice box%'
    union all
    select 'soda-cans', count(*)::numeric from archived_orders where lower(coalesce(drink, '')) like '%soda%'
    union all
    select 'water-bottles', count(*)::numeric from archived_orders where lower(coalesce(drink, '')) like '%water%'
    union all
    select 'refresher-base', count(*)::numeric from archived_orders where lower(coalesce(drink, '')) like '%refresher%'
    union all
    select 'smoothie-mix', count(*)::numeric from archived_orders where lower(coalesce(drink, '')) like '%smoothie%'
    union all
    select 'small-snacks', count(*)::numeric from archived_orders where lower(coalesce(drink, '')) like '%small snack%'
    union all
    select 'big-snacks', count(*)::numeric from archived_orders where lower(coalesce(drink, '')) like '%big snack%'
    union all
    select 'light-meals', count(*)::numeric from archived_orders where lower(coalesce(drink, '')) like '%light meal%'
  ),
  item_rows as (
    select
      fi.*,
      coalesce(ur.used, 0) as used_servings,
      coalesce(
        fi.actual_remaining_servings,
        greatest(0, (fi.units_on_hand * fi.servings_per_unit) - coalesce(ur.used, 0) - coalesce(fi.waste_servings, 0))
      ) as remaining_servings,
      greatest(
        0,
        (fi.units_on_hand * fi.servings_per_unit)
          - coalesce(ur.used, 0)
          - coalesce(fi.actual_remaining_servings, greatest(0, (fi.units_on_hand * fi.servings_per_unit) - coalesce(ur.used, 0) - coalesce(fi.waste_servings, 0)))
      ) as calculated_waste_servings,
      case
        when fi.servings_per_unit <= 0 then 0
        else coalesce(
          fi.actual_remaining_servings,
          greatest(0, (fi.units_on_hand * fi.servings_per_unit) - coalesce(ur.used, 0) - coalesce(fi.waste_servings, 0))
        ) / fi.servings_per_unit * fi.unit_cost
      end as remaining_value
    from finance_items fi
    left join usage_rows ur on ur.id = fi.id
    where fi.active
  ),
  totals as (
    select
      category,
      sum(units_on_hand * servings_per_unit) as capacity,
      sum(used_servings) as used,
      sum(calculated_waste_servings) as waste,
      sum(remaining_servings) as remaining,
      sum(remaining_value) as remaining_value
    from item_rows
    group by category
  )
  select case
    when not arise_pin_matches(input_pin) then jsonb_build_object('ok', false, 'error', 'Wrong PIN')
    else jsonb_build_object(
      'ok', true,
      'items', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id,
        'item', item,
        'category', category,
        'unitsOnHand', units_on_hand,
        'servingsPerUnit', servings_per_unit,
        'unitCost', unit_cost,
        'usedServings', used_servings,
        'wasteServings', calculated_waste_servings,
        'actualRemainingServings', actual_remaining_servings,
        'remainingServings', remaining_servings,
        'remainingValue', remaining_value,
        'sortOrder', sort_order
      ) order by sort_order, item) from item_rows), '[]'::jsonb),
      'totals', coalesce((select jsonb_agg(jsonb_build_object(
        'category', category,
        'capacity', capacity,
        'used', used,
        'waste', waste,
        'remaining', remaining,
        'remainingValue', remaining_value
      ) order by category) from totals), '[]'::jsonb)
    )
  end;
$$;

drop function if exists arise_save_finance(text, jsonb);
create or replace function arise_save_finance(input_pin text, input_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  supply_item jsonb;
begin
  if not arise_pin_matches(input_pin) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN');
  end if;

  if jsonb_typeof(coalesce(input_items, '[]'::jsonb)) <> 'array' then
    return jsonb_build_object('ok', false, 'error', 'Invalid finance items');
  end if;

  for supply_item in
    select value
    from jsonb_array_elements(input_items)
  loop
    update finance_items
    set
      units_on_hand = greatest(0, coalesce(nullif(supply_item->>'unitsOnHand', '')::numeric, 0)),
      servings_per_unit = greatest(0, coalesce(nullif(supply_item->>'servingsPerUnit', '')::numeric, 1)),
      unit_cost = greatest(0, coalesce(nullif(supply_item->>'unitCost', '')::numeric, 0)),
      actual_remaining_servings = nullif(supply_item->>'actualRemainingServings', '')::numeric,
      updated_at = now()
    where id = supply_item->>'id';
  end loop;

  return arise_finance(input_pin);
end;
$$;

drop function if exists arise_save_theme(text, jsonb);
create or replace function arise_save_theme(input_pin text, input_theme jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned jsonb;
begin
  if not arise_pin_matches(input_pin) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN');
  end if;

  if jsonb_typeof(coalesce(input_theme, '{}'::jsonb)) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'Invalid theme');
  end if;

  cleaned := jsonb_build_object(
    'bg', coalesce(nullif(input_theme->>'bg', ''), '#0B0604'),
    'surface', coalesce(nullif(input_theme->>'surface', ''), '#32180D'),
    'surface2', coalesce(nullif(input_theme->>'surface2', ''), '#4A2415'),
    'text', coalesce(nullif(input_theme->>'text', ''), '#FFF7EA'),
    'muted', coalesce(nullif(input_theme->>'muted', ''), '#E5C6A1'),
    'gold', coalesce(nullif(input_theme->>'gold', ''), '#E7A94C'),
    'red', coalesce(nullif(input_theme->>'red', ''), '#D84A38'),
    'green', coalesce(nullif(input_theme->>'green', ''), '#A9BC75'),
    'copper', coalesce(nullif(input_theme->>'copper', ''), '#B7642C')
  );

  insert into settings (key, value)
  values ('theme', cleaned)
  on conflict (key) do update set value = excluded.value;

  return jsonb_build_object('ok', true, 'theme', cleaned);
end;
$$;

grant execute on function arise_status() to anon;
grant execute on function arise_inventory() to anon;
grant execute on function arise_menu(text) to anon;
grant execute on function arise_login(text) to anon;
grant execute on function arise_orders() to anon;
grant execute on function arise_display() to anon;
grant execute on function arise_order(text) to anon;
grant execute on function arise_place_order(jsonb) to anon;
grant execute on function arise_update_admin(text, boolean, text) to anon;
grant execute on function arise_update_status(text, text, text) to anon;
grant execute on function arise_update_inventory(text, text, boolean) to anon;
grant execute on function arise_save_menu(text, jsonb, jsonb, jsonb, jsonb) to anon;
grant execute on function arise_clear_completed(text) to anon;
grant execute on function arise_clear_all(text) to anon;
grant execute on function arise_archive(text, integer) to anon;
grant execute on function arise_clear_archive(text) to anon;
grant execute on function arise_analytics(text, integer) to anon;
grant execute on function arise_finance(text) to anon;
grant execute on function arise_save_finance(text, jsonb) to anon;
grant execute on function arise_save_theme(text, jsonb) to anon;

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  customer_name text,
  order_name text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_sent_at timestamptz
);

alter table push_subscriptions enable row level security;

grant select, insert, update on push_subscriptions to anon;

drop policy if exists "Customers can read push subscriptions for upsert" on push_subscriptions;
create policy "Customers can read push subscriptions for upsert"
on push_subscriptions
for select
to anon
using (true);

drop policy if exists "Customers can create push subscriptions" on push_subscriptions;
create policy "Customers can create push subscriptions"
on push_subscriptions
for insert
to anon
with check (
  order_id <> ''
  and endpoint <> ''
  and p256dh <> ''
  and auth <> ''
);

drop policy if exists "Customers can update their push endpoint" on push_subscriptions;
create policy "Customers can update their push endpoint"
on push_subscriptions
for update
to anon
using (true)
with check (
  order_id <> ''
  and endpoint <> ''
  and p256dh <> ''
  and auth <> ''
);

drop function if exists delete_expired_push_subscription(text);
create or replace function delete_expired_push_subscription(input_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from push_subscriptions
  where endpoint = input_endpoint;
$$;

grant execute on function delete_expired_push_subscription(text) to service_role;

drop function if exists cleanup_old_push_subscriptions(integer);
create or replace function cleanup_old_push_subscriptions(input_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from push_subscriptions
  where created_at < now() - make_interval(days => greatest(input_days, 1));

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function cleanup_old_push_subscriptions(integer) to service_role;

create extension if not exists pg_cron with schema extensions;

do $cron_setup$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'cleanup-old-push-subscriptions'
  ) then
    perform cron.unschedule('cleanup-old-push-subscriptions');
  end if;

  perform cron.schedule(
    'cleanup-old-push-subscriptions',
    '0 8 1 * *',
    $cleanup$select public.cleanup_old_push_subscriptions(30);$cleanup$
  );
end;
$cron_setup$;

drop function if exists arise_time_entry_json(time_entries);
create or replace function arise_time_entry_json(input_entry time_entries)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', (input_entry).id,
    'employeeId', (input_entry).employee_id,
    'clockIn', (input_entry).clock_in,
    'clockOut', (input_entry).clock_out,
    'hours', case
      when (input_entry).clock_out is null then null
      else round((extract(epoch from ((input_entry).clock_out - (input_entry).clock_in)) / 3600.0)::numeric, 2)
    end
  );
$$;

drop function if exists arise_employee_json(employees);
create or replace function arise_employee_json(input_employee employees)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', (input_employee).id,
    'name', (input_employee).name,
    'pin', (input_employee).pin,
    'active', (input_employee).active
  );
$$;

drop function if exists arise_time_clock(text);
create or replace function arise_time_clock(input_employee_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  found_employee employees;
  open_entry time_entries;
  saved_entry time_entries;
  employee_entries jsonb;
  total_hours numeric;
begin
  select *
  into found_employee
  from employees
  where pin = trim(coalesce(input_employee_pin, ''))
    and active = true
  limit 1;

  if found_employee is null then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN');
  end if;

  select *
  into open_entry
  from time_entries
  where employee_id = found_employee.id
    and clock_out is null
  order by clock_in desc
  limit 1;

  if open_entry is null then
    insert into time_entries (employee_id, clock_in)
    values (found_employee.id, now())
    returning * into saved_entry;

    select coalesce(jsonb_agg(arise_time_entry_json(entry_row) order by entry_row.clock_in desc), '[]'::jsonb)
    into employee_entries
    from (
      select *
      from time_entries
      where employee_id = found_employee.id
        and clock_in >= now() - interval '30 days'
      order by clock_in desc
      limit 20
    ) entry_row;

    select coalesce(round(sum(extract(epoch from (coalesce(clock_out, now()) - clock_in)) / 3600.0)::numeric, 2), 0)
    into total_hours
    from time_entries
    where employee_id = found_employee.id
      and clock_in >= now() - interval '30 days';

    return jsonb_build_object(
      'ok', true,
      'action', 'clocked_in',
      'employee', arise_employee_json(found_employee),
      'entry', arise_time_entry_json(saved_entry),
      'entries', employee_entries,
      'totalHours30Days', total_hours
    );
  end if;

  update time_entries
  set clock_out = now()
  where id = open_entry.id
  returning * into saved_entry;

  select coalesce(jsonb_agg(arise_time_entry_json(entry_row) order by entry_row.clock_in desc), '[]'::jsonb)
  into employee_entries
  from (
    select *
    from time_entries
    where employee_id = found_employee.id
      and clock_in >= now() - interval '30 days'
    order by clock_in desc
    limit 20
  ) entry_row;

  select coalesce(round(sum(extract(epoch from (coalesce(clock_out, now()) - clock_in)) / 3600.0)::numeric, 2), 0)
  into total_hours
  from time_entries
  where employee_id = found_employee.id
    and clock_in >= now() - interval '30 days';

  return jsonb_build_object(
    'ok', true,
    'action', 'clocked_out',
    'employee', arise_employee_json(found_employee),
    'entry', arise_time_entry_json(saved_entry),
    'entries', employee_entries,
    'totalHours30Days', total_hours
  );
end;
$$;

drop function if exists arise_time_clock_admin(text);
create or replace function arise_time_clock_admin(input_pin text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with recent_entries as (
    select
      te.*,
      e.name as employee_name
    from time_entries te
    join employees e on e.id = te.employee_id
    where te.clock_in >= now() - interval '30 days'
    order by te.clock_in desc
    limit 100
  ),
  employee_totals as (
    select
      e.id,
      e.name,
      coalesce(round(sum(extract(epoch from (coalesce(te.clock_out, now()) - te.clock_in)) / 3600.0)::numeric, 2), 0) as hours_30_days,
      exists (
        select 1
        from time_entries open_te
        where open_te.employee_id = e.id
          and open_te.clock_out is null
      ) as clocked_in
    from employees e
    left join time_entries te
      on te.employee_id = e.id
      and te.clock_in >= now() - interval '30 days'
    group by e.id, e.name
  )
  select case
    when not arise_pin_matches(input_pin) then jsonb_build_object('ok', false, 'error', 'Wrong PIN')
    else jsonb_build_object(
      'ok', true,
      'employees', coalesce((select jsonb_agg(arise_employee_json(e) order by e.name) from employees e), '[]'::jsonb),
      'totals', coalesce((select jsonb_agg(jsonb_build_object(
        'employeeId', id,
        'name', name,
        'hours30Days', hours_30_days,
        'clockedIn', clocked_in
      ) order by name) from employee_totals), '[]'::jsonb),
      'entries', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id,
        'employeeId', employee_id,
        'employeeName', employee_name,
        'clockIn', clock_in,
        'clockOut', clock_out,
        'hours', case
          when clock_out is null then null
          else round((extract(epoch from (clock_out - clock_in)) / 3600.0)::numeric, 2)
        end
      ) order by clock_in desc) from recent_entries), '[]'::jsonb)
    )
  end;
$$;

drop function if exists arise_save_employee(text, jsonb);
create or replace function arise_save_employee(input_pin text, input_employee jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_employee employees;
  target_id uuid;
begin
  if not arise_pin_matches(input_pin) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN');
  end if;

  if length(trim(coalesce(input_employee->>'name', ''))) < 2 then
    return jsonb_build_object('ok', false, 'error', 'Employee name is required');
  end if;

  if length(trim(coalesce(input_employee->>'pin', ''))) < 4 then
    return jsonb_build_object('ok', false, 'error', 'Employee PIN must be at least 4 digits');
  end if;

  if coalesce(input_employee->>'id', '') <> '' then
    target_id := (input_employee->>'id')::uuid;
  end if;

  if target_id is null then
    insert into employees (name, pin, active)
    values (
      left(trim(input_employee->>'name'), 80),
      left(trim(input_employee->>'pin'), 20),
      coalesce((input_employee->>'active')::boolean, true)
    )
    returning * into saved_employee;
  else
    update employees
    set
      name = left(trim(input_employee->>'name'), 80),
      pin = left(trim(input_employee->>'pin'), 20),
      active = coalesce((input_employee->>'active')::boolean, active)
    where id = target_id
    returning * into saved_employee;
  end if;

  return jsonb_build_object('ok', true, 'employee', arise_employee_json(saved_employee));
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'That PIN is already used');
end;
$$;

drop function if exists arise_toggle_employee(text, text, boolean);
create or replace function arise_toggle_employee(input_pin text, input_employee_id text, input_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_employee employees;
begin
  if not arise_pin_matches(input_pin) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN');
  end if;

  update employees
  set active = input_active
  where id::text = input_employee_id
  returning * into saved_employee;

  if saved_employee is null then
    return jsonb_build_object('ok', false, 'error', 'Employee not found');
  end if;

  return jsonb_build_object('ok', true, 'employee', arise_employee_json(saved_employee));
end;
$$;

drop function if exists arise_delete_employee(text, text);
create or replace function arise_delete_employee(input_pin text, input_employee_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_employee employees;
  deleted_entries integer := 0;
begin
  if not arise_pin_matches(input_pin) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN');
  end if;

  if coalesce(input_employee_id, '') = '' then
    return jsonb_build_object('ok', false, 'error', 'Employee not found');
  end if;

  delete from time_entries
  where employee_id::text = input_employee_id;

  get diagnostics deleted_entries = row_count;

  delete from employees
  where id::text = input_employee_id
  returning * into deleted_employee;

  if deleted_employee is null then
    return jsonb_build_object('ok', false, 'error', 'Employee not found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'employee', arise_employee_json(deleted_employee),
    'deletedEntries', deleted_entries
  );
end;
$$;

drop function if exists arise_close_shift(text, text);
create or replace function arise_close_shift(input_pin text, input_entry_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_entry time_entries;
begin
  if not arise_pin_matches(input_pin) then
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN');
  end if;

  update time_entries
  set clock_out = now()
  where id::text = input_entry_id
    and clock_out is null
  returning * into saved_entry;

  if saved_entry is null then
    return jsonb_build_object('ok', false, 'error', 'Open shift not found');
  end if;

  return jsonb_build_object('ok', true, 'entry', arise_time_entry_json(saved_entry));
end;
$$;

grant execute on function arise_time_clock(text) to anon;
grant execute on function arise_time_clock_admin(text) to anon;
grant execute on function arise_save_employee(text, jsonb) to anon;
grant execute on function arise_toggle_employee(text, text, boolean) to anon;
grant execute on function arise_delete_employee(text, text) to anon;
grant execute on function arise_close_shift(text, text) to anon;
