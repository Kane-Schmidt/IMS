-- Schmidt Systems IMS — migration 005: employee-style details on login
-- accounts (first/last name, date of hire, home office). Run after 002
-- (needs the locations table for the home office reference).

alter table profiles add column if not exists first_name text not null default '';
alter table profiles add column if not exists last_name text not null default '';
alter table profiles add column if not exists date_of_hire date;
alter table profiles add column if not exists home_office_location_id uuid;

alter table profiles drop constraint if exists profiles_home_office_location_id_fkey;
alter table profiles add constraint profiles_home_office_location_id_fkey
  foreign key (home_office_location_id) references locations (id) on delete set null;
