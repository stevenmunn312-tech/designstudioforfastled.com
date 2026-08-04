-- Moderator management of published patterns: edit the presentation metadata,
-- archive a pattern (reversible, hides it everywhere), and purge an archived
-- one (permanent). Archive and purge are deliberately two separate steps —
-- nothing here can destroy a maker's uploaded source file in a single action,
-- and purge_pattern refuses to run on a pattern that has not been archived
-- first, so the guard cannot be skipped by calling the RPC directly.

alter table public.patterns
  add column archived boolean not null default false,
  add column archived_at timestamptz;

create index patterns_archived_idx on public.patterns (archived) where archived;

-- Archived patterns disappear from every public surface. Owners keep seeing
-- their own submission, the same as a pending or rejected one.
drop policy "Published patterns and own drafts are readable" on public.patterns;

create policy "Published patterns and own drafts are readable"
  on public.patterns for select
  using ((published and not archived) or auth.uid() = owner_id);

-- The storage gates decide whether an object is publicly downloadable, so they
-- have to honour archiving too — otherwise an archived pattern's source file
-- and clip stay fetchable by anyone holding (or guessing) the object path.
create or replace function public.is_published_pattern_file(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.patterns
    where storage_path = object_name
      and status = 'approved'
      and published = true
      and archived = false
  );
$$;

create or replace function public.is_published_pattern_preview(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.patterns
    where preview_media_path = object_name
      and status = 'approved'
      and published = true
      and archived = false
  );
$$;

-- Presentation metadata and moderation state. Deliberately excludes likes,
-- downloads and storage_path: the counters are community-earned and the file
-- is the maker's artefact, so neither is a moderator's to rewrite here. The
-- table's own CHECK constraints still enforce title/description length and the
-- LED-count range, surfacing as an error the workbench shows.
create or replace function public.update_pattern_details(
  pattern_id uuid,
  new_title text,
  new_description text,
  new_controller text,
  new_led_count integer,
  new_tags text[],
  new_preview_colors text[],
  new_studio_score smallint,
  new_status text,
  new_published boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;

  if new_status not in ('pending', 'approved', 'rejected') then
    raise exception 'Status must be pending, approved or rejected' using errcode = '22023';
  end if;

  if new_studio_score is not null and (new_studio_score < 0 or new_studio_score > 100) then
    raise exception 'Studio Score must be between 0 and 100' using errcode = '22023';
  end if;

  if array_length(new_preview_colors, 1) is distinct from 3 then
    raise exception 'Preview colours must be exactly three values' using errcode = '22023';
  end if;

  update public.patterns
  set
    title = new_title,
    description = new_description,
    controller = new_controller,
    led_count = new_led_count,
    tags = coalesce(new_tags, '{}'),
    preview_colors = new_preview_colors,
    studio_score = new_studio_score,
    status = new_status,
    published = new_published,
    updated_at = now()
  where id = pattern_id;

  if not found then
    raise exception 'Pattern not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.set_pattern_archived(pattern_id uuid, should_archive boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;

  update public.patterns
  set
    archived = should_archive,
    archived_at = case when should_archive then now() else null end,
    updated_at = now()
  where id = pattern_id;

  if not found then
    raise exception 'Pattern not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Permanent. The caller removes the storage objects first; this drops the row.
-- Refusing a pattern that is not archived is what makes the two-step real
-- rather than a UI convention.
create or replace function public.purge_pattern(pattern_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;

  delete from public.patterns
  where id = pattern_id and archived = true;

  if not found then
    raise exception 'Only an archived pattern can be purged' using errcode = 'P0002';
  end if;
end;
$$;

-- Moderators need object DELETE to purge; the existing policies only granted
-- them SELECT on pattern-files.
create policy "Moderators can delete pattern objects"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('pattern-files', 'pattern-previews')
    and public.is_moderator()
  );

create policy "Moderators can read pattern previews"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'pattern-previews'
    and public.is_moderator()
  );

revoke all on function public.update_pattern_details(uuid, text, text, text, integer, text[], text[], smallint, text, boolean) from public;
grant execute on function public.update_pattern_details(uuid, text, text, text, integer, text[], text[], smallint, text, boolean) to authenticated;

revoke all on function public.set_pattern_archived(uuid, boolean) from public;
grant execute on function public.set_pattern_archived(uuid, boolean) to authenticated;

revoke all on function public.purge_pattern(uuid) from public;
grant execute on function public.purge_pattern(uuid) to authenticated;
