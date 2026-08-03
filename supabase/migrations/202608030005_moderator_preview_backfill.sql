create or replace function public.set_pattern_preview_media(pattern_id uuid, media_path text, media_type text)
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
  set preview_media_path = media_path, preview_media_type = media_type, updated_at = now()
  where id = pattern_id;

  if not found then
    raise exception 'Pattern not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_pattern_preview_media(uuid, text, text) from public;
grant execute on function public.set_pattern_preview_media(uuid, text, text) to authenticated;

-- The per-owner-folder upload policy (from 202608030004) only lets a member
-- upload into their own folder — fine for sharing their own new pattern, but
-- a moderator backfilling a preview for an existing approved pattern may not
-- be uploading into their own folder. Grant moderators a separate, broader
-- insert allowance scoped to this one bucket.
create policy "Moderators can upload any pattern preview media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'pattern-previews'
    and public.is_moderator()
  );
