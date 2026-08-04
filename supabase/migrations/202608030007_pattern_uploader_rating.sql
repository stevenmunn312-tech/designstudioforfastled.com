-- Seeds a pattern's community rating with the sharer's own 1-5 star rating
-- from the app's Pattern Library (usePatternRatingStore), carried through
-- the share handoff payload as `personalRating`. Nullable — omitted when the
-- sharer never rated the pattern, or when sharing a whole project that has
-- no single Pattern Library entry to have been rated.
alter table public.patterns
  add column uploader_rating smallint;

alter table public.patterns
  add constraint patterns_uploader_rating_range
  check (uploader_rating is null or (uploader_rating >= 1 and uploader_rating <= 5));
