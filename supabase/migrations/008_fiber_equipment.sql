-- Schmidt Systems IMS — migration 008: Cabinet Master Data and Network
-- Equipment Master Data, for fiber network operators. Run after 001.

create table if not exists cabinets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  cabinet_name text not null,
  cabinet_type text not null,
  street text,
  city text,
  state text,
  unit_number text,
  zip_code text,
  capacity numeric,
  created_at timestamptz not null default now()
);

alter table cabinets enable row level security;

drop policy if exists "org members full access" on cabinets;
create policy "org members full access" on cabinets
  for all using (organization_id = auth_organization_id()) with check (organization_id = auth_organization_id());

create table if not exists network_equipment (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  equipment_name text not null,
  equipment_type text not null,
  manufacturer text,
  model text,
  serial_number text,
  cabinet_id uuid references cabinets (id) on delete set null,
  in_service_date date,
  created_at timestamptz not null default now()
);

alter table network_equipment enable row level security;

drop policy if exists "org members full access" on network_equipment;
create policy "org members full access" on network_equipment
  for all using (organization_id = auth_organization_id()) with check (organization_id = auth_organization_id());
