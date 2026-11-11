-- =====================================================================
--  Nook database schema (Supabase / Postgres)
--  Run this whole file once: Supabase dashboard -> SQL Editor -> New query -> Run
-- =====================================================================

-- ---------- TABLES ----------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  name        text not null check (char_length(name) between 1 and 30),
  about       text not null default 'Hey there! I''m using Nook.' check (char_length(about) <= 80),
  color       text,
  created_at  timestamptz not null default now()
);

create table public.posts (
  id          uuid primary key default gen_random_uuid(),
  author      uuid not null references public.profiles(id) on delete cascade,
  text        text not null check (char_length(text) between 1 and 500),
  created_at  timestamptz not null default now()
);
create index posts_created_idx on public.posts (created_at desc);

create table public.post_likes (
  post_id     uuid not null references public.posts(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  primary key (post_id, user_id)
);

create table public.post_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  author      uuid not null references public.profiles(id) on delete cascade,
  text        text not null check (char_length(text) between 1 and 300),
  created_at  timestamptz not null default now()
);
create index post_comments_post_idx on public.post_comments (post_id);

-- One table for both private chats (type = 'dm') and groups (type = 'group')
create table public.chats (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('dm', 'group')),
  name        text,
  color       text,
  dm_key      text unique,           -- "<smaller-id>:<larger-id>" so each pair has exactly one DM
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.chat_members (
  chat_id       uuid not null references public.chats(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  role          text not null default 'member' check (role in ('admin', 'member')),
  last_read_at  timestamptz not null default now(),
  joined_at     timestamptz not null default now(),
  primary key (chat_id, user_id)
);
create index chat_members_user_idx on public.chat_members (user_id);

create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  chat_id     uuid not null references public.chats(id) on delete cascade,
  sender      uuid not null references public.profiles(id) on delete cascade,
  text        text not null check (char_length(text) between 1 and 2000),
  created_at  timestamptz not null default now()
);
create index messages_chat_created_idx on public.messages (chat_id, created_at);

-- ---------- PROFILE IS CREATED AUTOMATICALLY AT SIGN-UP ---------------

create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uname text;
  dname text;
begin
  uname := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', ''), '[^a-zA-Z0-9_]', '', 'g'));
  dname := left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), uname), 30);
  insert into public.profiles (id, username, name) values (new.id, uname, dname);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- HELPER FUNCTIONS (called from the website) ----------------

-- Used by the sign-up form before creating an account
create function public.username_available(u text)
returns boolean language sql security definer stable set search_path = public as $$
  select not exists (select 1 from public.profiles where username = lower(u));
$$;

-- True when the signed-in user belongs to the chat (used by the security rules)
create function public.is_chat_member(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.chat_members where chat_id = cid and user_id = auth.uid());
$$;

