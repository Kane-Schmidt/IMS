-- Schmidt Systems IMS — migration 004: Row-Level Security. Run after 003.
-- Every table is scoped so a signed-in user only ever sees their own
-- organization's rows.

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table products enable row level security;
alter table locations enable row level security;
alter table vehicles enable row level security;
alter table orders enable row level security;
alter table order_line_items enable row level security;
alter table inventory_items enable row level security;
alter table bundles enable row level security;
alter table tickets enable row level security;
alter table activity_log enable row level security;
alter table company_assumptions enable row level security;

-- organizations: members can see their own org; nobody inserts directly
-- (that only happens through create_organization, in 001).
drop policy if exists "members can view own organization" on organizations;
create policy "members can view own organization" on organizations
  for select using (id = auth_organization_id());

-- profiles: members can see everyone in their org; a user can update
-- their own row, and admins can update anyone's in their org (role,
-- status, warehouse/receiver/vehicle assignment).
drop policy if exists "members can view org profiles" on profiles;
create policy "members can view org profiles" on profiles
  for select using (organization_id = auth_organization_id());

drop policy if exists "users can update own profile" on profiles;
create policy "users can update own profile" on profiles
  for update using (id = auth.uid());

-- Multiple permissive policies on the same table combine with OR, so this
-- adds admin capability without removing the self-update policy above.
drop policy if exists "admins can update org profiles" on profiles;
create policy "admins can update org profiles" on profiles
  for update using (
    organization_id = auth_organization_id()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Every remaining table follows the same simple pattern: full access,
-- scoped to the caller's organization. (Per-role restrictions, e.g.
-- read-only users, come in a later phase.)
do $$
declare
  t text;
begin
  foreach t in array array[
    'products', 'locations', 'vehicles',
    'orders', 'inventory_items', 'bundles', 'tickets',
    'activity_log', 'company_assumptions'
  ]
  loop
    execute format('drop policy if exists "org members full access" on %I;', t);
    execute format(
      'create policy "org members full access" on %I for all using (organization_id = auth_organization_id()) with check (organization_id = auth_organization_id());',
      t
    );
  end loop;
end $$;

-- order_line_items has no organization_id of its own — it inherits scope
-- from its parent order.
drop policy if exists "org members full access via order" on order_line_items;
create policy "org members full access via order" on order_line_items
  for all
  using (order_id in (select id from orders where organization_id = auth_organization_id()))
  with check (order_id in (select id from orders where organization_id = auth_organization_id()));
