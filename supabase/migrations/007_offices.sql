-- Schmidt Systems IMS — migration 007: Office Master Data, and repoint
-- Home Office on profiles/invites to reference it instead of the general
-- locations table. Run after 001, 002, 005, 006.

create table if not exists offices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  office_name text not null,
  street text,
  city text,
  state text,
  unit_number text,
  zip_code text,
  created_at timestamptz not null default now()
);

alter table offices enable row level security;

drop policy if exists "org members full access" on offices;
create policy "org members full access" on offices
  for all using (organization_id = auth_organization_id()) with check (organization_id = auth_organization_id());

-- profiles.home_office_location_id pointed at the general locations table.
-- Replaced with home_office_id pointing at the new offices table. The new
-- column starts empty, so this is safe even if home offices were already
-- set — those pointed at a location, not necessarily an office, so they do
-- not carry over automatically.
alter table profiles drop constraint if exists profiles_home_office_location_id_fkey;
alter table profiles add column if not exists home_office_id uuid;
alter table profiles drop column if exists home_office_location_id;
alter table profiles drop constraint if exists profiles_home_office_id_fkey;
alter table profiles add constraint profiles_home_office_id_fkey
  foreign key (home_office_id) references offices (id) on delete set null;

-- Same change on pending invites.
alter table invites drop constraint if exists invites_home_office_location_id_fkey;
alter table invites add column if not exists home_office_id uuid;
alter table invites drop column if exists home_office_location_id;
alter table invites drop constraint if exists invites_home_office_id_fkey;
alter table invites add constraint invites_home_office_id_fkey
  foreign key (home_office_id) references offices (id) on delete set null;
