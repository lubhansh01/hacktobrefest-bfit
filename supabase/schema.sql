-- Hacktoberfest BFIT — Supabase schema
-- Ported from firestore.rules + firebase-blueprint.json.
-- Column names stay camelCase (quoted) to match the field names the app already uses.

create extension if not exists pgcrypto;

-- ============================================================
-- TABLES
-- ============================================================

-- Mirrors auth.users; holds role + granular event-team permissions.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text,
  "photoURL"  text,
  role        text not null default 'user' check (role in ('admin','event_team','mentor','user')),
  permissions jsonb not null default '{}'::jsonb,
  "updatedAt" timestamptz not null default now()
);
create index if not exists profiles_email_idx on public.profiles (lower(email));

create table if not exists public.tracks (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text
);

create table if not exists public.problems (
  id          uuid primary key default gen_random_uuid(),
  "trackId"   uuid references public.tracks(id) on delete cascade,
  title       text not null,
  description text
);
create index if not exists problems_track_idx on public.problems ("trackId");

create table if not exists public.teams (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  "trackId"             uuid references public.tracks(id) on delete set null,
  "problemId"           uuid references public.problems(id) on delete set null,
  "creatorUid"          uuid references auth.users(id) on delete set null,
  "assignedMentorName"  text,
  "assignedMentorEmail" text,
  members               jsonb not null default '[]'::jsonb,
  "contactEmail"        text not null,
  city                  text,
  "memberEmails"        text[] not null default '{}',
  "memberPhones"        text[] not null default '{}',
  consent               boolean not null default false,
  status                text not null default 'pending' check (status in ('pending','approved','disapproved','rejected')),
  "currentRoundOrder"   integer not null default 0,
  "isEliminated"        boolean not null default false,
  "roundSubmissions"    jsonb not null default '{}'::jsonb,
  "roundEvaluations"    jsonb not null default '{}'::jsonb,
  attendance            jsonb not null default '{}'::jsonb,
  -- venue check-in, driven by the QR scanner in AttendanceManager
  "checkedIn"           boolean not null default false,
  "checkedInAt"         timestamptz,
  "checkedInBy"         text,
  "creatorEmail"        text,
  -- denormalised mentor card, written when a mentor is assigned
  "assignedMentorId"           text,
  "assignedMentorDesignation"  text,
  "assignedMentorCompany"      text,
  "createdAt"           timestamptz not null default now(),
  "updatedAt"           timestamptz
);
create index if not exists teams_creator_idx on public.teams ("creatorUid");
create index if not exists teams_mentor_idx  on public.teams (lower("assignedMentorEmail"));
create index if not exists teams_status_idx  on public.teams (status);

create table if not exists public.timeline (
  id          uuid primary key default gen_random_uuid(),
  event       text not null,
  time        text not null,
  description text,
  day         text,
  "order"     integer not null default 0
);

create table if not exists public.rounds (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  "isActive"  boolean not null default false,
  "order"     integer not null default 0
);

create table if not exists public.speakers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  role        text,
  company     text,
  photo       text,
  "createdAt" timestamptz not null default now()
);

create table if not exists public.partners (
  id      uuid primary key default gen_random_uuid(),
  name    text not null,
  tier    text,
  logo    text,
  "order" integer not null default 0
);

-- Keyed by email: the app looks mentors up by the signed-in user's address.
create table if not exists public.mentors (
  email               text primary key,
  uid                 uuid references auth.users(id) on delete set null,
  name                text not null,
  expertise           text,
  designation         text,
  company             text,
  photo               text,
  -- team ids this mentor supervises (was arrayUnion/arrayRemove in Firestore)
  "assignedTeams"     uuid[] not null default '{}',
  "assignedTeamCount" integer not null default 0,
  "createdAt"         timestamptz not null default now()
);

