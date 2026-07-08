-- Stores pending invitations for users who are not yet registered.
-- Once they authenticate via the AcceptInvite page, the row is consumed
-- (workspace_members row created + this row deleted).

create table if not exists public.workspace_invitations (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email        text not null,
  role         text not null default 'developer',
  invited_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),

  -- Prevent duplicate pending invites for the same email+workspace
  unique (workspace_id, email)
);

-- Only the invited user (matched by email after auth) or admins should read these.
-- The edge function uses the service-role key so it bypasses RLS entirely.
-- The AcceptInvite page reads with the anon/user key, so we need a policy.
alter table public.workspace_invitations enable row level security;

-- Allow any authenticated user to read an invite row where the email matches
-- their own authenticated email. This lets AcceptInvite.jsx call getPendingInvite.
create policy "Invited user can read own invite"
  on public.workspace_invitations
  for select
  using (
    lower(email) = lower(auth.jwt() ->> 'email')
  );

-- Allow any authenticated user to delete their own invite row (cleanup after accept).
create policy "Invited user can delete own invite"
  on public.workspace_invitations
  for delete
  using (
    lower(email) = lower(auth.jwt() ->> 'email')
  );

-- Allow any authenticated user to insert their own workspace_members row
-- when accepting an invite (the AcceptInvite page calls this directly).
-- workspace_members RLS must permit this — check existing policies.
-- If workspace_members already has an insert policy for authenticated users, this is fine.
-- If not, uncomment the policy below:
--
-- create policy "Members can insert themselves via invite"
--   on public.workspace_members
--   for insert
--   with check (user_id = auth.uid());
