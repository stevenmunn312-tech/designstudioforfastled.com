create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Community maker',
  created_at timestamptz not null default now()
);

create table public.patterns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  description text not null check (char_length(description) between 10 and 800),
  controller text not null,
  led_count integer not null check (led_count between 1 and 100000),
  tags text[] not null default '{}',
  storage_path text not null unique,
  preview_colors text[] not null default array['#61e4ff', '#876bff', '#ff78b7'],
  likes integer not null default 0 check (likes >= 0),
  downloads integer not null default 0 check (downloads >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index patterns_published_created_at_idx on public.patterns (published, created_at desc);
create index patterns_owner_id_idx on public.patterns (owner_id);

alter table public.profiles enable row level security;
alter table public.patterns enable row level security;

create policy "Profiles are publicly readable"
  on public.profiles for select using (true);

create policy "Members can update their profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Published patterns and own drafts are readable"
  on public.patterns for select using (published or auth.uid() = owner_id);

create policy "Members can create their own patterns"
  on public.patterns for insert with check (auth.uid() = owner_id);

create policy "Members can update their own patterns"
  on public.patterns for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "Members can delete their own patterns"
  on public.patterns for delete using (auth.uid() = owner_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'Community maker'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pattern-files',
  'pattern-files',
  false,
  2097152,
  array['application/json', 'text/plain', 'application/octet-stream']
)
on conflict (id) do nothing;

create policy "Members can upload to their own pattern folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'pattern-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Members can read their own pattern files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'pattern-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Members can delete their own pattern files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'pattern-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
