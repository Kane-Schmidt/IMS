-- Schmidt Systems IMS — migration 006: admin-created invites by email.
-- Run after 001-005 (needs locations, vehicles, and join_organization).

create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  role text not null default 'standard' check (role in ('admin', 'standard', 'read-only')),
  is_receiver boolean not null default false,
  assigned_warehouses jsonb not null default '[]',
  assigned_vehicle_id uuid references vehicles (id) on delete set null,
  home_office_location_id uuid references locations (id) on delete set null,
  date_of_hire date,
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

alter table invites enable row level security;

drop policy if exists "org members full access" on invites;
create policy "org members full access" on invites
  for all using (organization_id = auth_organization_id()) with check (organization_id = auth_organization_id());

-- join_organization now looks for a pending invite matching the new user's
-- email and, if found, applies its presets (role, warehouses, receiver,
-- vehicle, home office, name, date of hire) instead of always creating a
-- blank standard member. The invite is consumed (deleted) once claimed.
create or replace function join_organization(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org_id uuid;
  matched_invite invites%rowtype;
  user_email text;
begin
  if auth_organization_id() is not null then
    raise exception 'This account already belongs to an organization.';
  end if;

  select id into target_org_id from organizations where invite_code = code;

  if target_org_id is null then
    raise exception 'Invalid invite code.';
  end if;

  user_email := coalesce(auth.jwt() ->> 'email', '');

  select * into matched_invite from invites
    where organization_id = target_org_id and lower(email) = lower(user_email)
    limit 1;

  if found then
    insert into profiles (
      id, organization_id, email, role, status,
      first_name, last_name, date_of_hire, home_office_location_id,
      is_receiver, assigned_warehouses, assigned_vehicle_id
    ) values (
      auth.uid(), target_org_id, user_email, matched_invite.role, 'active',
      matched_invite.first_name, matched_invite.last_name, matched_invite.date_of_hire,
      matched_invite.home_office_location_id, matched_invite.is_receiver,
      matched_invite.assigned_warehouses, matched_invite.assigned_vehicle_id
    );
    delete from invites where id = matched_invite.id;
  else
    insert into profiles (id, organization_id, name, email, role, status)
    values (auth.uid(), target_org_id, coalesce(auth.jwt() ->> 'name', ''), user_email, 'standard', 'active');
  end if;

  return target_org_id;
end;
$$;

grant execute on function join_organization(text) to authenticated;