-- Keyed by email for the same reason.
create table if not exists public.event_team (
  email         text primary key,
  name          text not null,
  designation   text,
  company       text,
  photo         text,
  permissions   jsonb not null default '{}'::jsonb,
  "createdAt"   timestamptz not null default now()
);

-- Added here because teams is declared above mentors.
do $$
begin
  alter table public.teams
    add constraint teams_mentor_fkey
    foreign key ("assignedMentorId") references public.mentors(email) on delete set null;
exception when duplicate_object then null;
end $$;

create table if not exists public.location (
  id          text primary key,
  name        text not null,
  address     text not null,
  "mapUrl"    text,
  city        text,
  "updatedAt" timestamptz not null default now()
);

create table if not exists public.guests (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  position    text,
  photo       text,
  "order"     integer not null default 0,
  "createdAt" timestamptz not null default now()
);

-- Single-row-ish key/value settings (e.g. id = 'registration').
create table if not exists public.config (
  id          text primary key,
  data        jsonb not null default '{}'::jsonb,
  "updatedAt" timestamptz not null default now()
);

-- ============================================================
-- ROLE HELPERS
-- security definer so they can read profiles/event_team without
-- re-entering the policies that call them (Firestore's get() had
-- the same escape hatch).
-- ============================================================

create or replace function public.jwt_email() returns text
language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.jwt_email() = 'lubhanshsharma555@gmail.com'
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
$$;

-- Admin, or an event_team member whose permission map grants `perm`.
create or replace function public.has_perm(perm text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.event_team e
    where lower(e.email) = public.jwt_email()
      and coalesce((e.permissions ->> perm)::boolean, false)
  );
$$;

create or replace function public.is_mentor() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from public.mentors m where lower(m.email) = public.jwt_email())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'mentor')
  );
$$;

-- ============================================================
-- PROFILE BOOTSTRAP
-- ============================================================

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, "photoURL")
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- GRANTS
-- RLS decides which ROWS are visible; these decide whether the role may
-- touch the table at all. Without them every request fails regardless of
-- policy, so they must come before the policies mean anything.
-- ============================================================

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public
  grant select on tables to anon, authenticated;
alter default privileges in schema public
  grant insert, update, delete on tables to authenticated;

-- ============================================================
-- RLS
-- ============================================================

alter table public.profiles   enable row level security;
alter table public.tracks     enable row level security;
alter table public.problems   enable row level security;
alter table public.teams      enable row level security;
alter table public.timeline   enable row level security;
alter table public.rounds     enable row level security;
alter table public.speakers   enable row level security;
alter table public.partners   enable row level security;
alter table public.mentors    enable row level security;
alter table public.event_team enable row level security;
alter table public.location   enable row level security;
alter table public.guests     enable row level security;
alter table public.config     enable row level security;

-- PROFILES: any signed-in user may read (the app resolves roles client-side);
-- you may only write your own row, and you may not promote yourself.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()))
  );

-- Public reference data: world-readable, permission-gated writes.
-- (tracks/problems share manage_tracks, matching firestore.rules.)
do $$
declare t record;
begin
  for t in
    select * from (values
      ('tracks',     'manage_tracks'),
      ('problems',   'manage_tracks'),
      ('timeline',   'manage_timeline'),
      ('speakers',   'manage_speakers'),
      ('partners',   'manage_partners'),
      ('mentors',    'manage_mentors'),
      ('location',   'manage_location'),
      ('guests',     'manage_guests')
    ) as v(tbl, perm)
  loop
    execute format('drop policy if exists %I on public.%I', t.tbl || '_read', t.tbl);
    execute format('create policy %I on public.%I for select using (true)', t.tbl || '_read', t.tbl);
    execute format('drop policy if exists %I on public.%I', t.tbl || '_write', t.tbl);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.has_perm(%L)) with check (public.has_perm(%L))',
      t.tbl || '_write', t.tbl, t.perm, t.perm);
  end loop;
end $$;

