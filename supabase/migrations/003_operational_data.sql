-- Schmidt Systems IMS — migration 003: operational data (orders, inventory,
-- bundles, tickets, activity log, company assumptions). Run after 002.
-- These tables are not yet wired into the app (still localStorage-backed
-- client-side) but the schema is here ready for that migration.

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
