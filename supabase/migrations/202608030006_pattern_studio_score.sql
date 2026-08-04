-- Studio Score: a 0-100 rating the site computes itself from the live graph
-- (see src/lib/evaluator/patternRating.ts), rather than trusting a value the
-- uploader's app computed and sent along. Nullable — unset until a moderator
-- runs the scan from /review, same lifecycle as preview_media_path.
alter table public.patterns
  add column studio_score smallint;

alter table public.patterns
  add constraint patterns_studio_score_range
  check (studio_score is null or (studio_score >= 0 and studio_score <= 100));

create or replace function public.set_pattern_studio_score(pattern_id uuid, score smallint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;

  if score < 0 or score > 100 then
    raise exception 'Score must be between 0 and 100' using errcode = '22003';
  end if;

  update public.patterns
  set studio_score = score, updated_at = now()
  where id = pattern_id;

  if not found then
    raise exception 'Pattern not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_pattern_studio_score(uuid, smallint) from public;
grant execute on function public.set_pattern_studio_score(uuid, smallint) to authenticated;
