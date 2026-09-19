-- Self-check for schema.sql: proves the RLS policies and the RPCs behave.
--
-- The Firestore rules this replaced were never executable outside Firebase, so
-- an authorisation mistake only showed up in production. These asserts run
-- against any Postgres with the Supabase auth stubs applied:
--
--   psql -d schemacheck -v ON_ERROR_STOP=1 -f supabase/auth_stub.sql
--   psql -d schemacheck -v ON_ERROR_STOP=1 -f supabase/schema.sql
--   psql -d schemacheck -v ON_ERROR_STOP=1 -f supabase/schema.check.sql
--
-- Any failure raises; a clean run prints "schema.check: all passed".

\set ON_ERROR_STOP on
set client_min_messages = warning;

-- ---------- helpers (temp schema, dropped with the session) ----------
create or replace function pg_temp.act_as(p_uid text, p_email text) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid, false);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'email', p_email)::text, false);
end $$;

create or replace function pg_temp.anon() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', false);
  perform set_config('request.jwt.claims', '', false);
end $$;

create or replace function pg_temp.eq(p_label text, p_got anyelement, p_want anyelement)
returns void language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception 'FAIL %: got %, want %', p_label, p_got, p_want;
  end if;
end $$;

-- ---------- fixtures ----------
delete from public.teams;
delete from public.mentors;
delete from public.event_team;
delete from public.rounds;
delete from public.tracks;
delete from public.profiles;
delete from auth.users;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'lubhanshsharma555@gmail.com'),
  ('22222222-2222-2222-2222-222222222222', 'organiser@bfit.test'),
  ('33333333-3333-3333-3333-333333333333', 'mentor@bfit.test'),
  ('44444444-4444-4444-4444-444444444444', 'leader@bfit.test'),
  ('55555555-5555-5555-5555-555555555555', 'stranger@bfit.test');

insert into public.event_team (email, name, permissions) values
  ('organiser@bfit.test', 'Organiser',
   '{"manage_teams": true, "manage_rounds": true, "manage_mentors": true}'::jsonb);
insert into public.mentors (email, name) values ('mentor@bfit.test', 'Mentor');
insert into public.tracks (id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'EdTech');
insert into public.rounds (id, name, "order", "isActive") values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Round 1', 1, true),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Round 2', 2, false);
insert into public.teams (id, name, "contactEmail", "creatorUid", status, "assignedMentorEmail") values
  ('cccccccc-0000-0000-0000-000000000001', 'Leader Squad', 'leader@bfit.test',
   '44444444-4444-4444-4444-444444444444', 'pending', 'mentor@bfit.test'),
  ('cccccccc-0000-0000-0000-000000000002', 'Other Squad', 'other@bfit.test',
   '55555555-5555-5555-5555-555555555555', 'pending', null),
  ('cccccccc-0000-0000-0000-000000000003', 'Approved Squad', 'appr@bfit.test',
   '55555555-5555-5555-5555-555555555555', 'approved', null);

-- ============================================================
-- public reads: the marketing site works signed out
-- ============================================================
set role anon;
select pg_temp.anon();
select pg_temp.eq('anon reads tracks', (select count(*) from public.tracks), 1::bigint);
select pg_temp.eq('anon reads rounds', (select count(*) from public.rounds), 2::bigint);
select pg_temp.eq('anon reads mentors', (select count(*) from public.mentors), 1::bigint);
-- teams are never public, not even the approved ones
select pg_temp.eq('anon sees no teams', (select count(*) from public.teams), 0::bigint);
reset role;

-- ============================================================
-- role resolution
-- ============================================================
set role authenticated;

select pg_temp.act_as('11111111-1111-1111-1111-111111111111', 'lubhanshsharma555@gmail.com');
select pg_temp.eq('super admin is admin', public.is_admin(), true);
select pg_temp.eq('super admin has every perm', public.has_perm('manage_anything'), true);

select pg_temp.act_as('22222222-2222-2222-2222-222222222222', 'organiser@bfit.test');
select pg_temp.eq('organiser is not admin', public.is_admin(), false);
select pg_temp.eq('organiser has granted perm', public.has_perm('manage_teams'), true);
select pg_temp.eq('organiser lacks ungranted perm', public.has_perm('manage_guests'), false);

