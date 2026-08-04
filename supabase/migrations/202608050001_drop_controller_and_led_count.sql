-- Remove the controller and led_count fields from patterns.
-- These were hardware hints that added friction for uploaders and were not
-- used by the evaluator. Drop the columns then replace the moderator RPC so
-- its signature no longer carries those parameters.

alter table public.patterns
  drop column if exists controller,
  drop column if exists led_count;

-- Drop the old overload (identified by its full parameter list) before
-- creating the new one, so Postgres does not keep both signatures.
drop function if exists public.update_pattern_details(
  uuid, text, text, text, integer, text[], text[], smallint, text, boolean
);

create or replace function public.update_pattern_details(
  pattern_id uuid,
  new_title text,
  new_description text,
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

revoke all on function public.update_pattern_details(uuid, text, text, text[], text[], smallint, text, boolean) from public;
grant execute on function public.update_pattern_details(uuid, text, text, text[], text[], smallint, text, boolean) to authenticated;
