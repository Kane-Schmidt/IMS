-- Schmidt Systems IMS — multi-tenant schema (Phase 1)
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / OR REPLACE.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────
-- Organizations (each is one paying customer / small business)
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  seat_limit int not null default 25,
  created_at timestamptz not null default now()
);

-- One row per authenticated user, linking them to an organization and role.
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null default '',
  email text not null default '',
  role text not null default 'standard' check (role in ('admin', 'standard', 'read-only')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

-- Looks up the calling user's organization without triggering RLS
-- recursion — every other table's policies call this.
create or replace function auth_organization_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id from profiles where id = auth.uid();
$$;

-- Bootstraps a brand-new organization plus its first (admin) profile,
-- atomically. Call this once right after a user signs up.
create or replace function create_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  if auth_organization_id() is not null then
    raise exception 'This account already belongs to an organization.';
  end if;

  insert into organizations (name) values (org_name) returning id into new_org_id;

  insert into profiles (id, organization_id, name, email, role, status)
  values (auth.uid(), new_org_id, coalesce(auth.jwt() ->> 'name', ''), coalesce(auth.jwt() ->> 'email', ''), 'admin', 'active');

  return new_org_id;
end;
$$;

grant execute on function create_organization(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Master data
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  manufacturer text not null,
  model_number text not null,
  purchase_price numeric not null default 0,
  active boolean not null default true,
  depreciation_model jsonb,
  created_at timestamptz not null default now()
);

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  region_assigned text,
  truck_assigned int,
  home_office_location text,
  job_title text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  location_name text not null,
  location_type text not null,
  street text,
  city text,
  state text,
  unit_number text,
  zip_code text,
  storage_locations jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  vehicle_number text not null,
  manufacturer text,
  model text,
  year int,
  vin text,
  vehicle_type text,
  purchase_price numeric,
  in_service_date date,
  depreciation_model jsonb,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Operational data
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  po_number text not null,
  vendor text,
  destination_location_id text,
  expected_date date,
  supervisor text,
  attachment_name text,
  status text not null default 'draft' check (status in ('draft', 'pending-approval', 'approved', 'rejected', 'received')),
  rejection_comment text,
  pallet_box_count int,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  received_at timestamptz
);

create table if not exists order_line_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid references products (id),
  quantity int not null default 1
);

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  serial text not null,
  product_id uuid references products (id),
  location_id text not null,
  bundle_id uuid,
  order_id uuid references orders (id),
  received_at timestamptz not null default now()
);

create table if not exists bundles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  warehouse_location_id text not null,
  item_ids uuid[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'broken')),
  created_at timestamptz not null default now(),
  broken_at timestamptz
);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  subject text not null,
  priority text not null default 'Medium',
  description text,
  status text not null default 'open',
  submitted_at timestamptz not null default now()
);

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  type text not null,
  description text not null,
  site_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists company_assumptions (
  organization_id uuid primary key references organizations (id) on delete cascade,
  monthly_revenue numeric not null default 0,
  ebitda_margin_pct numeric not null default 30,
  ebitda_multiple numeric not null default 8,
  subscribers int not null default 0
);

-- ─────────────────────────────────────────────────────────────────────────
-- Row-Level Security — every table is scoped to the caller's organization
-- ─────────────────────────────────────────────────────────────────────────

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table products enable row level security;
alter table employees enable row level security;
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
-- (that only happens through create_organization, above).
drop policy if exists "members can view own organization" on organizations;
create policy "members can view own organization" on organizations
  for select using (id = auth_organization_id());

-- profiles: members can see everyone in their org; a user can update
-- only their own row (role/status changes should go through an
-- admin-checked RPC in a later phase).
drop policy if exists "members can view org profiles" on profiles;
create policy "members can view org profiles" on profiles
  for select using (organization_id = auth_organization_id());

drop policy if exists "users can update own profile" on profiles;
create policy "users can update own profile" on profiles
  for update using (id = auth.uid());

-- Every remaining table follows the same simple pattern: full access,
-- scoped to the caller's organization. (Per-role restrictions, e.g.
-- read-only users, come in a later phase.)
do $$
declare
  t text;
begin
  foreach t in array array[
    'products', 'employees', 'locations', 'vehicles',
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