-- Find or create the private chat between you and another person
create function public.start_dm(other_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me  uuid := auth.uid();
  k   text;
  cid uuid;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if other_id = me then raise exception 'You cannot message yourself'; end if;
  if not exists (select 1 from public.profiles where id = other_id) then raise exception 'User not found'; end if;

  k := least(me::text, other_id::text) || ':' || greatest(me::text, other_id::text);
  insert into public.chats (type, dm_key, created_by) values ('dm', k, me) on conflict (dm_key) do nothing;
  select id into cid from public.chats where dm_key = k;
  insert into public.chat_members (chat_id, user_id) values (cid, me), (cid, other_id) on conflict do nothing;
  return cid;
end $$;

-- Create a group; the creator becomes its admin
create function public.create_group(group_name text, group_color text, member_ids uuid[])
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me  uuid := auth.uid();
  cid uuid;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if not (char_length(trim(group_name)) between 1 and 40) then raise exception 'Group name must be 1-40 characters'; end if;

  insert into public.chats (type, name, color, created_by) values ('group', trim(group_name), group_color, me) returning id into cid;
  insert into public.chat_members (chat_id, user_id, role) values (cid, me, 'admin');
  insert into public.chat_members (chat_id, user_id)
    select cid, p.id from public.profiles p where p.id = any (member_ids) and p.id <> me;
  return cid;
end $$;

-- Only a group's admin can add people
create function public.add_group_member(p_chat uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.chat_members cm join public.chats c on c.id = cm.chat_id
    where cm.chat_id = p_chat and cm.user_id = auth.uid() and cm.role = 'admin' and c.type = 'group'
  ) then raise exception 'Only the group admin can add people'; end if;
  insert into public.chat_members (chat_id, user_id) values (p_chat, p_user) on conflict do nothing;
end $$;

-- Leave a group. The next member becomes admin; an empty group is deleted.
create function public.leave_chat(p_chat uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  was_admin boolean;
begin
  select (role = 'admin') into was_admin from public.chat_members where chat_id = p_chat and user_id = auth.uid();
  delete from public.chat_members
    where chat_id = p_chat and user_id = auth.uid()
      and exists (select 1 from public.chats where id = p_chat and type = 'group');

  if not exists (select 1 from public.chat_members where chat_id = p_chat) then
    delete from public.chats where id = p_chat;
  elsif coalesce(was_admin, false) then
    update public.chat_members set role = 'admin'
      where chat_id = p_chat
        and user_id = (select user_id from public.chat_members where chat_id = p_chat order by joined_at limit 1);
  end if;
end $$;

create function public.mark_read(p_chat uuid)
returns void language sql security definer set search_path = public as $$
  update public.chat_members set last_read_at = now() where chat_id = p_chat and user_id = auth.uid();
$$;

-- Deletes your login, profile, posts and messages
create function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- ---------- SECURITY RULES (Row Level Security) -----------------------
-- This is what makes private chats truly private: the database itself
-- refuses to return rows the signed-in user is not allowed to see.

alter table public.profiles      enable row level security;
alter table public.posts         enable row level security;
alter table public.post_likes    enable row level security;
alter table public.post_comments enable row level security;
alter table public.chats         enable row level security;
alter table public.chat_members  enable row level security;
alter table public.messages      enable row level security;

-- profiles: everyone signed in can see profiles; you can edit only your own name/about/color
create policy "profiles are visible to signed-in users" on public.profiles
  for select to authenticated using (true);
create policy "edit own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (name, about, color) on public.profiles to authenticated;

-- posts: public to all signed-in users; write/delete only your own
create policy "posts are public" on public.posts for select to authenticated using (true);
create policy "write own posts" on public.posts for insert to authenticated with check (author = auth.uid());
create policy "delete own posts" on public.posts for delete to authenticated using (author = auth.uid());

create policy "likes are public" on public.post_likes for select to authenticated using (true);
create policy "like as yourself" on public.post_likes for insert to authenticated with check (user_id = auth.uid());
create policy "unlike as yourself" on public.post_likes for delete to authenticated using (user_id = auth.uid());

create policy "comments are public" on public.post_comments for select to authenticated using (true);
create policy "comment as yourself" on public.post_comments for insert to authenticated with check (author = auth.uid());
create policy "delete own comments" on public.post_comments for delete to authenticated using (author = auth.uid());

-- chats, members, messages: visible only to members of that chat
create policy "see your chats" on public.chats
  for select to authenticated using (public.is_chat_member(id));
create policy "see members of your chats" on public.chat_members
  for select to authenticated using (public.is_chat_member(chat_id));
create policy "read messages in your chats" on public.messages
  for select to authenticated using (public.is_chat_member(chat_id));
create policy "send messages in your chats" on public.messages
  for insert to authenticated with check (sender = auth.uid() and public.is_chat_member(chat_id));

-- ---------- LIVE UPDATES ----------------------------------------------
alter publication supabase_realtime add table
  public.posts, public.post_likes, public.post_comments,
  public.chats, public.chat_members, public.messages;
