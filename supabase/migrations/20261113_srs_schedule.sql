-- Flashcard review schedule (spaced repetition), synced per verse.
-- Additive and nullable: safe to apply while older app versions are live.
alter table public.verse_progress
  add column if not exists srs_due bigint,          -- ms epoch, local midnight of the due day
  add column if not exists srs_interval integer,    -- days until the next review
  add column if not exists srs_ease real,           -- SM-2 ease factor
  add column if not exists srs_reps integer,        -- consecutive successful reviews
  add column if not exists srs_lapses integer,      -- times rated "Again"
  add column if not exists srs_introduced bigint;   -- ms epoch of first review
