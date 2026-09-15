-- Schmidt Systems IMS — migration 001: organizations, profiles, auth
-- Run in the Supabase SQL Editor. Run 001, then 002, then 003, then 004 —
-- each as its own separate paste-and-run, in order. Splitting them up like
-- this means if one ever fails partway, only that file's work is at risk,
-- not everything that ran before it (a single pasted block is one Postgres
-- transaction — one failure anywhere rolls back the whole paste).

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────
-- Organizations (each is one paying customer / small business)
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  seat_limit int not null default 25,
  invite_code text unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz not null default now()
);

-- One row per authenticated user, linking them to an organization and role.
-- assigned_vehicle_id has no foreign key yet — the vehicles table doesn't
-- exist until migration 002. See 002 for the constraint that links them.
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null default '',
  email text not null default '',
  role text not null default 'standard' check (role in ('admin', 'standard', 'read-only')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  assigned_warehouses jsonb not null default '[]',
  is_receiver boolean not null default false,
  assigned_vehicle_id uuid,
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

-- Lets a second user join an existing organization via its invite code,
-- instead of every signup creating a new one.
create or replace function join_organization(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org_id uuid;
begin
  if auth_organization_id() is not null then
    raise exception 'This account already belongs to an organization.';
  end if;

  select id into target_org_id from organizations where invite_code = code;

  if target_org_id is null then
    raise exception 'Invalid invite code.';
  end if;

  insert into profiles (id, organization_id, name, email, role, status)
  values (auth.uid(), target_org_id, coalesce(auth.jwt() ->> 'name', ''), coalesce(auth.jwt() ->> 'email', ''), 'standard', 'active');

  return target_org_id;
end;
$$;

grant execute on function join_organization(text) to authenticated;
