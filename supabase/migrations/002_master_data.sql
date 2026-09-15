-- Schmidt Systems IMS — migration 002: master data (products, locations,
-- vehicles). Run after 001.

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

-- Now that vehicles exists, link the optional vehicle assignment on
-- profiles (added in 001) to a real row. Clearing the vehicle from Vehicle
-- Master Data unassigns it rather than blocking the delete.
alter table profiles drop constraint if exists profiles_assigned_vehicle_id_fkey;
alter table profiles add constraint profiles_assigned_vehicle_id_fkey
  foreign key (assigned_vehicle_id) references vehicles (id) on delete set null;
