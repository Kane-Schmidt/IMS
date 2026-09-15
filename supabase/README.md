# Database setup

Run the files in `migrations/` **in order, one at a time**, each as its own
paste into the Supabase SQL Editor (Project → SQL Editor → New query):

1. `001_core.sql` — organizations, profiles, auth functions, invite codes
2. `002_master_data.sql` — products, locations, vehicles
3. `003_operational_data.sql` — orders, inventory, bundles, tickets, activity log
4. `004_row_level_security.sql` — access rules, scoped per organization
5. `005_profile_details.sql` — first/last name, date of hire, home office on profiles (needs 002 for the locations reference)
6. `006_invites.sql` — admin-created pending invites by email, applied automatically when the invitee joins (needs 001, 002, 005)
7. `007_offices.sql` — Office Master Data, and repoints Home Office on profiles/invites to it instead of general locations (needs 001, 002, 005, 006)
8. `008_fiber_equipment.sql` — Cabinet Master Data and Network Equipment Master Data, for fiber network operators (needs 001)

**Why one at a time, not all pasted together:** a pasted SQL block runs as a
single transaction. If any one statement in it fails, the *entire* block
rolls back — including everything before the failure — with no clear sign of
where it broke. Running each file separately means a failure only costs you
that one file, and the error message points at the actual problem.

After running a file, you can sanity-check what actually landed with:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = '<table_name>'
order by column_name;
```

001-004 are already applied to the live project as of 2026-09. These files
exist for setting up a new environment from scratch (a new Supabase project,
a teammate's local setup) as much as for applying new changes — check with
the query above before assuming a given migration still needs to run.

## Note on the `employees` table

An earlier version of the app had a separate Employee Master Data feature
with its own `employees` table. That feature was removed once warehouse
assignment, receiver status, and vehicle assignment moved onto login
accounts (`profiles`) instead. The `employees` table may still exist in the
live database from that earlier version — it's unused and harmless, and
these migration files no longer create it. Dropping it is a deliberate,
separate decision (it's destructive) rather than something to do as a
side effect of a schema update.
