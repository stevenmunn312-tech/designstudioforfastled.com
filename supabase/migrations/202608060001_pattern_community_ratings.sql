-- Community star ratings: one 1-5 vote per member per published pattern.
--
-- This is the third rating concept on `patterns` and deliberately does not
-- merge with either of the other two:
--   * `studio_score`     0-100, computed by the site's own evaluator from the
--                        graph itself. Objective, and not a matter of taste.
--   * `uploader_rating`  the sharer's own stars, carried through the app's
--                        share handoff. Folding a self-rating into a community
--                        average would lift every pattern by its own author's
--                        vote, so it stays out of the aggregate below.

-- `user_id` references auth.users, NOT public.profiles, and must stay that
-- way. Pointing it at profiles gives PostgREST a second join path between
-- `patterns` and `profiles` (patterns -> pattern_ratings -> profiles), at
-- which point every `profiles(display_name)` embed on `patterns` fails with
-- PGRST201, "more than one relationship was found". That breaks the gallery,
-- the homepage, every detail page and /review at once — and because
-- getPublishedPatterns falls back to the starter fixtures on error, it fails
-- silently, serving six sample patterns in place of the real library.
--
-- profiles.id references auth.users(id) anyway, so nothing is lost here: a
-- rating still cannot outlive the account that cast it. If the rater's
-- display name is ever needed, join profiles explicitly on user_id rather
-- than reinstating the foreign key.
create table public.pattern_ratings (
  pattern_id uuid not null references public.patterns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One row per member per pattern. Re-rating is an upsert onto this key, so
  -- a member cannot stack votes by submitting repeatedly.
  primary key (pattern_id, user_id)
);

-- The aggregate below groups by pattern_id, and the detail page looks up a
-- single pattern's rows; the primary key's leading column already serves both,
-- so no extra index is needed here.

alter table public.pattern_ratings enable row level security;

-- Readable by anyone, but only for patterns the gallery would actually show.
-- This is what scopes the aggregate view further down: an archived or
-- unpublished pattern's votes are invisible, so its stats row disappears too.
create policy "Ratings on visible patterns are readable"
  on public.pattern_ratings for select
  using (
    exists (
      select 1 from public.patterns p
      where p.id = pattern_id and p.published and not p.archived
    )
  );

-- `auth.uid() = user_id` is the part that stops a member writing a vote under
-- someone else's id. The pattern check stops votes accruing on drafts and
-- rejected uploads, which would then become visible the moment one was
-- published.
create policy "Members rate published patterns as themselves"
  on public.pattern_ratings for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.patterns p
      where p.id = pattern_id
        and p.published
        and not p.archived
        and p.status = 'approved'
    )
  );

create policy "Members change their own rating"
  on public.pattern_ratings for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Members clear their own rating"
  on public.pattern_ratings for delete to authenticated
  using (auth.uid() = user_id);

-- `security_invoker` matters: without it the view would run as its owner and
-- happily aggregate votes on unpublished and archived patterns for anonymous
-- callers, quietly routing around the select policy above.
create view public.pattern_rating_stats
  with (security_invoker = true)
  as
  select
    pattern_id,
    round(avg(stars)::numeric, 2) as average,
    count(*)::integer as votes
  from public.pattern_ratings
  group by pattern_id;

grant select on public.pattern_rating_stats to anon, authenticated;
