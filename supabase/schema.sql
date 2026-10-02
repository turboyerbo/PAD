-- PAD: accounts, buildings, sharing and chat.
-- Run this once in the Supabase dashboard: SQL Editor > New query > paste > Run.
-- Row level security is on for every table, so the public anon key in index.html can only reach
-- buildings the signed-in person belongs to.

-- Tables -------------------------------------------------------------------------------------

create table public.profiles (
  id    uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name  text
);

create table public.projects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 80),
  owner      uuid not null references public.profiles(id),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'editor' check (role in ('owner', 'editor')),
  primary key (project_id, user_id)
);

create table public.project_invites (
  project_id uuid not null references public.projects(id) on delete cascade,
  email      text not null,
  invited_by uuid references public.profiles(id),
  primary key (project_id, email)
);

create table public.comments (
  id         bigint generated always as identity primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  unit       integer,                                  -- unit number (PAD-04 is 4); null means the general thread
  user_id    uuid not null default auth.uid() references public.profiles(id),
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index on public.comments (project_id, id);
create index on public.project_members (user_id);

-- Helpers ------------------------------------------------------------------------------------

-- True when the signed-in person belongs to the building. Security definer so the policies do not recurse.
create or replace function public.is_member(pid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.project_members where project_id = pid and user_id = auth.uid()
  );
$$;

-- New sign-ups get a profile, and any invites waiting for their email turn into memberships.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  insert into public.project_members (project_id, user_id, role)
    select project_id, new.id, 'editor' from public.project_invites where email = lower(new.email)
    on conflict do nothing;
  delete from public.project_invites where email = lower(new.email);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Creates a building and makes the caller its owner.
create or replace function public.create_project(p_name text, p_data jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  insert into public.projects (name, owner, data, updated_by)
    values (left(trim(p_name), 80), auth.uid(), coalesce(p_data, '{}'::jsonb), auth.uid())
    returning id into pid;
  insert into public.project_members (project_id, user_id, role) values (pid, auth.uid(), 'owner');
  return pid;
end $$;

-- Adds an existing person to a building, or saves an invite for someone who has not signed up yet.
create or replace function public.invite_to_project(p_project uuid, p_email text) returns text
language plpgsql security definer set search_path = public as $$
declare
  target uuid;
  em text := lower(trim(p_email));
begin
  if not public.is_member(p_project) then raise exception 'You do not have access to this building'; end if;
  select id into target from public.profiles where email = em;
  if target is not null then
    insert into public.project_members (project_id, user_id, role) values (p_project, target, 'editor') on conflict do nothing;
    return 'added';
  end if;
  insert into public.project_invites (project_id, email, invited_by) values (p_project, em, auth.uid()) on conflict do nothing;
  return 'pending';
end $$;

-- Every save stamps who made it and when, so teammates know which changes are theirs to ignore.
create or replace function public.touch_project() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end $$;

create trigger projects_touch
  before update on public.projects
  for each row execute function public.touch_project();

-- Row level security ---------------------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invites enable row level security;
alter table public.comments        enable row level security;

create policy "read yourself and teammates" on public.profiles for select to authenticated
  using (id = auth.uid() or exists (
    select 1 from public.project_members pm where pm.user_id = profiles.id and public.is_member(pm.project_id)
  ));

create policy "read your buildings" on public.projects for select to authenticated
  using (public.is_member(id));
create policy "edit your buildings" on public.projects for update to authenticated
  using (public.is_member(id)) with check (public.is_member(id));
create policy "owner deletes building" on public.projects for delete to authenticated
  using (owner = auth.uid());

create policy "read members" on public.project_members for select to authenticated
  using (public.is_member(project_id));
create policy "leave a building" on public.project_members for delete to authenticated
  using (user_id = auth.uid() and role <> 'owner');

create policy "read invites" on public.project_invites for select to authenticated
  using (public.is_member(project_id));

create policy "read comments" on public.comments for select to authenticated
  using (public.is_member(project_id));
create policy "post comments" on public.comments for insert to authenticated
  with check (user_id = auth.uid() and public.is_member(project_id));
create policy "delete your comments" on public.comments for delete to authenticated
  using (user_id = auth.uid());

-- Privileges ---------------------------------------------------------------------------------

revoke all on public.profiles, public.projects, public.project_members, public.project_invites, public.comments from anon;
grant select on public.profiles, public.projects, public.project_members, public.project_invites, public.comments to authenticated;
-- Editors can change the name and the layout data, never the owner or the id.
grant update (name, data) on public.projects to authenticated;
grant delete on public.projects, public.project_members to authenticated;
grant insert, delete on public.comments to authenticated;

revoke execute on function public.is_member(uuid), public.create_project(text, jsonb), public.invite_to_project(uuid, text) from public, anon;
grant execute on function public.is_member(uuid), public.create_project(text, jsonb), public.invite_to_project(uuid, text) to authenticated;

-- Live updates ---------------------------------------------------------------------------------

alter publication supabase_realtime add table public.comments, public.projects;