select pg_temp.act_as('33333333-3333-3333-3333-333333333333', 'mentor@bfit.test');
select pg_temp.eq('mentor is mentor', public.is_mentor(), true);
select pg_temp.eq('mentor has no perms', public.has_perm('manage_teams'), false);

select pg_temp.act_as('55555555-5555-5555-5555-555555555555', 'stranger@bfit.test');
select pg_temp.eq('stranger is nobody', public.is_admin() or public.is_mentor(), false);

-- ============================================================
-- teams visibility
-- ============================================================
select pg_temp.act_as('22222222-2222-2222-2222-222222222222', 'organiser@bfit.test');
select pg_temp.eq('organiser sees all teams', (select count(*) from public.teams), 3::bigint);

select pg_temp.act_as('33333333-3333-3333-3333-333333333333', 'mentor@bfit.test');
-- assigned squad + the approved one that everyone signed in can see
select pg_temp.eq('mentor sees assigned + approved', (select count(*) from public.teams), 2::bigint);
select pg_temp.eq('mentor sees their squad',
  (select count(*) from public.teams where id = 'cccccccc-0000-0000-0000-000000000001'), 1::bigint);

select pg_temp.act_as('44444444-4444-4444-4444-444444444444', 'leader@bfit.test');
select pg_temp.eq('leader sees own + approved', (select count(*) from public.teams), 2::bigint);
select pg_temp.eq('leader cannot see rival pending team',
  (select count(*) from public.teams where id = 'cccccccc-0000-0000-0000-000000000002'), 0::bigint);

-- ============================================================
-- teams writes
-- ============================================================
-- a leader may edit their own squad
select pg_temp.act_as('44444444-4444-4444-4444-444444444444', 'leader@bfit.test');
update public.teams set "roundSubmissions" = '{"1": {"workDone": "ok"}}'::jsonb
  where id = 'cccccccc-0000-0000-0000-000000000001';
select pg_temp.eq('leader edited own squad',
  (select "roundSubmissions" -> '1' ->> 'workDone' from public.teams
    where id = 'cccccccc-0000-0000-0000-000000000001'), 'ok');

-- ...but not somebody else's
update public.teams set name = 'hijacked' where id = 'cccccccc-0000-0000-0000-000000000002';
reset role;
select pg_temp.eq('rival team untouched',
  (select name from public.teams where id = 'cccccccc-0000-0000-0000-000000000002'), 'Other Squad');
set role authenticated;

-- a stranger cannot register a team in someone else's name
select pg_temp.act_as('55555555-5555-5555-5555-555555555555', 'stranger@bfit.test');
do $$
begin
  insert into public.teams (name, "contactEmail", "creatorUid")
  values ('Forged', 'x@y.test', '44444444-4444-4444-4444-444444444444');
  raise exception 'FAIL: stranger forged a team for another user';
exception when insufficient_privilege then null;
end $$;

-- ...nor self-assign a mentor while registering
do $$
begin
  insert into public.teams (name, "contactEmail", "creatorUid", "assignedMentorEmail")
  values ('Self-mentored', 'x@y.test', '55555555-5555-5555-5555-555555555555', 'mentor@bfit.test');
  raise exception 'FAIL: leader self-assigned a mentor';
exception when insufficient_privilege then null;
end $$;

-- a stranger cannot promote themselves to admin
select pg_temp.act_as('55555555-5555-5555-5555-555555555555', 'stranger@bfit.test');
select public.sync_my_profile();
do $$
begin
  update public.profiles set role = 'admin'
    where id = '55555555-5555-5555-5555-555555555555';
  if found then raise exception 'FAIL: self-promotion to admin succeeded'; end if;
exception when insufficient_privilege then null;
end $$;
reset role;
select pg_temp.eq('stranger still a plain user',
  (select role from public.profiles where id = '55555555-5555-5555-5555-555555555555'), 'user');
set role authenticated;

-- ============================================================
-- reference data writes are permission-gated
-- ============================================================
select pg_temp.act_as('55555555-5555-5555-5555-555555555555', 'stranger@bfit.test');
do $$
begin
  insert into public.tracks (name) values ('Rogue Track');
  raise exception 'FAIL: stranger wrote a track';
exception when insufficient_privilege then null;
end $$;

select pg_temp.act_as('11111111-1111-1111-1111-111111111111', 'lubhanshsharma555@gmail.com');
insert into public.tracks (name) values ('Admin Track');
reset role;
select pg_temp.eq('admin wrote a track', (select count(*) from public.tracks), 2::bigint);
set role authenticated;