-- ROUNDS: public read; organisers manage, mentors may flip the active round.
drop policy if exists rounds_read on public.rounds;
create policy rounds_read on public.rounds for select using (true);

drop policy if exists rounds_write on public.rounds;
create policy rounds_write on public.rounds
  for all to authenticated
  using (public.has_perm('manage_rounds') or public.is_mentor())
  with check (public.has_perm('manage_rounds') or public.is_mentor());

-- EVENT TEAM: public read (shown on the site); admin-managed.
drop policy if exists event_team_read on public.event_team;
create policy event_team_read on public.event_team for select using (true);

drop policy if exists event_team_write on public.event_team;
create policy event_team_write on public.event_team
  for all to authenticated
  using (public.is_admin() or public.has_perm('manage_event_team'))
  with check (public.is_admin() or public.has_perm('manage_event_team'));

-- CONFIG: public read; organisers write.
drop policy if exists config_read on public.config;
create policy config_read on public.config for select using (true);

drop policy if exists config_write on public.config;
create policy config_write on public.config
  for all to authenticated
  using (public.is_admin() or public.has_perm('manage_teams'))
  with check (public.is_admin() or public.has_perm('manage_teams'));

-- TEAMS: organisers see everything; mentors see their assigned squads;
-- leaders see their own; approved teams are publicly listed.
drop policy if exists teams_read on public.teams;
create policy teams_read on public.teams
  for select to authenticated using (
    public.has_perm('manage_teams')
    or public.has_perm('view_teams')
    or public.has_perm('manage_attendance')
    or lower("assignedMentorEmail") = public.jwt_email()
    or "creatorUid" = auth.uid()
    or status = 'approved'
  );

-- A leader registers their own team and may not self-assign a mentor.
drop policy if exists teams_insert on public.teams;
create policy teams_insert on public.teams
  for insert to authenticated with check (
    public.is_admin()
    or public.has_perm('manage_teams')
    or ("creatorUid" = auth.uid() and "assignedMentorEmail" is null and "assignedMentorName" is null)
  );

drop policy if exists teams_update on public.teams;
create policy teams_update on public.teams
  for update to authenticated
  using (
    public.is_admin()
    or public.has_perm('manage_teams')
    or public.has_perm('manage_attendance')
    or (public.is_mentor() and lower("assignedMentorEmail") = public.jwt_email())
    or ("creatorUid" = auth.uid() and not "isEliminated")
  )
  with check (
    public.is_admin()
    or public.has_perm('manage_teams')
    or public.has_perm('manage_attendance')
    or (public.is_mentor() and lower("assignedMentorEmail") = public.jwt_email())
    or "creatorUid" = auth.uid()
  );

drop policy if exists teams_delete on public.teams;
create policy teams_delete on public.teams
  for delete to authenticated
  using (public.is_admin() or public.has_perm('manage_teams'));

-- ============================================================
-- REALTIME
-- replaces the 49 Firestore onSnapshot listeners
-- ============================================================

do $$
declare t text;
begin
  for t in select unnest(array[
    'teams','tracks','problems','rounds','timeline',
    'speakers','partners','mentors','event_team','guests','location','config'
  ]) loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ============================================================
-- ROLE SYNC
-- The Firestore build resolved the caller's role in the browser and wrote it
-- back to /users, so a client could name its own role. Here the server derives
-- it from event_team / mentors and returns it; the client only reads.
-- ============================================================

create or replace function public.sync_my_profile()
returns table (role text, permissions jsonb)
language plpgsql security definer set search_path = public as $$
declare
  v_email text := public.jwt_email();
  v_role  text := 'user';
  v_perms jsonb := '{}'::jsonb;
  v_admin_perms constant jsonb := jsonb_build_object(
    'manage_teams', true, 'manage_mentors', true, 'manage_rounds', true,
    'manage_tracks', true, 'manage_timeline', true, 'manage_speakers', true,
    'manage_partners', true, 'manage_event_team', true, 'manage_location', true,
    'manage_email_marketing', true, 'manage_guests', true, 'view_teams', true,
    'manage_attendance', true
  );
