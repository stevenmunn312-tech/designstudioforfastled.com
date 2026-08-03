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
  );
$$;

revoke all on function public.is_published_pattern_file(text) from public;
grant execute on function public.is_published_pattern_file(text) to anon, authenticated;

create policy "Published pattern files are publicly readable"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'pattern-files'
    and public.is_published_pattern_file(name)
  );