-- ============================================================
-- sync_my_profile derives the role server-side
-- ============================================================
select pg_temp.act_as('22222222-2222-2222-2222-222222222222', 'organiser@bfit.test');
select pg_temp.eq('organiser resolves to event_team',
  (select role from public.sync_my_profile()), 'event_team');
select pg_temp.eq('organiser keeps their permissions',
  (select (permissions ->> 'manage_teams')::boolean from public.sync_my_profile()), true);

select pg_temp.act_as('33333333-3333-3333-3333-333333333333', 'mentor@bfit.test');
select pg_temp.eq('mentor resolves to mentor', (select role from public.sync_my_profile()), 'mentor');
reset role;
select pg_temp.eq('mentor uid linked on sign-in',
  (select uid from public.mentors where email = 'mentor@bfit.test'),
  '33333333-3333-3333-3333-333333333333'::uuid);
set role authenticated;

select pg_temp.act_as('11111111-1111-1111-1111-111111111111', 'lubhanshsharma555@gmail.com');
select pg_temp.eq('super admin resolves to admin',
  (select role from public.sync_my_profile()), 'admin');

-- ============================================================
-- set_active_round keeps exactly one round live
-- ============================================================
select pg_temp.act_as('22222222-2222-2222-2222-222222222222', 'organiser@bfit.test');
select public.set_active_round('bbbbbbbb-0000-0000-0000-000000000002', true);
reset role;
select pg_temp.eq('exactly one active round',
  (select count(*) from public.rounds where "isActive"), 1::bigint);
select pg_temp.eq('the right round is active',
  (select id from public.rounds where "isActive"), 'bbbbbbbb-0000-0000-0000-000000000002'::uuid);
set role authenticated;

select pg_temp.act_as('22222222-2222-2222-2222-222222222222', 'organiser@bfit.test');
select public.set_active_round('bbbbbbbb-0000-0000-0000-000000000002', false);
reset role;
select pg_temp.eq('deactivating leaves none active',
  (select count(*) from public.rounds where "isActive"), 0::bigint);
set role authenticated;

-- a stranger cannot drive the rounds
select pg_temp.act_as('55555555-5555-5555-5555-555555555555', 'stranger@bfit.test');
do $$
begin
  perform public.set_active_round('bbbbbbbb-0000-0000-0000-000000000001', true);
  raise exception 'FAIL: stranger activated a round';
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
end $$;

-- ============================================================
-- mentor team arrays (the old arrayUnion / arrayRemove)
-- ============================================================
select pg_temp.act_as('22222222-2222-2222-2222-222222222222', 'organiser@bfit.test');
select public.mentor_add_team('mentor@bfit.test', 'cccccccc-0000-0000-0000-000000000001');
select public.mentor_add_team('mentor@bfit.test', 'cccccccc-0000-0000-0000-000000000002');
-- adding twice must not duplicate, the way arrayUnion did not
select public.mentor_add_team('mentor@bfit.test', 'cccccccc-0000-0000-0000-000000000001');
reset role;
select pg_temp.eq('two distinct assigned teams',
  (select cardinality("assignedTeams") from public.mentors where email = 'mentor@bfit.test'), 2);
select pg_temp.eq('count column tracks the array',
  (select "assignedTeamCount" from public.mentors where email = 'mentor@bfit.test'), 2);
set role authenticated;

select pg_temp.act_as('22222222-2222-2222-2222-222222222222', 'organiser@bfit.test');
select public.mentor_remove_team('mentor@bfit.test', 'cccccccc-0000-0000-0000-000000000001');
reset role;
select pg_temp.eq('one assigned team left',
  (select cardinality("assignedTeams") from public.mentors where email = 'mentor@bfit.test'), 1);
set role authenticated;

-- a stranger cannot reshuffle mentor assignments
select pg_temp.act_as('55555555-5555-5555-5555-555555555555', 'stranger@bfit.test');
select public.mentor_add_team('mentor@bfit.test', 'cccccccc-0000-0000-0000-000000000003');
reset role;
select pg_temp.eq('stranger could not assign a team',
  (select cardinality("assignedTeams") from public.mentors where email = 'mentor@bfit.test'), 1);

\echo 'schema.check: all passed'
