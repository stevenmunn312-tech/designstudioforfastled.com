alter table public.patterns
  add column preview_media_path text,
  add column preview_media_type text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pattern-previews',
  'pattern-previews',
  false,
  8388608,
  array['video/webm']
)
on conflict (id) do nothing;

create policy "Members can upload to their own preview folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'pattern-previews'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Members can read their own preview media"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'pattern-previews'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Members can delete their own preview media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'pattern-previews'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Moderators can read pattern preview media"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'pattern-previews'
    and public.is_moderator()
  );

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
  );
$$;

revoke all on function public.is_published_pattern_preview(text) from public;
grant execute on function public.is_published_pattern_preview(text) to anon, authenticated;

create policy "Published pattern preview media is publicly readable"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'pattern-previews'
    and public.is_published_pattern_preview(name)
  );