begin
  if auth.uid() is null then
    return;
  end if;

  if v_email = 'lubhanshsharma555@gmail.com' then
    v_role := 'admin';
    v_perms := v_admin_perms;
  else
    select 'event_team', coalesce(e.permissions, '{}'::jsonb)
      into v_role, v_perms
      from public.event_team e where lower(e.email) = v_email;

    -- a SELECT INTO that matches nothing nulls both variables, so reset them
    if not found then
      v_role := 'user';
      v_perms := '{}'::jsonb;
      if exists (select 1 from public.mentors m where lower(m.email) = v_email) then
        v_role := 'mentor';
      else
        select p.role, p.permissions into v_role, v_perms
          from public.profiles p where p.id = auth.uid();
        v_role := coalesce(v_role, 'user');
        v_perms := coalesce(v_perms, '{}'::jsonb);
      end if;
    end if;
  end if;

  insert into public.profiles as p (id, email, name, "photoURL", role, permissions, "updatedAt")
  values (
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', ''),
    coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() -> 'user_metadata' ->> 'name'),
    auth.jwt() -> 'user_metadata' ->> 'avatar_url',
    v_role, v_perms, now()
  )
  on conflict (id) do update
    set role = excluded.role,
        permissions = excluded.permissions,
        email = excluded.email,
        name = coalesce(excluded.name, p.name),
        "photoURL" = coalesce(excluded."photoURL", p."photoURL"),
        "updatedAt" = now();

  -- Keep a mentor's uid linked once they have actually signed in.
  update public.mentors m set uid = auth.uid()
    where lower(m.email) = v_email and m.uid is distinct from auth.uid();

  return query select v_role, v_perms;
end;
$$;

revoke all on function public.sync_my_profile() from public;
grant execute on function public.sync_my_profile() to authenticated;

-- ============================================================
-- ARRAY / BATCH HELPERS
-- Firestore had arrayUnion/arrayRemove and writeBatch; these keep the
-- same operations atomic rather than read-modify-writing from the client.
-- ============================================================

create or replace function public.mentor_add_team(p_email text, p_team uuid)
returns void language sql security definer set search_path = public as $$
  update public.mentors
     set "assignedTeams" = (
           select array(select distinct unnest("assignedTeams" || p_team))
         ),
         "assignedTeamCount" = cardinality(
           (select array(select distinct unnest("assignedTeams" || p_team)))
         )
   where lower(email) = lower(p_email)
     and public.has_perm('manage_mentors');
$$;

create or replace function public.mentor_remove_team(p_email text, p_team uuid)
returns void language sql security definer set search_path = public as $$
  update public.mentors
     set "assignedTeams" = array_remove("assignedTeams", p_team),
         "assignedTeamCount" = cardinality(array_remove("assignedTeams", p_team))
   where lower(email) = lower(p_email)
     and public.has_perm('manage_mentors');
$$;

-- Exactly one active round; replaces the writeBatch that cleared the others.
create or replace function public.set_active_round(p_round uuid, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.has_perm('manage_rounds') or public.is_mentor()) then
    raise exception 'insufficient permissions';
  end if;

  if p_active then
    update public.rounds set "isActive" = (id = p_round);
  else
    update public.rounds set "isActive" = false where id = p_round;
  end if;
end;
$$;

revoke all on function public.mentor_add_team(text, uuid) from public;
revoke all on function public.mentor_remove_team(text, uuid) from public;
revoke all on function public.set_active_round(uuid, boolean) from public;
grant execute on function public.mentor_add_team(text, uuid) to authenticated;
grant execute on function public.mentor_remove_team(text, uuid) to authenticated;
grant execute on function public.set_active_round(uuid, boolean) to authenticated;
