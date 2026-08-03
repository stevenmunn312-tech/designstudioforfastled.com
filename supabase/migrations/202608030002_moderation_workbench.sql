create table public.moderators (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.moderators enable row level security;

create policy "Moderators can read their own membership"
  on public.moderators for select to authenticated
  using (auth.uid() = user_id);

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.moderators
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_moderator() from public;
grant execute on function public.is_moderator() to authenticated;

drop policy "Members can update their own patterns" on public.patterns;

create policy "Members can update their own pending patterns"
  on public.patterns for update to authenticated
  using (
    auth.uid() = owner_id
    and status = 'pending'
    and published = false
  )
  with check (
    auth.uid() = owner_id
    and status = 'pending'
    and published = false
  );

create policy "Moderators can review all patterns"
  on public.patterns for select to authenticated
  using (public.is_moderator());

create policy "Moderators can read pattern files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'pattern-files'
    and public.is_moderator()
  );

create or replace function public.review_pattern(pattern_id uuid, decision text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;

  if decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected' using errcode = '22023';
  end if;

  update public.patterns
  set
    status = decision,
    published = (decision = 'approved'),
    updated_at = now()
  where id = pattern_id and status = 'pending';

  if not found then
    raise exception 'Pattern is no longer waiting for review' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.review_pattern(uuid, text) from public;
grant execute on function public.review_pattern(uuid, text) to authenticated;
